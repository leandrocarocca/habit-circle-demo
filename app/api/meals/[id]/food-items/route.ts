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
  'per_piece'
];

// POST /api/meals/[id]/food-items - Add a food item to a meal
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
    const { food_item_id, portion_type, portion_count } = body;

    if (!food_item_id || !portion_type || !portion_count) {
      return NextResponse.json(
        { error: "Missing required fields: food_item_id, portion_type, portion_count" },
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

    // Add the food item to the meal
    const result = await pool.query(
      `INSERT INTO meal_food_items (meal_id, food_item_id, portion_type, portion_count)
       VALUES ($1, $2, $3, $4)
       RETURNING id, meal_id, food_item_id, portion_type, portion_count, created_at`,
      [mealId, food_item_id, portion_type, portion_count]
    );

    const mealFoodItem = result.rows[0];

    // Fetch the complete food item details
    const foodItemResult = await pool.query(
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
      [mealFoodItem.id]
    );

    return NextResponse.json(foodItemResult.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error adding food item to meal:', error);
    return NextResponse.json(
      { error: "Failed to add food item to meal" },
      { status: 500 }
    );
  }
}
