'use client';

import { useState } from 'react';
import { AppShell, Group, Button, NavLink, Stack, Text, UnstyledButton, Menu } from '@mantine/core';
import { signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
  IconHome,
  IconSettings,
  IconLogout,
  IconClipboardList,
  IconCalendar,
  IconUsers,
  IconApple,
  IconChartBar,
  IconTemplate,
  IconDotsVertical,
  IconChefHat,
} from '@tabler/icons-react';

export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  // Main tabs shown in mobile bottom bar
  const mainNavItems = [
    { href: '/app', label: 'Home', icon: IconHome },
    { href: '/app/logging', label: 'Log', icon: IconClipboardList },
    { href: '/app/calorie-tracking', label: 'Calories', icon: IconChartBar },
    { href: '/app/meal-templates', label: 'Templates', icon: IconTemplate },
  ];

  // Items shown in "More" menu on mobile
  const moreNavItems = [
    { href: '/app/recipes', label: 'Recipes', icon: IconChefHat },
    { href: '/app/calendar', label: 'Calendar', icon: IconCalendar },
    { href: '/app/groups', label: 'Groups', icon: IconUsers },
    { href: '/app/food-items', label: 'Food Items', icon: IconApple },
    { href: '/app/settings', label: 'Settings', icon: IconSettings },
  ];

  const isMoreActive = moreNavItems.some(item => pathname === item.href);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: true } }}
      footer={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>Habit Circle</div>
          <Button
            variant="subtle"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={handleSignOut}
            visibleFrom="sm"
          >
            Sign out
          </Button>
          <Button
            variant="subtle"
            color="red"
            onClick={handleSignOut}
            hiddenFrom="sm"
            size="compact-sm"
          >
            <IconLogout size={16} />
          </Button>
        </Group>
      </AppShell.Header>

      {/* Desktop Navbar */}
      <AppShell.Navbar p="md" visibleFrom="sm">
        <NavLink
          href="/app"
          label="Home"
          leftSection={<IconHome size={16} />}
        />
        <NavLink
          href="/app/logging"
          label="Logging"
          leftSection={<IconClipboardList size={16} />}
        />
        <NavLink
          href="/app/calendar"
          label="Calendar"
          leftSection={<IconCalendar size={16} />}
        />
        <NavLink
          href="/app/groups"
          label="Groups"
          leftSection={<IconUsers size={16} />}
        />
        <NavLink
          href="/app/food-items"
          label="Food Items"
          leftSection={<IconApple size={16} />}
        />
        <NavLink
          href="/app/meal-templates"
          label="Meal Templates"
          leftSection={<IconTemplate size={16} />}
        />
        <NavLink
          href="/app/recipes"
          label="Recipes"
          leftSection={<IconChefHat size={16} />}
        />
        <NavLink
          href="/app/calorie-tracking"
          label="Calorie Tracking"
          leftSection={<IconChartBar size={16} />}
        />
        <NavLink
          href="/app/settings"
          label="Settings"
          leftSection={<IconSettings size={16} />}
        />
      </AppShell.Navbar>

      {/* Mobile Bottom Tabs */}
      <AppShell.Footer hiddenFrom="sm" withBorder>
        <Group
          h="100%"
          justify="space-around"
          align="center"
          px="xs"
          style={{ width: '100%' }}
        >
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <UnstyledButton
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 8px',
                  flex: 1,
                  color: isActive ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)',
                }}
              >
                <Icon size={20} stroke={isActive ? 2.5 : 1.5} />
                <Text size="10px" fw={isActive ? 600 : 400} mt={2}>
                  {item.label}
                </Text>
              </UnstyledButton>
            );
          })}
          <Menu position="top" withArrow>
            <Menu.Target>
              <UnstyledButton
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 8px',
                  flex: 1,
                  color: isMoreActive ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)',
                }}
              >
                <IconDotsVertical size={20} stroke={isMoreActive ? 2.5 : 1.5} />
                <Text size="10px" fw={isMoreActive ? 600 : 400} mt={2}>
                  More
                </Text>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              {moreNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Menu.Item
                    key={item.href}
                    leftSection={<Icon size={16} />}
                    onClick={() => router.push(item.href)}
                  >
                    {item.label}
                  </Menu.Item>
                );
              })}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Footer>

      <AppShell.Main
        style={{
          paddingBottom: 'calc(var(--app-shell-footer-height, 0px) + var(--mantine-spacing-md))',
        }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
