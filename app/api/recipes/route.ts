import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// GET /api/recipes - Get all recipes for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const result = await pool.query(
      `SELECT
        r.id,
        r.user_id,
        r.name,
        r.portions_yield,
        r.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ri.id,
              'food_item_id', ri.food_item_id,
              'food_item_name', fi.name,
              'food_item_brand', fi.brand,
              'food_item_category', fi.category,
              'portion_type', ri.portion_type,
              'portion_count', ri.portion_count,
              'portion_grams', fip.grams,
              'protein_per_100g', fi.protein_per_100g,
              'fat_per_100g', fi.fat_per_100g,
              'carbs_per_100g', fi.carbs_per_100g,
              'sugar_per_100g', fi.sugar_per_100g,
              'calories_per_100g', fi.calories_per_100g
            ) ORDER BY ri.created_at
          ) FILTER (WHERE ri.id IS NOT NULL),
          '[]'::json
        ) as ingredients
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      LEFT JOIN food_items fi ON ri.food_item_id = fi.id
      LEFT JOIN food_item_portions fip ON fi.id = fip.food_item_id AND ri.portion_type::portion_type = fip.portion_type
      WHERE r.user_id = $1
      GROUP BY r.id, r.user_id, r.name, r.portions_yield, r.created_at
      ORDER BY r.name`,
      [session.user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, portions_yield } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    if (!portions_yield || portions_yield < 1) {
      return NextResponse.json(
        { error: "portions_yield must be at least 1" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const result = await pool.query(
      `INSERT INTO recipes (user_id, name, portions_yield)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, name, portions_yield, created_at`,
      [session.user.id, name, portions_yield]
    );

    const recipe = result.rows[0];

    return NextResponse.json({
      ...recipe,
      ingredients: []
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
