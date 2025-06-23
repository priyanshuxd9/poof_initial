
"use client";

import Image from "next/image";
import { ThumbsUp, SmilePlus, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDetailedTimestamp, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { type AppUser } from "@/lib/firebase";

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatMessageData {
  id: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  timestamp: string | Date;
  reactions?: MessageReaction[];
}

interface ChatMessageProps {
  message: ChatMessageData;
  senderInfo?: AppUser;
}

export function ChatMessage({ message, senderInfo }: ChatMessageProps) {
  const { user: currentUser } = useAuth();
  const isCurrentUserMessage = message.senderId === currentUser?.uid;

  const senderUsername = senderInfo?.username || '...';
  const senderAvatarUrl = senderInfo?.photoURL;

  // TODO: Implement reaction handling logic
  const handleReaction = (emoji: string) => {
    console.log(`Reacted with ${emoji} to message ${message.id}`);
  };

  return (
    <div className={cn("flex gap-3 py-2 px-2 group", isCurrentUserMessage ? "justify-end" : "justify-start")}>
      {!isCurrentUserMessage && (
        <Avatar className="h-8 w-8 self-end">
          <AvatarImage src={senderAvatarUrl || `https://placehold.co/40x40.png`} alt={senderUsername} data-ai-hint="user avatar" />
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            {getInitials(senderUsername)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[70%] space-y-1", isCurrentUserMessage ? "items-end" : "items-start")}>
        <Card className={cn(
            "rounded-2xl shadow-sm", 
            isCurrentUserMessage ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none"
        )}>
          <CardContent className="p-3 space-y-2">
            {!isCurrentUserMessage && (
              <p className="text-xs font-medium">{senderUsername}</p>
            )}
            {message.text && <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>}
            {message.mediaUrl && message.mediaType === "image" && (
              <Image
                src={message.mediaUrl}
                alt="Shared image"
                width={300}
                height={200}
                className="rounded-lg object-cover max-w-full h-auto"
                data-ai-hint="chat image"
              />
            )}
            {message.mediaUrl && message.mediaType === "video" && (
              <video controls src={message.mediaUrl} className="rounded-lg max-w-full h-auto" width={300}>
                Your browser does not support the video tag.
              </video>
            )}
          </CardContent>
        </Card>
        <div className={cn("flex items-center gap-2 px-1", isCurrentUserMessage ? "justify-end" : "")}>
          <span className="text-xs text-muted-foreground">{formatDetailedTimestamp(message.timestamp)}</span>
          {/* Placeholder for reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1">
              {message.reactions.slice(0, 3).map(reaction => (
                <Button key={reaction.emoji} variant="ghost" size="xs" className="p-1 h-auto text-xs rounded-full bg-muted hover:bg-muted/80">
                  {reaction.emoji} <span className="ml-0.5">{reaction.count}</span>
                </Button>
              ))}
            </div>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/50" onClick={() => handleReaction("👍")}>
              <ThumbsUp size={14} className="text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/50">
              <SmilePlus size={14} className="text-muted-foreground" />
            </Button>
             <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/50">
              <MoreHorizontal size={14} className="text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
       {isCurrentUserMessage && (
        <Avatar className="h-8 w-8 self-end">
          <AvatarImage src={currentUser?.photoURL || `https://placehold.co/40x40.png`} alt={currentUser?.username || "You"} data-ai-hint="user avatar"/>
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {getInitials(currentUser?.username || currentUser?.email, "Me")}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
