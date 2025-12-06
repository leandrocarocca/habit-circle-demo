'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Title, Paper, Stack, Group, ActionIcon, Text, SimpleGrid, Box } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface DayData {
  points: number;
  is_completed: boolean;
}

interface CalendarData {
  tracking_start_date: string | null;
  logs: Record<string, DayData>;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await fetch(`/api/calendar?year=${year}&month=${month}`);
      const data = await response.json();
      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDayColor = (dateStr: string, dayData: DayData | undefined): string => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const isToday = date.getTime() === today.getTime();
    const isPast = date < today;
    const trackingStartDate = calendarData?.tracking_start_date
      ? new Date(calendarData.tracking_start_date)
      : null;

    // Before tracking start date or no start date set - use default white
    if (trackingStartDate) {
      trackingStartDate.setHours(0, 0, 0, 0);
      if (date < trackingStartDate) {
        return '#ffffff';
      }
    }

    // Current date with no data
    if (isToday && !dayData) {
      return '#ffffff';
    }

    // Has data
    if (dayData) {
      // Completed with full points (4 points)
      if (dayData.is_completed && dayData.points === 4) {
        return '#51cf66'; // Green
      }
      // Completed but not all points
      if (dayData.is_completed && dayData.points < 4) {
        return '#339af0'; // Blue
      }
      // Has points but not completed
      if (!dayData.is_completed && dayData.points > 0) {
        return '#cc5de8'; // Purple
      }
      // Not completed (after start date, has entry but no completion)
      if (!dayData.is_completed) {
        return '#ffd43b'; // Yellow
      }
    }

    // Past date with no data (after start date)
    if (isPast) {
      return '#ff6b6b'; // Red
    }

    // Default (future dates)
    return '#ffffff';
  };

  const handleDayClick = (dateStr: string) => {
    router.push(`/app/logging?date=${dateStr}`);
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Convert to Monday-based (0 = Monday, 6 = Sunday)
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days = [];
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Add weekday headers
    weekDays.forEach((day) => {
      days.push(
        <Box key={`header-${day}`} ta="center" fw={700} p="xs">
          {day}
        </Box>
      );
    });

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<Box key={`empty-${i}`} />);
    }

    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarData?.logs[dateStr];
      const bgColor = getDayColor(dateStr, dayData);

      days.push(
        <Paper
          key={dateStr}
          p="md"
          withBorder
          onClick={() => handleDayClick(dateStr)}
          style={{
            backgroundColor: bgColor,
            aspectRatio: '1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60px',
            cursor: 'pointer',
          }}
        >
          <Text size="lg" fw={500}>
            {day}
          </Text>
          {dayData && (
            <Text size="xs" c="dimmed">
              {dayData.points}/4
            </Text>
          )}
        </Paper>
      );
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>Calendar</Title>
      </Group>

      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <ActionIcon onClick={goToPreviousMonth} size="lg" variant="subtle" disabled={loading}>
            <IconChevronLeft size={20} />
          </ActionIcon>

          <Text size="xl" fw={600}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>

          <ActionIcon onClick={goToNextMonth} size="lg" variant="subtle" disabled={loading}>
            <IconChevronRight size={20} />
          </ActionIcon>
        </Group>

        <SimpleGrid cols={7} spacing="xs">
          {calendarData && renderCalendar()}
        </SimpleGrid>
      </Paper>

      {/* Legend */}
      <Paper p="md" withBorder>
        <Title order={4} mb="md">Legend</Title>
        <Stack gap="xs">
          <Group gap="xs">
            <Box w={20} h={20} style={{ backgroundColor: '#51cf66', border: '1px solid #ccc' }} />
            <Text size="sm">Completed with full points (4/4)</Text>
          </Group>
          <Group gap="xs">
            <Box w={20} h={20} style={{ backgroundColor: '#339af0', border: '1px solid #ccc' }} />
            <Text size="sm">Completed with partial points</Text>
          </Group>
          <Group gap="xs">
            <Box w={20} h={20} style={{ backgroundColor: '#cc5de8', border: '1px solid #ccc' }} />
            <Text size="sm">Has points but not completed</Text>
          </Group>
          <Group gap="xs">
            <Box w={20} h={20} style={{ backgroundColor: '#ffd43b', border: '1px solid #ccc' }} />
            <Text size="sm">Not completed (after start date)</Text>
          </Group>
          <Group gap="xs">
            <Box w={20} h={20} style={{ backgroundColor: '#ff6b6b', border: '1px solid #ccc' }} />
            <Text size="sm">Past date with no data (after start date)</Text>
          </Group>
          <Group gap="xs">
            <Box w={20} h={20} style={{ backgroundColor: '#ffffff', border: '1px solid #ccc' }} />
            <Text size="sm">Default (before start date or future)</Text>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
