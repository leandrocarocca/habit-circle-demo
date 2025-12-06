'use client';

import { useState, useEffect } from 'react';
import { Title, Paper, Stack, Button, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';

export default function SettingsPage() {
  const [startDate, setStartDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.tracking_start_date) {
        setStartDate(data.tracking_start_date);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_start_date: startDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      notifications.show({
        title: 'Success',
        message: 'Settings saved successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Title order={2}>Settings</Title>

      <Paper p="lg" withBorder>
        <Stack gap="md">
          <Title order={3}>Tracking Start Date</Title>
          <Text c="dimmed" size="sm">
            Set the date when you started tracking your habits. This helps
            calculate accurate statistics.
          </Text>
          <TextInput
            label="Start Date"
            placeholder="YYYY-MM-DD"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.currentTarget.value)}
            disabled={loading}
            max={new Date().toISOString().split('T')[0]}
          />
          <Button onClick={handleSave} loading={saving} disabled={loading}>
            Save Settings
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
