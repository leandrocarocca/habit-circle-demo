import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { auth } from '@/auth';

// DELETE /api/recipes/[id]/ingredients/[ingredientId] - Remove an ingredient from a recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: recipeId, ingredientId } = await params;
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

    // Verify the recipe belongs to the user
    const recipeCheck = await pool.query(
      'SELECT id FROM recipes WHERE id = $1 AND user_id = $2',
      [recipeId, session.user.id]
    );

    if (recipeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Delete the ingredient
    const result = await pool.query(
      'DELETE FROM recipe_ingredients WHERE id = $1 AND recipe_id = $2 RETURNING id',
      [ingredientId, recipeId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Ingredient not found in recipe" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing ingredient from recipe:', error);
    return NextResponse.json(
      { error: "Failed to remove ingredient from recipe" },
      { status: 500 }
    );
  }
}
