
"use client";

import Link from "next/link";
import Image from "next/image";
import { PlusCircle, ListChecks, Info, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, formatTimeAgo } from "@/lib/utils";
import { useState, useEffect } from "react";
import { JoinGroupDialog } from "@/components/groups/join-group-dialog"; // Import the new dialog

// Group type definition
export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastActivity?: string | Date;
  imageUrl?: string;
  selfDestructAt: string | Date;
  createdAt: string | Date;
}

// Mock data for groups - replace with actual data fetching
const mockGroupsData: Group[] = [
  {
    id: "1",
    name: "Weekend Adventurers",
    description: "Planning epic weekend trips and sharing cool finds. Open to all thrill-seekers!",
    memberCount: 12,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    imageUrl: "https://placehold.co/600x338.png",
    selfDestructAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days from now
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // Created 2 days ago
  },
  {
    id: "2",
    name: "Project Poof Planning",
    description: "Internal discussion for the Poof app development. Next deadline: UI freeze.",
    memberCount: 5,
    lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    imageUrl: "https://placehold.co/600x338.png",
    selfDestructAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(), // 1 day from now
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString(), // Created 29 days ago
  },
    {
    id: "3",
    name: "Book Club Readers",
    description: "Discussing the latest sci-fi novel and classic literature. Spoilers allowed!",
    memberCount: 25,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), // 1 day ago
    imageUrl: "https://placehold.co/600x338.png",
    selfDestructAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days from now
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // Created 5 days ago
  },
];

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

  const lastActivityDisplay = group.lastActivity 
    ? formatTimeAgo(group.lastActivity)
    : group.description.substring(0, 45) + (group.description.length > 45 ? "..." : "");

  return (
    <Link href={`/groups/${group.id}`} className="block hover:bg-muted/30 transition-colors rounded-lg">
      <div className="flex items-center p-3 sm:p-4 space-x-3 sm:space-x-4 border-b last:border-b-0">
        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
          <AvatarImage src={group.imageUrl || `https://placehold.co/64x64.png`} alt={group.name} data-ai-hint="group avatar" />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
            {getInitials(group.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-lg font-semibold text-foreground truncate">{group.name}</p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{lastActivityDisplay}</p>
        </div>
        <div className="flex flex-col items-end text-right ml-2 flex-shrink-0 w-20 sm:w-24">
          <span className={`text-xs sm:text-sm font-medium ${isPoofingSoon && timeRemainingText !== "Poofed!" ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}>
            {timeRemainingText}
          </span>
          {isPoofingSoon && timeRemainingText !== "Poofed!" && (
            <span className="text-xs text-destructive items-center flex gap-1">
              <Clock className="h-3 w-3"/> Poofing!
            </span>
           )}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  // TODO: Fetch actual groups for the user
  const groups = [...mockGroupsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <Skeleton className="h-10 w-48" />
          <div className="flex space-x-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
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
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user?.username || user?.email}!</h1>
          <p className="text-muted-foreground">Manage your Poof groups or start a new one.</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/groups/create">
              <PlusCircle className="mr-2 h-5 w-5" /> Create Group
            </Link>
          </Button>
          <JoinGroupDialog /> {/* Replace old button with the dialog component */}
        </div>
      </div>

      {groups.length === 0 ? (
        <Alert className="max-w-2xl mx-auto shadow-md">
          <Info className="h-4 w-4" />
          <AlertTitle className="font-semibold">No Groups Yet!</AlertTitle>
          <AlertDescription>
            You're not part of any Poof groups. Why not create one or join using an invite code?
            Poof groups are temporary and will disappear after a set time.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">Your Active Groups</h2>
          </div>
          <div className="bg-card rounded-xl shadow-lg border divide-y divide-border">
            {groups.map((group) => (
              <GroupListItem key={group.id} group={group} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
