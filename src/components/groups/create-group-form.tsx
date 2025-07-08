
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import React, { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, Trash2, ImagePlus } from "lucide-react";
import imageCompression from 'browser-image-compression';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { generateInviteCode } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { db, storage } from "@/lib/firebase";
import { collection, doc, serverTimestamp, Timestamp, setDoc, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const createGroupSchema = z.object({
  groupName: z.string().min(3, { message: "Group name must be at least 3 characters." }).max(50, { message: "Group name must be at most 50 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }).max(200, { message: "Description must be at most 200 characters." }),
  selfDestructTimerDays: z.number().min(1).max(31),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

export function CreateGroupForm() {
  const [isPending, startTransition] = useTransition();
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      groupName: "",
      description: "",
      selfDestructTimerDays: 7,
    },
  });

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive" });
        return;
      }
      
      setImagePreview(URL.createObjectURL(file));
      
      try {
        const options = {
          maxSizeMB: 1,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        setGroupImage(compressedFile);
      } catch (error) {
        console.error("Image compression error:", error);
        setGroupImage(file);
      }
    }
  };

  const onSubmit = (values: CreateGroupFormValues) => {
    if (!user || !user.uid) {
      toast({
        title: "Authentication Error",
        description: "User data is incomplete or you are not properly logged in. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const groupDocRef = doc(collection(db, "groups"));
      const groupId = groupDocRef.id;

      try {
        // Step 1: Create the initial group document in Firestore so it exists.
        const inviteCode = generateInviteCode();
        const selfDestructDate = new Date();
        selfDestructDate.setDate(selfDestructDate.getDate() + values.selfDestructTimerDays);
        
        const initialGroupDocData = {
          name: values.groupName,
          description: values.description,
          inviteCode: inviteCode,
          ownerId: user.uid,
          memberUserIds: [user.uid],
          createdAt: serverTimestamp(),
          selfDestructAt: Timestamp.fromDate(selfDestructDate),
          imageUrl: null, // Start with a null image URL
          lastActivity: serverTimestamp(),
        };

        await setDoc(groupDocRef, initialGroupDocData);

        // Step 2: If an image was selected, upload it now. The storage rule will pass because the ownerId is in the path.
        if (groupImage) {
          const filePath = `group-avatars/${user.uid}/${groupId}/avatar.jpg`;
          const sRef = storageRef(storage, filePath);
          await uploadBytes(sRef, groupImage);
          const finalImageUrl = await getDownloadURL(sRef);
          
          // Step 3: Update the group document with the final image URL.
          await updateDoc(groupDocRef, { imageUrl: finalImageUrl });
        }
        
        toast({
          title: "Group Created!",
          description: `Your group "${values.groupName}" is ready.`
        });
        
        router.push(`/groups/${groupId}`);

      } catch (error: any) {
        console.error("Group creation failed:", error);
        toast({
          title: "Creation Failed",
          description: error.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        // Note: A more robust implementation might delete the Firestore doc if the image upload fails.
      }
    });
  };

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormItem>
          <FormLabel className="text-lg">Group Image (Optional)</FormLabel>
          <FormControl>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 cursor-pointer border" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage src={imagePreview || undefined} alt="Group image preview" data-ai-hint="group logo" className="object-cover"/>
                <AvatarFallback className="bg-muted hover:bg-muted/80 transition-colors">
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                disabled={isPending}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                Choose Image
              </Button>
            </div>
          </FormControl>
          <FormDescription>
            Click the icon or button to upload a group image. It will be compressed automatically.
          </FormDescription>
          <FormMessage />
        </FormItem>


        <FormField
          control={form.control}
          name="groupName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Group Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Weekend Warriors, Project Phoenix" {...field} disabled={isPending} className="text-base py-2.5"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us about your group..." {...field} rows={3} disabled={isPending} className="text-base py-2.5"/>
              </FormControl>
              <FormDescription>A brief, catchy description for your group.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="selfDestructTimerDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Self-Destruct Timer (1-31 days)</FormLabel>
              <div className="flex items-center gap-4">
                <Trash2 className="h-6 w-6 text-muted-foreground" />
                <FormControl className="flex-grow">
                  <Slider
                    min={1}
                    max={31}
                    step={1}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    disabled={isPending}
                  />
                </FormControl>
                <span className="text-lg font-semibold w-12 text-center">{field.value} {field.value === 1 ? "day" : "days"}</span>
              </div>
              <FormDescription>The group and all its contents will be deleted after this period.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full text-lg py-3" disabled={isPending || !user}>
          {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Users className="mr-2 h-5 w-5" />}
          Create Poof Group
        </Button>
      </form>
    </Form>
    </>
  );
}
