import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

interface GeneratedFoodItem {
  name: string;
  brand: string | null;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  sugar_per_100g: number;
  grams: number;
}

interface GeneratedMeal {
  name: string;
  food_items: GeneratedFoodItem[];
}

interface GeneratedMealPlan {
  meals: GeneratedMeal[];
  total_calories: number;
  total_protein: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { min_protein, calorie_min, calorie_max, num_meals, date } = body;

    if (!min_protein || !calorie_min || !calorie_max || !num_meals || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: min_protein, calorie_min, calorie_max, num_meals, date' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Generate meal plan using Claude
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a Swedish meal planner. Generate a meal plan for one day using food items that can be found at Willys.se (Swedish grocery store).

Requirements:
- Minimum ${min_protein}g of protein for the day
- Total calories between ${calorie_min} and ${calorie_max} kcal
- Exactly ${num_meals} meals

For each food item, provide realistic nutritional values per 100g based on typical Swedish products from Willys.

Return ONLY a valid JSON object in this exact format:
{
  "meals": [
    {
      "name": "Breakfast",
      "food_items": [
        {
          "name": "Kycklingfilé",
          "brand": "Kronfågel",
          "category": "chicken",
          "calories_per_100g": 110,
          "protein_per_100g": 23,
          "fat_per_100g": 1.5,
          "carbs_per_100g": 0,
          "sugar_per_100g": 0,
          "grams": 150
        }
      ]
    }
  ],
  "total_calories": 1800,
  "total_protein": 160
}

Categories must be one of: meat, chicken, vegetables, fruits, toppings_on_bread, cheese, frozen_food, bread, pantry, carbs, cooking_fat, dairy, other

Use Swedish product names where appropriate. Include realistic Swedish brands like Arla, Scan, Kronfågel, Garant, Eldorado, Felix, etc.

Make the meals practical and balanced. Common Swedish foods like filmjölk, knäckebröd, kvarg, cottage cheese, kyckling, lax, ägg, havregryn, etc. are good choices for high-protein meals.`,
        },
      ],
    });

    // Extract the text content from the response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to generate meal plan' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    const responseText = textContent.text.trim();
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let mealPlan: GeneratedMealPlan;
    try {
      mealPlan = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse meal plan:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse generated meal plan' },
        { status: 500 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
    const createdMeals = [];

    // Process each meal
    for (const meal of mealPlan.meals) {
      // Create the meal
      const mealResult = await pool.query(
        `INSERT INTO meals (user_id, date, name)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, date, name, created_at, updated_at`,
        [session.user.id, date, meal.name]
      );
      const createdMeal = mealResult.rows[0];

      // Process each food item
      for (const foodItem of meal.food_items) {
        // Check if food item exists (by name, case-insensitive)
        const existingFoodItem = await pool.query(
          `SELECT id FROM food_items WHERE LOWER(name) = LOWER($1)`,
          [foodItem.name]
        );

        let foodItemId: number;

        if (existingFoodItem.rows.length > 0) {
          foodItemId = existingFoodItem.rows[0].id;
        } else {
          // Create new food item
          const newFoodItem = await pool.query(
            `INSERT INTO food_items (name, brand, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, sugar_per_100g)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
              foodItem.name,
              foodItem.brand,
              foodItem.category,
              foodItem.calories_per_100g,
              foodItem.protein_per_100g,
              foodItem.fat_per_100g,
              foodItem.carbs_per_100g,
              foodItem.sugar_per_100g,
            ]
          );
          foodItemId = newFoodItem.rows[0].id;

          // Add default portions (1g and 100g)
          await pool.query(
            `INSERT INTO food_item_portions (food_item_id, portion_type, grams)
             VALUES ($1, 'per_1g', 1), ($1, 'per_100g', 100)`,
            [foodItemId]
          );
        }

        // Add food item to meal using per_1g portion type with the specified grams
        await pool.query(
          `INSERT INTO meal_food_items (meal_id, food_item_id, portion_type, portion_count)
           VALUES ($1, $2, 'per_1g'::portion_type, $3)`,
          [createdMeal.id, foodItemId, foodItem.grams]
        );
      }

      // Fetch the complete meal with food items
      const completeMealResult = await pool.query(
        `SELECT
          m.id,
          m.user_id,
          m.date,
          m.name,
          m.created_at,
          m.updated_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', mfi.id,
                'food_item_id', mfi.food_item_id,
                'food_item_name', fi.name,
                'food_item_brand', fi.brand,
                'food_item_category', fi.category,
                'portion_type', mfi.portion_type,
                'portion_count', mfi.portion_count,
                'portion_grams', fip.grams,
                'protein_per_100g', fi.protein_per_100g,
                'fat_per_100g', fi.fat_per_100g,
                'carbs_per_100g', fi.carbs_per_100g,
                'sugar_per_100g', fi.sugar_per_100g,
                'calories_per_100g', fi.calories_per_100g
              ) ORDER BY mfi.created_at
            ) FILTER (WHERE mfi.id IS NOT NULL),
            '[]'::json
          ) as food_items
        FROM meals m
        LEFT JOIN meal_food_items mfi ON m.id = mfi.meal_id
        LEFT JOIN food_items fi ON mfi.food_item_id = fi.id
        LEFT JOIN food_item_portions fip ON fi.id = fip.food_item_id AND mfi.portion_type = fip.portion_type
        WHERE m.id = $1
        GROUP BY m.id, m.user_id, m.date, m.name, m.created_at, m.updated_at`,
        [createdMeal.id]
      );

      createdMeals.push(completeMealResult.rows[0]);
    }

    return NextResponse.json({
      meals: createdMeals,
      summary: {
        total_calories: mealPlan.total_calories,
        total_protein: mealPlan.total_protein,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating meals:', error);
    return NextResponse.json(
      { error: 'Failed to generate meals' },
      { status: 500 }
    );
  }
}
