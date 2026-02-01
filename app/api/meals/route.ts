import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// GET /api/meals - Get meals for a specific date
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const targetUserId = searchParams.get('user_id') || session.user.id;
    const groupId = searchParams.get('group_id');

    if (!date) {
      return NextResponse.json(
        { error: "Missing required parameter: date" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // If viewing another user's meals, verify they're in the same group
    if (targetUserId !== session.user.id) {
      if (!groupId) {
        return NextResponse.json(
          { error: "Group ID required to view other users' meals" },
          { status: 400 }
        );
      }

      const groupCheck = await pool.query(
        `SELECT 1 FROM group_memberships gm1
         INNER JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
         WHERE gm1.user_id = $1 AND gm2.user_id = $2 AND gm1.group_id = $3`,
        [session.user.id, targetUserId, groupId]
      );

      if (groupCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "You can only view meals of users in your group" },
          { status: 403 }
        );
      }
    }

    const result = await pool.query(
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
      WHERE m.user_id = $1 AND m.date = $2
      GROUP BY m.id, m.user_id, m.date, m.name, m.created_at, m.updated_at
      ORDER BY m.created_at`,
      [targetUserId, date]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json(
      { error: "Failed to fetch meals" },
      { status: 500 }
    );
  }
}

// POST /api/meals - Create a new meal
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, name } = body;

    if (!date || !name) {
      return NextResponse.json(
        { error: "Missing required fields: date and name" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const result = await pool.query(
      `INSERT INTO meals (user_id, date, name)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, date, name, created_at, updated_at`,
      [session.user.id, date, name]
    );

    const meal = result.rows[0];

    // Return the meal with an empty food_items array
    return NextResponse.json({
      ...meal,
      food_items: []
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json(
      { error: "Failed to create meal" },
      { status: 500 }
    );
  }
}
