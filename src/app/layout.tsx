/**
 * Root Layout for Bakame.ai
 * Sets up fonts, metadata, theme provider, and authentication
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Bakame.ai - Intelligent AI Assistant',
  description: 'A modern, intelligent AI chat assistant powered by OpenAI. Clean, minimal, and professional interface.',
  keywords: ['AI', 'chat', 'assistant', 'OpenAI', 'GPT-4', 'Bakame'],
  authors: [{ name: 'Bakame.ai' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow user zoom for accessibility
  userScalable: true,
  viewportFit: 'cover', // Support for notched devices (iPhone X+, etc.)
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9FAFB' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get user on server side - this works because server can read cookies
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log('[LAYOUT] Server-side user:', user?.email || 'guest');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#F9FAFB] dark:bg-[#0A0A0A] text-gray-900 dark:text-gray-100">
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
