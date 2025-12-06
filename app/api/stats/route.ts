import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Get user's tracking start date
    const userResult = await pool.query(
      "SELECT tracking_start_date FROM users WHERE id = $1",
      [session.user.id]
    );
    const trackingStartDate = userResult.rows[0]?.tracking_start_date;

    // Get total points (only after start date and only from completed days)
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(points), 0) as total_points
       FROM daily_logs
       WHERE user_id = $1
       AND is_completed = true
       AND ($2::date IS NULL OR log_date >= $2)`,
      [session.user.id, trackingStartDate]
    );

    // Days logged food - total count and current streak
    const loggedFoodTotal = await pool.query(
      `SELECT COUNT(*) as total
       FROM daily_logs
       WHERE user_id = $1
       AND logged_food = true
       AND ($2::date IS NULL OR log_date >= $2)`,
      [session.user.id, trackingStartDate]
    );

    const loggedFoodStreak = await pool.query(
      `WITH RECURSIVE date_series AS (
        SELECT
          CURRENT_DATE as check_date,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM daily_logs
              WHERE user_id = $1
              AND log_date = CURRENT_DATE
              AND logged_food = true
              AND is_completed = true
            ) THEN 1
            ELSE 0
          END as streak
        UNION ALL
        SELECT
          check_date - 1,
          streak + 1
        FROM date_series
        WHERE EXISTS (
          SELECT 1 FROM daily_logs
          WHERE user_id = $1
          AND log_date = check_date - 1
          AND logged_food = true
          AND is_completed = true
        )
        AND streak > 0
        AND streak < 1000
        AND ($2::date IS NULL OR check_date - 1 >= $2)
      )
      SELECT MAX(streak) as current_streak FROM date_series`,
      [session.user.id, trackingStartDate]
    );

    // Days under calorie limit - total count and current streak
    const calorieTotal = await pool.query(
      `SELECT COUNT(*) as total
       FROM daily_logs
       WHERE user_id = $1
       AND within_calorie_limit = true
       AND ($2::date IS NULL OR log_date >= $2)`,
      [session.user.id, trackingStartDate]
    );

    const calorieStreak = await pool.query(
      `WITH RECURSIVE date_series AS (
        SELECT
          CURRENT_DATE as check_date,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM daily_logs
              WHERE user_id = $1
              AND log_date = CURRENT_DATE
              AND within_calorie_limit = true
              AND is_completed = true
            ) THEN 1
            ELSE 0
          END as streak
        UNION ALL
        SELECT
          check_date - 1,
          streak + 1
        FROM date_series
        WHERE EXISTS (
          SELECT 1 FROM daily_logs
          WHERE user_id = $1
          AND log_date = check_date - 1
          AND within_calorie_limit = true
          AND is_completed = true
        )
        AND streak > 0
        AND streak < 1000
        AND ($2::date IS NULL OR check_date - 1 >= $2)
      )
      SELECT MAX(streak) as current_streak FROM date_series`,
      [session.user.id, trackingStartDate]
    );

    // Days reached protein goal - total count and current streak
    const proteinTotal = await pool.query(
      `SELECT COUNT(*) as total
       FROM daily_logs
       WHERE user_id = $1
       AND protein_goal_met = true
       AND ($2::date IS NULL OR log_date >= $2)`,
      [session.user.id, trackingStartDate]
    );

    const proteinStreak = await pool.query(
      `WITH RECURSIVE date_series AS (
        SELECT
          CURRENT_DATE as check_date,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM daily_logs
              WHERE user_id = $1
              AND log_date = CURRENT_DATE
              AND protein_goal_met = true
              AND is_completed = true
            ) THEN 1
            ELSE 0
          END as streak
        UNION ALL
        SELECT
          check_date - 1,
          streak + 1
        FROM date_series
        WHERE EXISTS (
          SELECT 1 FROM daily_logs
          WHERE user_id = $1
          AND log_date = check_date - 1
          AND protein_goal_met = true
          AND is_completed = true
        )
        AND streak > 0
        AND streak < 1000
        AND ($2::date IS NULL OR check_date - 1 >= $2)
      )
      SELECT MAX(streak) as current_streak FROM date_series`,
      [session.user.id, trackingStartDate]
    );

    // Days not cheating - total count
    const noCheatTotal = await pool.query(
      `SELECT COUNT(*) as total
       FROM daily_logs
       WHERE user_id = $1
       AND no_cheat_foods = true
       AND ($2::date IS NULL OR log_date >= $2)`,
      [session.user.id, trackingStartDate]
    );

    return NextResponse.json({
      total_points: parseInt(totalResult.rows[0].total_points),
      tracking_start_date: trackingStartDate,
      logged_food: {
        total: parseInt(loggedFoodTotal.rows[0].total),
        current_streak: parseInt(loggedFoodStreak.rows[0].current_streak || 0),
      },
      calorie_limit: {
        total: parseInt(calorieTotal.rows[0].total),
        current_streak: parseInt(calorieStreak.rows[0].current_streak || 0),
      },
      protein_goal: {
        total: parseInt(proteinTotal.rows[0].total),
        current_streak: parseInt(proteinStreak.rows[0].current_streak || 0),
      },
      no_cheat: {
        total: parseInt(noCheatTotal.rows[0].total),
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
