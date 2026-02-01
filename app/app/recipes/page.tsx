'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Button,
  Stack,
  Group,
  Paper,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Card,
  Accordion,
  Select,
  Divider,
  Badge,
  Spoiler,
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconChefHat,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Portion {
  portion_type: string;
  grams: number;
}

interface FoodItem {
  id: number;
  name: string;
  brand?: string;
  category: string;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  sugar_per_100g: number;
  calories_per_100g: number;
  portions: Portion[];
}

interface RecipeIngredient {
  id: number;
  food_item_id: number;
  food_item_name: string;
  food_item_brand?: string;
  food_item_category: string;
  portion_type: string;
  portion_count: number;
  portion_grams: number;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  sugar_per_100g: number;
  calories_per_100g: number;
}

interface Recipe {
  id: number;
  user_id: string;
  name: string;
  instructions?: string;
  portions_yield: number;
  created_at: string;
  ingredients: RecipeIngredient[];
}

const CATEGORIES = [
  { value: 'meat', label: 'Meat' },
  { value: 'chicken', label: 'Chicken' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'toppings_on_bread', label: 'Toppings on bread' },
  { value: 'cheese', label: 'Cheese' },
  { value: 'frozen_food', label: 'Frozen food' },
  { value: 'bread', label: 'Bread' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'carbs', label: 'Carbs' },
  { value: 'cooking_fat', label: 'Cooking fat' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'other', label: 'Other' },
];

