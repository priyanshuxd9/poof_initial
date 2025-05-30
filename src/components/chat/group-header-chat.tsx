
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Users, Info, Clock, Share2, Copy, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface ChatGroupHeaderInfo {
  id: string;
  name: string;
  memberCount: number;
  imageUrl?: string;
  selfDestructAt: string | Date;
  createdAt: string | Date;
  inviteCode: string;
}

interface GroupHeaderChatProps {
  group: ChatGroupHeaderInfo;
}

export function GroupHeaderChat({ group }: GroupHeaderChatProps) {
  const { toast } = useToast();
  const [timeRemainingPercent, setTimeRemainingPercent] = useState(100);
  const [timeRemainingText, setTimeRemainingText] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const calculateRemainingTime = () => {
      const now = new Date().getTime();
      const destructTime = new Date(group.selfDestructAt).getTime();
      const createdTime = new Date(group.createdAt).getTime();
      
      const totalDuration = destructTime - createdTime;
      const timeLeft = destructTime - now;

      if (timeLeft <= 0) {
        setTimeRemainingPercent(0);
        setTimeRemainingText("Faded!");
        setShowWarning(false); // No warning if already faded
        return;
      }
      
      const percent = totalDuration > 0 ? Math.max(0, (timeLeft / totalDuration) * 100) : 0;
      setTimeRemainingPercent(percent);

      // Show warning if < 15% time left
      setShowWarning(percent < 15 && percent > 0);

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemainingText(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeRemainingText(`${hours}h ${minutes}m left`);
      } else if (minutes > 0) {
        setTimeRemainingText(`${minutes}m left`);
      } else {
        setTimeRemainingText("Fading soon!");
      }
    };

    calculateRemainingTime();
    const interval = setInterval(calculateRemainingTime, 1000 * 30); // Update every 30 seconds for more accuracy
    return () => clearInterval(interval);
  }, [group.selfDestructAt, group.createdAt]);

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    toast({
      title: "Invite Code Copied!",
      description: `Code: ${group.inviteCode}`,
    });
  };

  return (
    <div className="bg-card border-b p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="mr-1 md:hidden">
            <Link href="/dashboard">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={group.imageUrl || `https://placehold.co/100x100.png`} alt={group.name} data-ai-hint="group logo"/>
            <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(group.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{group.name}</h1>
            <div className="text-xs text-muted-foreground flex items-center">
              <Users className="h-3 w-3 mr-1" /> {group.memberCount} Members
              <span className="mx-1.5">·</span> 
              <Clock className="h-3 w-3 mr-1" /> {timeRemainingText}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyInviteCode}>
            <Share2 className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Invite</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyInviteCode}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Invite Code
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Info className="mr-2 h-4 w-4" />
                Group Info
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Progress value={timeRemainingPercent} className="h-1.5 mt-3" />
      {showWarning && timeRemainingText !== "Faded!" && (
        <Alert variant="destructive" className="mt-3 animate-pulse">
          <Clock className="h-4 w-4" />
          <AlertTitle>Warning!</AlertTitle>
          <AlertDescription>
            This group is scheduled to self-destruct soon!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

