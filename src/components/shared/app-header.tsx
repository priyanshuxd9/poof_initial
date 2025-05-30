
"use client";

import Link from "next/link";
import { LogOut, UserCircle, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes"; // Assuming next-themes is or will be installed for theme toggling

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";

// Mock useTheme hook if next-themes is not available
const useMockTheme = () => {
  const [theme, setThemeState] = React.useState('light');
  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);
  return { theme, setTheme: toggleTheme };
};


export function AppHeader() {
  const { user, signOut } = useAuth();
  // const { theme, setTheme } = useTheme(); // Use this if next-themes is installed
   const { theme, setTheme } = useMockTheme(); // Using mock for now
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "P"; // Poof
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };

  if (!isMounted) {
    return ( // Skeleton loader for header
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between max-w-screen-2xl">
          <div className="h-8 w-24 bg-muted rounded"></div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-muted rounded-full"></div>
            <div className="h-10 w-10 bg-muted rounded-full"></div>
          </div>
        </div>
      </header>
    );
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <Logo className="hidden sm:flex" />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-primary hover:border-accent transition-colors">
                    <AvatarImage src={user.photoURL || `https://placehold.co/100x100.png`} alt={user.username || "User"} data-ai-hint="profile avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.username || user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
// React import for mock theme hook
import React, { useEffect } from "react";
