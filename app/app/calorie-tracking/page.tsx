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
  Card,
  Accordion,
  Select,
  NumberInput,
  Divider,
  SegmentedControl,
  ScrollArea,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconTrash,
  IconEdit,
  IconTemplate,
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
  created_at?: string;
}

interface MealFoodItem {
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

interface Meal {
  id: number;
  user_id: string;
  date: string;
  name: string;
  created_at: string;
  updated_at: string;
  food_items: MealFoodItem[];
}

interface TemplateItem {
  id: number;
  food_item_id: number;
  food_item_name: string;
  food_item_brand?: string;
  portion_type: string;
  portion_count: number;
  portion_grams: number;
  calories_per_100g: number;
}

interface MealTemplate {
  id: number;
  name: string;
  items: TemplateItem[];
}

interface RecipeIngredient {
  id: number;
  food_item_id: number;
  food_item_name: string;
  portion_type: string;
  portion_count: number;
  portion_grams: number;
  calories_per_100g: number;
}

interface Recipe {
  id: number;
  name: string;
  portions_yield: number;
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

export default function CalorieTrackingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [addMealModalOpened, setAddMealModalOpened] = useState(false);
  const [editMealModalOpened, setEditMealModalOpened] = useState(false);
  const [addFoodModalOpened, setAddFoodModalOpened] = useState(false);
  const [mealName, setMealName] = useState('');
  const [editingMealId, setEditingMealId] = useState<number | null>(null);
  const [selectedMealForFood, setSelectedMealForFood] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [templateModalOpened, setTemplateModalOpened] = useState(false);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [addTemplateToMealModalOpened, setAddTemplateToMealModalOpened] = useState(false);
  const [selectedMealForTemplate, setSelectedMealForTemplate] = useState<number | null>(null);

  // Recipe state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [addRecipeToMealModalOpened, setAddRecipeToMealModalOpened] = useState(false);
  const [selectedMealForRecipe, setSelectedMealForRecipe] = useState<number | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipePortions, setRecipePortions] = useState<number>(1);

  // Edit food item state
  const [editFoodModalOpened, setEditFoodModalOpened] = useState(false);
  const [editingFoodItem, setEditingFoodItem] = useState<MealFoodItem | null>(null);
  const [editFoodMealId, setEditFoodMealId] = useState<number | null>(null);
  const [editPortionType, setEditPortionType] = useState<string>('');
  const [editPortionCount, setEditPortionCount] = useState<number>(1);
  const [editFoodPortions, setEditFoodPortions] = useState<Portion[]>([]);

  // Food item selection state
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [selectedPortionType, setSelectedPortionType] = useState<string>('');
  const [portionCount, setPortionCount] = useState<number>(1);
  const [foodViewMode, setFoodViewMode] = useState<'recent' | 'category'>('recent');

  // Format date as YYYY-MM-DD in local timezone
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDisplayDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (formatDate(date) === formatDate(today)) {
      return 'Today';
    } else if (formatDate(date) === formatDate(yesterday)) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  useEffect(() => {
    loadMeals();
  }, [currentDate]);

  const loadMeals = async () => {
    try {
      setLoading(true);
      const dateStr = formatDate(currentDate);
      const response = await fetch(`/api/meals?date=${dateStr}`);
      if (!response.ok) {
        throw new Error('Failed to load meals');
      }
      const data = await response.json();
      setMeals(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load meals',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openAddMealModal = () => {
    const nextMealNumber = meals.length + 1;
    setMealName(`Meal ${nextMealNumber}`);
    setAddMealModalOpened(true);
  };

  const handleAddMeal = async () => {
    try {
      const dateStr = formatDate(currentDate);
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, name: mealName }),
      });

      if (!response.ok) {
        throw new Error('Failed to create meal');
      }

      const newMeal = await response.json();
      setMeals([...meals, newMeal]);
      setAddMealModalOpened(false);
      setMealName('');

