import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// POST /api/meals/[id]/from-template - Add all items from a template to an existing meal
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
    const { template_id } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: "Missing required field: template_id" },
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

    // Get the template with its items
    const templateResult = await pool.query(
      `SELECT
        mt.id,
        COALESCE(
          json_agg(
            json_build_object(
              'food_item_id', mti.food_item_id,
              'portion_type', mti.portion_type,
              'portion_count', mti.portion_count
            )
          ) FILTER (WHERE mti.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM meal_templates mt
      LEFT JOIN meal_template_items mti ON mt.id = mti.template_id
      WHERE mt.id = $1 AND mt.user_id = $2
      GROUP BY mt.id`,
      [template_id, session.user.id]
    );

    if (templateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Meal template not found" },
        { status: 404 }
      );
    }

    const template = templateResult.rows[0];
    const items = template.items;

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Template has no food items" },
        { status: 400 }
      );
    }

    // Add all template items to the meal
    for (const item of items) {
      await pool.query(
        `INSERT INTO meal_food_items (meal_id, food_item_id, portion_type, portion_count)
         VALUES ($1, $2, $3::portion_type, $4)`,
        [mealId, item.food_item_id, item.portion_type, item.portion_count]
      );
    }

    return NextResponse.json({ success: true, items_added: items.length }, { status: 200 });
  } catch (error) {
    console.error('Error adding template items to meal:', error);
    return NextResponse.json(
      { error: "Failed to add template items to meal" },
      { status: 500 }
    );
  }
}
