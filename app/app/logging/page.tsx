'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Title,
  Text,
  Checkbox,
  Button,
  Stack,
  Group,
  Paper,
  ActionIcon,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface DailyLog {
  log_date: string;
  logged_food: boolean;
  within_calorie_limit: boolean;
  protein_goal_met: boolean;
  no_cheat_foods: boolean;
  is_completed: boolean;
  points: number;
}

export default function LoggingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [log, setLog] = useState<DailyLog>({
    log_date: '',
    logged_food: false,
    within_calorie_limit: false,
    protein_goal_met: false,
    no_cheat_foods: false,
    is_completed: false,
    points: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

    const fullDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (formatDate(date) === formatDate(today)) {
      return `Today - ${fullDate}`;
    } else if (formatDate(date) === formatDate(yesterday)) {
      return `Yesterday - ${fullDate}`;
    } else {
      return fullDate;
    }
  };

  // Handle date parameter from URL
  const searchParams = useSearchParams();

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setCurrentDate(new Date(dateParam));
    }
  }, [searchParams]);

  // Load log for current date
  useEffect(() => {
    loadLog();
  }, [currentDate]);

  const loadLog = async () => {
    setLoading(true);
    // Reset log state to default while loading
    setLog({
      log_date: '',
      logged_food: false,
      within_calorie_limit: false,
      protein_goal_met: false,
      no_cheat_foods: false,
      is_completed: false,
      points: 0,
    });
    try {
      const dateStr = formatDate(currentDate);
      const response = await fetch(`/api/logs?date=${dateStr}`);
      const data = await response.json();
      setLog(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to load log',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveLog = async (updates: Partial<DailyLog>) => {
    setSaving(true);
    try {
      const updatedLog = { ...log, ...updates };
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formatDate(currentDate),
          ...updatedLog,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      const data = await response.json();
      setLog(data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save log',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxChange = (field: keyof DailyLog, value: boolean) => {
    const updates = { [field]: value };
    setLog((prev) => ({ ...prev, ...updates }));
    saveLog(updates);
  };

  const handleMarkComplete = () => {
    saveLog({ is_completed: true });
    notifications.show({
      title: 'Success',
      message: 'Day marked as complete!',
      color: 'green',
    });
  };

  const handleUncomplete = () => {
    saveLog({ is_completed: false });
    notifications.show({
      title: 'Success',
      message: 'Day marked as incomplete',
      color: 'blue',
    });
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

  const isToday = formatDate(currentDate) === formatDate(new Date());

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>Daily Logging</Title>
        {!isToday && (
          <Button onClick={goToToday} variant="light">
            Go to Today
          </Button>
        )}
      </Group>

      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <ActionIcon
            onClick={goToPreviousDay}
            size="lg"
            variant="subtle"
            disabled={loading}
          >
            <IconChevronLeft size={20} />
          </ActionIcon>

          <Stack gap={0} align="center">
            <Text size="xl" fw={600}>
              {formatDisplayDate(currentDate)}
            </Text>
            <Text size="sm" c="dimmed">
              Points: {log.points}/4
            </Text>
          </Stack>

          <ActionIcon
            onClick={goToNextDay}
            size="lg"
            variant="subtle"
            disabled={loading || isToday}
          >
            <IconChevronRight size={20} />
          </ActionIcon>
        </Group>

        <Stack gap="md">
          <Checkbox
            label="I have logged my food today"
            checked={log.logged_food}
            onChange={(e) =>
              handleCheckboxChange('logged_food', e.currentTarget.checked)
            }
            disabled={loading || saving || log.is_completed}
          />
          <Checkbox
            label="I have not gone over my calorie-limit"
            checked={log.within_calorie_limit}
            onChange={(e) =>
              handleCheckboxChange(
                'within_calorie_limit',
                e.currentTarget.checked
              )
            }
            disabled={loading || saving || log.is_completed}
          />
          <Checkbox
            label="I have reached my goal of 100 grams of protein"
            checked={log.protein_goal_met}
            onChange={(e) =>
              handleCheckboxChange('protein_goal_met', e.currentTarget.checked)
            }
            disabled={loading || saving || log.is_completed}
          />
          <Checkbox
            label="I have not cheated today (eaten candy or junk-food)"
            checked={log.no_cheat_foods}
            onChange={(e) =>
              handleCheckboxChange('no_cheat_foods', e.currentTarget.checked)
            }
            disabled={loading || saving || log.is_completed}
          />
        </Stack>

        {log.is_completed ? (
          <Stack gap="xs" mt="md">
            <Text c="green" fw={500}>
              ✓ Day completed!
            </Text>
            <Button
              onClick={handleUncomplete}
              fullWidth
              variant="light"
              color="gray"
              loading={saving}
              disabled={loading}
            >
              Mark as Incomplete
            </Button>
          </Stack>
        ) : (
          <Button
            onClick={handleMarkComplete}
            fullWidth
            mt="md"
            loading={saving}
            disabled={loading}
          >
            Mark Day as Complete
          </Button>
        )}
      </Paper>
    </Stack>
  );
}
