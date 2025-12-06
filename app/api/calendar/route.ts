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
    const targetUserId = searchParams.get("user_id") || session.user.id;
    const groupId = searchParams.get("group_id");

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // If viewing another user's calendar, verify they're in the same group
    if (targetUserId !== session.user.id) {
      if (!groupId) {
        return NextResponse.json(
          { error: "Group ID required to view other users' calendar" },
          { status: 400 }
        );
      }

      const groupCheck = await pool.query(
        `SELECT 1 FROM group_memberships gm1
         INNER JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
         WHERE gm1.user_id = $1 AND gm2.user_id = $2 AND gm1.group_id = $3`,
        [session.user.id, targetUserId, groupId]
      );

      if (groupCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "You can only view calendar of users in your group" },
          { status: 403 }
        );
      }
    }

    // Get tracking start date (from group if provided, otherwise from user)
    let trackingStartDate;
    if (groupId) {
      const groupResult = await pool.query(
        "SELECT tracking_start_date FROM challenge_groups WHERE id = $1",
        [groupId]
      );
      trackingStartDate = groupResult.rows[0]?.tracking_start_date;
    } else {
      const userResult = await pool.query(
        "SELECT tracking_start_date FROM users WHERE id = $1",
        [targetUserId]
      );
      trackingStartDate = userResult.rows[0]?.tracking_start_date;
    }

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
      [targetUserId, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
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
