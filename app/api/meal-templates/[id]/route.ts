import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// GET /api/meal-templates/[id] - Get a specific meal template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const result = await pool.query(
      `SELECT
        mt.id,
        mt.user_id,
        mt.name,
        mt.created_at,
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
      LEFT JOIN food_item_portions fip ON fi.id = fip.food_item_id AND mti.portion_type::portion_type = fip.portion_type
      WHERE mt.id = $1 AND mt.user_id = $2
      GROUP BY mt.id, mt.user_id, mt.name, mt.created_at`,
      [id, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Meal template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching meal template:', error);
    return NextResponse.json(
      { error: "Failed to fetch meal template" },
      { status: 500 }
    );
  }
}

// PUT /api/meal-templates/[id] - Update a meal template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT id FROM meal_templates WHERE id = $1 AND user_id = $2',
      [id, session.user.id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Meal template not found" },
        { status: 404 }
      );
    }

    const result = await pool.query(
      `UPDATE meal_templates
       SET name = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, name, created_at`,
      [name, id, session.user.id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meal template:', error);
    return NextResponse.json(
      { error: "Failed to update meal template" },
      { status: 500 }
    );
  }
}

// DELETE /api/meal-templates/[id] - Delete a meal template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT id FROM meal_templates WHERE id = $1 AND user_id = $2',
      [id, session.user.id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Meal template not found" },
        { status: 404 }
      );
    }

    // Delete template items first (cascade should handle this, but being explicit)
    await pool.query(
      'DELETE FROM meal_template_items WHERE template_id = $1',
      [id]
    );

    // Delete the template
    await pool.query(
      'DELETE FROM meal_templates WHERE id = $1 AND user_id = $2',
      [id, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal template:', error);
    return NextResponse.json(
      { error: "Failed to delete meal template" },
      { status: 500 }
    );
  }
}
