'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Title,
  Text,
  Checkbox,
  Button,
  Stack,
  Group,
  Paper,
  ActionIcon,
  Select,
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

interface ChallengeGroup {
  id: number;
  name: string;
}

interface GroupMember {
  id: number;
  name: string;
  email: string;
}

export default function LoggingPage() {
  const { data: session } = useSession();
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

  const [groups, setGroups] = useState<ChallengeGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

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

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMembers(parseInt(selectedGroup));
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (session?.user?.id && !selectedUser) {
      setSelectedUser(session.user.id);
    }
  }, [session, selectedUser]);

  // Load log for current date and selected user
  useEffect(() => {
    if (selectedUser) {
      loadLog();
    }
  }, [currentDate, selectedUser, selectedGroup]);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      setGroups(data);

      if (data.length > 0) {
        setSelectedGroup(data[0].id.toString());
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadMembers = async (groupId: number) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadLog = async () => {
    if (!selectedUser) return;

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
      const params = new URLSearchParams({ date: dateStr });

      // If viewing another user's log, add user_id and group_id
      if (selectedUser !== session?.user?.id && selectedGroup) {
        params.append('user_id', selectedUser);
        params.append('group_id', selectedGroup);
      }

      const response = await fetch(`/api/logs?${params.toString()}`);
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
  const isViewingOtherUser = selectedUser !== session?.user?.id;
  const selectedMember = members.find((m) => m.id.toString() === selectedUser);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>Daily Logging</Title>
        <Group>
          {groups.length > 0 && (
            <>
              <Select
                placeholder="Select group"
                value={selectedGroup}
                onChange={setSelectedGroup}
                data={groups.map((g) => ({
                  value: g.id.toString(),
                  label: g.name,
                }))}
                style={{ width: 200 }}
              />
              {members.length > 0 && (
                <Select
                  placeholder="Select member"
                  value={selectedUser}
                  onChange={setSelectedUser}
                  data={members.map((m) => ({
                    value: m.id.toString(),
                    label: m.name || m.email,
                  }))}
                  style={{ width: 200 }}
                />
              )}
            </>
          )}
          {!isToday && (
            <Button onClick={goToToday} variant="light">
              Go to Today
            </Button>
          )}
        </Group>
      </Group>

      {isViewingOtherUser && selectedMember && (
        <Paper p="sm" withBorder style={{ backgroundColor: '#f0f7ff' }}>
          <Text size="sm" c="blue" fw={500}>
            Viewing logs for: {selectedMember.name || selectedMember.email} (Read-only)
          </Text>
        </Paper>
      )}

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
            disabled={loading || saving || log.is_completed || isViewingOtherUser}
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
            disabled={loading || saving || log.is_completed || isViewingOtherUser}
          />
          <Checkbox
            label="I have reached my goal of 100 grams of protein"
            checked={log.protein_goal_met}
            onChange={(e) =>
              handleCheckboxChange('protein_goal_met', e.currentTarget.checked)
            }
            disabled={loading || saving || log.is_completed || isViewingOtherUser}
          />
          <Checkbox
            label="I have not cheated today (eaten candy or junk-food)"
            checked={log.no_cheat_foods}
            onChange={(e) =>
              handleCheckboxChange('no_cheat_foods', e.currentTarget.checked)
            }
            disabled={loading || saving || log.is_completed || isViewingOtherUser}
          />
        </Stack>

        {!isViewingOtherUser && (
          <>
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
          </>
        )}
        {isViewingOtherUser && log.is_completed && (
          <Text c="green" fw={500} mt="md">
            ✓ Day completed!
          </Text>
        )}
      </Paper>
    </Stack>
  );
}
