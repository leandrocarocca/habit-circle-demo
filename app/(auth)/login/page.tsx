'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        notifications.show({
          title: 'Error',
          message: 'Invalid email or password',
          color: 'red',
        });
      } else {
        router.push('/app');
        router.refresh();
      }
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
      <Title ta="center">Welcome back!</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Don&apos;t have an account yet?{' '}
        <Anchor size="sm" href="/signup">
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
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
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
