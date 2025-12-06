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
    const year = parseInt(searchParams.get("year") || "");
    const month = parseInt(searchParams.get("month") || "");

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Get user's tracking start date
    const userResult = await pool.query(
      "SELECT tracking_start_date FROM users WHERE id = $1",
      [session.user.id]
    );
    const trackingStartDate = userResult.rows[0]?.tracking_start_date;

    // Get first and last day of the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Fetch all logs for this month
    const logsResult = await pool.query(
      `SELECT log_date, points, is_completed
       FROM daily_logs
       WHERE user_id = $1
       AND log_date >= $2
       AND log_date <= $3
       ORDER BY log_date`,
      [session.user.id, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
    );

    // Create a map of logs by date
    const logsMap = new Map();
    logsResult.rows.forEach(row => {
      logsMap.set(row.log_date.toISOString().split('T')[0], {
        points: row.points,
        is_completed: row.is_completed,
      });
    });

    return NextResponse.json({
      tracking_start_date: trackingStartDate,
      logs: Object.fromEntries(logsMap),
    });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
