import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// POST /api/meals/[id]/from-recipe - Add portions from a recipe to an existing meal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: mealId } = await params;
    const body = await request.json();
    const { recipe_id, portions } = body;

    if (!recipe_id) {
      return NextResponse.json(
        { error: "Missing required field: recipe_id" },
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

    // Verify the meal belongs to the user
    const mealCheck = await pool.query(
      'SELECT id FROM meals WHERE id = $1 AND user_id = $2',
      [mealId, session.user.id]
    );

    if (mealCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Meal not found" },
        { status: 404 }
      );
    }

    // Get the recipe with its ingredients
    const recipeResult = await pool.query(
      `SELECT
        r.id,
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
      GROUP BY r.id`,
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

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "Recipe has no ingredients" },
        { status: 400 }
      );
    }

    // Calculate the portion multiplier: portions requested / portions_yield
    const portionMultiplier = portions / recipe.portions_yield;

    // Add each ingredient to the meal with adjusted portion_count
    let itemsAdded = 0;
    for (const ingredient of ingredients) {
      // Calculate adjusted portion count: original * (portions / portions_yield)
      const adjustedPortionCount = ingredient.portion_count * portionMultiplier;

      await pool.query(
        `INSERT INTO meal_food_items (meal_id, food_item_id, portion_type, portion_count)
         VALUES ($1, $2, $3::portion_type, $4)`,
        [mealId, ingredient.food_item_id, ingredient.portion_type, adjustedPortionCount]
      );
      itemsAdded++;
    }

    return NextResponse.json({
      success: true,
      items_added: itemsAdded,
      portions_added: portions,
      portions_yield: recipe.portions_yield
    }, { status: 200 });
  } catch (error) {
    console.error('Error adding recipe to meal:', error);
    return NextResponse.json(
      { error: "Failed to add recipe to meal" },
      { status: 500 }
    );
  }
}
