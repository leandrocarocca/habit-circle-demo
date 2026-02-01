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
  Image,
  FileButton,
  Box,
} from '@mantine/core';
import { IconTrash, IconPlus, IconArrowLeft, IconPhoto, IconX, IconScan } from '@tabler/icons-react';
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
  image_url?: string;
  protein_per_100g: number;
  fat_per_100g: number;
  carbs_per_100g: number;
  sugar_per_100g: number;
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

const PORTION_TYPES = [
  { value: 'per_1g', label: 'Per 1 Gram' },
  { value: 'per_100g', label: 'Per 100 Grams' },
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
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [formData, setFormData] = useState<FoodItem>({
    name: '',
    brand: '',
    category: 'other',
    protein_per_100g: 0,
    fat_per_100g: 0,
    carbs_per_100g: 0,
    sugar_per_100g: 0,
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

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    try {
      setUploading(true);
      const uploadData = new FormData();
      uploadData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const { url } = await response.json();
      setFormData((prev) => ({ ...prev, image_url: url }));

      notifications.show({
        title: 'Success',
        message: 'Image uploaded',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to upload image',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (formData.image_url) {
      try {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formData.image_url }),
        });
      } catch (error) {
        console.error('Failed to delete image from storage:', error);
      }
    }
    setFormData({ ...formData, image_url: undefined });
  };

  const handleScanNutritionLabel = async (file: File | null) => {
    if (!file) return;

    try {
      setAnalyzing(true);

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);

      const base64 = await base64Promise;
      const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

      const response = await fetch('/api/analyze-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          media_type: mediaType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze nutrition label');
      }

      const nutritionData = await response.json();

      // Update form with extracted data
      setFormData((prev) => ({
        ...prev,
        name: nutritionData.name || prev.name,
        brand: nutritionData.brand || prev.brand,
        calories_per_100g: nutritionData.calories_per_100g ?? prev.calories_per_100g,
        protein_per_100g: nutritionData.protein_per_100g ?? prev.protein_per_100g,
        fat_per_100g: nutritionData.fat_per_100g ?? prev.fat_per_100g,
        carbs_per_100g: nutritionData.carbs_per_100g ?? prev.carbs_per_100g,
        sugar_per_100g: nutritionData.sugar_per_100g ?? prev.sugar_per_100g,
      }));

      notifications.show({
        title: 'Success',
        message: 'Nutrition info extracted from label',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to analyze nutrition label',
        color: 'red',
      });
    } finally {
      setAnalyzing(false);
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

          <Box>
            <Text size="sm" fw={500} mb="xs">
              Photo
            </Text>
            {formData.image_url ? (
              <Box pos="relative" style={{ width: 'fit-content' }}>
                <Image
                  src={formData.image_url}
                  alt="Food item"
                  w={200}
                  h={200}
                  fit="cover"
                  radius="md"
                />
                <ActionIcon
                  color="red"
                  variant="filled"
                  size="sm"
                  pos="absolute"
                  top={5}
                  right={5}
                  onClick={handleRemoveImage}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Box>
            ) : (
              <FileButton
                onChange={handleImageUpload}
                accept="image/png,image/jpeg,image/webp,image/gif"
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    leftSection={<IconPhoto size={16} />}
                    loading={uploading}
                  >
                    Upload Photo
                  </Button>
                )}
              </FileButton>
            )}
            <Text size="xs" c="dimmed" mt="xs">
              Max 4MB. JPEG, PNG, WebP, or GIF.
            </Text>
          </Box>

          <Divider label="Nutrition per 100g" labelPosition="center" />

          <Box>
            <FileButton
              onChange={handleScanNutritionLabel}
              accept="image/png,image/jpeg,image/webp,image/gif"
            >
              {(props) => (
                <Button
                  {...props}
                  variant="light"
                  color="teal"
                  leftSection={<IconScan size={16} />}
                  loading={analyzing}
                  fullWidth
                >
                  {analyzing ? 'Analyzing...' : 'Scan Nutrition Label'}
                </Button>
              )}
            </FileButton>
            <Text size="xs" c="dimmed" mt="xs">
              Take a photo of a nutrition label to auto-fill the values below
            </Text>
          </Box>

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
              label="Sugar (g)"
              value={formData.sugar_per_100g}
              onChange={(value) =>
                setFormData({ ...formData, sugar_per_100g: Number(value) })
              }
              min={0}
              decimalScale={2}
            />
          </Group>

          <Group grow>
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
