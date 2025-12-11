import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// DELETE /api/meals/[mealId]/food-items/[foodItemId] - Remove a food item from a meal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string; foodItemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mealId, foodItemId } = await params;
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