      notifications.show({
        title: 'Success',
        message: 'Meal created successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create meal',
        color: 'red',
      });
    }
  };

  const openEditMealModal = (meal: Meal) => {
    setEditingMealId(meal.id);
    setMealName(meal.name);
    setEditMealModalOpened(true);
  };

  const handleUpdateMeal = async () => {
    if (!editingMealId) return;

    try {
      const response = await fetch(`/api/meals/${editingMealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: mealName }),
      });

      if (!response.ok) {
        throw new Error('Failed to update meal');
      }

      const updatedMeal = await response.json();
      setMeals(
        meals.map((m) =>
          m.id === editingMealId ? { ...m, name: updatedMeal.name } : m
        )
      );
      setEditMealModalOpened(false);
      setMealName('');
      setEditingMealId(null);

      notifications.show({
        title: 'Success',
        message: 'Meal updated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update meal',
        color: 'red',
      });
    }
  };

  const handleDeleteMeal = async (mealId: number) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;

    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meal');
      }

      setMeals(meals.filter((m) => m.id !== mealId));

      notifications.show({
        title: 'Success',
        message: 'Meal deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete meal',
        color: 'red',
      });
    }
  };

  const openAddFoodModal = async (mealId: number) => {
    setSelectedMealForFood(mealId);
    setSearchQuery('');
    setCategoryFilter(null);
    setSelectedFoodItem(null);
    setSelectedPortionType('');
    setPortionCount(1);
    setFoodViewMode('recent');

    // Load food items
    try {
      const response = await fetch('/api/food-items');
      if (!response.ok) {
        throw new Error('Failed to load food items');
      }
      const data = await response.json();
      setFoodItems(data);
      setAddFoodModalOpened(true);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load food items',
        color: 'red',
      });
    }
  };

  const handleAddFoodToMeal = async () => {
    if (!selectedMealForFood || !selectedFoodItem || !selectedPortionType) {
      notifications.show({
        title: 'Error',
        message: 'Please select a food item and portion',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch(`/api/meals/${selectedMealForFood}/food-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_item_id: selectedFoodItem.id,
          portion_type: selectedPortionType,
          portion_count: portionCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add food item to meal');
      }

      // Reload meals to get updated data
      await loadMeals();

      setAddFoodModalOpened(false);
      setSelectedFoodItem(null);
      setSelectedPortionType('');
      setPortionCount(1);

      notifications.show({
        title: 'Success',
        message: 'Food item added to meal',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to add food item to meal',
        color: 'red',
      });
    }
  };

  const handleRemoveFoodFromMeal = async (mealId: number, foodItemId: number) => {
    if (!confirm('Are you sure you want to remove this food item?')) return;

    try {
      const response = await fetch(`/api/meals/${mealId}/food-items/${foodItemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove food item');
      }

      // Reload meals to get updated data
      await loadMeals();

      notifications.show({
        title: 'Success',
        message: 'Food item removed from meal',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to remove food item',
        color: 'red',
      });
    }
  };

  const openEditFoodModal = async (mealId: number, foodItem: MealFoodItem) => {
    setEditFoodMealId(mealId);
    setEditingFoodItem(foodItem);
    setEditPortionType(foodItem.portion_type);
    setEditPortionCount(foodItem.portion_count);

    // Load portions for this food item
    try {
      const response = await fetch(`/api/food-items/${foodItem.food_item_id}`);
      if (!response.ok) {
        throw new Error('Failed to load food item');
      }
      const data = await response.json();
      setEditFoodPortions(data.portions || []);
      setEditFoodModalOpened(true);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load food item details',
        color: 'red',
      });
    }
  };

  const handleUpdateFoodItem = async () => {
    if (!editFoodMealId || !editingFoodItem || !editPortionType) {
      notifications.show({
        title: 'Error',
        message: 'Please select a portion size',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/meals/${editFoodMealId}/food-items/${editingFoodItem.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portion_type: editPortionType,
            portion_count: editPortionCount,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update food item');
      }

      // Reload meals to get updated data
      await loadMeals();

      setEditFoodModalOpened(false);
      setEditingFoodItem(null);
      setEditFoodMealId(null);
      setEditPortionType('');
      setEditPortionCount(1);
      setEditFoodPortions([]);

      notifications.show({
        title: 'Success',
        message: 'Food item updated',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update food item',
        color: 'red',
      });
    }
  };

  const openTemplateModal = async () => {
    try {
      const response = await fetch('/api/meal-templates');
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }
      const data = await response.json();
      setTemplates(data);
      setTemplateModalOpened(true);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load meal templates',
        color: 'red',
      });
    }
  };

  const handleAddFromTemplate = async (templateId: number) => {
    try {
      const dateStr = formatDate(currentDate);
      const response = await fetch('/api/meals/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, date: dateStr }),
      });

      if (!response.ok) {
        throw new Error('Failed to create meal from template');
      }

      const newMeal = await response.json();
      setMeals([...meals, newMeal]);
      setTemplateModalOpened(false);

      notifications.show({
        title: 'Success',
        message: 'Meal added from template',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to add meal from template',
        color: 'red',
      });
    }
  };

  const openAddTemplateToMealModal = async (mealId: number) => {
    setSelectedMealForTemplate(mealId);
    try {
      const response = await fetch('/api/meal-templates');
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }
      const data = await response.json();
      setTemplates(data);
      setAddTemplateToMealModalOpened(true);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load meal templates',
        color: 'red',
      });
    }
  };

  const handleAddTemplateToMeal = async (templateId: number) => {
    if (!selectedMealForTemplate) return;

    try {
      const response = await fetch(`/api/meals/${selectedMealForTemplate}/from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId }),
      });

      if (!response.ok) {
        throw new Error('Failed to add template items to meal');
      }

      // Reload meals to get updated data
      await loadMeals();
      setAddTemplateToMealModalOpened(false);
      setSelectedMealForTemplate(null);

      notifications.show({
        title: 'Success',
        message: 'Template items added to meal',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to add template items to meal',
        color: 'red',
      });
    }
  };

  // Calculate template calories
  const calculateTemplateCalories = (template: MealTemplate) => {
    return template.items.reduce((total, item) => {
      return total + (item.portion_grams * item.portion_count * item.calories_per_100g) / 100;
    }, 0);
  };

  // Recipe handlers
  const openAddRecipeToMealModal = async (mealId: number) => {
    setSelectedMealForRecipe(mealId);
    setSelectedRecipe(null);
    setRecipePortions(1);
    try {
      const response = await fetch('/api/recipes');
      if (!response.ok) {
        throw new Error('Failed to load recipes');
      }
      const data = await response.json();
      setRecipes(data);
      setAddRecipeToMealModalOpened(true);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load recipes',
        color: 'red',
      });
    }
  };

  const handleAddRecipeToMeal = async () => {
    if (!selectedMealForRecipe || !selectedRecipe) return;

    try {
      const response = await fetch(`/api/meals/${selectedMealForRecipe}/from-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: selectedRecipe.id,
          portions: recipePortions,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add recipe to meal');
      }

      await loadMeals();
      setAddRecipeToMealModalOpened(false);
      setSelectedMealForRecipe(null);
      setSelectedRecipe(null);
      setRecipePortions(1);

      notifications.show({
        title: 'Success',
        message: `Added ${recipePortions} portion${recipePortions !== 1 ? 's' : ''} of ${selectedRecipe.name}`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to add recipe to meal',
        color: 'red',
      });
    }
  };

  // Calculate recipe calories (total)
  const calculateRecipeCalories = (recipe: Recipe) => {
    return recipe.ingredients.reduce((total, ingredient) => {
      return total + (ingredient.portion_grams * ingredient.portion_count * ingredient.calories_per_100g) / 100;
    }, 0);
  };

  // Calculate per-portion calories
  const calculateRecipeCaloriesPerPortion = (recipe: Recipe) => {
    return calculateRecipeCalories(recipe) / recipe.portions_yield;
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

  // Calculate calories for a food item
  const calculateFoodItemCalories = (foodItem: MealFoodItem) => {
    return (foodItem.portion_grams * foodItem.portion_count * foodItem.calories_per_100g) / 100;
  };

  // Calculate macros for a food item
  const calculateFoodItemMacros = (foodItem: MealFoodItem) => {
    const grams = foodItem.portion_grams * foodItem.portion_count;
    return {
      protein: (grams * foodItem.protein_per_100g) / 100,
      fat: (grams * foodItem.fat_per_100g) / 100,
      carbs: (grams * foodItem.carbs_per_100g) / 100,
      sugar: (grams * foodItem.sugar_per_100g) / 100,
      calories: (grams * foodItem.calories_per_100g) / 100,
    };
  };

  // Calculate totals for a meal
  const calculateMealTotals = (meal: Meal) => {
    return meal.food_items.reduce(
      (totals, foodItem) => {
        const macros = calculateFoodItemMacros(foodItem);
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

  // Calculate totals for the day
  const calculateDayTotals = () => {
    return meals.reduce(
      (totals, meal) => {
        const mealTotals = calculateMealTotals(meal);
        return {
          protein: totals.protein + mealTotals.protein,
          fat: totals.fat + mealTotals.fat,
          carbs: totals.carbs + mealTotals.carbs,
          sugar: totals.sugar + mealTotals.sugar,
          calories: totals.calories + mealTotals.calories,
        };
      },
      { protein: 0, fat: 0, carbs: 0, sugar: 0, calories: 0 }
    );
  };

  const dayTotals = calculateDayTotals();

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Calorie Tracking</Title>
        <Button
          variant="light"
          size="xs"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
      </Group>

      {/* Date navigation */}
      <Paper p="md" withBorder>
        <Group justify="space-between">
          <ActionIcon onClick={goToPreviousDay} variant="subtle">
            <IconChevronLeft size={20} />
          </ActionIcon>
          <Stack gap={4} style={{ flex: 1, alignItems: 'center' }}>
            <Text size="lg" fw={500}>
              {formatDisplayDate(currentDate)}
            </Text>
            <Text size="sm" c="dimmed">
              {formatDate(currentDate)}
            </Text>
          </Stack>
          <ActionIcon onClick={goToNextDay} variant="subtle">
            <IconChevronRight size={20} />
          </ActionIcon>
        </Group>
        {formatDate(currentDate) !== formatDate(new Date()) && (
          <Group justify="center" mt="sm">
            <Button onClick={goToToday} variant="light" size="xs">
              Go to Today
            </Button>
          </Group>
        )}
      </Paper>

      {/* Daily summary */}
      {meals.length > 0 && (
        <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
          <Stack gap="md">
            <div>
              <Text size="xl" fw={700} ta="center" c="blue">
                {Math.round(dayTotals.calories)} calories
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                Total for the day
              </Text>
            </div>
            <Group justify="space-around">
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={600} c="blue">
                  {Math.round(dayTotals.protein)}g
                </Text>
                <Text size="xs" c="dimmed">
                  Protein
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={600} c="orange">
                  {Math.round(dayTotals.carbs)}g
                </Text>
                <Text size="xs" c="dimmed">
                  Carbs
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={600} c="yellow">
                  {Math.round(dayTotals.fat)}g
                </Text>
                <Text size="xs" c="dimmed">
                  Fat
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={600} c="pink">
                  {Math.round(dayTotals.sugar)}g
                </Text>
                <Text size="xs" c="dimmed">
                  Sugar
                </Text>
              </div>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Add meal buttons */}
      <Group>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openAddMealModal}
          variant="light"
        >
          Add Meal
        </Button>
        <Button
          leftSection={<IconTemplate size={16} />}
          onClick={openTemplateModal}
          variant="light"
          color="teal"
        >
          Add from Template
        </Button>
      </Group>

      {/* Meals list */}
      {loading ? (
        <Text>Loading...</Text>
      ) : meals.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text c="dimmed" ta="center">
            No meals logged for this day
          </Text>
        </Paper>
      ) : (
        <Stack gap="md">
          {meals.map((meal) => {
            const mealTotals = calculateMealTotals(meal);
            return (
              <Paper key={meal.id} p="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text fw={500} size="lg">
                    {meal.name}
                  </Text>
                  <Group gap="xs">
                    <ActionIcon
                      onClick={() => openEditMealModal(meal)}
                      variant="subtle"
                      color="blue"
                    >
                      <IconEdit size={18} />
                    </ActionIcon>
                    <ActionIcon
                      onClick={() => handleDeleteMeal(meal.id)}
                      variant="subtle"
                      color="red"
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Group>

                {/* Meal totals */}
                {showDetails ? (
                  <Group gap="md" mb="md">
                    <Text size="sm" c="blue" fw={500}>
                      {Math.round(mealTotals.calories)} cal
                    </Text>
                    <Text size="sm" c="dimmed">
                      P: {Math.round(mealTotals.protein)}g
                    </Text>
                    <Text size="sm" c="dimmed">
                      C: {Math.round(mealTotals.carbs)}g
                    </Text>
                    <Text size="sm" c="dimmed">
                      F: {Math.round(mealTotals.fat)}g
                    </Text>
                    <Text size="sm" c="dimmed">
                      S: {Math.round(mealTotals.sugar)}g
                    </Text>
                  </Group>
                ) : (
                  <Text size="sm" c="blue" fw={500} mb="md">
                    {Math.round(mealTotals.calories)} cal
                  </Text>
                )}

              {/* Food items in meal */}
              {meal.food_items.length === 0 ? (
                <Text size="sm" c="dimmed" mb="sm">
                  No food items added
                </Text>
              ) : (
                <Stack gap="xs" mb="sm">
                  {meal.food_items.map((foodItem) => {
                    const macros = calculateFoodItemMacros(foodItem);
                    return (
                      <Group key={foodItem.id} justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                          <Text size="sm" fw={500}>
                            {foodItem.food_item_name}
                            {foodItem.food_item_brand && (
                              <Text span size="sm" c="dimmed" ml={4}>
                                ({foodItem.food_item_brand})
                              </Text>
                            )}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {foodItem.portion_count} × {getPortionTypeLabel(foodItem.portion_type)} (
                            {foodItem.portion_grams}g)
                          </Text>
                          {showDetails ? (
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
                              <Text size="xs" c="dimmed">
                                S: {Math.round(macros.sugar)}g
                              </Text>
                            </Group>
                          ) : (
                            <Text size="xs" c="blue" fw={500} mt={4}>
                              {Math.round(macros.calories)} cal
                            </Text>
                          )}
                        </div>
                        <Group gap={4}>
                          <ActionIcon
                            onClick={() => openEditFoodModal(meal.id, foodItem)}
                            variant="subtle"
                            color="blue"
                            size="sm"
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon
                            onClick={() => handleRemoveFoodFromMeal(meal.id, foodItem.id)}
                            variant="subtle"
                            color="red"
                            size="sm"
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    );
                  })}
                </Stack>
              )}

              <Group grow>
                <Button
                  leftSection={<IconPlus size={14} />}
                  onClick={() => openAddFoodModal(meal.id)}
                  variant="light"
                  size="xs"
                >
                  Add Food
                </Button>
                <Button
                  leftSection={<IconTemplate size={14} />}
                  onClick={() => openAddTemplateToMealModal(meal.id)}
                  variant="light"
                  size="xs"
                  color="teal"
                >
                  Template
                </Button>
                <Button
                  leftSection={<IconChefHat size={14} />}
                  onClick={() => openAddRecipeToMealModal(meal.id)}
                  variant="light"
                  size="xs"
                  color="grape"
                >
                  Recipe
                </Button>
              </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Add meal modal */}
      <Modal
        opened={addMealModalOpened}
        onClose={() => setAddMealModalOpened(false)}
        title="Add Meal"
      >
        <Stack gap="md">
          <TextInput
            label="Meal Name"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="e.g., Breakfast, Lunch, Dinner"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setAddMealModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMeal}>Add Meal</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit meal modal */}
      <Modal
        opened={editMealModalOpened}
        onClose={() => setEditMealModalOpened(false)}
        title="Edit Meal"
      >
        <Stack gap="md">
          <TextInput
            label="Meal Name"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="e.g., Breakfast, Lunch, Dinner"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditMealModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMeal}>Update Meal</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add food item modal */}
      <Modal
        opened={addFoodModalOpened}
        onClose={() => setAddFoodModalOpened(false)}
        title="Add Food Item"
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

              {/* Show search results directly when searching */}
              {searchQuery ? (
                <ScrollArea h={400}>
                  <Stack gap="xs">
                    {filteredFoodItems.length === 0 ? (
                      <Text c="dimmed" ta="center" py="md">
                        No food items found matching "{searchQuery}"
                      </Text>
                    ) : (
                      filteredFoodItems.map((item) => (
                        <Card
                          key={item.id}
                          padding="sm"
                          withBorder
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedFoodItem(item)}
                        >
                          <Group justify="space-between">
                            <div>
                              <Text fw={500}>{item.name}</Text>
                              {item.brand && (
                                <Text size="xs" c="dimmed">
                                  {item.brand}
                                </Text>
                              )}
                            </div>
                            <Text size="sm" c="dimmed">
                              {item.calories_per_100g} cal
                            </Text>
                          </Group>
                        </Card>
                      ))
                    )}
                  </Stack>
                </ScrollArea>
              ) : (
                <>
                  {/* View mode toggle when not searching */}
                  <SegmentedControl
                    value={foodViewMode}
                    onChange={(value) => setFoodViewMode(value as 'recent' | 'category')}
                    data={[
                      { label: 'Recent', value: 'recent' },
                      { label: 'By Category', value: 'category' },
                    ]}
                    fullWidth
                  />

                  {foodViewMode === 'recent' ? (
                    <ScrollArea h={350}>
                      <Stack gap="xs">
                        {foodItems.length === 0 ? (
                          <Text c="dimmed" ta="center" py="md">
                            No food items yet. Create some in the Food Items page.
                          </Text>
                        ) : (
                          // Show most recent items first
                          [...foodItems]
                            .sort((a, b) => {
                              if (!a.created_at || !b.created_at) return 0;
                              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                            })
                            .slice(0, 20)
                            .map((item) => (
                            <Card
                              key={item.id}
                              padding="sm"
                              withBorder
                              style={{ cursor: 'pointer' }}
                              onClick={() => setSelectedFoodItem(item)}
                            >
                              <Group justify="space-between">
                                <div>
                                  <Text fw={500}>{item.name}</Text>
                                  {item.brand && (
                                    <Text size="xs" c="dimmed">
                                      {item.brand}
                                    </Text>
                                  )}
                                </div>
                                <Text size="sm" c="dimmed">
                                  {item.calories_per_100g} cal
                                </Text>
                              </Group>
                            </Card>
                          ))
                        )}
                      </Stack>
                    </ScrollArea>
                  ) : (
                    <>
                      <Select
                        placeholder="Filter by category"
                        data={CATEGORIES}
                        value={categoryFilter}
                        onChange={(value) => setCategoryFilter(value)}
                        clearable
                      />
                      <ScrollArea h={300}>
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
                      </ScrollArea>
                    </>
                  )}
                </>
              )}
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
                <Button onClick={handleAddFoodToMeal}>Add to Meal</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      {/* Add from template modal */}
      <Modal
        opened={templateModalOpened}
        onClose={() => setTemplateModalOpened(false)}
        title="Add Meal from Template"
        size="md"
      >
        <Stack gap="md">
          {templates.length === 0 ? (
            <Text c="dimmed" ta="center">
              No meal templates found. Create templates in the Meal Templates page.
            </Text>
          ) : (
            templates.map((template) => (
              <Card
                key={template.id}
                padding="sm"
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => handleAddFromTemplate(template.id)}
              >
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>{template.name}</Text>
                    <Text size="xs" c="dimmed">
                      {template.items.length} item{template.items.length !== 1 ? 's' : ''}
                    </Text>
                  </div>
                  <Text size="sm" c="blue" fw={500}>
                    {Math.round(calculateTemplateCalories(template))} cal
                  </Text>
                </Group>
              </Card>
            ))
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setTemplateModalOpened(false)}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add template items to existing meal modal */}
      <Modal
        opened={addTemplateToMealModalOpened}
        onClose={() => {
          setAddTemplateToMealModalOpened(false);
          setSelectedMealForTemplate(null);
        }}
        title="Add Items from Template"
        size="md"
      >
        <Stack gap="md">
          {templates.length === 0 ? (
            <Text c="dimmed" ta="center">
              No meal templates found. Create templates in the Meal Templates page.
            </Text>
          ) : (
            templates.map((template) => (
              <Card
                key={template.id}
                padding="sm"
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => handleAddTemplateToMeal(template.id)}
              >
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>{template.name}</Text>
                    <Text size="xs" c="dimmed">
                      {template.items.length} item{template.items.length !== 1 ? 's' : ''}
                    </Text>
                  </div>
                  <Text size="sm" c="blue" fw={500}>
                    {Math.round(calculateTemplateCalories(template))} cal
                  </Text>
                </Group>
              </Card>
            ))
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => {
              setAddTemplateToMealModalOpened(false);
              setSelectedMealForTemplate(null);
            }}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit food item modal */}
      <Modal
        opened={editFoodModalOpened}
        onClose={() => {
          setEditFoodModalOpened(false);
          setEditingFoodItem(null);
          setEditFoodMealId(null);
          setEditPortionType('');
          setEditPortionCount(1);
          setEditFoodPortions([]);
        }}
        title="Edit Food Item"
      >
        <Stack gap="md">
          {editingFoodItem && (
            <>
              <div>
                <Text fw={500}>{editingFoodItem.food_item_name}</Text>
                {editingFoodItem.food_item_brand && (
                  <Text size="sm" c="dimmed">
                    {editingFoodItem.food_item_brand}
                  </Text>
                )}
              </div>
              <Divider />
              <Select
                label="Portion Size"
                placeholder="Select portion size"
                data={editFoodPortions.map((p) => ({
                  value: p.portion_type,
                  label: `${getPortionTypeLabel(p.portion_type)} (${p.grams}g)`,
                }))}
                value={editPortionType}
                onChange={(value) => setEditPortionType(value || '')}
              />
              <NumberInput
                label="Number of Portions"
                value={editPortionCount}
                onChange={(value) => setEditPortionCount(Number(value) || 1)}
                min={0.1}
                step={0.5}
                decimalScale={1}
              />
              <Group justify="flex-end">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setEditFoodModalOpened(false);
                    setEditingFoodItem(null);
                    setEditFoodMealId(null);
                    setEditPortionType('');
                    setEditPortionCount(1);
                    setEditFoodPortions([]);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateFoodItem}>Save Changes</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      {/* Add recipe to meal modal */}
      <Modal
        opened={addRecipeToMealModalOpened}
        onClose={() => {
          setAddRecipeToMealModalOpened(false);
          setSelectedMealForRecipe(null);
          setSelectedRecipe(null);
          setRecipePortions(1);
        }}
        title="Add from Recipe"
        size="md"
      >
        <Stack gap="md">
          {!selectedRecipe ? (
            <>
              {recipes.length === 0 ? (
                <Text c="dimmed" ta="center">
                  No recipes found. Create recipes in the Recipes page.
                </Text>
              ) : (
                recipes.map((recipe) => (
                  <Card
                    key={recipe.id}
                    padding="sm"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <Group justify="space-between">
                      <div>
                        <Text fw={500}>{recipe.name}</Text>
                        <Text size="xs" c="dimmed">
                          Makes {recipe.portions_yield} portion{recipe.portions_yield !== 1 ? 's' : ''} •{' '}
                          {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                        </Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text size="sm" c="blue" fw={500}>
                          {Math.round(calculateRecipeCaloriesPerPortion(recipe))} cal
                        </Text>
                        <Text size="xs" c="dimmed">per portion</Text>
                      </div>
                    </Group>
                  </Card>
                ))
              )}
              <Group justify="flex-end">
                <Button variant="subtle" onClick={() => {
                  setAddRecipeToMealModalOpened(false);
                  setSelectedMealForRecipe(null);
                }}>
                  Cancel
                </Button>
              </Group>
            </>
          ) : (
            <>
              <div>
                <Text fw={500} size="lg">{selectedRecipe.name}</Text>
                <Text size="sm" c="dimmed">
                  Makes {selectedRecipe.portions_yield} portion{selectedRecipe.portions_yield !== 1 ? 's' : ''} •{' '}
                  {Math.round(calculateRecipeCaloriesPerPortion(selectedRecipe))} cal per portion
                </Text>
              </div>
              <Divider />
              <NumberInput
                label="Number of Portions"
                description={`Adding ${recipePortions} portion${recipePortions !== 1 ? 's' : ''} = ${Math.round(calculateRecipeCaloriesPerPortion(selectedRecipe) * recipePortions)} calories`}
                value={recipePortions}
                onChange={(value) => setRecipePortions(Number(value) || 1)}
                min={0.25}
                max={selectedRecipe.portions_yield * 10}
                step={0.25}
                decimalScale={2}
              />
              <Group justify="flex-end">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setSelectedRecipe(null);
                    setRecipePortions(1);
                  }}
                >
                  Back
                </Button>
                <Button onClick={handleAddRecipeToMeal} color="grape">
                  Add to Meal
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
