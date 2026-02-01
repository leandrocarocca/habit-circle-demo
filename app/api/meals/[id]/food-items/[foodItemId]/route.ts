import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

const VALID_PORTION_TYPES = [
  'per_slice',
  'per_portion',
  'per_dl',
  'per_cup',
  'per_tablespoon',
  'per_teaspoon',
  'per_piece',
  'per_1g',
  'per_100g'
];

// PUT /api/meals/[id]/food-items/[foodItemId] - Update a food item in a meal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; foodItemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: mealId, foodItemId } = await params;
    const body = await request.json();
    const { portion_type, portion_count } = body;

    if (!portion_type || !portion_count) {
      return NextResponse.json(
        { error: "Missing required fields: portion_type, portion_count" },
        { status: 400 }
      );
    }

    if (!VALID_PORTION_TYPES.includes(portion_type)) {
      return NextResponse.json(
        { error: "Invalid portion_type" },
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

    // Get the food item to verify it exists and get the food_item_id
    const foodItemCheck = await pool.query(
      'SELECT food_item_id FROM meal_food_items WHERE id = $1 AND meal_id = $2',
      [foodItemId, mealId]
    );

    if (foodItemCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Food item not found in meal" },
        { status: 404 }
      );
    }

    const food_item_id = foodItemCheck.rows[0].food_item_id;

    // Verify the food item has the specified portion type
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

    // Update the meal food item
    await pool.query(
      `UPDATE meal_food_items
       SET portion_type = $1, portion_count = $2
       WHERE id = $3 AND meal_id = $4`,
      [portion_type, portion_count, foodItemId, mealId]
    );

    // Fetch the updated food item details
    const result = await pool.query(
      `SELECT
        mfi.id,
        mfi.food_item_id,
        fi.name as food_item_name,
        fi.brand as food_item_brand,
        fi.category as food_item_category,
        mfi.portion_type,
        mfi.portion_count,
        fip.grams as portion_grams,
        fi.protein_per_100g,
        fi.fat_per_100g,
        fi.carbs_per_100g,
        fi.sugar_per_100g,
        fi.calories_per_100g
      FROM meal_food_items mfi
      JOIN food_items fi ON mfi.food_item_id = fi.id
      JOIN food_item_portions fip ON fi.id = fip.food_item_id AND mfi.portion_type = fip.portion_type
      WHERE mfi.id = $1`,
      [foodItemId]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating food item in meal:', error);
    return NextResponse.json(
      { error: "Failed to update food item in meal" },
      { status: 500 }
    );
  }
}

// DELETE /api/meals/[id]/food-items/[foodItemId] - Remove a food item from a meal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; foodItemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: mealId, foodItemId } = await params;
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Verify the meal belongs to the user before deleting
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

    // Delete the meal food item
    const result = await pool.query(
      'DELETE FROM meal_food_items WHERE id = $1 AND meal_id = $2 RETURNING id',
      [foodItemId, mealId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Food item not found in meal" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing food item from meal:', error);
    return NextResponse.json(
      { error: "Failed to remove food item from meal" },
      { status: 500 }
    );
  }
}
