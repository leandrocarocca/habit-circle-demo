import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

// GET /api/food-items/recent - Get food items recently used by the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Get food items that the user has recently added to their meals
    // Ordered by most recent usage, with distinct food items
    const result = await pool.query(
      `SELECT DISTINCT ON (fi.id)
        fi.id,
        fi.name,
        fi.brand,
        fi.category,
        fi.image_url,
        fi.protein_per_100g,
        fi.fat_per_100g,
        fi.carbs_per_100g,
        fi.sugar_per_100g,
        fi.calories_per_100g,
        fi.created_at,
        MAX(mfi.created_at) OVER (PARTITION BY fi.id) as last_used_at,
        COALESCE(
          json_agg(
            json_build_object(
              'portion_type', fip.portion_type,
              'grams', fip.grams
            )
          ) FILTER (WHERE fip.id IS NOT NULL),
          '[]'
        ) as portions
      FROM meal_food_items mfi
      JOIN meals m ON mfi.meal_id = m.id
      JOIN food_items fi ON mfi.food_item_id = fi.id
      LEFT JOIN food_item_portions fip ON fi.id = fip.food_item_id
      WHERE m.user_id = $1
      GROUP BY fi.id, fi.name, fi.brand, fi.category, fi.image_url,
               fi.protein_per_100g, fi.fat_per_100g, fi.carbs_per_100g,
               fi.sugar_per_100g, fi.calories_per_100g, fi.created_at, mfi.created_at
      ORDER BY fi.id, mfi.created_at DESC`,
      [session.user.id]
    );

    // Sort by last_used_at descending to get most recently used first
    const sortedResults = result.rows.sort((a, b) => {
      return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
    });

    // Return top 20 most recently used
    return NextResponse.json(sortedResults.slice(0, 20));
  } catch (error) {
    console.error("Error fetching recent food items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
