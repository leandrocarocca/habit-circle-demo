import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// GET /api/meal-templates - Get all meal templates for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const result = await pool.query(
      `SELECT
        mt.id,
        mt.user_id,
        mt.name,
        mt.created_at,
        mt.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', mti.id,
              'food_item_id', mti.food_item_id,
              'food_item_name', fi.name,
              'food_item_brand', fi.brand,
              'food_item_category', fi.category,
              'portion_type', mti.portion_type,
              'portion_count', mti.portion_count,
              'portion_grams', fip.grams,
              'protein_per_100g', fi.protein_per_100g,
              'fat_per_100g', fi.fat_per_100g,
              'carbs_per_100g', fi.carbs_per_100g,
              'sugar_per_100g', fi.sugar_per_100g,
              'calories_per_100g', fi.calories_per_100g
            ) ORDER BY mti.created_at
          ) FILTER (WHERE mti.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM meal_templates mt
      LEFT JOIN meal_template_items mti ON mt.id = mti.template_id
      LEFT JOIN food_items fi ON mti.food_item_id = fi.id
      LEFT JOIN food_item_portions fip ON fi.id = fip.food_item_id AND mti.portion_type = fip.portion_type
      WHERE mt.user_id = $1
      GROUP BY mt.id, mt.user_id, mt.name, mt.created_at, mt.updated_at
      ORDER BY mt.name`,
      [session.user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching meal templates:', error);
    return NextResponse.json(
      { error: "Failed to fetch meal templates" },
      { status: 500 }
    );
  }
}

// POST /api/meal-templates - Create a new meal template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const result = await pool.query(
      `INSERT INTO meal_templates (user_id, name)
       VALUES ($1, $2)
       RETURNING id, user_id, name, created_at, updated_at`,
      [session.user.id, name]
    );

    const template = result.rows[0];

    return NextResponse.json({
      ...template,
      items: []
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating meal template:', error);
    return NextResponse.json(
      { error: "Failed to create meal template" },
      { status: 500 }
    );
  }
}
