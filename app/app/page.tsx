'use client';

import { useEffect, useState } from 'react';
import { Title, Paper, Text, Stack, Table, Select, Group, Box, Badge } from '@mantine/core';
import { IconTrophy, IconMedal, IconAward } from '@tabler/icons-react';

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
  gym_weeks: {
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

interface WeekCheckboxStat {
  name: string;
  label: string;
  type: string;
  points: number;
  weekly_threshold: number | null;
  completed_count: number;
  total_days: number;
  is_complete: boolean;
}

interface DailyLogData {
  user_id: number;
  log_date: string;
  checkbox_states: Record<string, boolean>;
  is_completed: boolean;
}

interface WeekStats {
  week_start: string;
  week_end: string;
  total_points: number;
  daily_points: number;
  weekly_points: number;
  checkbox_stats: Record<string, WeekCheckboxStat>;
  days_logged: number;
  total_days: number;
  daily_logs: Record<string, DailyLogData | null>;
}

interface MemberWeekStats {
  userId: number;
  userName: string;
  weekStats: WeekStats;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <IconTrophy size={24} color="gold" />;
    case 2:
      return <IconMedal size={24} color="silver" />;
    case 3:
      return <IconAward size={24} color="#CD7F32" />;
    default:
      return null;
  }
};

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return <Badge color="yellow" variant="filled">1st</Badge>;
    case 2:
      return <Badge color="gray" variant="filled">2nd</Badge>;
    case 3:
      return <Badge color="orange" variant="filled">3rd</Badge>;
    default:
      return <Badge color="blue" variant="light">{rank}th</Badge>;
  }
};

