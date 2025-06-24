
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, getInitials, formatDetailedTimestamp } from "@/lib/utils";
import type { AppUser } from "@/lib/firebase";
import { Timestamp, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { ThumbsUp } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";


export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
  reactions?: { [key: string]: string[] }; // e.g., { '👍': ['uid1', 'uid2'] }
}

interface ChatMessageProps {
  message: Message;
  sender?: AppUser;
  isCurrentUser: boolean;
}

export function ChatMessage({ message, sender, isCurrentUser }: ChatMessageProps) {
  const { user } = useAuth();
  const params = useParams();
  const groupId = params.groupId as string;

  const messageDate = message.createdAt?.toDate();
  const formattedTime = formatDetailedTimestamp(messageDate);

  const handleReaction = async (emoji: string) => {
    if (!user || !groupId || !message.id) return;

    const messageRef = doc(db, 'groups', groupId, 'messages', message.id);
    const reactionPath = `reactions.${emoji}`;
    
    const hasReacted = message.reactions?.[emoji]?.includes(user.uid);

    await updateDoc(messageRef, {
        [reactionPath]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  if (!sender) {
    return (
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
    );
  }
  
  const thumbsUpCount = message.reactions?.['👍']?.length || 0;
  const currentUserThumbedUp = user ? message.reactions?.['👍']?.includes(user.uid) : false;

  return (
    <div
      className={cn(
        "flex items-end gap-2 group",
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 self-start flex-shrink-0">
          <AvatarImage src={sender.photoURL || undefined} alt={sender.username} data-ai-hint="user avatar"/>
          <AvatarFallback>{getInitials(sender.username)}</AvatarFallback>
        </Avatar>
      )}
    
      <div className="flex flex-col items-start max-w-xs md:max-w-md lg:max-w-lg">
        <div
          className={cn(
            "relative flex flex-col rounded-xl px-3 py-2",
            isCurrentUser
              ? "bg-primary text-primary-foreground rounded-br-none items-end"
              : "bg-muted text-foreground rounded-bl-none items-start"
          )}
        >
          {!isCurrentUser && (
            <p className="text-xs font-semibold mb-1 text-primary">{sender.username}</p>
          )}
          <p className="whitespace-pre-wrap break-words text-left">{message.text}</p>
          <p className={cn(
            "text-xs mt-1",
            isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {formattedTime}
          </p>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
                "absolute -bottom-4 h-6 w-6 rounded-full bg-card shadow-md transition-all opacity-0 group-hover:opacity-100",
                isCurrentUser ? "left-1" : "right-1",
                {"opacity-100": currentUserThumbedUp || thumbsUpCount > 0}
            )}
            onClick={() => handleReaction('👍')}
            >
                <ThumbsUp className={cn("h-3 w-3", currentUserThumbedUp ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground")} />
            </Button>
        </div>

        {thumbsUpCount > 0 && (
             <div className={cn(
                 "flex items-center gap-1 text-xs text-muted-foreground bg-card px-1.5 py-0.5 rounded-full mt-1 shadow-sm",
                 isCurrentUser ? "self-end" : "self-start"
             )}>
                <ThumbsUp className="h-3 w-3 text-yellow-500" />
                <span>{thumbsUpCount}</span>
             </div>
        )}
      </div>

       {isCurrentUser && (
        <Avatar className="h-8 w-8 self-start flex-shrink-0">
          <AvatarImage src={sender.photoURL || undefined} alt={sender.username} data-ai-hint="user avatar"/>
          <AvatarFallback>{getInitials(sender.username)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
