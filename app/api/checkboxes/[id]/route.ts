import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { label, points, type, weekly_threshold, display_order, is_active } = body;

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (label !== undefined) {
      updates.push(`label = $${paramIndex++}`);
      values.push(label);
    }
    if (points !== undefined) {
      updates.push(`points = $${paramIndex++}`);
      values.push(points);
    }
    if (type !== undefined) {
      if (type !== 'daily' && type !== 'weekly') {
        return NextResponse.json(
          { error: "Type must be 'daily' or 'weekly'" },
          { status: 400 }
        );
      }
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }
    if (weekly_threshold !== undefined) {
      updates.push(`weekly_threshold = $${paramIndex++}`);
      values.push(weekly_threshold);
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(display_order);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE checkbox_definitions
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, label, points, type, weekly_threshold, display_order, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Checkbox not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating checkbox:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Soft delete by setting is_active to false
    const result = await pool.query(
      `UPDATE checkbox_definitions
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Checkbox not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checkbox:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