export default function AppPage() {
  const [groups, setGroups] = useState<ChallengeGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStats[]>([]);
  const [memberWeekStats, setMemberWeekStats] = useState<MemberWeekStats[]>([]);
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
      loadAllMemberWeekStats();
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
          `/api/stats-v2?user_id=${member.id}&group_id=${selectedGroup}`
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

  const loadAllMemberWeekStats = async () => {
    if (!selectedGroup) return;

    try {
      const weekStatsPromises = members.map(async (member) => {
        const response = await fetch(
          `/api/stats/current-week?user_id=${member.id}&group_id=${selectedGroup}`
        );
        const weekStats = await response.json();
        return {
          userId: member.id,
          userName: member.name || member.email,
          weekStats,
        };
      });

      const allWeekStats = await Promise.all(weekStatsPromises);
      setMemberWeekStats(allWeekStats);
    } catch (error) {
      console.error('Error loading member week stats:', error);
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
          <Title order={3} mb="md">All-Time Statistics</Title>

          {/* Desktop Table View */}
          <Box style={{ overflowX: 'auto' }} visibleFrom="sm">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Rank</Table.Th>
                  <Table.Th>Member</Table.Th>
                  <Table.Th>Total Points</Table.Th>
                  <Table.Th>Logged Food</Table.Th>
                  <Table.Th>Under Calorie Limit</Table.Th>
                  <Table.Th>Protein Goal</Table.Th>
                  <Table.Th>Days Cheated</Table.Th>
                  <Table.Th>Gym Weeks (3+)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {memberStats
                  .sort((a, b) => b.stats.total_points - a.stats.total_points)
                  .map((member, index) => (
                    <Table.Tr key={member.userId}>
                      <Table.Td>
                        <Group gap="xs">
                          {getRankIcon(index + 1)}
                          {getRankBadge(index + 1)}
                        </Group>
                      </Table.Td>
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
                      <Table.Td>
                        <Text size="sm">{member.stats.gym_weeks.total} weeks</Text>
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
                <Paper key={member.userId} p="md" withBorder style={{ backgroundColor: index === 0 ? '#fff9e6' : index === 1 ? '#f5f5f5' : index === 2 ? '#fff4e6' : undefined }}>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      {getRankIcon(index + 1)}
                      <Text fw={600} size="lg">{member.userName}</Text>
                    </Group>
                    {getRankBadge(index + 1)}
                  </Group>
                  <Group justify="space-between" mb="sm">
                    <Text size="sm" c="dimmed">Total Points</Text>
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
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Gym Weeks (3+)</Text>
                      <Text size="sm">{member.stats.gym_weeks.total} weeks</Text>
                    </Group>
                  </Stack>
                </Paper>
              ))}
          </Stack>
        </Paper>
      )}

      {memberWeekStats.length > 0 && (
        <Paper p="lg" withBorder>
          <Title order={3} mb="md">Current Week Overview</Title>
          <Text size="sm" c="dimmed" mb="md">
            Week: {new Date(memberWeekStats[0]?.weekStats.week_start).toLocaleDateString()} - {new Date(memberWeekStats[0]?.weekStats.week_end).toLocaleDateString()}
          </Text>

          <Stack gap="md">
            {memberWeekStats
              .sort((a, b) => b.weekStats.total_points - a.weekStats.total_points)
              .map((member, index) => {
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                return (
                  <Paper key={member.userId} p="md" withBorder style={{
                    backgroundColor: index === 0 ? '#fff9e6' : index === 1 ? '#f5f5f5' : index === 2 ? '#fff4e6' : undefined
                  }}>
                    <Group justify="space-between" mb="sm">
                      <Group gap="xs">
                        {getRankIcon(index + 1)}
                        <div>
                          <Text fw={600}>{member.userName}</Text>
                          <Text size="xs" c="dimmed">
                            {member.weekStats.days_logged}/{member.weekStats.total_days} days logged
                          </Text>
                        </div>
                      </Group>
                      <div style={{ textAlign: 'right' }}>
                        <Text fw={700} c="blue" size="lg">{member.weekStats.total_points} pts</Text>
                        <Text size="xs" c="dimmed">this week</Text>
                      </div>
                    </Group>

                    {/* Calendar View for Monday-Sunday */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                      gap: '8px',
                      marginTop: '12px'
                    }}>
                      {days.map((day) => {
                        const dayLog = member.weekStats.daily_logs[day];
                        const isLogged = dayLog?.is_completed || false;
                        const hasData = dayLog !== null;
                        const checkboxStates = dayLog?.checkbox_states || {};

                        // Get list of checked checkboxes for this day
                        const checkedBoxes = Object.keys(checkboxStates).filter(
                          key => checkboxStates[key] === true
                        );

                        // Emoji mapping for checkboxes (mobile-friendly)
                        const checkboxEmojis: Record<string, string> = {
                          'logged_food': '🍽️',
                          'within_calorie_limit': '🎯',
                          'protein_goal_met': '💪',
                          'no_cheat_foods': '✨',
                          'gym_session': '🏋️',
                        };

                        return (
                          <div
                            key={day}
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              backgroundColor: isLogged ? '#d4f4dd' : hasData ? '#fff3cd' : '#f8f9fa',
                              border: `2px solid ${isLogged ? '#40c057' : hasData ? '#ffd43b' : '#dee2e6'}`,
                              minHeight: '80px',
                            }}
                          >
                            <Text size="xs" fw={700} c="dimmed" ta="center" style={{ marginBottom: '6px' }}>
                              {day.substring(0, 3)}
                            </Text>
                            {hasData ? (
                              <Stack gap={2} align="center">
                                {checkedBoxes.map((checkboxName) => (
                                  <Text key={checkboxName} size="sm" style={{ lineHeight: 1.2 }}>
                                    {checkboxEmojis[checkboxName] || '✓'}
                                  </Text>
                                ))}
                                {checkedBoxes.length === 0 && (
                                  <Text size="xs" c="dimmed" ta="center">Started</Text>
                                )}
                              </Stack>
                            ) : (
                              <Text size="xl" c="dimmed" ta="center" mt="xs">-</Text>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Paper>
                );
              })}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
