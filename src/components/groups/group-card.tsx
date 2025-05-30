
"use client";

import Link from "next/link";
import Image from "next/image";
import { Users, MessageSquare, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatTimeAgo } from "@/lib/utils";
import { useEffect, useState } from "react";

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastActivity?: string | Date; // Or a more specific type if available
  imageUrl?: string;
  selfDestructAt: string | Date; // ISO string or Date object
  createdAt: string | Date; // ISO string or Date object for calculating total duration
}

interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
  const [timeRemainingPercent, setTimeRemainingPercent] = useState(100);
  const [timeRemainingText, setTimeRemainingText] = useState("");

  useEffect(() => {
    const calculateRemainingTime = () => {
      const now = new Date().getTime();
      const destructTime = new Date(group.selfDestructAt).getTime();
      const createdTime = new Date(group.createdAt).getTime();
      
      const totalDuration = destructTime - createdTime;
      const timeLeft = destructTime - now;

      if (timeLeft <= 0) {
        setTimeRemainingPercent(0);
        setTimeRemainingText("Poofed!");
        return;
      }
      
      const percent = totalDuration > 0 ? Math.max(0, (timeLeft / totalDuration) * 100) : 0;
      setTimeRemainingPercent(percent);

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
        setTimeRemainingText("Poofing soon!");
      }
    };

    calculateRemainingTime();
    const interval = setInterval(calculateRemainingTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [group.selfDestructAt, group.createdAt]);


  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
      <CardHeader className="p-4 sm:p-5">
        {group.imageUrl && (
          <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
            <Image 
              src={group.imageUrl} 
              alt={group.name} 
              layout="fill" 
              objectFit="cover" 
              data-ai-hint="group cover"
            />
          </div>
        )}
        <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">{group.name}</CardTitle>
        <CardDescription className="text-sm sm:text-base line-clamp-2 h-10 sm:h-12">{group.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 flex-grow space-y-3">
        <div className="flex items-center text-xs sm:text-sm text-muted-foreground space-x-3">
          <span className="flex items-center"><Users className="mr-1.5 h-4 w-4" /> {group.memberCount} Members</span>
          {group.lastActivity && (
            <span className="flex items-center"><MessageSquare className="mr-1.5 h-4 w-4" /> Last active {formatTimeAgo(group.lastActivity)}</span>
          )}
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-primary flex items-center">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Time Remaining
            </span>
            <Badge variant={timeRemainingPercent < 15 ? "destructive" : "secondary"} className="text-xs">
              {timeRemainingText}
            </Badge>
          </div>
          <Progress value={timeRemainingPercent} className="h-2" />
           {timeRemainingPercent < 15 && timeRemainingPercent > 0 && (
             <p className="text-xs text-destructive mt-1">Warning: This group will poof soon!</p>
           )}
        </div>
      </CardContent>
      <CardFooter className="p-4 sm:p-5 bg-muted/30">
        <Button asChild className="w-full group" variant="default" size="lg">
          <Link href={`/groups/${group.id}`}>
            Enter Group <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
