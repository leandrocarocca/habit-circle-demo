import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// POST /api/recipes/[id]/ingredients - Add an ingredient to a recipe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId } = await params;
    const body = await request.json();
    const { food_item_id, portion_type, portion_count } = body;

    if (!food_item_id || !portion_type || !portion_count) {
      return NextResponse.json(
        { error: "Missing required fields: food_item_id, portion_type, portion_count" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Verify the recipe belongs to the user
    const recipeCheck = await pool.query(
      'SELECT id FROM recipes WHERE id = $1 AND user_id = $2',
      [recipeId, session.user.id]
    );

    if (recipeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Verify the food item exists and has the specified portion type
    const portionCheck = await pool.query(
      'SELECT grams FROM food_item_portions WHERE food_item_id = $1 AND portion_type = $2',
      [food_item_id, portion_type]
    );

    if (portionCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Food item does not have the specified portion type" },
        { status: 400 }
      );
    }

    // Insert the ingredient
    const result = await pool.query(
      `INSERT INTO recipe_ingredients (recipe_id, food_item_id, portion_type, portion_count)
       VALUES ($1, $2, $3::portion_type, $4)
       RETURNING id`,
      [recipeId, food_item_id, portion_type, portion_count]
    );

    // Fetch the complete ingredient details
    const ingredientResult = await pool.query(
      `SELECT
        ri.id,
        ri.food_item_id,
        fi.name as food_item_name,
        fi.brand as food_item_brand,
        fi.category as food_item_category,
        ri.portion_type,
        ri.portion_count,
        fip.grams as portion_grams,
        fi.protein_per_100g,
        fi.fat_per_100g,
        fi.carbs_per_100g,
        fi.sugar_per_100g,
        fi.calories_per_100g
      FROM recipe_ingredients ri
      JOIN food_items fi ON ri.food_item_id = fi.id
      JOIN food_item_portions fip ON fi.id = fip.food_item_id AND ri.portion_type::portion_type = fip.portion_type
      WHERE ri.id = $1`,
      [result.rows[0].id]
    );

    return NextResponse.json(ingredientResult.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error adding ingredient to recipe:', error);
    return NextResponse.json(
      { error: "Failed to add ingredient to recipe" },
      { status: 500 }
    );
  }
}
