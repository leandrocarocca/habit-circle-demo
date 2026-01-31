import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// DELETE /api/meal-templates/[id]/items/[itemId] - Remove a food item from a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: templateId, itemId } = await params;
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Verify the template belongs to the user
    const templateCheck = await pool.query(
      'SELECT id FROM meal_templates WHERE id = $1 AND user_id = $2',
      [templateId, session.user.id]
    );

    if (templateCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Meal template not found" },
        { status: 404 }
      );
    }

    // Verify the item exists in the template
    const itemCheck = await pool.query(
      'SELECT id FROM meal_template_items WHERE id = $1 AND template_id = $2',
      [itemId, templateId]
    );

    if (itemCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Template item not found" },
        { status: 404 }
      );
    }

    // Delete the item
    await pool.query(
      'DELETE FROM meal_template_items WHERE id = $1 AND template_id = $2',
      [itemId, templateId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing food item from template:', error);
    return NextResponse.json(
      { error: "Failed to remove food item from template" },
      { status: 500 }
    );
  }
}
