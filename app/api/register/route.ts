import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      "INSERT INTO users (email, password, name, email_verified) VALUES ($1, $2, $3, $4) RETURNING id, email, name",
      [email, hashedPassword, name, new Date()]
    );

    return NextResponse.json(
      { user: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
