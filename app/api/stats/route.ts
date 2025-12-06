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

      // Verify both users are in the same group
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

    // Get tracking start date (from group if groupId provided, otherwise from user)
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

    // Get total points (only after start date and only from completed days)
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(points), 0) as total_points
       FROM daily_logs
       WHERE user_id = $1
       AND is_completed = true
       AND ($2::date IS NULL OR log_date >= $2)`,
      [targetUserId, trackingStartDate]
    );

    // Days logged food - total count and current streak
    const loggedFoodTotal = await pool.query(
      `SELECT COUNT(*) as total
       FROM daily_logs
       WHERE user_id = $1
       AND logged_food = true
       AND ($2::date IS NULL OR log_date >= $2)`,
      [targetUserId, trackingStartDate]
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
      [targetUserId, trackingStartDate]
    );

    // Days under calorie limit - total count and current streak
    const calorieTotal = await pool.query(
      `SELECT COUNT(*) as total
       FROM daily_logs
       WHERE user_id = $1
       AND within_calorie_limit = true
       AND ($2::date IS NULL OR log_date >= $2)`,
      [targetUserId, trackingStartDate]
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
      [targetUserId, trackingStartDate]
    );

    // Days reached protein goal - total count and current streak
    const proteinTotal = await pool.query(
      `SELECT COUNT(*) as total
       FROM daily_logs
       WHERE user_id = $1
       AND protein_goal_met = true
       AND ($2::date IS NULL OR log_date >= $2)`,
      [targetUserId, trackingStartDate]
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
      [targetUserId, trackingStartDate]
    );

    // Days cheated - total count (where no_cheat_foods is false)
    const cheatTotal = await pool.query(
      `SELECT COUNT(*) as total
       FROM daily_logs
       WHERE user_id = $1
       AND no_cheat_foods = false
       AND ($2::date IS NULL OR log_date >= $2)`,
      [targetUserId, trackingStartDate]
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
      cheat_days: {
        total: parseInt(cheatTotal.rows[0].total),
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
