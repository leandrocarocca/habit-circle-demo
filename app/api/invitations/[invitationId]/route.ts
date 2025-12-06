import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

// Accept or decline invitation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationId } = await params;
    const body = await request.json();
    const { action } = body; // 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Get invitation and verify it belongs to current user
    const invitationResult = await pool.query(
      `SELECT * FROM group_invitations
       WHERE id = $1 AND invitee_id = $2 AND status = 'pending'`,
      [invitationId, session.user.id]
    );

    if (invitationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invitation not found or already processed" },
        { status: 404 }
      );
    }

    const invitation = invitationResult.rows[0];

    if (action === 'accept') {
      // Add user to group
      await pool.query(
        `INSERT INTO group_memberships (group_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (group_id, user_id) DO NOTHING`,
        [invitation.group_id, session.user.id]
      );

      // Update invitation status
      await pool.query(
        `UPDATE group_invitations
         SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [invitationId]
      );
    } else {
      // Update invitation status to declined
      await pool.query(
        `UPDATE group_invitations
         SET status = 'declined', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [invitationId]
      );
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Error processing invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
