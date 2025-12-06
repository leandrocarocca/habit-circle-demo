'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Paper,
  Stack,
  Group,
  Button,
  TextInput,
  Modal,
  Table,
  Badge,
  Text,
  Alert,
} from '@mantine/core';
import { IconPlus, IconUsers, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

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
  joined_at: string;
}

interface Invitation {
  id: number;
  group_name: string;
  tracking_start_date: string;
  inviter_name: string;
  inviter_email: string;
  status: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<ChallengeGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupStartDate, setNewGroupStartDate] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    loadGroups();
    loadInvitations();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/invitations');
      const data = await response.json();
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
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

  const handleCreateGroup = async () => {
    if (!newGroupName || !newGroupStartDate) {
      notifications.show({
        title: 'Error',
        message: 'Please fill in all fields',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          tracking_start_date: newGroupStartDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      notifications.show({
        title: 'Success',
        message: 'Group created successfully!',
        color: 'green',
      });

      setNewGroupName('');
      setNewGroupStartDate('');
      setCreateModalOpen(false);
      loadGroups();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create group',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !selectedGroup) {
      notifications.show({
        title: 'Error',
        message: 'Please enter an email address',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroup,
          invitee_email: inviteEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      notifications.show({
        title: 'Success',
        message: 'Invitation sent successfully!',
        color: 'green',
      });

      setInviteEmail('');
      setInviteModalOpen(false);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to send invitation',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = async (invitationId: number, action: 'accept' | 'decline') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to process invitation');
      }

      notifications.show({
        title: 'Success',
        message: `Invitation ${action}ed successfully!`,
        color: action === 'accept' ? 'green' : 'blue',
      });

      loadInvitations();
      loadGroups();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to process invitation',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewMembers = (groupId: number) => {
    setSelectedGroup(groupId);
    loadMembers(groupId);
    setMembersModalOpen(true);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Challenge Groups</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpen(true)}>
          Create Group
        </Button>
      </Group>

      {invitations.length > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} title="Pending Invitations" color="blue">
          <Stack gap="xs">
            {invitations.map((inv) => (
              <Group key={inv.id} justify="space-between">
                <div>
                  <Text size="sm" fw={500}>
                    {inv.group_name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Invited by {inv.inviter_name} ({inv.inviter_email})
                  </Text>
                  <Text size="xs" c="dimmed">
                    Start date: {new Date(inv.tracking_start_date).toLocaleDateString()}
                  </Text>
                </div>
                <Group gap="xs">
                  <Button
                    size="xs"
                    color="green"
                    onClick={() => handleInvitationResponse(inv.id, 'accept')}
                    loading={loading}
                  >
                    Accept
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    onClick={() => handleInvitationResponse(inv.id, 'decline')}
                    loading={loading}
                  >
                    Decline
                  </Button>
                </Group>
              </Group>
            ))}
          </Stack>
        </Alert>
      )}

      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          My Groups
        </Title>
        {groups.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            You are not a member of any groups yet. Create one or wait for an invitation!
          </Text>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Group Name</Table.Th>
                  <Table.Th>Start Date</Table.Th>
                  <Table.Th>Members</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {groups.map((group) => (
                  <Table.Tr key={group.id}>
                    <Table.Td>{group.name}</Table.Td>
                    <Table.Td>{new Date(group.tracking_start_date).toLocaleDateString()}</Table.Td>
                    <Table.Td>
                      <Badge size="sm" leftSection={<IconUsers size={12} />}>
                        {group.member_count}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button size="xs" variant="light" onClick={() => handleViewMembers(group.id)}>
                          View
                        </Button>
                        <Button
                          size="xs"
                          onClick={() => {
                            setSelectedGroup(group.id);
                            setInviteModalOpen(true);
                          }}
                        >
                          Invite
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Paper>

      {/* Create Group Modal */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Challenge Group"
      >
        <Stack>
          <TextInput
            label="Group Name"
            placeholder="Enter group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.currentTarget.value)}
          />
          <TextInput
            label="Start Date"
            type="date"
            value={newGroupStartDate}
            onChange={(e) => setNewGroupStartDate(e.currentTarget.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          <Button onClick={handleCreateGroup} loading={loading}>
            Create Group
          </Button>
        </Stack>
      </Modal>

      {/* Invite User Modal */}
      <Modal
        opened={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite User to Group"
      >
        <Stack>
          <TextInput
            label="User Email"
            placeholder="Enter user's email address"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.currentTarget.value)}
          />
          <Button onClick={handleInviteUser} loading={loading}>
            Send Invitation
          </Button>
        </Stack>
      </Modal>

      {/* View Members Modal */}
      <Modal
        opened={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        title="Group Members"
        size="lg"
      >
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Joined</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {members.map((member) => (
                <Table.Tr key={member.id}>
                  <Table.Td>{member.name}</Table.Td>
                  <Table.Td>{member.email}</Table.Td>
                  <Table.Td>{new Date(member.joined_at).toLocaleDateString()}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      </Modal>
    </Stack>
  );
}
