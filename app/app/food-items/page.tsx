'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Paper,
  Text,
  Stack,
  Button,
  TextInput,
  Select,
  Group,
  Accordion,
  Card,
  Badge,
  Loader,
} from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';

interface Portion {
  id: number;
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
  calories_per_100g: number;
  portions: Portion[];
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

export default function FoodItemsPage() {
  const router = useRouter();
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    loadFoodItems();
  }, []);

  const loadFoodItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/food-items');
      if (!response.ok) {
        throw new Error('Failed to load food items');
      }
      const data = await response.json();
      setFoodItems(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load food items',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const filteredItems = foodItems.filter((item) => {
    const matchesSearch = search
      ? item.name.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FoodItem[]>);

  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const aLabel = getCategoryLabel(a);
    const bLabel = getCategoryLabel(b);
    return aLabel.localeCompare(bLabel);
  });

  if (loading) {
    return (
      <Stack gap="lg" align="center" justify="center" style={{ minHeight: 400 }}>
        <Loader size="lg" />
        <Text>Loading food items...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Food Items</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => router.push('/app/food-items/new')}
        >
          Add Food Item
        </Button>
      </Group>

      <Paper p="lg" withBorder>
        <Stack gap="md">
          <TextInput
            placeholder="Search food items..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />

          <Select
            placeholder="Filter by category"
            clearable
            value={categoryFilter}
            onChange={setCategoryFilter}
            data={CATEGORIES}
          />
        </Stack>
      </Paper>

      {filteredItems.length === 0 ? (
        <Paper p="lg" withBorder>
          <Text ta="center" c="dimmed">
            {search || categoryFilter
              ? 'No food items found matching your filters.'
              : 'No food items yet. Click "Add Food Item" to create one.'}
          </Text>
        </Paper>
      ) : (
        <Accordion variant="separated">
          {sortedCategories.map((category) => {
            const items = groupedItems[category];
            return (
              <Accordion.Item key={category} value={category}>
                <Accordion.Control>
                  <Group justify="space-between">
                    <Text fw={500}>{getCategoryLabel(category)}</Text>
                    <Badge>{items.length}</Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {items.map((item) => (
                      <Card
                        key={item.id}
                        withBorder
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/app/food-items/${item.id}`)}
                      >
                        <Group justify="space-between">
                          <div>
                            <Text fw={500}>{item.name}</Text>
                            {item.brand && (
                              <Text size="xs" c="dimmed">
                                {item.brand}
                              </Text>
                            )}
                            <Text size="sm" c="dimmed">
                              {item.calories_per_100g} cal per 100g
                            </Text>
                          </div>
                          <Text size="sm" c="dimmed">
                            P: {item.protein_per_100g}g | F: {item.fat_per_100g}g | C:{' '}
                            {item.carbs_per_100g}g
                          </Text>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </Stack>
  );
}
