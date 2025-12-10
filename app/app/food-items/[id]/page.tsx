'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Paper,
  Text,
  Stack,
  Button,
  TextInput,
  NumberInput,
  Select,
  Group,
  ActionIcon,
  Loader,
  Divider,
} from '@mantine/core';
import { IconTrash, IconPlus, IconArrowLeft } from '@tabler/icons-react';
import { useRouter, useParams } from 'next/navigation';
import { notifications } from '@mantine/notifications';

interface Portion {
  id?: number;
  portion_type: string;
  grams: number;
}

interface FoodItem {
  id?: number;
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
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'grains', label: 'Grains' },
  { value: 'protein', label: 'Protein' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'fats_oils', label: 'Fats & Oils' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'condiments', label: 'Condiments' },
  { value: 'other', label: 'Other' },
];

const PORTION_TYPES = [
  { value: 'per_slice', label: 'Per Slice' },
  { value: 'per_portion', label: 'Per Portion' },
  { value: 'per_dl', label: 'Per Deciliter (dl)' },
  { value: 'per_cup', label: 'Per Cup' },
  { value: 'per_tablespoon', label: 'Per Tablespoon' },
  { value: 'per_teaspoon', label: 'Per Teaspoon' },
  { value: 'per_piece', label: 'Per Piece' },
];

export default function FoodItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState<FoodItem>({
    name: '',
    brand: '',
    category: 'other',
    protein_per_100g: 0,
    fat_per_100g: 0,
    carbs_per_100g: 0,
    calories_per_100g: 0,
    portions: [],
  });

  useEffect(() => {
    if (!isNew) {
      loadFoodItem();
    }
  }, [id, isNew]);

  const loadFoodItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/food-items/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load food item');
      }
      const data = await response.json();
      setFormData(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load food item',
        color: 'red',
      });
      router.push('/app/food-items');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category) {
      notifications.show({
        title: 'Error',
        message: 'Please fill in all required fields',
        color: 'red',
      });
      return;
    }

    try {
      setSaving(true);
      const url = isNew ? '/api/food-items' : `/api/food-items/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save food item');
      }

      notifications.show({
        title: 'Success',
        message: isNew ? 'Food item created' : 'Food item updated',
        color: 'green',
      });

      router.push('/app/food-items');
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save food item',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this food item?')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/food-items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete food item');
      }

      notifications.show({
        title: 'Success',
        message: 'Food item deleted',
        color: 'green',
      });

      router.push('/app/food-items');
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete food item',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const addPortion = () => {
    setFormData({
      ...formData,
      portions: [...formData.portions, { portion_type: 'per_portion', grams: 0 }],
    });
  };

  const removePortion = (index: number) => {
    const newPortions = formData.portions.filter((_, i) => i !== index);
    setFormData({ ...formData, portions: newPortions });
  };

  const updatePortion = (index: number, field: keyof Portion, value: any) => {
    const newPortions = [...formData.portions];
    newPortions[index] = { ...newPortions[index], [field]: value };
    setFormData({ ...formData, portions: newPortions });
  };

  if (loading) {
    return (
      <Stack gap="lg" align="center" justify="center" style={{ minHeight: 400 }}>
        <Loader size="lg" />
        <Text>Loading food item...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <ActionIcon
            variant="subtle"
            onClick={() => router.push('/app/food-items')}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={2}>{isNew ? 'Add Food Item' : 'Edit Food Item'}</Title>
        </Group>
        {!isNew && (
          <Button
            color="red"
            variant="outline"
            leftSection={<IconTrash size={16} />}
            onClick={handleDelete}
            loading={deleting}
          >
            Delete
          </Button>
        )}
      </Group>

      <Paper p="lg" withBorder>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="e.g., Chicken Breast"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.currentTarget.value })
            }
            required
          />

          <TextInput
            label="Brand"
            placeholder="e.g., Kirkland (optional)"
            value={formData.brand || ''}
            onChange={(e) =>
              setFormData({ ...formData, brand: e.currentTarget.value })
            }
          />

          <Select
            label="Category"
            value={formData.category}
            onChange={(value) =>
              setFormData({ ...formData, category: value || 'other' })
            }
            data={CATEGORIES}
            required
          />

          <Divider label="Nutrition per 100g" labelPosition="center" />

          <Group grow>
            <NumberInput
              label="Protein (g)"
              value={formData.protein_per_100g}
              onChange={(value) =>
                setFormData({ ...formData, protein_per_100g: Number(value) })
              }
              min={0}
              decimalScale={2}
            />

            <NumberInput
              label="Fat (g)"
              value={formData.fat_per_100g}
              onChange={(value) =>
                setFormData({ ...formData, fat_per_100g: Number(value) })
              }
              min={0}
              decimalScale={2}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Carbohydrates (g)"
              value={formData.carbs_per_100g}
              onChange={(value) =>
                setFormData({ ...formData, carbs_per_100g: Number(value) })
              }
              min={0}
              decimalScale={2}
            />

            <NumberInput
              label="Calories"
              value={formData.calories_per_100g}
              onChange={(value) =>
                setFormData({ ...formData, calories_per_100g: Number(value) })
              }
              min={0}
              decimalScale={2}
            />
          </Group>

          <Divider label="Portion Sizes" labelPosition="center" mt="md" />

          {formData.portions.map((portion, index) => (
            <Group key={index} align="flex-end">
              <Select
                label="Portion Type"
                value={portion.portion_type}
                onChange={(value) =>
                  updatePortion(index, 'portion_type', value || 'per_portion')
                }
                data={PORTION_TYPES}
                style={{ flex: 1 }}
              />

              <NumberInput
                label="Grams"
                value={portion.grams}
                onChange={(value) => updatePortion(index, 'grams', Number(value))}
                min={0}
                decimalScale={2}
                style={{ flex: 1 }}
              />

              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => removePortion(index)}
                mb={2}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}

          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={addPortion}
          >
            Add Portion Size
          </Button>

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => router.push('/app/food-items')}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {isNew ? 'Create' : 'Update'}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
