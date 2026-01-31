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

interface TemplateItem {
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

interface MealTemplate {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  items: TemplateItem[];
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

export default function MealTemplatesPage() {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [addTemplateModalOpened, setAddTemplateModalOpened] = useState(false);
  const [editTemplateModalOpened, setEditTemplateModalOpened] = useState(false);
  const [addFoodModalOpened, setAddFoodModalOpened] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [selectedTemplateForFood, setSelectedTemplateForFood] = useState<number | null>(null);

  // Food item selection state
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [selectedPortionType, setSelectedPortionType] = useState<string>('');
  const [portionCount, setPortionCount] = useState<number>(1);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/meal-templates');
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load meal templates',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!templateName.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a template name',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch('/api/meal-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName }),
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      const newTemplate = await response.json();
      setTemplates([...templates, newTemplate]);
      setAddTemplateModalOpened(false);
      setTemplateName('');

      notifications.show({
        title: 'Success',
        message: 'Meal template created successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create meal template',
        color: 'red',
      });
    }
  };

  const openEditTemplateModal = (template: MealTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setEditTemplateModalOpened(true);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplateId || !templateName.trim()) return;

    try {
      const response = await fetch(`/api/meal-templates/${editingTemplateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName }),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      const updatedTemplate = await response.json();
      setTemplates(
        templates.map((t) =>
          t.id === editingTemplateId ? { ...t, name: updatedTemplate.name } : t
        )
      );
      setEditTemplateModalOpened(false);
      setTemplateName('');
      setEditingTemplateId(null);

      notifications.show({
        title: 'Success',
        message: 'Meal template updated successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to update meal template',
        color: 'red',
      });
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/meal-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates(templates.filter((t) => t.id !== templateId));

      notifications.show({
        title: 'Success',
        message: 'Meal template deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete meal template',
        color: 'red',
      });
    }
  };

  const openAddFoodModal = async (templateId: number) => {
    setSelectedTemplateForFood(templateId);
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
      setAddFoodModalOpened(true);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load food items',
        color: 'red',
      });
    }
  };

  const handleAddFoodToTemplate = async () => {
    if (!selectedTemplateForFood || !selectedFoodItem || !selectedPortionType) {
      notifications.show({
        title: 'Error',
        message: 'Please select a food item and portion',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch(`/api/meal-templates/${selectedTemplateForFood}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_item_id: selectedFoodItem.id,
          portion_type: selectedPortionType,
          portion_count: portionCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add food item to template');
      }

      // Reload templates to get updated data
      await loadTemplates();

      setAddFoodModalOpened(false);
      setSelectedFoodItem(null);
      setSelectedPortionType('');
      setPortionCount(1);

      notifications.show({
        title: 'Success',
        message: 'Food item added to template',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to add food item to template',
        color: 'red',
      });
    }
  };

  const handleRemoveFoodFromTemplate = async (templateId: number, itemId: number) => {
    if (!confirm('Are you sure you want to remove this food item?')) return;

    try {
      const response = await fetch(`/api/meal-templates/${templateId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove food item');
      }

      // Reload templates to get updated data
      await loadTemplates();

      notifications.show({
        title: 'Success',
        message: 'Food item removed from template',
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

  // Calculate macros for a template item
  const calculateItemMacros = (item: TemplateItem) => {
    const grams = item.portion_grams * item.portion_count;
    return {
      protein: (grams * item.protein_per_100g) / 100,
      fat: (grams * item.fat_per_100g) / 100,
      carbs: (grams * item.carbs_per_100g) / 100,
      sugar: (grams * item.sugar_per_100g) / 100,
      calories: (grams * item.calories_per_100g) / 100,
    };
  };

  // Calculate totals for a template
  const calculateTemplateTotals = (template: MealTemplate) => {
    return template.items.reduce(
      (totals, item) => {
        const macros = calculateItemMacros(item);
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

  return (
    <Stack gap="md">
      <Title order={2}>Meal Templates</Title>
      <Text c="dimmed" size="sm">
        Create reusable meal templates to quickly add pre-defined meals to your calorie tracking.
      </Text>

      {/* Add template button */}
      <Button
        leftSection={<IconPlus size={16} />}
        onClick={() => setAddTemplateModalOpened(true)}
        variant="light"
      >
        Create New Template
      </Button>

      {/* Templates list */}
      {loading ? (
        <Text>Loading...</Text>
      ) : templates.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text c="dimmed" ta="center">
            No meal templates yet. Create one to get started!
          </Text>
        </Paper>
      ) : (
        <Stack gap="md">
          {templates.map((template) => {
            const totals = calculateTemplateTotals(template);
            return (
              <Paper key={template.id} p="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text fw={500} size="lg">
                    {template.name}
                  </Text>
                  <Group gap="xs">
                    <ActionIcon
                      onClick={() => openEditTemplateModal(template)}
                      variant="subtle"
                      color="blue"
                    >
                      <IconEdit size={18} />
                    </ActionIcon>
                    <ActionIcon
                      onClick={() => handleDeleteTemplate(template.id)}
                      variant="subtle"
                      color="red"
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Group>
                </Group>

                {/* Template totals */}
                {template.items.length > 0 && (
                  <Group gap="md" mb="md">
                    <Text size="sm" c="blue" fw={500}>
                      {Math.round(totals.calories)} cal
                    </Text>
                    <Text size="sm" c="dimmed">
                      P: {Math.round(totals.protein)}g
                    </Text>
                    <Text size="sm" c="dimmed">
                      C: {Math.round(totals.carbs)}g
                    </Text>
                    <Text size="sm" c="dimmed">
                      F: {Math.round(totals.fat)}g
                    </Text>
                    <Text size="sm" c="dimmed">
                      S: {Math.round(totals.sugar)}g
                    </Text>
                  </Group>
                )}

                {/* Food items in template */}
                {template.items.length === 0 ? (
                  <Text size="sm" c="dimmed" mb="sm">
                    No food items added
                  </Text>
                ) : (
                  <Stack gap="xs" mb="sm">
                    {template.items.map((item) => {
                      const macros = calculateItemMacros(item);
                      return (
                        <Group key={item.id} justify="space-between" align="flex-start">
                          <div style={{ flex: 1 }}>
                            <Text size="sm" fw={500}>
                              {item.food_item_name}
                              {item.food_item_brand && (
                                <Text span size="sm" c="dimmed" ml={4}>
                                  ({item.food_item_brand})
                                </Text>
                              )}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {item.portion_count} × {getPortionTypeLabel(item.portion_type)} (
                              {item.portion_grams}g)
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
                            onClick={() => handleRemoveFoodFromTemplate(template.id, item.id)}
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
                  onClick={() => openAddFoodModal(template.id)}
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

      {/* Add template modal */}
      <Modal
        opened={addTemplateModalOpened}
        onClose={() => setAddTemplateModalOpened(false)}
        title="Create Meal Template"
      >
        <Stack gap="md">
          <TextInput
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., Typical Breakfast, Quick Lunch"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setAddTemplateModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTemplate}>Create Template</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit template modal */}
      <Modal
        opened={editTemplateModalOpened}
        onClose={() => setEditTemplateModalOpened(false)}
        title="Edit Template"
      >
        <Stack gap="md">
          <TextInput
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., Typical Breakfast, Quick Lunch"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditTemplateModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate}>Update Template</Button>
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
                <Button onClick={handleAddFoodToTemplate}>Add to Template</Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
