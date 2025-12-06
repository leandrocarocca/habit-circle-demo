'use client';

import { useEffect, useState } from 'react';
import { Title, Paper, Text, Stack, Table } from '@mantine/core';

interface Stats {
  total_points: number;
  tracking_start_date: string | null;
  logged_food: {
    total: number;
    current_streak: number;
  };
  calorie_limit: {
    total: number;
    current_streak: number;
  };
  protein_goal: {
    total: number;
    current_streak: number;
  };
  no_cheat: {
    total: number;
  };
}

export default function AppPage() {
  const [stats, setStats] = useState<Stats | null>(null);
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

  if (loading) {
    return (
      <Stack gap="lg">
        <Title order={2}>Dashboard</Title>
        <Text>Loading...</Text>
      </Stack>
    );
  }

  if (!stats) {
    return (
      <Stack gap="lg">
        <Title order={2}>Dashboard</Title>
        <Text>Error loading stats</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Dashboard</Title>

      <Paper p="lg" withBorder>
        <Stack gap="md">
          <Title order={3}>Total Points: {stats.total_points}</Title>
          {stats.tracking_start_date && (
            <Text c="dimmed">
              Tracking since: {new Date(stats.tracking_start_date).toLocaleDateString()}
            </Text>
          )}
        </Stack>
      </Paper>

      <Paper p="lg" withBorder>
        <Title order={3} mb="md">Habit Statistics</Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Habit</Table.Th>
              <Table.Th>Days Completed</Table.Th>
              <Table.Th>Current Streak</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Days Logged Food</Table.Td>
              <Table.Td>{stats.logged_food.total}</Table.Td>
              <Table.Td>{stats.logged_food.current_streak} days</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Days Under Calorie Limit</Table.Td>
              <Table.Td>{stats.calorie_limit.total}</Table.Td>
              <Table.Td>{stats.calorie_limit.current_streak} days</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Days Reached Protein Goal</Table.Td>
              <Table.Td>{stats.protein_goal.total}</Table.Td>
              <Table.Td>{stats.protein_goal.current_streak} days</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Days Not Cheating</Table.Td>
              <Table.Td>{stats.no_cheat.total}</Table.Td>
              <Table.Td>-</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
