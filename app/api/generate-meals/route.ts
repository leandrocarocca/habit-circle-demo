import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

interface ExistingFoodItem {
  id: number;
  name: string;
  brand: string | null;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  portions: Array<{ portion_type: string; grams: number }>;
}

interface GeneratedFoodItem {
  existing_food_item_id: number | null;
  name: string;
  brand: string | null;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  sugar_per_100g: number;
  portion_type: string;
  portion_count: number;
  portion_grams: number;
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

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Fetch all existing food items with their portions
    const existingFoodItemsResult = await pool.query(
      `SELECT
        fi.id,
        fi.name,
        fi.brand,
        fi.category,
        fi.calories_per_100g,
        fi.protein_per_100g,
        COALESCE(
          json_agg(
            json_build_object(
              'portion_type', fip.portion_type,
              'grams', fip.grams
            )
          ) FILTER (WHERE fip.id IS NOT NULL),
          '[]'::json
        ) as portions
      FROM food_items fi
      LEFT JOIN food_item_portions fip ON fi.id = fip.food_item_id
      GROUP BY fi.id, fi.name, fi.brand, fi.category, fi.calories_per_100g, fi.protein_per_100g
      ORDER BY fi.name`
    );

    const existingFoodItems: ExistingFoodItem[] = existingFoodItemsResult.rows;

    // Create a summary of existing food items for the AI
    const existingFoodItemsSummary = existingFoodItems.map(item => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      calories_per_100g: item.calories_per_100g,
      protein_per_100g: item.protein_per_100g,
      portions: item.portions.filter(p => p.portion_type !== 'per_1g' && p.portion_type !== 'per_100g'),
    }));

    const client = new Anthropic({ apiKey });

    // Generate meal plan using Claude
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `You are a Swedish meal planner. Generate a meal plan for one day.

Requirements:
- Minimum ${min_protein}g of protein for the day
- Total calories between ${calorie_min} and ${calorie_max} kcal
- Exactly ${num_meals} meals

IMPORTANT: You MUST prioritize using existing food items from the database. Only create new food items if nothing similar exists.

Here are the existing food items in the database:
${JSON.stringify(existingFoodItemsSummary, null, 2)}

For each food item in your meal plan:
1. If an existing food item matches (same or very similar), use "existing_food_item_id" with that item's id
2. Only if no similar item exists, set "existing_food_item_id" to null and provide full nutritional data

For portions, use appropriate portion types:
- "per_piece" for items like eggs, fruits, bread slices
- "per_portion" for servings of prepared foods
- "per_dl" for liquids like milk, yogurt
- "per_tablespoon" or "per_teaspoon" for small amounts
- "per_100g" for meats, fish, etc. where weight makes sense
- Use existing portion types from the food item if available

Return ONLY a valid JSON object in this exact format:
{
  "meals": [
    {
      "name": "Breakfast",
      "food_items": [
        {
          "existing_food_item_id": 5,
          "name": "Ägg",
          "brand": null,
          "category": "other",
          "calories_per_100g": 155,
          "protein_per_100g": 13,
          "fat_per_100g": 11,
          "carbs_per_100g": 1,
          "sugar_per_100g": 0,
          "portion_type": "per_piece",
          "portion_count": 2,
          "portion_grams": 60
        }
      ]
    }
  ],
  "total_calories": 1800,
  "total_protein": 160
}

Categories must be one of: meat, chicken, vegetables, fruits, toppings_on_bread, cheese, frozen_food, bread, pantry, carbs, cooking_fat, dairy, other

Portion types must be one of: per_1g, per_100g, per_slice, per_portion, per_dl, per_cup, per_tablespoon, per_teaspoon, per_piece

If creating a NEW food item (not in database), use Swedish product names and realistic Swedish brands like Arla, Scan, Kronfågel, Garant, Eldorado, Felix, etc.

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
        let foodItemId: number;

        if (foodItem.existing_food_item_id) {
          // Use existing food item
          foodItemId = foodItem.existing_food_item_id;
        } else {
          // Check if a similar food item exists by name (fuzzy match)
          const similarFoodItem = await pool.query(
            `SELECT id FROM food_items
             WHERE LOWER(name) = LOWER($1)
             OR LOWER(name) LIKE LOWER($2)`,
            [foodItem.name, `%${foodItem.name}%`]
          );

          if (similarFoodItem.rows.length > 0) {
            foodItemId = similarFoodItem.rows[0].id;
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
        }

        // Check if the portion type exists for this food item
        const existingPortion = await pool.query(
          `SELECT portion_type FROM food_item_portions
           WHERE food_item_id = $1 AND portion_type = $2`,
          [foodItemId, foodItem.portion_type]
        );

        let portionType = foodItem.portion_type;
        let portionCount = foodItem.portion_count;

        if (existingPortion.rows.length === 0) {
          // Portion type doesn't exist, create it or fall back to per_1g
          if (foodItem.portion_grams && foodItem.portion_grams > 0) {
            // Create the new portion type
            await pool.query(
              `INSERT INTO food_item_portions (food_item_id, portion_type, grams)
               VALUES ($1, $2, $3)
               ON CONFLICT (food_item_id, portion_type) DO NOTHING`,
              [foodItemId, foodItem.portion_type, foodItem.portion_grams]
            );
          } else {
            // Fall back to per_1g with calculated count
            portionType = 'per_1g';
            portionCount = foodItem.portion_grams * foodItem.portion_count;
          }
        }

        // Add food item to meal
        await pool.query(
          `INSERT INTO meal_food_items (meal_id, food_item_id, portion_type, portion_count)
           VALUES ($1, $2, $3::portion_type, $4)`,
          [createdMeal.id, foodItemId, portionType, portionCount]
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
