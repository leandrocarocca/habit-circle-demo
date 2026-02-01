import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// POST /api/meals/from-recipe - Create a meal from a recipe
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipe_id, date, portions } = body;

    if (!recipe_id || !date) {
      return NextResponse.json(
        { error: "Missing required fields: recipe_id, date" },
        { status: 400 }
      );
    }

    if (!portions || portions <= 0) {
      return NextResponse.json(
        { error: "portions must be greater than 0" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Get the recipe with its ingredients
    const recipeResult = await pool.query(
      `SELECT
        r.id,
        r.name,
        r.portions_yield,
        COALESCE(
          json_agg(
            json_build_object(
              'food_item_id', ri.food_item_id,
              'portion_type', ri.portion_type,
              'portion_count', ri.portion_count
            )
          ) FILTER (WHERE ri.id IS NOT NULL),
          '[]'::json
        ) as ingredients
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE r.id = $1 AND r.user_id = $2
      GROUP BY r.id, r.name, r.portions_yield`,
      [recipe_id, session.user.id]
    );

    if (recipeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    const recipe = recipeResult.rows[0];
    const ingredients = recipe.ingredients;

    // Create the meal with the recipe name
    const mealResult = await pool.query(
      `INSERT INTO meals (user_id, date, name)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, date, name, created_at, updated_at`,
      [session.user.id, date, recipe.name]
    );

    const meal = mealResult.rows[0];

    // Calculate the portion multiplier: portions requested / portions_yield
    const portionMultiplier = portions / recipe.portions_yield;

    // Add all recipe ingredients to the meal with adjusted portion counts
    for (const ingredient of ingredients) {
      const adjustedPortionCount = ingredient.portion_count * portionMultiplier;

      await pool.query(
        `INSERT INTO meal_food_items (meal_id, food_item_id, portion_type, portion_count)
         VALUES ($1, $2, $3::portion_type, $4)`,
        [meal.id, ingredient.food_item_id, ingredient.portion_type, adjustedPortionCount]
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
      [meal.id]
    );

    return NextResponse.json(completeMealResult.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating meal from recipe:', error);
    return NextResponse.json(
      { error: "Failed to create meal from recipe" },
      { status: 500 }
    );
  }
}
