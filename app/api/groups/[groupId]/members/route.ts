import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Verify user is a member of this group
    const membershipCheck = await pool.query(
      `SELECT 1 FROM group_memberships
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, session.user.id]
    );

    if (membershipCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 }
      );
    }

    // Get all members of the group
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, gm.joined_at
       FROM users u
       INNER JOIN group_memberships gm ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching group members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
