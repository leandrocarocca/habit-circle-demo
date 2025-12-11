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
} from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconTrash,
  IconEdit,
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

  // Food item selection state
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [selectedPortionType, setSelectedPortionType] = useState<string>('');
  const [portionCount, setPortionCount] = useState<number>(1);

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

      {/* Add meal button */}
      <Button
        leftSection={<IconPlus size={16} />}
        onClick={openAddMealModal}
        variant="light"
      >
        Add Meal
      </Button>

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
                        <ActionIcon
                          onClick={() => handleRemoveFoodFromMeal(meal.id, foodItem.id)}
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
                onClick={() => openAddFoodModal(meal.id)}
                variant="light"
                size="xs"
                fullWidth
              >
                Add Food Item
              </Button>
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
                <Button onClick={handleAddFoodToMeal}>Add to Meal</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
