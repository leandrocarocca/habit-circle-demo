import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";
import { getWeekRange } from "@/lib/weekUtils";
import {
  calculateDailyCheckboxPoints,
  calculateWeeklyCheckboxPoints,
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
    const date = searchParams.get("date");
    const targetUserId = searchParams.get("user_id") || session.user.id;
    const groupId = searchParams.get("group_id");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // If viewing another user's logs, verify they're in the same group
    if (targetUserId !== session.user.id) {
      if (!groupId) {
        return NextResponse.json(
          { error: "Group ID required to view other users' logs" },
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
          { error: "You can only view logs of users in your group" },
          { status: 403 }
        );
      }
    }

    const result = await pool.query(
      "SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = $2",
      [targetUserId, date]
    );

    if (result.rows.length === 0) {
      // Return default values if no log exists for this date
      return NextResponse.json({
        log_date: date,
        checkbox_states: {},
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
    const { date, checkbox_states, is_completed } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Load checkbox definitions
    const checkboxDefsResult = await pool.query(
      `SELECT id, name, label, points, type, weekly_threshold, display_order, is_active
       FROM checkbox_definitions
       WHERE is_active = true`
    );
    const checkboxDefinitions: CheckboxDefinition[] = checkboxDefsResult.rows;

    console.log('=== Dynamic Points Calculation ===');
    console.log('Date:', date);
    console.log('Checkbox states:', checkbox_states);

    // Upsert the daily log with checkbox_states
    await pool.query(
      `INSERT INTO daily_logs (user_id, log_date, checkbox_states, is_completed, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET
         checkbox_states = $3,
         is_completed = $4,
         updated_at = CURRENT_TIMESTAMP`,
      [session.user.id, date, JSON.stringify(checkbox_states || {}), is_completed ?? false]
    );

    // Calculate the week range
    const { weekStart, weekEnd } = getWeekRange(date);

    console.log('Week start:', weekStart.toISOString().split('T')[0]);
    console.log('Week end:', weekEnd.toISOString().split('T')[0]);

    // Get all logs for this week
    const weekLogsResult = await pool.query(
      `SELECT user_id, log_date, checkbox_states, is_completed
       FROM daily_logs
       WHERE user_id = $1
       AND log_date >= $2
       AND log_date <= $3`,
      [session.user.id, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]
    );

    const weekLogs: DailyLog[] = weekLogsResult.rows.map((row) => ({
      ...row,
      log_date: row.log_date,
    }));

    // Calculate daily points for the current log
    const dailyPoints = calculateDailyCheckboxPoints(
      checkbox_states || {},
      checkboxDefinitions
    );

    // Calculate weekly points for this week
    const weeklyPointsMap = calculateWeeklyCheckboxPoints(
      weekLogs,
      checkboxDefinitions,
      weekStart,
      weekEnd
    );
    const weeklyPoints = Object.values(weeklyPointsMap).reduce((sum, pts) => sum + pts, 0);

    console.log('Daily points:', dailyPoints);
    console.log('Weekly points breakdown:', weeklyPointsMap);
    console.log('Total weekly points:', weeklyPoints);

    // Fetch and return the updated log
    const updatedResult = await pool.query(
      "SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = $2",
      [session.user.id, date]
    );

    // Add calculated points to the response (not stored in DB)
    const response = {
      ...updatedResult.rows[0],
      calculated_points: {
        daily: dailyPoints,
        weekly: weeklyPoints,
        total: dailyPoints + weeklyPoints,
      },
    };

    console.log('Response:', response);
    console.log('========================\n');

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error saving log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
