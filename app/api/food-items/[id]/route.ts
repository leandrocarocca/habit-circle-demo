import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

export async function GET(
  request: Request,
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
        fi.id, fi.name, fi.brand, fi.category, fi.protein_per_100g,
        fi.fat_per_100g, fi.carbs_per_100g, fi.sugar_per_100g, fi.calories_per_100g,
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
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Food item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching food item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      brand,
      category,
      protein_per_100g,
      fat_per_100g,
      carbs_per_100g,
      sugar_per_100g,
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

    const updateResult = await pool.query(
      `UPDATE food_items
       SET name = $1, brand = $2, category = $3, protein_per_100g = $4,
           fat_per_100g = $5, carbs_per_100g = $6, sugar_per_100g = $7, calories_per_100g = $8
       WHERE id = $9
       RETURNING id`,
      [
        name,
        brand || null,
        category,
        protein_per_100g || 0,
        fat_per_100g || 0,
        carbs_per_100g || 0,
        sugar_per_100g || 0,
        calories_per_100g || 0,
        id
      ]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Food item not found" },
        { status: 404 }
      );
    }

    await pool.query(
      `DELETE FROM food_item_portions WHERE food_item_id = $1`,
      [id]
    );

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
          [id, portion.portion_type, portion.grams]
        );
      }
    }

    const result = await pool.query(
      `SELECT
        fi.id, fi.name, fi.brand, fi.category, fi.protein_per_100g,
        fi.fat_per_100g, fi.carbs_per_100g, fi.sugar_per_100g, fi.calories_per_100g,
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
      [id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating food item:", error);

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

export async function DELETE(
  request: Request,
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
      `DELETE FROM food_items WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Food item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting food item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
