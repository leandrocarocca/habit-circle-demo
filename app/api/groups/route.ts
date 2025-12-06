import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

// Get user's groups
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Get all groups the user is a member of
    const result = await pool.query(
      `SELECT cg.*,
        (SELECT COUNT(*) FROM group_memberships WHERE group_id = cg.id) as member_count
       FROM challenge_groups cg
       INNER JOIN group_memberships gm ON gm.group_id = cg.id
       WHERE gm.user_id = $1
       ORDER BY cg.created_at DESC`,
      [session.user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a new group
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, tracking_start_date } = body;

    if (!name || !tracking_start_date) {
      return NextResponse.json(
        { error: "Name and tracking start date are required" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Create the group
    const groupResult = await pool.query(
      `INSERT INTO challenge_groups (name, created_by, tracking_start_date)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, session.user.id, tracking_start_date]
    );

    const group = groupResult.rows[0];

    // Add creator as first member
    await pool.query(
      `INSERT INTO group_memberships (group_id, user_id)
       VALUES ($1, $2)`,
      [group.id, session.user.id]
    );

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
