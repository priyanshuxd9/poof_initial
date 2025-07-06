
"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from "next-themes";
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Moon, Sun, Trash2, Laptop, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from '@/contexts/auth-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount } from '@/lib/firebase';
import { Slider } from '@/components/ui/slider';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [fontSize, setFontSize] = useState(90);

  // Load initial font size from localStorage
  useEffect(() => {
    const savedSize = localStorage.getItem('app-font-size');
    if (savedSize) {
      setFontSize(parseInt(savedSize, 10));
    } else {
      setFontSize(90); // Explicitly set to default if nothing is saved
    }
  }, []);

  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}%`;
    localStorage.setItem('app-font-size', newSize.toString());
  };

  const handleDeleteAccount = async () => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to delete an account.", variant: "destructive" });
        return;
    }
    setIsDeleting(true);
    try {
        await deleteUserAccount();
        toast({ title: "Account Deletion Started", description: "Your account and all associated data are being permanently deleted. This may take a moment." });
        // The onAuthStateChanged listener in auth-context will handle redirecting the user.
    } catch (error: any) {
        toast({ title: "Error", description: `Could not delete account: ${error.message}. You may need to sign in again for this operation.`, variant: "destructive" });
        setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
               <div>
                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                <Label htmlFor="light" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <Sun className="mb-2 h-5 w-5" />
                    Light
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                <Label htmlFor="dark" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <Moon className="mb-2 h-5 w-5" />
                    Dark
                </Label>
              </div>
              <div>
                <RadioGroupItem value="system" id="system" className="peer sr-only" />
                <Label htmlFor="system" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <Laptop className="mb-2 h-5 w-5" />
                    System
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Font Size</CardTitle>
            <CardDescription>
              Adjust the text size for the entire application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 pt-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <Slider
                value={[fontSize]}
                onValueChange={handleFontSizeChange}
                min={70}
                max={130}
                step={10}
                className="flex-1"
              />
              <span className="text-base font-semibold w-16 text-center">{fontSize}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-destructive">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Manage your account and irreversible actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex flex-col sm:flex-row justify-between items-center rounded-lg border border-border p-4">
                <div>
                    <h3 className="font-semibold">Log Out</h3>
                    <p className="text-sm text-muted-foreground">End your current session on this device.</p>
                </div>
                <Button variant="outline" onClick={signOut} className="mt-2 sm:mt-0 w-full sm:w-auto">
                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                </Button>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center rounded-lg border border-destructive/50 p-4">
                <div>
                    <h3 className="font-semibold text-destructive">Delete Account</h3>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                </div>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="mt-2 sm:mt-0 w-full sm:w-auto">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account, remove your data from our servers, and you will be removed
                        from all your groups.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                         {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
