'use client';

import { useEffect, useState } from 'react';
import { Title, Paper, Text, Stack, Table, Select, Group, Box } from '@mantine/core';

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
  cheat_days: {
    total: number;
  };
}

interface ChallengeGroup {
  id: number;
  name: string;
  tracking_start_date: string;
  created_by: number;
  member_count: string;
}

interface GroupMember {
  id: number;
  name: string;
  email: string;
}

interface MemberStats {
  userId: number;
  userName: string;
  stats: Stats;
}

export default function AppPage() {
  const [groups, setGroups] = useState<ChallengeGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupMembers(parseInt(selectedGroup));
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (members.length > 0 && selectedGroup) {
      loadAllMemberStats();
    }
  }, [members, selectedGroup]);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      setGroups(data);

      // Auto-select first group if available
      if (data.length > 0) {
        setSelectedGroup(data[0].id.toString());
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: number) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadAllMemberStats = async () => {
    if (!selectedGroup) return;

    try {
      const statsPromises = members.map(async (member) => {
        const response = await fetch(
          `/api/stats?user_id=${member.id}&group_id=${selectedGroup}`
        );
        const stats = await response.json();
        return {
          userId: member.id,
          userName: member.name || member.email,
          stats,
        };
      });

      const allStats = await Promise.all(statsPromises);
      setMemberStats(allStats);
    } catch (error) {
      console.error('Error loading member stats:', error);
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

  if (groups.length === 0) {
    return (
      <Stack gap="lg">
        <Title order={2}>Dashboard</Title>
        <Paper p="lg" withBorder>
          <Text ta="center" c="dimmed">
            You are not a member of any groups yet. Create a group or wait for an invitation to get started!
          </Text>
        </Paper>
      </Stack>
    );
  }

  const selectedGroupData = groups.find((g) => g.id.toString() === selectedGroup);

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <Title order={2}>Dashboard</Title>
        <Select
          placeholder="Select a group"
          value={selectedGroup}
          onChange={setSelectedGroup}
          data={groups.map((g) => ({
            value: g.id.toString(),
            label: g.name,
          }))}
          style={{ width: '100%', maxWidth: 250 }}
        />
      </Stack>

      {selectedGroupData && (
        <Paper p="lg" withBorder>
          <Stack gap="xs">
            <Title order={3}>{selectedGroupData.name}</Title>
            <Text c="dimmed">
              Tracking since: {new Date(selectedGroupData.tracking_start_date).toLocaleDateString()}
            </Text>
            <Text c="dimmed">
              Members: {selectedGroupData.member_count}
            </Text>
          </Stack>
        </Paper>
      )}

      {memberStats.length > 0 && (
        <Paper p="lg" withBorder>
          <Title order={3} mb="md">Group Statistics</Title>

          {/* Desktop Table View */}
          <Box style={{ overflowX: 'auto' }} visibleFrom="sm">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Member</Table.Th>
                  <Table.Th>Total Points</Table.Th>
                  <Table.Th>Logged Food</Table.Th>
                  <Table.Th>Under Calorie Limit</Table.Th>
                  <Table.Th>Protein Goal</Table.Th>
                  <Table.Th>Days Cheated</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {memberStats
                  .sort((a, b) => b.stats.total_points - a.stats.total_points)
                  .map((member) => (
                    <Table.Tr key={member.userId}>
                      <Table.Td>
                        <Text fw={500}>{member.userName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={700} c="blue">{member.stats.total_points}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text size="sm">{member.stats.logged_food.total} days</Text>
                          <Text size="xs" c="dimmed">
                            {member.stats.logged_food.current_streak} streak
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text size="sm">{member.stats.calorie_limit.total} days</Text>
                          <Text size="xs" c="dimmed">
                            {member.stats.calorie_limit.current_streak} streak
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text size="sm">{member.stats.protein_goal.total} days</Text>
                          <Text size="xs" c="dimmed">
                            {member.stats.protein_goal.current_streak} streak
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{member.stats.cheat_days.total} days</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          </Box>

          {/* Mobile Card View */}
          <Stack gap="md" hiddenFrom="sm">
            {memberStats
              .sort((a, b) => b.stats.total_points - a.stats.total_points)
              .map((member, index) => (
                <Paper key={member.userId} p="md" withBorder style={{ backgroundColor: index === 0 ? '#f0f7ff' : undefined }}>
                  <Group justify="space-between" mb="sm">
                    <Text fw={600} size="lg">{member.userName}</Text>
                    <Text fw={700} c="blue" size="xl">{member.stats.total_points} pts</Text>
                  </Group>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Logged Food</Text>
                      <Text size="sm">{member.stats.logged_food.total} days ({member.stats.logged_food.current_streak} streak)</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Calorie Limit</Text>
                      <Text size="sm">{member.stats.calorie_limit.total} days ({member.stats.calorie_limit.current_streak} streak)</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Protein Goal</Text>
                      <Text size="sm">{member.stats.protein_goal.total} days ({member.stats.protein_goal.current_streak} streak)</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Days Cheated</Text>
                      <Text size="sm">{member.stats.cheat_days.total} days</Text>
                    </Group>
                  </Stack>
                </Paper>
              ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
