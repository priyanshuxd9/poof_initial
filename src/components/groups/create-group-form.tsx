
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Timer, Loader2, Users, Info, Trash2 } from "lucide-react";

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
import { db } from "@/lib/firebase"; // Import db
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore"; // Import Firestore functions

const createGroupSchema = z.object({
  groupName: z.string().min(3, { message: "Group name must be at least 3 characters." }).max(50, { message: "Group name must be at most 50 characters." }),
  groupPurpose: z.string().max(100, {message: "Purpose is too long (max 100)."}).optional(),
  groupTheme: z.string().max(50, {message: "Theme is too long (max 50)."}).optional(),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }).max(200, { message: "Description must be at most 200 characters." }),
  selfDestructTimerDays: z.number().min(1).max(31),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

// Function for creating group in Firestore
async function createGroupInFirestore(data: CreateGroupFormValues & { inviteCode: string }, ownerId: string) {
  console.log("Creating group in Firestore with data:", data, "Owner ID:", ownerId);
  
  const selfDestructDate = new Date();
  selfDestructDate.setDate(selfDestructDate.getDate() + data.selfDestructTimerDays);
  const selfDestructAtTimestamp = Timestamp.fromDate(selfDestructDate);

  const groupDocData = {
    name: data.groupName,
    description: data.description,
    purpose: data.groupPurpose || null,
    theme: data.groupTheme || null,
    inviteCode: data.inviteCode,
    ownerId: ownerId,
    // members: [ownerId], // This field was redundant and likely causing permission issues
    memberUserIds: [ownerId], // Storing UIDs for easier querying
    createdAt: serverTimestamp(),
    selfDestructAt: selfDestructAtTimestamp,
    imageUrl: null, // Placeholder for potential future group image
    lastActivity: serverTimestamp(), // Initialize last activity
  };

  try {
    const groupsCollectionRef = collection(db, "groups");
    const docRef = await addDoc(groupsCollectionRef, groupDocData);
    console.log("Group created with ID:", docRef.id);
    return { id: docRef.id };
  } catch (error) {
    console.error("Error creating group in Firestore:", error);
    throw error; // Re-throw the error to be caught by the caller
  }
}


export function CreateGroupForm() {
  const [isPending, startTransition] = useTransition();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth(); // Get the authenticated user

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
      const input: SuggestSelfDestructTimerInput = { topic: groupName, memberCount: 1 }; // Start with 1 member (owner)
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
    if (!user || !user.uid) { // More robust check
      toast({
        title: "Authentication Error",
        description: "User data is incomplete or you are not properly logged in. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        const inviteCode = generateInviteCode();
        const groupData = { ...values, inviteCode };
        // At this point, user and user.uid should be valid
        const group = await createGroupInFirestore(groupData, user.uid); 
        
        toast({
          title: "Group Created!",
          description: `Your group "${values.groupName}" is live. Invite code: ${inviteCode}`,
        });
        router.push(`/groups/${group.id}`); 
      } catch (error: any) {
        toast({
          title: "Creation Failed",
          description: error.message || "Could not create group.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
    
