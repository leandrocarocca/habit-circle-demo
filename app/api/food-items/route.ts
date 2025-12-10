import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    let query = `
      SELECT
        fi.id,
        fi.name,
        fi.brand,
        fi.category,
        fi.protein_per_100g,
        fi.fat_per_100g,
        fi.carbs_per_100g,
        fi.calories_per_100g,
        fi.created_at,
        fi.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', fip.id,
              'portion_type', fip.portion_type,
              'grams', fip.grams
            )
          ) FILTER (WHERE fip.id IS NOT NULL),
          '[]'
        ) as portions
      FROM food_items fi
      LEFT JOIN food_item_portions fip ON fi.id = fip.food_item_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    if (search) {
      conditions.push(`fi.name ILIKE $${paramCounter}`);
      params.push(`%${search}%`);
      paramCounter++;
    }

    if (category) {
      conditions.push(`fi.category = $${paramCounter}`);
      params.push(category);
      paramCounter++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY fi.id ORDER BY fi.name ASC`;

    const result = await pool.query(query, params);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching food items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      brand,
      category,
      protein_per_100g,
      fat_per_100g,
      carbs_per_100g,
      calories_per_100g,
      portions = []
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: "Missing required fields: name and category" },
        { status: 400 }
      );
    }

    const validCategories = [
      'meat', 'chicken', 'vegetables', 'fruits', 'toppings_on_bread',
      'cheese', 'frozen_food', 'bread', 'pantry', 'carbs',
      'cooking_fat', 'dairy', 'other'
    ];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const foodItemResult = await pool.query(
      `INSERT INTO food_items (
        name, brand, category, protein_per_100g, fat_per_100g,
        carbs_per_100g, calories_per_100g
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, brand, category, protein_per_100g, fat_per_100g,
                carbs_per_100g, calories_per_100g, created_at, updated_at`,
      [
        name,
        brand || null,
        category,
        protein_per_100g || 0,
        fat_per_100g || 0,
        carbs_per_100g || 0,
        calories_per_100g || 0
      ]
    );

    const foodItem = foodItemResult.rows[0];

    if (portions && portions.length > 0) {
      const validPortionTypes = [
        'per_slice', 'per_portion', 'per_dl', 'per_cup',
        'per_tablespoon', 'per_teaspoon', 'per_piece'
      ];

      for (const portion of portions) {
        if (!validPortionTypes.includes(portion.portion_type)) {
          continue;
        }

        await pool.query(
          `INSERT INTO food_item_portions (food_item_id, portion_type, grams)
           VALUES ($1, $2, $3)`,
          [foodItem.id, portion.portion_type, portion.grams]
        );
      }
    }

    const result = await pool.query(
      `SELECT
        fi.id, fi.name, fi.brand, fi.category, fi.protein_per_100g,
        fi.fat_per_100g, fi.carbs_per_100g, fi.calories_per_100g,
        fi.created_at, fi.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', fip.id,
              'portion_type', fip.portion_type,
              'grams', fip.grams
            )
          ) FILTER (WHERE fip.id IS NOT NULL),
          '[]'
        ) as portions
      FROM food_items fi
      LEFT JOIN food_item_portions fip ON fi.id = fip.food_item_id
      WHERE fi.id = $1
      GROUP BY fi.id`,
      [foodItem.id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating food item:", error);

    if (error.code === '23505') {
      return NextResponse.json(
        { error: "A food item with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
