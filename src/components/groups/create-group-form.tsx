
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import React, { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Timer, Loader2, Users, Trash2, ImagePlus } from "lucide-react";
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
import { generateGroupDescription, GenerateGroupDescriptionInput } from "@/ai/flows/generate-group-description";
import { suggestSelfDestructTimer, SuggestSelfDestructTimerInput } from "@/ai/flows/suggest-self-destruct-timer";
import { useAuth } from "@/contexts/auth-context";
import { db, storage } from "@/lib/firebase";
import { collection, doc, serverTimestamp, Timestamp, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const createGroupSchema = z.object({
  groupName: z.string().min(3, { message: "Group name must be at least 3 characters." }).max(50, { message: "Group name must be at most 50 characters." }),
  groupPurpose: z.string().max(100, {message: "Purpose is too long (max 100)."}).optional(),
  groupTheme: z.string().max(50, {message: "Theme is too long (max 50)."}).optional(),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }).max(200, { message: "Description must be at most 200 characters." }),
  selfDestructTimerDays: z.number().min(1).max(31),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

export function CreateGroupForm() {
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
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
      groupPurpose: "",
      groupTheme: "",
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
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        setGroupImage(compressedFile);
        toast({ title: "Image Selected", description: `Compressed from ${(file.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB.` });
      } catch (error) {
        console.error("Image compression error:", error);
        setGroupImage(file);
        toast({ title: "Compression Failed", description: "Using original image.", variant: "destructive" });
      }
    }
  };

  const handleGenerateDescription = async () => {
    const groupName = form.getValues("groupName");
    const groupPurpose = form.getValues("groupPurpose");
    const groupTheme = form.getValues("groupTheme");

    if (!groupName) {
      toast({ title: "Group Name Required", description: "Please enter a group name to generate a description.", variant: "destructive" });
      return;
    }
    setIsAiLoading(true);
    try {
      const input: GenerateGroupDescriptionInput = { 
        groupName, 
        groupPurpose: groupPurpose || "General chat", 
        groupTheme: groupTheme || "Casual" 
      };
      const result = await generateGroupDescription(input);
      if (result.description) {
        form.setValue("description", result.description.substring(0,200)); 
        toast({ title: "Description Generated!", description: "AI has suggested a description for your group." });
      }
    } catch (error) {
      toast({ title: "AI Error", description: "Could not generate description.", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSuggestTimer = async () => {
    const groupName = form.getValues("groupName"); 
    if (!groupName) {
      toast({ title: "Group Name Required", description: "Please enter a group name to suggest a timer.", variant: "destructive" });
      return;
    }
    setIsAiLoading(true);
    try {
      const input: SuggestSelfDestructTimerInput = { topic: groupName, memberCount: 1 };
      const result = await suggestSelfDestructTimer(input);
      if (result.durationDays) {
        form.setValue("selfDestructTimerDays", Math.max(1, Math.min(31, result.durationDays)));
        toast({ title: "Timer Suggested!", description: result.reasoning });
      }
    } catch (error) {
      toast({ title: "AI Error", description: "Could not suggest timer.", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
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
      try {
        // 1. Generate a new group document reference to get a unique ID upfront.
        const groupDocRef = doc(collection(db, "groups"));
        const groupId = groupDocRef.id;

        let finalImageUrl: string | null = null;

        // 2. If an image was selected, upload it to Storage using the new groupId.
        if (groupImage) {
          const filePath = `group-avatars/${groupId}/avatar.jpg`;
          const sRef = storageRef(storage, filePath);
          await uploadBytes(sRef, groupImage);
          finalImageUrl = await getDownloadURL(sRef);
        }
        
        // 3. Prepare the complete group document data.
        const inviteCode = generateInviteCode();
        const selfDestructDate = new Date();
        selfDestructDate.setDate(selfDestructDate.getDate() + values.selfDestructTimerDays);
        
        const groupDocData = {
          name: values.groupName,
          description: values.description,
          purpose: values.groupPurpose || null,
          theme: values.groupTheme || null,
          inviteCode: inviteCode,
          ownerId: user.uid,
          memberUserIds: [user.uid],
          createdAt: serverTimestamp(),
          selfDestructAt: Timestamp.fromDate(selfDestructDate),
          imageUrl: finalImageUrl,
          lastActivity: serverTimestamp(),
        };

        // 4. Create the document in Firestore with a single setDoc call.
        await setDoc(groupDocRef, groupDocData);

        toast({
          title: "Group Created!",
          description: `Your group "${values.groupName}" is live. Invite code: ${inviteCode}`,
        });
        router.push(`/groups/${groupId}`); 
      } catch (error: any) {
        console.error("Group creation failed:", error);
        toast({
          title: "Creation Failed",
          description: error.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormItem>
          <FormLabel className="text-lg">Group Image (Optional)</FormLabel>
          <FormControl>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 cursor-pointer border" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage src={imagePreview || undefined} alt="Group image preview" className="object-cover"/>
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
                disabled={isPending || isAiLoading}
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending || isAiLoading}>
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
                <Input placeholder="e.g., Weekend Warriors, Project Phoenix" {...field} disabled={isPending || isAiLoading} className="text-base py-2.5"/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="groupPurpose"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Group Purpose (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Planning a trip, Book club" {...field} disabled={isPending || isAiLoading} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="groupTheme"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Group Theme (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., Fun, Serious, Tech" {...field} disabled={isPending || isAiLoading} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Description</FormLabel>
              <div className="flex items-start gap-2">
                <FormControl className="flex-grow">
                  <Textarea placeholder="Tell us about your group..." {...field} rows={3} disabled={isPending || isAiLoading} className="text-base py-2.5"/>
                </FormControl>
                <Button type="button" variant="outline" size="icon" onClick={handleGenerateDescription} disabled={isPending || isAiLoading || !form.getValues("groupName")} aria-label="Generate Description with AI" className="shrink-0 mt-1">
                  {isAiLoading && form.formState.dirtyFields.description === undefined ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
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
                    disabled={isPending || isAiLoading}
                  />
                </FormControl>
                <span className="text-lg font-semibold w-12 text-center">{field.value} {field.value === 1 ? "day" : "days"}</span>
                 <Button type="button" variant="outline" size="icon" onClick={handleSuggestTimer} disabled={isPending || isAiLoading || !form.getValues("groupName")} aria-label="Suggest Timer with AI" className="shrink-0">
                   {isAiLoading && form.formState.dirtyFields.selfDestructTimerDays === undefined ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}
                </Button>
              </div>
              <FormDescription>The group and all its contents will be deleted after this period.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full text-lg py-3" disabled={isPending || isAiLoading || !user}>
          {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Users className="mr-2 h-5 w-5" />}
          Create Poof Group
        </Button>
      </form>
    </Form>
  );
}
