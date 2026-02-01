import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// POST /api/meals/from-template - Create a meal from a template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { template_id, date } = body;

    if (!template_id || !date) {
      return NextResponse.json(
        { error: "Missing required fields: template_id, date" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Get the template with its items
    const templateResult = await pool.query(
      `SELECT
        mt.id,
        mt.name,
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
      GROUP BY mt.id, mt.name`,
      [template_id, session.user.id]
    );

    if (templateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Meal template not found" },
        { status: 404 }
      );
    }

    const template = templateResult.rows[0];

    // Create the meal with the template name
    const mealResult = await pool.query(
      `INSERT INTO meals (user_id, date, name)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, date, name, created_at, updated_at`,
      [session.user.id, date, template.name]
    );

    const meal = mealResult.rows[0];

    // Add all template items to the meal
    const items = template.items;
    for (const item of items) {
      await pool.query(
        `INSERT INTO meal_food_items (meal_id, food_item_id, portion_type, portion_count)
         VALUES ($1, $2, $3::portion_type, $4)`,
        [meal.id, item.food_item_id, item.portion_type, item.portion_count]
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
    console.error('Error creating meal from template:', error);
    return NextResponse.json(
      { error: "Failed to create meal from template" },
      { status: 500 }
    );
  }
}
