
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import React, { useState, useTransition, useRef } from "react";
import { Loader2, User, ImagePlus } from "lucide-react";
import imageCompression from 'browser-image-compression';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { getInitials } from "@/lib/utils";
import { updateUserUsername } from "@/lib/firebase";

const profileSchema = z.object({
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(20, { message: "Username must be at most 20 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores." }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, updateUserContext, updateProfilePicture, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: { // Use `values` to pre-populate and react to external user changes
      username: user?.username || "",
    },
  });
  
  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const options = {
        maxSizeMB: 1,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      await updateProfilePicture(compressedFile);
      toast({ title: "Profile Picture Updated!", description: "Your new avatar has been saved." });
    } catch (error: any) {
      console.error("Error updating profile picture:", error);
      toast({ title: "Upload Failed", description: "Could not update your profile picture. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onSubmit = (values: ProfileFormValues) => {
    if (!user || !user.uid || !user.username) {
        toast({ title: "Error", description: "Not logged in or user data is missing.", variant: "destructive" });
        return;
    }
    if (values.username === user.username) {
        toast({ title: "No Changes", description: "The new username is the same as the old one." });
        return;
    }
    
    startTransition(async () => {
        try {
            await updateUserUsername(user.uid, user.username!, values.username);
            updateUserContext({ username: values.username });
            toast({ title: "Success", description: "Your username has been updated." });
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        }
    });
  };

  if (authLoading) {
      return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Profile</CardTitle>
          <CardDescription>Manage your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center space-x-4">
             <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-primary">
                  <AvatarImage src={user?.photoURL || `https://placehold.co/100x100.png`} alt={user?.username || "user"} data-ai-hint="profile avatar" className="object-cover" />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {getInitials(user?.username || user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div 
                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer group/icon"
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                    {isUploading ? (
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                    ) : (
                       <ImagePlus className="h-8 w-8 text-white group-hover/icon:scale-110 transition-transform" />
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    disabled={isUploading}
                />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{user?.username}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">Username</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input {...field} disabled={isPending} className="text-base"/>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending || !form.formState.isDirty}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
