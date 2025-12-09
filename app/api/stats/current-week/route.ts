import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";
import { getWeekRange, formatDateLocal } from "@/lib/weekUtils";
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
    const targetUserId = searchParams.get("user_id") || session.user.id;
    const groupId = searchParams.get("group_id");

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // If viewing another user's stats, verify they're in the same group
    if (targetUserId !== session.user.id) {
      if (!groupId) {
        return NextResponse.json(
          { error: "Group ID required to view other users' stats" },
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
          { error: "You can only view stats of users in your group" },
          { status: 403 }
        );
      }
    }

    // Load checkbox definitions
    const checkboxDefsResult = await pool.query(
      `SELECT id, name, label, points, type, weekly_threshold, display_order, is_active
       FROM checkbox_definitions
       WHERE is_active = true
       ORDER BY display_order ASC`
    );
    const checkboxDefinitions: CheckboxDefinition[] = checkboxDefsResult.rows;

    // Get current week range
    const today = new Date();
    const { weekStart, weekEnd } = getWeekRange(today.toISOString().split('T')[0]);

    // Get logs for this week
    const logsResult = await pool.query(
      `SELECT user_id, log_date, checkbox_states, is_completed
       FROM daily_logs
       WHERE user_id = $1
       AND log_date >= $2
       AND log_date <= $3
       ORDER BY log_date ASC`,
      [targetUserId, formatDateLocal(weekStart), formatDateLocal(weekEnd)]
    );

    const weekLogs: DailyLog[] = logsResult.rows;

    // Calculate daily points for this week
    let totalDailyPoints = 0;
    weekLogs.forEach((log) => {
      if (log.is_completed) {
        totalDailyPoints += calculateDailyCheckboxPoints(
          log.checkbox_states,
          checkboxDefinitions
        );
      }
    });

    // Calculate weekly points for this week
    const weeklyPointsMap = calculateWeeklyCheckboxPoints(
      weekLogs,
      checkboxDefinitions,
      weekStart,
      weekEnd
    );
    const totalWeeklyPoints = Object.values(weeklyPointsMap).reduce(
      (sum, pts) => sum + pts,
      0
    );

    // Calculate checkbox completion stats for this week
    const checkboxStats: Record<string, any> = {};

    for (const def of checkboxDefinitions) {
      const completedCount = weekLogs.filter(
        (log) => log.checkbox_states[def.name] === true && log.is_completed
      ).length;

      checkboxStats[def.name] = {
        name: def.name,
        label: def.label,
        type: def.type,
        points: def.points,
        weekly_threshold: def.weekly_threshold,
        completed_count: completedCount,
        total_days: 7,
        is_complete: def.type === 'weekly'
          ? completedCount >= (def.weekly_threshold || 0)
          : completedCount === 7,
      };
    }

    // Create a map of daily logs by date
    const dailyLogsMap: Record<string, DailyLog | null> = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = formatDateLocal(date);
      const log = weekLogs.find(l => l.log_date === dateStr);
      dailyLogsMap[days[i]] = log || null;
    }

    return NextResponse.json({
      week_start: formatDateLocal(weekStart),
      week_end: formatDateLocal(weekEnd),
      total_points: totalDailyPoints + totalWeeklyPoints,
      daily_points: totalDailyPoints,
      weekly_points: totalWeeklyPoints,
      checkbox_stats: checkboxStats,
      days_logged: weekLogs.filter(log => log.is_completed).length,
      total_days: 7,
      daily_logs: dailyLogsMap,
    });
  } catch (error) {
    console.error("Error fetching current week stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
