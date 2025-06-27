"use client";

import { useState } from "react";
import NextImage from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getInitials, formatDetailedTimestamp, formatFileSize } from "@/lib/utils";
import type { AppUser } from "@/lib/firebase";
import { Timestamp, doc, writeBatch, arrayUnion, arrayRemove } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { SmilePlus, Download, FileText } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import { format } from 'date-fns';


export interface Message {
  id: string;
  text?: string;
  senderId: string;
  createdAt: Timestamp;
  reactions?: { [key: string]: string[] }; // e.g., { '👍': ['uid1', 'uid2'] }
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  fileName?: string;
  fileSize?: number;
}

interface ChatMessageProps {
  message: Message;
  sender?: AppUser;
  isCurrentUser: boolean;
  membersMap: Map<string, AppUser>;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function ChatMessage({ message, sender, isCurrentUser, membersMap }: ChatMessageProps) {
  const { user } = useAuth();
  const params = useParams();
  const groupId = params.groupId as string;
  const [popoverOpen, setPopoverOpen] = useState(false);

  const messageDate = message.createdAt?.toDate();

  const handleReaction = async (newEmoji: string) => {
    if (!user || !groupId || !message.id) return;
    setPopoverOpen(false);

    const messageRef = doc(db, 'groups', groupId, 'messages', message.id);
    const reactions = message.reactions || {};
    let currentUserReaction: string | null = null;

    // Find user's current reaction
    for (const emoji in reactions) {
        if (reactions[emoji]?.includes(user.uid)) {
            currentUserReaction = emoji;
            break;
        }
    }
    
    const batch = writeBatch(db);

    // If user has an existing reaction, remove it
    if (currentUserReaction) {
        const oldReactionPath = `reactions.${currentUserReaction}`;
        batch.update(messageRef, { [oldReactionPath]: arrayRemove(user.uid) });
    }

    // If the new reaction is different from the old one (or if there was no old one), add it.
    // This logic handles toggling off the same reaction.
    if (currentUserReaction !== newEmoji) {
        const newReactionPath = `reactions.${newEmoji}`;
        batch.update(messageRef, { [newReactionPath]: arrayUnion(user.uid) });
    }

    await batch.commit();
  };

  const linkifyText = (text: string) => {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    if (!text) return text;
    
    const matches = [...text.matchAll(urlRegex)];

    if (matches.length === 0) {
      return text;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((match, i) => {
      const url = match[0];
      const index = match.index || 0;

      // Push the text before the match
      if (index > lastIndex) {
        elements.push(text.substring(lastIndex, index));
      }

      // Push the link
      elements.push(
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
          onClick={(e) => e.stopPropagation()} // Prevent popover trigger
        >
          {url}
        </a>
      );

      lastIndex = index + url.length;
    });

    // Push the remaining text after the last match
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return elements;
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
  
  const validReactions = Object.entries(message.reactions || {}).filter(
    ([, uids]) => uids && uids.length > 0
  );

  const MessageContent = () => (
    <>
        {message.mediaUrl && (
            <div className="relative group/media" style={{ marginBottom: message.text ? '0.5rem' : 0 }}>
                {message.mediaType === 'image' ? (
                     <NextImage 
                        src={message.mediaUrl}
                        alt={message.fileName || "Shared image"}
                        width={300}
                        height={300}
                        className="rounded-lg object-cover max-h-[400px] w-auto"
                        unoptimized // Required for external storage URLs in Next.js
                     />
                ) : message.mediaType === 'video' ? (
                    <video
                        src={message.mediaUrl}
                        controls
                        className="rounded-lg max-h-[400px] w-full"
                    />
                ) : message.mediaType === 'file' ? (
                    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-background/50 p-3 rounded-lg hover:bg-background/80 transition-colors">
                        <FileText className="h-6 w-6 text-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{message.fileName}</p>
                            {typeof message.fileSize === 'number' && <p className="text-xs text-muted-foreground">{formatFileSize(message.fileSize)}</p>}
                        </div>
                        <Download className="h-5 w-5 text-muted-foreground" />
                    </a>
                ) : null}
                
                {(message.mediaType === 'image' || message.mediaType === 'video') && (
                    <a href={message.mediaUrl} download={message.fileName} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover/media:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 border-none text-white">
                            <Download className="h-4 w-4" />
                        </Button>
                    </a>
                )}
            </div>
        )}
        {message.text && (
            <p className="whitespace-pre-wrap break-words text-left">{linkifyText(message.text)}</p>
        )}
    </>
  );

  const TimestampDisplay = () => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground cursor-default pb-1 px-1">
                    {messageDate ? format(messageDate, "p") : ""}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{messageDate ? formatDetailedTimestamp(messageDate) : ""}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );

  return (
    <div
      className={cn(
        "flex items-end gap-2 group",
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 self-start flex-shrink-0">
          <AvatarImage src={sender.photoURL || undefined} alt={sender.username} data-ai-hint="user avatar" className="object-cover"/>
          <AvatarFallback>{getInitials(sender.username)}</AvatarFallback>
        </Avatar>
      )}

      {isCurrentUser && <TimestampDisplay />}
    
      <div className="flex flex-col max-w-xs md:max-w-md lg:max-w-lg">
        <div
          className={cn(
            "relative flex flex-col rounded-xl px-3 py-2",
            isCurrentUser
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-muted text-foreground rounded-bl-none",
            !message.text && message.mediaUrl && message.mediaType !== 'file' ? "p-1 bg-transparent" : "",
            message.mediaType === 'file' ? 'p-0 bg-transparent' : ''
          )}
        >
          {!isCurrentUser && message.mediaType !== 'file' && (
            <p className="text-xs font-semibold mb-1 text-primary">{sender.username}</p>
          )}
          
          <MessageContent />

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                  <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                          "absolute -bottom-4 h-7 w-7 rounded-full bg-card shadow-md transition-all opacity-0 group-hover:opacity-100",
                          isCurrentUser ? "left-1" : "right-1"
                      )}
                  >
                      <SmilePlus className="h-4 w-4 text-muted-foreground" />
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 rounded-full">
                  <div className="flex gap-1">
                      {EMOJIS.map(emoji => (
                          <Button
                              key={emoji}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-lg"
                              onClick={() => handleReaction(emoji)}
                          >
                              {emoji}
                          </Button>
                      ))}
                  </div>
              </PopoverContent>
          </Popover>
        </div>

        {validReactions.length > 0 && (
             <div className={cn(
                 "flex items-center gap-1.5 mt-1.5 flex-wrap",
                 isCurrentUser ? "self-end" : "self-start"
             )}>
                {validReactions.map(([emoji, uids]) => {
                  const currentUserReacted = user ? uids.includes(user.uid) : false;
                  const reactedUsernames = uids.map(uid => membersMap.get(uid)?.username || '...').join('\n');
                  
                  return (
                    <TooltipProvider key={emoji} delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                              variant={currentUserReacted ? "default" : "secondary"}
                              size="sm"
                              className="h-auto px-2 py-0.5 rounded-full border"
                              onClick={() => handleReaction(emoji)}
                          >
                              <span className="text-sm mr-1">{emoji}</span>
                              <span className="text-xs font-semibold">{uids.length}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="p-2">
                            <div className="text-sm text-center font-medium whitespace-pre-wrap">{reactedUsernames} reacted with {emoji}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
             </div>
        )}
      </div>

       {!isCurrentUser && <TimestampDisplay />}

       {isCurrentUser && (
        <Avatar className="h-8 w-8 self-start flex-shrink-0">
          <AvatarImage src={sender.photoURL || undefined} alt={sender.username} data-ai-hint="user avatar" className="object-cover"/>
          <AvatarFallback>{getInitials(sender.username)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
