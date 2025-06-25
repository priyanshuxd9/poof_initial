
"use client";

import { Logo } from '@/components/shared/logo';
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

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
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 animated-gradient-bg">
      
      {isMounted && (
        <div className="absolute right-4 top-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="text-white hover:bg-white/10 hover:text-white"
          >
            {effectiveTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      )}

      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo iconSize={40} textSize="text-4xl" className="[&>h1]:text-white" />
        </div>
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {children}
        </div>
         <p className="text-center text-sm text-gray-300">
          Poof: Create group chats that... well, <em>poof</em>! Gone like magic.
        </p>
      </div>
    </div>
  );
}
