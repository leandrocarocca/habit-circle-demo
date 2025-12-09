'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Paper,
  Text,
  Stack,
  Button,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Group,
  ActionIcon,
} from '@mantine/core';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface CheckboxDefinition {
  id: number;
  name: string;
  label: string;
  points: number;
  type: 'daily' | 'weekly';
  weekly_threshold: number | null;
  display_order: number;
  is_active: boolean;
}

export default function CheckboxSettingsPage() {
  const [checkboxes, setCheckboxes] = useState<CheckboxDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCheckbox, setEditingCheckbox] = useState<CheckboxDefinition | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formPoints, setFormPoints] = useState<number>(1);
  const [formType, setFormType] = useState<'daily' | 'weekly'>('daily');
  const [formWeeklyThreshold, setFormWeeklyThreshold] = useState<number>(3);
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(0);

  useEffect(() => {
    loadCheckboxes();
  }, []);

  const loadCheckboxes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/checkboxes');
      const data = await response.json();
      setCheckboxes(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load checkboxes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCheckbox(null);
    setFormName('');
    setFormLabel('');
    setFormPoints(1);
    setFormType('daily');
    setFormWeeklyThreshold(3);
    setFormDisplayOrder(checkboxes.length + 1);
    setModalOpen(true);
  };

  const openEditModal = (checkbox: CheckboxDefinition) => {
    setEditingCheckbox(checkbox);
    setFormName(checkbox.name);
    setFormLabel(checkbox.label);
    setFormPoints(checkbox.points);
    setFormType(checkbox.type);
    setFormWeeklyThreshold(checkbox.weekly_threshold || 3);
    setFormDisplayOrder(checkbox.display_order);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formName,
        label: formLabel,
        points: formPoints,
        type: formType,
        weekly_threshold: formType === 'weekly' ? formWeeklyThreshold : null,
        display_order: formDisplayOrder,
      };

      let response;
      if (editingCheckbox) {
        // Update existing
        response = await fetch(`/api/checkboxes/${editingCheckbox.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new
        response = await fetch('/api/checkboxes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save checkbox');
      }

      notifications.show({
        title: 'Success',
        message: editingCheckbox ? 'Checkbox updated' : 'Checkbox created',
        color: 'green',
      });

      setModalOpen(false);
      loadCheckboxes();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save checkbox',
        color: 'red',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this checkbox?')) {
      return;
    }

    try {
      const response = await fetch(`/api/checkboxes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete checkbox');
      }

      notifications.show({
        title: 'Success',
        message: 'Checkbox deleted',
        color: 'green',
      });

      loadCheckboxes();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete checkbox',
        color: 'red',
      });
    }
  };

  if (loading) {
    return (
      <Stack gap="lg">
        <Title order={2}>Checkbox Settings</Title>
        <Text>Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Checkbox Settings</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Add Checkbox
        </Button>
      </Group>

      <Paper p="lg" withBorder>
        <Text size="sm" c="dimmed" mb="md">
          Configure the checkboxes that appear in the daily logging page. Daily checkboxes
          award points immediately when checked. Weekly checkboxes require a certain number
          of checks per week to award points.
        </Text>

        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Order</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Label</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Points</Table.Th>
              <Table.Th>Weekly Threshold</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {checkboxes.map((checkbox) => (
              <Table.Tr key={checkbox.id}>
                <Table.Td>{checkbox.display_order}</Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {checkbox.name}
                  </Text>
                </Table.Td>
                <Table.Td>{checkbox.label}</Table.Td>
                <Table.Td>
                  <Text size="sm" tt="capitalize">
                    {checkbox.type}
                  </Text>
                </Table.Td>
                <Table.Td>{checkbox.points}</Table.Td>
                <Table.Td>
                  {checkbox.weekly_threshold ? `${checkbox.weekly_threshold} times` : '-'}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      onClick={() => openEditModal(checkbox)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(checkbox.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCheckbox ? 'Edit Checkbox' : 'Create Checkbox'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="e.g., logged_food"
            value={formName}
            onChange={(e) => setFormName(e.currentTarget.value)}
            disabled={!!editingCheckbox}
            required
            description="Unique identifier (cannot be changed after creation)"
          />

          <TextInput
            label="Label"
            placeholder="e.g., I have logged my food today"
            value={formLabel}
            onChange={(e) => setFormLabel(e.currentTarget.value)}
            required
          />

          <Select
            label="Type"
            value={formType}
            onChange={(value) => setFormType(value as 'daily' | 'weekly')}
            data={[
              { value: 'daily', label: 'Daily - Points awarded each day' },
              { value: 'weekly', label: 'Weekly - Points awarded per week' },
            ]}
            required
          />

          <NumberInput
            label="Points"
            value={formPoints}
            onChange={(value) => setFormPoints(Number(value))}
            min={0}
            required
          />

          {formType === 'weekly' && (
            <NumberInput
              label="Weekly Threshold"
              value={formWeeklyThreshold}
              onChange={(value) => setFormWeeklyThreshold(Number(value))}
              min={1}
              max={7}
              required
              description="How many times per week this must be checked to earn points"
            />
          )}

          <NumberInput
            label="Display Order"
            value={formDisplayOrder}
            onChange={(value) => setFormDisplayOrder(Number(value))}
            min={0}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingCheckbox ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