const PORTION_TYPES = [
  { value: 'per_1g', label: 'Per 1 gram' },
  { value: 'per_100g', label: 'Per 100 grams' },
  { value: 'per_slice', label: 'Per slice' },
  { value: 'per_portion', label: 'Per portion' },
  { value: 'per_dl', label: 'Per dl' },
  { value: 'per_cup', label: 'Per cup' },
  { value: 'per_tablespoon', label: 'Per tablespoon' },
  { value: 'per_teaspoon', label: 'Per teaspoon' },
  { value: 'per_piece', label: 'Per piece' },
];

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [addRecipeModalOpened, setAddRecipeModalOpened] = useState(false);
  const [editRecipeModalOpened, setEditRecipeModalOpened] = useState(false);
  const [addIngredientModalOpened, setAddIngredientModalOpened] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [portionsYield, setPortionsYield] = useState<number>(4);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [selectedRecipeForIngredient, setSelectedRecipeForIngredient] = useState<number | null>(null);

  // Food item selection state
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [selectedPortionType, setSelectedPortionType] = useState<string>('');
  const [portionCount, setPortionCount] = useState<number>(1);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recipes');
      if (!response.ok) {
        throw new Error('Failed to load recipes');
      }
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load recipes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipe = async () => {
    if (!recipeName.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a recipe name',
        color: 'red',
      });
      return;
    }

    if (!portionsYield || portionsYield < 1) {
      notifications.show({
        title: 'Error',
        message: 'Portions yield must be at least 1',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: recipeName, instructions: recipeInstructions, portions_yield: portionsYield }),
      });

      if (!response.ok) {
        throw new Error('Failed to create recipe');
      }

      const newRecipe = await response.json();
      setRecipes([...recipes, newRecipe]);
      setAddRecipeModalOpened(false);
      setRecipeName('');
      setRecipeInstructions('');
      setPortionsYield(4);

      notifications.show({
        title: 'Success',
        message: 'Recipe created successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create recipe',
        color: 'red',
      });
    }
  };

  const openEditRecipeModal = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeName(recipe.name);
    setRecipeInstructions(recipe.instructions || '');
    setPortionsYield(recipe.portions_yield);
    setEditRecipeModalOpened(true);
  };

  const handleUpdateRecipe = async () => {
    if (!editingRecipeId || !recipeName.trim()) return;

    if (!portionsYield || portionsYield < 1) {
      notifications.show({
        title: 'Error',
        message: 'Portions yield must be at least 1',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch(`/api/recipes/${editingRecipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: recipeName, instructions: recipeInstructions, portions_yield: portionsYield }),
      });

      if (!response.ok) {
        throw new Error('Failed to update recipe');
      }

      const updatedRecipe = await response.json();
      setRecipes(
        recipes.map((r) =>
          r.id === editingRecipeId
            ? { ...r, name: updatedRecipe.name, instructions: updatedRecipe.instructions, portions_yield: updatedRecipe.portions_yield }
            : r
        )
      );
      setEditRecipeModalOpened(false);
      setRecipeName('');
      setRecipeInstructions('');
      setPortionsYield(4);
      setEditingRecipeId(null);

      notifications.show({
        title: 'Success',
        message: 'Recipe updated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update recipe',
        color: 'red',
      });
    }
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recipe');
      }

      setRecipes(recipes.filter((r) => r.id !== recipeId));

      notifications.show({
        title: 'Success',
        message: 'Recipe deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete recipe',
        color: 'red',
      });
    }
  };

  const openAddIngredientModal = async (recipeId: number) => {
    setSelectedRecipeForIngredient(recipeId);
    setSearchQuery('');
    setCategoryFilter(null);
    setSelectedFoodItem(null);
    setSelectedPortionType('');
    setPortionCount(1);

    try {
      const response = await fetch('/api/food-items');
      if (!response.ok) {
        throw new Error('Failed to load food items');
      }
      const data = await response.json();
      setFoodItems(data);
      setAddIngredientModalOpened(true);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load food items',
        color: 'red',
      });
    }
  };

  const handleAddIngredientToRecipe = async () => {
    if (!selectedRecipeForIngredient || !selectedFoodItem || !selectedPortionType) {
      notifications.show({
        title: 'Error',
        message: 'Please select a food item and portion',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch(`/api/recipes/${selectedRecipeForIngredient}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_item_id: selectedFoodItem.id,
          portion_type: selectedPortionType,
          portion_count: portionCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add ingredient to recipe');
      }

      await loadRecipes();

      setAddIngredientModalOpened(false);
      setSelectedFoodItem(null);
      setSelectedPortionType('');
      setPortionCount(1);

      notifications.show({
        title: 'Success',
        message: 'Ingredient added to recipe',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to add ingredient to recipe',
        color: 'red',
      });
    }
  };

  const handleRemoveIngredientFromRecipe = async (recipeId: number, ingredientId: number) => {
    if (!confirm('Are you sure you want to remove this ingredient?')) return;

    try {
      const response = await fetch(`/api/recipes/${recipeId}/ingredients/${ingredientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove ingredient');
      }

      await loadRecipes();

      notifications.show({
        title: 'Success',
        message: 'Ingredient removed from recipe',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to remove ingredient',
        color: 'red',
      });
    }
  };

  // Filter food items
  const filteredFoodItems = foodItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group food items by category
  const groupedFoodItems = filteredFoodItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FoodItem[]>);

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const getPortionTypeLabel = (value: string) => {
    return PORTION_TYPES.find((p) => p.value === value)?.label || value;
  };

  // Calculate macros for an ingredient
  const calculateIngredientMacros = (ingredient: RecipeIngredient) => {
    const grams = ingredient.portion_grams * ingredient.portion_count;
    return {
      protein: (grams * ingredient.protein_per_100g) / 100,
      fat: (grams * ingredient.fat_per_100g) / 100,
      carbs: (grams * ingredient.carbs_per_100g) / 100,
      sugar: (grams * ingredient.sugar_per_100g) / 100,
      calories: (grams * ingredient.calories_per_100g) / 100,
    };
  };

  // Calculate totals for a recipe (full recipe)
  const calculateRecipeTotals = (recipe: Recipe) => {
    return recipe.ingredients.reduce(
      (totals, ingredient) => {
        const macros = calculateIngredientMacros(ingredient);
        return {
          protein: totals.protein + macros.protein,
          fat: totals.fat + macros.fat,
          carbs: totals.carbs + macros.carbs,
          sugar: totals.sugar + macros.sugar,
          calories: totals.calories + macros.calories,
        };
      },
      { protein: 0, fat: 0, carbs: 0, sugar: 0, calories: 0 }
    );
  };

  // Calculate per-portion macros
  const calculatePerPortionMacros = (recipe: Recipe) => {
    const totals = calculateRecipeTotals(recipe);
    return {
      protein: totals.protein / recipe.portions_yield,
      fat: totals.fat / recipe.portions_yield,
      carbs: totals.carbs / recipe.portions_yield,
      sugar: totals.sugar / recipe.portions_yield,
      calories: totals.calories / recipe.portions_yield,
    };
  };

  return (
    <Stack gap="md">
      <Group>
        <IconChefHat size={28} />
        <Title order={2}>Recipes</Title>
      </Group>
      <Text c="dimmed" size="sm">
        Create recipes with ingredients. When adding a recipe to a meal, the macros are calculated based on how many portions you add.
      </Text>

      {/* Add recipe button */}
      <Button
        leftSection={<IconPlus size={16} />}
        onClick={() => setAddRecipeModalOpened(true)}
        variant="light"
      >
        Create New Recipe
      </Button>

      {/* Recipes list */}
      {loading ? (
        <Text>Loading...</Text>
      ) : recipes.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text c="dimmed" ta="center">
            No recipes yet. Create one to get started!
          </Text>
        </Paper>
      ) : (
        <Stack gap="md">
          {recipes.map((recipe) => {
            const totals = calculateRecipeTotals(recipe);
            const perPortion = calculatePerPortionMacros(recipe);
            return (
              <Paper key={recipe.id} p="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Group>
                    <Text fw={500} size="lg">
                      {recipe.name}
                    </Text>
                    <Badge color="blue" variant="light">
                      Makes {recipe.portions_yield} portion{recipe.portions_yield !== 1 ? 's' : ''}
                    </Badge>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon
                      onClick={() => openEditRecipeModal(recipe)}
                      variant="subtle"
                      color="blue"
                    >
                      <IconEdit size={18} />
                    </ActionIcon>
                    <ActionIcon
                      onClick={() => handleDeleteRecipe(recipe.id)}
                      variant="subtle"
                      color="red"
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Group>

                {/* Recipe totals */}
                {recipe.ingredients.length > 0 && (
                  <Stack gap="xs" mb="md">
                    <Group gap="md">
                      <Text size="sm" fw={500}>Per portion:</Text>
                      <Text size="sm" c="blue" fw={500}>
                        {Math.round(perPortion.calories)} cal
                      </Text>
                      <Text size="sm" c="dimmed">
                        P: {Math.round(perPortion.protein)}g
                      </Text>
                      <Text size="sm" c="dimmed">
                        C: {Math.round(perPortion.carbs)}g
                      </Text>
                      <Text size="sm" c="dimmed">
                        F: {Math.round(perPortion.fat)}g
                      </Text>
                      <Text size="sm" c="dimmed">
                        S: {Math.round(perPortion.sugar)}g
                      </Text>
                    </Group>
                    <Group gap="md">
                      <Text size="xs" c="dimmed">Total recipe:</Text>
                      <Text size="xs" c="dimmed">
                        {Math.round(totals.calories)} cal
                      </Text>
                      <Text size="xs" c="dimmed">
                        P: {Math.round(totals.protein)}g
                      </Text>
                      <Text size="xs" c="dimmed">
                        C: {Math.round(totals.carbs)}g
                      </Text>
                      <Text size="xs" c="dimmed">
                        F: {Math.round(totals.fat)}g
                      </Text>
                    </Group>
                  </Stack>
                )}

                {/* Instructions */}
                {recipe.instructions && (
                  <Spoiler maxHeight={60} showLabel="Show instructions" hideLabel="Hide instructions" mb="sm">
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {recipe.instructions}
                    </Text>
                  </Spoiler>
                )}

                <Divider mb="sm" />

                {/* Ingredients in recipe */}
                {recipe.ingredients.length === 0 ? (
                  <Text size="sm" c="dimmed" mb="sm">
                    No ingredients added
                  </Text>
                ) : (
                  <Stack gap="xs" mb="sm">
                    {recipe.ingredients.map((ingredient) => {
                      const macros = calculateIngredientMacros(ingredient);
                      return (
                        <Group key={ingredient.id} justify="space-between" align="flex-start">
                          <div style={{ flex: 1 }}>
                            <Text size="sm" fw={500}>
                              {ingredient.food_item_name}
                              {ingredient.food_item_brand && (
                                <Text span size="sm" c="dimmed" ml={4}>
                                  ({ingredient.food_item_brand})
                                </Text>
                              )}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {ingredient.portion_count} × {getPortionTypeLabel(ingredient.portion_type)} (
                              {ingredient.portion_grams}g)
                            </Text>
                            <Group gap="xs" mt={4}>
                              <Text size="xs" c="blue" fw={500}>
                                {Math.round(macros.calories)} cal
                              </Text>
                              <Text size="xs" c="dimmed">
                                P: {Math.round(macros.protein)}g
                              </Text>
                              <Text size="xs" c="dimmed">
                                C: {Math.round(macros.carbs)}g
                              </Text>
                              <Text size="xs" c="dimmed">
                                F: {Math.round(macros.fat)}g
                              </Text>
                            </Group>
                          </div>
                          <ActionIcon
                            onClick={() => handleRemoveIngredientFromRecipe(recipe.id, ingredient.id)}
                            variant="subtle"
                            color="red"
                            size="sm"
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      );
                    })}
                  </Stack>
                )}

                <Button
                  leftSection={<IconPlus size={14} />}
                  onClick={() => openAddIngredientModal(recipe.id)}
                  variant="light"
                  size="xs"
                  fullWidth
                >
                  Add Ingredient
                </Button>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Add recipe modal */}
      <Modal
        opened={addRecipeModalOpened}
        onClose={() => setAddRecipeModalOpened(false)}
        title="Create Recipe"
      >
        <Stack gap="md">
          <TextInput
            label="Recipe Name"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="e.g., Chicken Stir Fry, Pasta Bolognese"
          />
          <NumberInput
            label="Portions Yield"
            description="How many portions does this recipe make?"
            value={portionsYield}
            onChange={(value) => setPortionsYield(Number(value) || 1)}
            min={1}
            max={100}
          />
          <Textarea
            label="Instructions"
            description="Step-by-step cooking instructions (optional)"
            value={recipeInstructions}
            onChange={(e) => setRecipeInstructions(e.target.value)}
            placeholder="1. Preheat oven to 180°C&#10;2. Mix ingredients...&#10;3. Bake for 30 minutes..."
            minRows={4}
            autosize
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setAddRecipeModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecipe}>Create Recipe</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit recipe modal */}
      <Modal
        opened={editRecipeModalOpened}
        onClose={() => setEditRecipeModalOpened(false)}
        title="Edit Recipe"
      >
        <Stack gap="md">
          <TextInput
            label="Recipe Name"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="e.g., Chicken Stir Fry, Pasta Bolognese"
          />
          <NumberInput
            label="Portions Yield"
            description="How many portions does this recipe make?"
            value={portionsYield}
            onChange={(value) => setPortionsYield(Number(value) || 1)}
            min={1}
            max={100}
          />
          <Textarea
            label="Instructions"
            description="Step-by-step cooking instructions (optional)"
            value={recipeInstructions}
            onChange={(e) => setRecipeInstructions(e.target.value)}
            placeholder="1. Preheat oven to 180°C&#10;2. Mix ingredients...&#10;3. Bake for 30 minutes..."
            minRows={4}
            autosize
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditRecipeModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRecipe}>Update Recipe</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add ingredient modal */}
      <Modal
        opened={addIngredientModalOpened}
        onClose={() => setAddIngredientModalOpened(false)}
        title="Add Ingredient"
        size="lg"
      >
        <Stack gap="md">
          {!selectedFoodItem ? (
            <>
              <TextInput
                placeholder="Search food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                placeholder="Filter by category"
                data={CATEGORIES}
                value={categoryFilter}
                onChange={(value) => setCategoryFilter(value)}
                clearable
              />
              <Accordion>
                {Object.entries(groupedFoodItems).map(([category, items]) => (
                  <Accordion.Item key={category} value={category}>
                    <Accordion.Control>
                      {getCategoryLabel(category)} ({items.length})
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="xs">
                        {items.map((item) => (
                          <Card
                            key={item.id}
                            padding="sm"
                            withBorder
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedFoodItem(item)}
                          >
                            <Text fw={500}>{item.name}</Text>
                            {item.brand && (
                              <Text size="xs" c="dimmed">
                                {item.brand}
                              </Text>
                            )}
                            <Text size="sm" c="dimmed">
                              {item.calories_per_100g} cal per 100g
                            </Text>
                          </Card>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </>
          ) : (
            <>
              <div>
                <Text fw={500}>{selectedFoodItem.name}</Text>
                {selectedFoodItem.brand && (
                  <Text size="sm" c="dimmed">
                    {selectedFoodItem.brand}
                  </Text>
                )}
              </div>
              <Divider />
              <Select
                label="Portion Size"
                placeholder="Select portion size"
                data={selectedFoodItem.portions.map((p) => ({
                  value: p.portion_type,
                  label: `${getPortionTypeLabel(p.portion_type)} (${p.grams}g)`,
                }))}
                value={selectedPortionType}
                onChange={(value) => setSelectedPortionType(value || '')}
              />
              <NumberInput
                label="Number of Portions"
                value={portionCount}
                onChange={(value) => setPortionCount(Number(value) || 1)}
                min={0.1}
                step={0.5}
                decimalScale={1}
              />
              <Group justify="flex-end">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setSelectedFoodItem(null);
                    setSelectedPortionType('');
                    setPortionCount(1);
                  }}
                >
                  Back
                </Button>
                <Button onClick={handleAddIngredientToRecipe}>Add to Recipe</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
