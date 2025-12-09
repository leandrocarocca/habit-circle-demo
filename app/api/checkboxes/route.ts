import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Pool } from "@neondatabase/serverless";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const result = await pool.query(
      `SELECT id, name, label, points, type, weekly_threshold, display_order, is_active
       FROM checkbox_definitions
       WHERE is_active = true
       ORDER BY display_order ASC`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching checkboxes:", error);
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
    const { name, label, points, type, weekly_threshold, display_order } = body;

    // Validate required fields
    if (!name || !label || points === undefined || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== 'daily' && type !== 'weekly') {
      return NextResponse.json(
        { error: "Type must be 'daily' or 'weekly'" },
        { status: 400 }
      );
    }

    // Validate weekly_threshold for weekly checkboxes
    if (type === 'weekly' && (!weekly_threshold || weekly_threshold <= 0)) {
      return NextResponse.json(
        { error: "Weekly checkboxes must have a positive weekly_threshold" },
        { status: 400 }
      );
    }

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    const result = await pool.query(
      `INSERT INTO checkbox_definitions (name, label, points, type, weekly_threshold, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, label, points, type, weekly_threshold, display_order, is_active`,
      [name, label, points, type, type === 'weekly' ? weekly_threshold : null, display_order || 0]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating checkbox:", error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: "A checkbox with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
