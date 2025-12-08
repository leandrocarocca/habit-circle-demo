import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";
import { getWeekRange, calculateGymBonus, calculateDailyPoints } from "@/lib/weekUtils";

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
        logged_food: false,
        within_calorie_limit: false,
        protein_goal_met: false,
        no_cheat_foods: false,
        gym_session: false,
        is_completed: false,
        points: 0,
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
      gym_session,
      is_completed,
    } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Calculate daily points using utility function
    const dailyPoints = calculateDailyPoints({
      logged_food,
      within_calorie_limit,
      protein_goal_met,
      no_cheat_foods,
    });

    const result = await pool.query(
      `INSERT INTO daily_logs (user_id, log_date, logged_food, within_calorie_limit, protein_goal_met, no_cheat_foods, gym_session, is_completed, points, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET
         logged_food = $3,
         within_calorie_limit = $4,
         protein_goal_met = $5,
         no_cheat_foods = $6,
         gym_session = $7,
         is_completed = $8,
         points = $9,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        session.user.id,
        date,
        logged_food ?? false,
        within_calorie_limit ?? false,
        protein_goal_met ?? false,
        no_cheat_foods ?? false,
        gym_session ?? false,
        is_completed ?? false,
        dailyPoints, // Just daily points for now
      ]
    );

    // Calculate the week range using utility function
    const { weekStart, weekEnd } = getWeekRange(date);

    console.log('=== Gym Points Debug ===');
    console.log('Date:', date);
    console.log('Week start:', weekStart.toISOString().split('T')[0]);
    console.log('Week end:', weekEnd.toISOString().split('T')[0]);

    // Get gym sessions count for this week
    const gymCountResult = await pool.query(
      `SELECT COUNT(*) as gym_count
       FROM daily_logs
       WHERE user_id = $1
       AND log_date >= $2
       AND log_date <= $3
       AND gym_session = true`,
      [session.user.id, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]
    );

    const totalGymThisWeek = parseInt(gymCountResult.rows[0].gym_count);
    const gymBonus = calculateGymBonus(totalGymThisWeek);

    console.log('Total gym sessions this week:', totalGymThisWeek);
    console.log('Gym bonus:', gymBonus);
    console.log('Daily points:', dailyPoints);

    // Update points for ALL days in this week with the gym bonus
    const updateResult = await pool.query(
      `UPDATE daily_logs
       SET points = (
         (CASE WHEN logged_food THEN 1 ELSE 0 END) +
         (CASE WHEN within_calorie_limit THEN 1 ELSE 0 END) +
         (CASE WHEN protein_goal_met THEN 1 ELSE 0 END) +
         (CASE WHEN no_cheat_foods THEN 1 ELSE 0 END) +
         $4
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       AND log_date >= $2
       AND log_date <= $3`,
      [session.user.id, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0], gymBonus]
    );

    console.log('Updated', updateResult.rowCount, 'days in the week');

    // Fetch and return the updated log for the requested date
    const updatedResult = await pool.query(
      "SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = $2",
      [session.user.id, date]
    );

    console.log('Final result for', date, ':', updatedResult.rows[0]);
    console.log('========================\n');

    return NextResponse.json(updatedResult.rows[0]);
  } catch (error) {
    console.error("Error saving log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
