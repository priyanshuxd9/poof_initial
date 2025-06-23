
import type { Metadata } from 'next';
import { Nova_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from 'next-themes';
import { FontSizeManager } from '@/components/shared/font-size-manager';

const novaMono = Nova_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-nova-mono',
});

export const metadata: Metadata = {
  title: 'poof - Ephemeral Group Chats',
  description: 'Create ephemeral group chats that Poof away (self-destruct).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${novaMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <FontSizeManager />
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
