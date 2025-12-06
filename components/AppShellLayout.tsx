'use client';

import { useState } from 'react';
import { AppShell, Burger, Group, Button, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  IconHome,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';

export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>Habit Circle</div>
          </Group>
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          href="/app"
          label="Home"
          leftSection={<IconHome size={16} />}
        />
        <NavLink
          href="/app/settings"
          label="Settings"
          leftSection={<IconSettings size={16} />}
        />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
