'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Text,
  Anchor,
  Stack,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        notifications.show({
          title: 'Error',
          message: data.error || 'Something went wrong',
          color: 'red',
        });
        return;
      }

      notifications.show({
        title: 'Success',
        message: 'Account created successfully! Redirecting to login...',
        color: 'green',
      });

      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Something went wrong',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Create an account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{' '}
        <Anchor size="sm" href="/login">
          Sign in
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="Your name"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <Button type="submit" fullWidth loading={loading}>
              Create account
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
