
"use client";

import Link from "next/link";
import Image from "next/image";
import { PlusCircle, ListChecks, Info, Clock, LogIn, Plus, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { JoinGroupDialog } from "@/components/groups/join-group-dialog";

// Group type definition
export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastActivity?: string | Date; // Firestore Timestamp will be converted to ISO string
  imageUrl?: string;
  selfDestructAt: string | Date; // Firestore Timestamp will be converted to ISO string
  createdAt: string | Date; // Firestore Timestamp will be converted to ISO string
}

interface GroupListItemProps {
  group: Group;
}

function GroupListItem({ group }: GroupListItemProps) {
  const [timeRemainingText, setTimeRemainingText] = useState("");
  const [isPoofingSoon, setIsPoofingSoon] = useState(false);

  useEffect(() => {
    const calculateRemainingTime = () => {
      const now = new Date().getTime();
      const destructTime = new Date(group.selfDestructAt).getTime();
      const createdTime = new Date(group.createdAt).getTime();
      
      const totalDuration = destructTime - createdTime;
      const timeLeft = destructTime - now;

      if (timeLeft <= 0) {
        setTimeRemainingText("Poofed!");
        setIsPoofingSoon(false);
        return;
      }
      
      const percent = totalDuration > 0 ? Math.max(0, (timeLeft / totalDuration) * 100) : 0;
      setIsPoofingSoon(percent < 15 && percent > 0);

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemainingText(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemainingText(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemainingText(`${minutes}m`);
      } else if (timeLeft > 0) {
        setTimeRemainingText("<1m");
      } else {
         setTimeRemainingText("Poofing!");
      }
    };

    calculateRemainingTime();
    const intervalId = setInterval(calculateRemainingTime, 30000); // Update every 30 seconds
    return () => clearInterval(intervalId);
  }, [group.selfDestructAt, group.createdAt]);

  return (
    <Link href={`/groups/${group.id}`} className="block bg-card text-card-foreground py-3 px-4 rounded-lg shadow-tile hover:bg-card/95 transition-colors">
      <div className="flex items-center justify-between w-full">
        {/* Left: Group Name */}
        <div className="flex-grow">
          <p className="text-base font-semibold truncate">{group.name}</p>
        </div>

        {/* Middle: Avatar */}
        <div className="flex-shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={group.imageUrl || `https://placehold.co/64x64.png`} alt={group.name} data-ai-hint="group avatar" className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
        </div>

        {/* Right: Time */}
        <div className="flex-shrink-0 w-24 text-right">
            <span className={`text-sm font-medium ${isPoofingSoon && timeRemainingText !== "Poofed!" ? 'text-destructive animate-pulse' : ''}`}>
              {timeRemainingText}
            </span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading, refreshKey } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isJoinGroupDialogOpen, setJoinGroupDialogOpen] = useState(false);
  const router = useRouter();

  const fetchAndProcessGroups = useCallback(async () => {
    if (!user || !user.uid) {
      setIsLoadingGroups(false);
      setGroups([]);
      return;
    }
    setIsLoadingGroups(true);
    try {
      const groupsRef = collection(db, "groups");
      const q = query(
        groupsRef, 
        where("memberUserIds", "array-contains", user.uid),
        where("selfDestructAt", ">", new Date())
      );
      
      const querySnapshot = await getDocs(q);
      
      const activeGroups: Group[] = [];
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const selfDestructDate = (data.selfDestructAt as Timestamp).toDate();
        
        activeGroups.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          memberCount: data.memberUserIds?.length || 0,
          lastActivity: data.lastActivity ? (data.lastActivity as Timestamp).toDate().toISOString() : new Date().toISOString(),
          imageUrl: data.imageUrl,
          selfDestructAt: selfDestructDate.toISOString(),
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        });
      });
      
      activeGroups.sort((a, b) => new Date(a.selfDestructAt).getTime() - new Date(b.selfDestructAt).getTime());
      setGroups(activeGroups);

    } catch (error) {
      console.error("Error fetching active groups:", error);
    } finally {
      setIsLoadingGroups(false);
    }
  }, [user]);

  const handleGroupJoined = useCallback(() => {
    fetchAndProcessGroups();
  }, [fetchAndProcessGroups]);


  useEffect(() => {
    if (!authLoading) {
      fetchAndProcessGroups();
    }
  }, [authLoading, fetchAndProcessGroups, refreshKey]);


  if (authLoading || isLoadingGroups) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => 
            <div key={i} className="flex items-center p-4 space-x-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-1/4" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <JoinGroupDialog
        open={isJoinGroupDialogOpen}
        onOpenChange={setJoinGroupDialogOpen}
        onGroupJoined={handleGroupJoined}
      />
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Welcome, {user?.username || user?.email}!</h1>
            <p className="text-sm text-muted-foreground">Manage your Poof groups or start a new one.</p>
          </div>
        </div>

        {groups.length === 0 ? (
          <Alert className="max-w-2xl mx-auto shadow-md">
            <Info className="h-4 w-4" />
            <AlertTitle className="font-semibold">No Active Groups!</AlertTitle>
            <AlertDescription>
              You aren't part of any active Poof groups. Why not create one or join using an invite code?
              Expired groups can be found in the past groups archive.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Your Active Groups</h2>
            </div>
            <div className="space-y-3">
              {groups.map((group) => (
                <GroupListItem key={group.id} group={group} />
              ))}
            </div>
          </>
        )}

        <div className="mt-8 flex justify-end">
          <Button variant="link" asChild className="text-muted-foreground hover:text-primary p-0 h-auto">
              <Link href="/archive">
                  View Past Groups
                  <Archive className="ml-1.5 h-4 w-4" />
              </Link>
          </Button>
        </div>

      </div>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
        <Button asChild className="h-14 w-14 rounded-full shadow-lg">
            <Link href="/groups/create">
                <Plus className="h-6 w-6" />
                <span className="sr-only">Create Group</span>
            </Link>
        </Button>
        <Button
            variant="secondary"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setJoinGroupDialogOpen(true)}
        >
            <LogIn className="h-6 w-6" />
            <span className="sr-only">Join Group</span>
        </Button>
      </div>
    </>
  );
}
