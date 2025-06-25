
"use client";

import { Logo } from '@/components/shared/logo';
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { SplineBackground } from '@/components/auth/spline-background';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' || theme === 'system' ? 'dark' : 'light');
  };

  const effectiveTheme = theme === 'system' 
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
    : theme;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <SplineBackground />
      
      {isMounted && (
        <div className="absolute right-4 top-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {effectiveTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo iconSize={40} textSize="text-4xl" />
        </div>
        <div className="rounded-xl border bg-card/70 p-8 shadow-lg backdrop-blur-sm dark:bg-card/50 dark:shadow-white-form-shadow">
          {children}
        </div>
         <p className="text-center text-sm text-muted-foreground">
          Poof: Create group chats that... well, <em>poof</em>! Gone like magic.
        </p>
      </div>
    </div>
  );
}
