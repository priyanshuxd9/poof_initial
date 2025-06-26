
"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, User, Calendar, Crown, Users, ImagePlus, Loader2, Timer, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { db, storage, getUsersFromIds, type AppUser, updateGroupTimer } from "@/lib/firebase";
import { doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getInitials } from "@/lib/utils";
import { format, differenceInDays, addDays } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import imageCompression from 'browser-image-compression';
import { Slider } from "@/components/ui/slider";
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

interface GroupInfo {
  name: string;
  description: string;
  ownerId: string;
  memberUserIds: string[];
  createdAt: string; // ISO string
  selfDestructAt: string; // ISO string
  imageUrl?: string;
}

export default function GroupInfoPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [owner, setOwner] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingTimer, setIsUpdatingTimer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for timer management
  const [newTimerDays, setNewTimerDays] = useState<number>(7);
  const [initialTimerDays, setInitialTimerDays] = useState<number>(7);


  useEffect(() => {
    if (!groupId) return;

    const fetchGroupInfo = async () => {
      setIsLoading(true);
      try {
        const groupDocRef = doc(db, "groups", groupId);
        const groupSnap = await getDoc(groupDocRef);

        if (!groupSnap.exists() || !groupSnap.data()?.memberUserIds?.includes(currentUser?.uid ?? '')) {
          setGroupInfo(null);
          return;
        }
        
        const groupData = groupSnap.data();
        const info: GroupInfo = {
          name: groupData.name,
          description: groupData.description,
          ownerId: groupData.ownerId,
          memberUserIds: groupData.memberUserIds,
          createdAt: (groupData.createdAt as Timestamp).toDate().toISOString(),
          selfDestructAt: (groupData.selfDestructAt as Timestamp).toDate().toISOString(),
          imageUrl: groupData.imageUrl,
        };
        setGroupInfo(info);

        const remainingDays = differenceInDays(new Date(info.selfDestructAt), new Date());
        const clampedRemainingDays = Math.max(1, Math.min(31, Math.ceil(remainingDays)));
        setNewTimerDays(clampedRemainingDays);
        setInitialTimerDays(clampedRemainingDays);


        const memberUsers = await getUsersFromIds(info.memberUserIds);
        setMembers(memberUsers);

        const ownerUser = memberUsers.find(u => u.uid === info.ownerId);
        setOwner(ownerUser || null);

      } catch (error) {
        console.error("Error fetching group info:", error);
        setGroupInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchGroupInfo();
    }
  }, [groupId, currentUser]);
  
  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !groupInfo) return;

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
      
      const filePath = `group-avatars/${groupInfo.ownerId}/${groupId}/avatar.jpg`;
      const sRef = storageRef(storage, filePath);
      await uploadBytes(sRef, compressedFile);
      const newImageUrl = await getDownloadURL(sRef);
      
      const groupDocRef = doc(db, "groups", groupId);
      await updateDoc(groupDocRef, {
        imageUrl: newImageUrl,
      });

      setGroupInfo(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);

      toast({ title: "Group Icon Updated!", description: "The new icon has been saved." });

    } catch (error) {
      console.error("Error updating group icon:", error);
      toast({ title: "Upload Failed", description: "Could not update the group icon. Please try again.", variant: "destructive" });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const handleUpdateTimer = async () => {
    if (!groupInfo) return;
    setIsUpdatingTimer(true);
    try {
        const newExpiryDate = addDays(new Date(), newTimerDays);
        await updateGroupTimer(groupId, newExpiryDate);
        setGroupInfo(prev => prev ? { ...prev, selfDestructAt: newExpiryDate.toISOString() } : null);
        setInitialTimerDays(newTimerDays);
        toast({ title: "Timer Updated!", description: `Group will now self-destruct on ${format(newExpiryDate, "MMM d, yyyy")}.` });
    } catch(error) {
        console.error("Error updating timer:", error);
        toast({ title: "Update Failed", description: "Could not update the timer. Please try again.", variant: "destructive" });
    } finally {
        setIsUpdatingTimer(false);
    }
  };

  const handlePoofNow = async () => {
    setIsUpdatingTimer(true);
    try {
        await updateGroupTimer(groupId, new Date()); // Set timer to now
        toast({ title: "Poof!", description: `The group "${groupInfo?.name}" has been archived.` });
        router.push('/archive');
    } catch(error) {
        console.error("Error poofing group:", error);
        toast({ title: "Action Failed", description: "Could not 'poof' the group. Please try again.", variant: "destructive" });
        setIsUpdatingTimer(false);
    }
  }


  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-8 px-4">
        <Skeleton className="h-9 w-40 mb-8" />
        <Card>
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-1/2 mx-auto mb-2" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-5 w-24" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="container mx-auto max-w-3xl py-8 px-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Group Not Found</h1>
        <p className="text-muted-foreground">This group might not exist, or you may not have permission to view it.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const newExpiryDate = addDays(new Date(), newTimerDays);
  const isTimerChanged = newTimerDays !== initialTimerDays;

  return (
    <div className="container mx-auto max-w-3xl py-8 sm:py-12 px-4">
       <Button variant="outline" asChild className="mb-6 group">
        <Link href={`/groups/${groupId}`}>
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Chat
        </Link>
      </Button>
      <div className="space-y-8">
        <Card className="shadow-lg">
            <CardHeader className="text-center border-b pb-6">
            <div className="relative flex justify-center mb-4 w-24 h-24 mx-auto">
                <Avatar className="h-full w-full border-4 border-primary">
                    <AvatarImage src={groupInfo.imageUrl || `https://placehold.co/100x100.png`} alt={groupInfo.name} data-ai-hint="group logo" className="object-cover"/>
                    <AvatarFallback className="bg-primary text-primary-foreground text-3xl">{getInitials(groupInfo.name)}</AvatarFallback>
                </Avatar>
                {currentUser?.uid === groupInfo.ownerId && (
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
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                    disabled={isUploading || isUpdatingTimer}
                />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">{groupInfo.name}</CardTitle>
            <CardDescription className="text-md max-w-prose mx-auto">{groupInfo.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                        <Crown className="h-5 w-5 text-primary"/>
                        <div>
                            <p className="font-semibold text-foreground">Group Creator</p>
                            <p className="text-muted-foreground">{owner?.username || 'Unknown'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary"/>
                        <div>
                            <p className="font-semibold text-foreground">Created On</p>
                            <p className="text-muted-foreground">{format(new Date(groupInfo.createdAt), "MMMM d, yyyy")}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><Users className="h-5 w-5"/> Members ({members.length})</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {members.map(member => (
                            <div key={member.uid} className="flex items-center gap-4 hover:bg-muted/50 p-2 rounded-md">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={member.photoURL || `https://placehold.co/40x40.png`} alt={member.username} data-ai-hint="user avatar" className="object-cover"/>
                                    <AvatarFallback className="bg-secondary text-secondary-foreground">{getInitials(member.username)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-foreground">{member.username}</span>
                                {member.uid === owner?.uid && <Crown className="h-4 w-4 text-yellow-500 ml-auto" title="Group Creator"/>}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>

        {currentUser?.uid === groupInfo.ownerId && (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Manage Group Timer</CardTitle>
                    <CardDescription>Adjust how long this group will exist before it "poofs".</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Timer className="h-6 w-6 text-muted-foreground" />
                            <Slider
                                value={[newTimerDays]}
                                onValueChange={(val) => setNewTimerDays(val[0])}
                                min={1}
                                max={31}
                                step={1}
                                className="flex-1"
                                disabled={isUpdatingTimer}
                            />
                            <span className="text-lg font-semibold w-24 text-center">
                                {newTimerDays} {newTimerDays === 1 ? 'day' : 'days'}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                            This group will now self-destruct on <span className="font-semibold text-foreground">{format(newExpiryDate, "MMMM d, yyyy 'at' p")}</span>.
                        </p>
                    </div>

                     <div className="flex flex-col sm:flex-row justify-between items-center rounded-lg border border-destructive/50 p-4">
                        <div>
                            <h3 className="font-semibold text-destructive">Poof Now</h3>
                            <p className="text-sm text-muted-foreground">Instantly and permanently delete all messages and archive this group.</p>
                        </div>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="mt-2 sm:mt-0 w-full sm:w-auto" disabled={isUpdatingTimer}>
                                <Trash2 className="mr-2 h-4 w-4" /> Poof Now
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will immediately archive the group and delete all its messages. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel disabled={isUpdatingTimer}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handlePoofNow}
                                disabled={isUpdatingTimer}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                                {isUpdatingTimer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Yes, Poof this group
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
                <CardFooter className="justify-end">
                     <Button onClick={handleUpdateTimer} disabled={!isTimerChanged || isUpdatingTimer}>
                        {isUpdatingTimer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Timer Changes
                    </Button>
                </CardFooter>
            </Card>
        )}
      </div>
    </div>
  );
}
