/**
 * Root Layout for Bakame.ai
 * Sets up fonts, metadata, and theme provider
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bakame.ai - Intelligent AI Assistant',
  description: 'A modern, intelligent AI chat assistant powered by OpenAI. Clean, minimal, and professional interface.',
  keywords: ['AI', 'chat', 'assistant', 'OpenAI', 'GPT-4', 'Bakame'],
  authors: [{ name: 'Bakame.ai' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9FAFB' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#F9FAFB] dark:bg-[#0A0A0A] text-gray-900 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
