'use client';

import { useEffect, useState } from 'react';
import { Title, SimpleGrid, Paper, Text, Stack, Group, RingProgress } from '@mantine/core';
import { IconTrophy, IconCalendar, IconFlame, IconChartBar } from '@tabler/icons-react';

interface Stats {
  total_points: number;
  week_points: number;
  month_points: number;
  days_logged: number;
  current_streak: number;
}

export default function AppPage() {
  const [stats, setStats] = useState<Stats>({
    total_points: 0,
    week_points: 0,
    month_points: 0,
    days_logged: 0,
    current_streak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color
  }: {
    title: string;
    value: number | string;
    icon: any;
    color: string;
  }) => (
    <Paper p="md" withBorder>
      <Group>
        <RingProgress
          size={80}
          roundCaps
          thickness={8}
          sections={[{ value: 100, color }]}
          label={
            <Icon size={24} stroke={1.5} style={{ color }} />
          }
        />
        <Stack gap={0}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text size="xl" fw={700}>
            {value}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );

  return (
    <Stack gap="lg">
      <Title order={2}>Dashboard</Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          title="Total Points"
          value={loading ? '...' : stats.total_points}
          icon={IconTrophy}
          color="yellow"
        />
        <StatCard
          title="This Week"
          value={loading ? '...' : stats.week_points}
          icon={IconChartBar}
          color="blue"
        />
        <StatCard
          title="This Month"
          value={loading ? '...' : stats.month_points}
          icon={IconCalendar}
          color="green"
        />
        <StatCard
          title="Current Streak"
          value={loading ? '...' : `${stats.current_streak} days`}
          icon={IconFlame}
          color="orange"
        />
      </SimpleGrid>

      <Paper p="lg" withBorder>
        <Stack gap="md">
          <Title order={3}>Quick Stats</Title>
          <Text>
            <strong>Total Days Logged:</strong> {stats.days_logged}
          </Text>
          <Text>
            <strong>Average Points Per Day:</strong>{' '}
            {stats.days_logged > 0
              ? (stats.total_points / stats.days_logged).toFixed(2)
              : '0.00'}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}
