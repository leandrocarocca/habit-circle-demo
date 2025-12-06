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
      "SELECT tracking_start_date FROM users WHERE id = $1",
      [session.user.id]
    );

    return NextResponse.json({
      tracking_start_date: result.rows[0]?.tracking_start_date,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
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
    const { tracking_start_date } = body;

    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
    await pool.query(
      "UPDATE users SET tracking_start_date = $1 WHERE id = $2",
      [tracking_start_date, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
