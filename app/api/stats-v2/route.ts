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

    // Get tracking start date
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
       WHERE is_active = true
       ORDER BY display_order ASC`
    );
    const checkboxDefinitions: CheckboxDefinition[] = checkboxDefsResult.rows;

    // Get all daily logs for the user
    const logsResult = await pool.query(
      `SELECT user_id, log_date, checkbox_states, is_completed
       FROM daily_logs
       WHERE user_id = $1
       AND ($2::date IS NULL OR log_date >= $2)
       ORDER BY log_date ASC`,
      [targetUserId, trackingStartDate]
    );

    const logs: DailyLog[] = logsResult.rows;

    // Calculate total points dynamically
    const startDate = trackingStartDate ? new Date(trackingStartDate) : undefined;
    const pointsCalculation = calculateTotalPoints(logs, checkboxDefinitions, startDate);

    // Calculate individual checkbox stats (total days checked and current streaks)
    const checkboxStats: Record<string, any> = {};

    for (const def of checkboxDefinitions) {
      if (def.type === 'daily') {
        // Total days this checkbox was checked
        const total = logs.filter(
          (log) => log.checkbox_states[def.name] === true && log.is_completed
        ).length;

        // Current streak
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 1000; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const checkDateStr = checkDate.toISOString().split('T')[0];

          const log = logs.find(
            (l) => l.log_date === checkDateStr && l.is_completed
          );

          if (log && log.checkbox_states[def.name] === true) {
            currentStreak++;
          } else if (i === 0 && !log) {
            // Today not logged yet, check yesterday
            continue;
          } else {
            break;
          }
        }

        checkboxStats[def.name] = {
          total,
          current_streak: currentStreak,
        };
      } else if (def.type === 'weekly') {
        // For weekly checkboxes, count weeks where threshold was met
        const weeksEarned = pointsCalculation.weeklyBreakdown[def.name] || 0;

        // Also count total sessions
        const totalSessions = logs.filter(
          (log) => log.checkbox_states[def.name] === true && log.is_completed
        ).length;

        checkboxStats[def.name] = {
          weeks_earned: weeksEarned,
          total_sessions: totalSessions,
        };
      }
    }

    // Calculate "days cheated" (for backward compatibility)
    const cheatDaysDef = checkboxDefinitions.find(def => def.name === 'no_cheat_foods');
    const cheatDays = cheatDaysDef
      ? logs.filter(log => log.checkbox_states['no_cheat_foods'] === false && log.is_completed).length
      : 0;

    return NextResponse.json({
      total_points: pointsCalculation.totalPoints,
      daily_points: pointsCalculation.dailyPoints,
      weekly_points: pointsCalculation.weeklyPoints,
      tracking_start_date: trackingStartDate,
      checkbox_stats: checkboxStats,
      cheat_days: {
        total: cheatDays,
      },
      // Legacy format for backward compatibility
      logged_food: checkboxStats.logged_food || { total: 0, current_streak: 0 },
      calorie_limit: checkboxStats.within_calorie_limit || { total: 0, current_streak: 0 },
      protein_goal: checkboxStats.protein_goal_met || { total: 0, current_streak: 0 },
      gym_weeks: {
        total: checkboxStats.gym_session?.weeks_earned || 0,
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
