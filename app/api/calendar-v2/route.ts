import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";
import {
  calculateTotalPoints,
  CheckboxDefinition,
  DailyLog,
} from "@/lib/pointsCalculation";

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

    // Load checkbox definitions
    const checkboxDefsResult = await pool.query(
      `SELECT id, name, label, points, type, weekly_threshold, display_order, is_active
       FROM checkbox_definitions
       WHERE is_active = true`
    );
    const checkboxDefinitions: CheckboxDefinition[] = checkboxDefsResult.rows;

    // Get first and last day of the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Fetch all logs for this user (to calculate weekly points correctly)
    const allLogsResult = await pool.query(
      `SELECT user_id, log_date, checkbox_states, is_completed
       FROM daily_logs
       WHERE user_id = $1
       ORDER BY log_date`,
      [targetUserId]
    );
    const allLogs: DailyLog[] = allLogsResult.rows;

    // Calculate points dynamically using our tested logic
    const startDate = trackingStartDate ? new Date(trackingStartDate) : undefined;
    const pointsCalc = calculateTotalPoints(allLogs, checkboxDefinitions, startDate);

    // Now filter logs for the current month and calculate points for each day
    const monthLogsResult = await pool.query(
      `SELECT log_date, checkbox_states, is_completed
       FROM daily_logs
       WHERE user_id = $1
       AND log_date >= $2
       AND log_date <= $3
       ORDER BY log_date`,
      [targetUserId, firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
    );

    // Create a map of logs by date with calculated points
    const logsMap = new Map();

    for (const row of monthLogsResult.rows) {
      const dateStr = row.log_date.toISOString ? row.log_date.toISOString().split('T')[0] : row.log_date;

      // Calculate points for this specific day
      // For simplicity in calendar view, show daily points only
      // (weekly points are distributed across the week, hard to show per day)
      const dayLogs = allLogs.filter(l => l.log_date === dateStr);
      if (dayLogs.length > 0) {
        const dayLog = dayLogs[0];

        // Calculate daily points
        const dailyPoints = checkboxDefinitions
          .filter(def => def.type === 'daily' && def.is_active)
          .reduce((total, def) => {
            return total + (dayLog.checkbox_states[def.name] ? def.points : 0);
          }, 0);

        logsMap.set(dateStr, {
          points: dailyPoints, // Show daily points in calendar for simplicity
          is_completed: row.is_completed,
        });
      }
    }

    return NextResponse.json({
      tracking_start_date: trackingStartDate,
      logs: Object.fromEntries(logsMap),
      total_points: pointsCalc.totalPoints, // Total points across all time
    });
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
