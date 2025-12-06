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
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
    const result = await pool.query(
      "SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = $2",
      [session.user.id, date]
    );

    if (result.rows.length === 0) {
      // Return default values if no log exists for this date
      return NextResponse.json({
        log_date: date,
        logged_food: false,
        within_calorie_limit: false,
        protein_goal_met: false,
        no_cheat_foods: false,
        is_completed: false,
      });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching log:", error);
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
      date,
      logged_food,
      within_calorie_limit,
      protein_goal_met,
      no_cheat_foods,
      is_completed,
    } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Upsert (insert or update) the daily log
    const result = await pool.query(
      `INSERT INTO daily_logs (user_id, log_date, logged_food, within_calorie_limit, protein_goal_met, no_cheat_foods, is_completed, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET
         logged_food = $3,
         within_calorie_limit = $4,
         protein_goal_met = $5,
         no_cheat_foods = $6,
         is_completed = $7,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        session.user.id,
        date,
        logged_food ?? false,
        within_calorie_limit ?? false,
        protein_goal_met ?? false,
        no_cheat_foods ?? false,
        is_completed ?? false,
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error saving log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
