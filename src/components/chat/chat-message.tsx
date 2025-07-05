
"use client";

import { useState } from "react";
import NextImage from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { SmilePlus, Download, FileText, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


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
  type?: 'system_join' | 'system_leave';
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

  // Handle system messages first
  if (message.senderId === 'system') {
    const Icon = message.type === 'system_join' ? LogIn : LogOut;
    return (
      <div className="flex justify-center items-center my-2 gap-2">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground italic">
          {message.text}
        </span>
      </div>
    );
  }

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
    if (!text) return text;
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    
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
          className="underline hover:opacity-80 break-all"
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
        <Skeleton className="h-8 w-8 rounded-full" />
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

  const MessageContent = () => {
    // This helper function handles laying out media with optional text below it.
    const mediaAndTextLayout = (mediaElement: React.ReactNode) => (
      <>
        <div className={cn(isCurrentUser ? 'flex justify-end' : '')} style={{ marginBottom: message.text ? '0.5rem' : 0 }}>
          {mediaElement}
        </div>
        {message.text && (
          <p className="whitespace-pre-wrap break-words">{linkifyText(message.text)}</p>
        )}
      </>
    );

    if (message.mediaUrl) {
      if (message.mediaType === 'image') {
        return mediaAndTextLayout(
          <Dialog>
            <DialogTrigger asChild>
              <button className="relative group/media w-fit text-left">
                <NextImage 
                  src={message.mediaUrl}
                  alt={message.fileName || "Shared image"}
                  width={250}
                  height={250}
                  className="rounded-lg object-cover max-h-[250px] w-auto cursor-pointer hover:brightness-90 transition-all"
                  unoptimized
                />
                <a 
                  href={message.mediaUrl} 
                  download={message.fileName} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()}
                  className={cn("absolute top-2 right-2 h-8 w-8 opacity-0 group-hover/media:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 border-none text-white inline-flex items-center justify-center rounded-md text-sm font-medium", "hover:bg-accent hover:text-accent-foreground")}
                  aria-label="Download image"
                >
                  <Download className="h-4 w-4" />
                </a>
              </button>
            </DialogTrigger>
            <DialogContent className="w-screen h-screen max-w-full max-h-full p-2 sm:p-4 bg-black/80 border-none flex items-center justify-center">
              <DialogHeader className="sr-only">
                <DialogTitle>{message.fileName || "Image Preview"}</DialogTitle>
                <DialogDescription>Full-screen preview of the image sent in the chat.</DialogDescription>
              </DialogHeader>
              <NextImage
                src={message.mediaUrl}
                alt={message.fileName || "Shared image"}
                width={1920}
                height={1080}
                className="rounded-lg object-contain w-full h-auto max-h-screen"
                unoptimized
              />
            </DialogContent>
          </Dialog>
        );
      }
      
      if (message.mediaType === 'file') {
        return mediaAndTextLayout(
          <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-background/50 p-3 rounded-lg hover:bg-background/80 transition-colors w-full">
            <FileText className="h-6 w-6 text-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{message.fileName}</p>
              {typeof message.fileSize === 'number' && <p className="text-xs text-muted-foreground">{formatFileSize(message.fileSize)}</p>}
            </div>
            <Download className="h-5 w-5 text-muted-foreground" />
          </a>
        );
      }
    }
    
    // Fallback for text-only messages
    return message.text ? <p className="whitespace-pre-wrap break-words">{linkifyText(message.text)}</p> : null;
  };

  const TimestampDisplay = () => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="text-xs text-muted-foreground cursor-default flex-shrink-0">
                    {messageDate ? format(messageDate, "p") : ""}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{messageDate ? formatDetailedTimestamp(messageDate) : ""}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
  
  const Reactions = () => (
    <>
      {validReactions.length > 0 && (
           <div className={cn(
               "absolute -bottom-4 flex items-center gap-1.5 flex-wrap z-10",
               isCurrentUser ? "right-2" : "left-2"
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
                            className="h-auto px-2 py-0.5 rounded-full border shadow-sm"
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
    </>
  );

  const ReactionPopover = () => (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "absolute -top-4 h-7 w-7 rounded-full transition-opacity opacity-0 group-hover:opacity-100 bg-background z-10",
                    isCurrentUser ? "right-0" : "left-0"
                )}
            >
                <SmilePlus className="h-4 w-4" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1 rounded-full mb-1" side="top" align={isCurrentUser ? "end" : "start"}>
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
  );

  const bubblePaddingBottom = validReactions.length > 0 ? "pb-5" : "";

  if (isCurrentUser) {
    return (
      <div className="flex justify-end items-end gap-2.5 group">
        <div className="flex flex-col items-end gap-1 max-w-[75%]">
            <div className="relative">
                <div className={cn("bg-primary text-primary-foreground p-3 rounded-t-xl rounded-bl-xl", bubblePaddingBottom)}>
                    <MessageContent />
                </div>
                <ReactionPopover />
                <Reactions />
            </div>
            <TimestampDisplay />
        </div>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={sender.photoURL || undefined} alt={sender.username} data-ai-hint="user avatar" className="object-cover"/>
          <AvatarFallback className="bg-primary-foreground text-primary text-xs">{getInitials(sender.username)}</AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2.5 group">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={sender.photoURL || undefined} alt={sender.username} data-ai-hint="user avatar" className="object-cover"/>
        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{getInitials(sender.username)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start gap-1 max-w-[75%]">
        <span className="font-semibold text-sm ml-3">{sender.username}</span>
         <div className="relative">
            <div className={cn("bg-card border p-3 rounded-t-xl rounded-br-xl", bubblePaddingBottom)}>
               <MessageContent />
            </div>
            <ReactionPopover />
            <Reactions />
         </div>
        <TimestampDisplay />
      </div>
    </div>
  );
}
