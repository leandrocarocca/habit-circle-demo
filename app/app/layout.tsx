import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppShellLayout } from '@/components/AppShellLayout';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return <AppShellLayout>{children}</AppShellLayout>;
}
