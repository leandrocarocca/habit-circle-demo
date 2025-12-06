import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Providers } from '@/components/Providers';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

export const metadata: Metadata = {
  title: "Habit Circle",
  description: "Track your habits and build better routines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>
          <MantineProvider>
            <Notifications />
            {children}
          </MantineProvider>
        </Providers>
      </body>
    </html>
  );
}
