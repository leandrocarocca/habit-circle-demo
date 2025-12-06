import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

// Get user's pending invitations
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const result = await pool.query(
      `SELECT gi.*,
        cg.name as group_name,
        cg.tracking_start_date,
        u.name as inviter_name,
        u.email as inviter_email
       FROM group_invitations gi
       INNER JOIN challenge_groups cg ON cg.id = gi.group_id
       INNER JOIN users u ON u.id = gi.inviter_id
       WHERE gi.invitee_id = $1 AND gi.status = 'pending'
       ORDER BY gi.created_at DESC`,
      [session.user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a new invitation
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { group_id, invitee_email } = body;

    if (!group_id || !invitee_email) {
      return NextResponse.json(
        { error: "Group ID and invitee email are required" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Verify user is a member of this group
    const membershipCheck = await pool.query(
      `SELECT 1 FROM group_memberships
       WHERE group_id = $1 AND user_id = $2`,
      [group_id, session.user.id]
    );

    if (membershipCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 }
      );
    }

    // Check if invitee exists
    const inviteeResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [invitee_email]
    );

    if (inviteeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "User with this email does not exist" },
        { status: 404 }
      );
    }

    const invitee_id = inviteeResult.rows[0].id;

    // Check if already a member
    const alreadyMember = await pool.query(
      `SELECT 1 FROM group_memberships
       WHERE group_id = $1 AND user_id = $2`,
      [group_id, invitee_id]
    );

    if (alreadyMember.rows.length > 0) {
      return NextResponse.json(
        { error: "User is already a member of this group" },
        { status: 400 }
      );
    }

    // Create invitation
    const result = await pool.query(
      `INSERT INTO group_invitations (group_id, inviter_id, invitee_email, invitee_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (group_id, invitee_email)
       DO UPDATE SET status = 'pending', updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [group_id, session.user.id, invitee_email, invitee_id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
