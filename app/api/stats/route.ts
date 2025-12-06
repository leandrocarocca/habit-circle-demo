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

    // Get total points
    const totalResult = await pool.query(
      "SELECT COALESCE(SUM(points), 0) as total_points FROM daily_logs WHERE user_id = $1",
      [session.user.id]
    );

    // Get current week's points (Sunday to Saturday)
    const currentWeekResult = await pool.query(
      `SELECT COALESCE(SUM(points), 0) as week_points
       FROM daily_logs
       WHERE user_id = $1
       AND log_date >= date_trunc('week', CURRENT_DATE)
       AND log_date < date_trunc('week', CURRENT_DATE) + interval '7 days'`,
      [session.user.id]
    );

    // Get current month's points
    const currentMonthResult = await pool.query(
      `SELECT COALESCE(SUM(points), 0) as month_points
       FROM daily_logs
       WHERE user_id = $1
       AND log_date >= date_trunc('month', CURRENT_DATE)
       AND log_date < date_trunc('month', CURRENT_DATE) + interval '1 month'`,
      [session.user.id]
    );

    // Get total days logged
    const daysLoggedResult = await pool.query(
      "SELECT COUNT(*) as days_logged FROM daily_logs WHERE user_id = $1",
      [session.user.id]
    );

    // Get current streak
    const streakResult = await pool.query(
      `WITH RECURSIVE date_series AS (
        SELECT CURRENT_DATE as check_date, 0 as streak
        UNION ALL
        SELECT check_date - 1, streak + 1
        FROM date_series
        WHERE EXISTS (
          SELECT 1 FROM daily_logs
          WHERE user_id = $1
          AND log_date = check_date - 1
          AND is_completed = true
        )
        AND streak < 365
      )
      SELECT MAX(streak) as current_streak FROM date_series`,
      [session.user.id]
    );

    return NextResponse.json({
      total_points: parseInt(totalResult.rows[0].total_points),
      week_points: parseInt(currentWeekResult.rows[0].week_points),
      month_points: parseInt(currentMonthResult.rows[0].month_points),
      days_logged: parseInt(daysLoggedResult.rows[0].days_logged),
      current_streak: parseInt(streakResult.rows[0].current_streak || 0),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
