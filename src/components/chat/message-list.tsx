
"use client";

import React, { useEffect, useRef } from "react";
import { ChatMessage, type ChatMessageData } from "./chat-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { type AppUser } from "@/lib/firebase";
import { type ChatGroupHeaderInfo } from "@/components/chat/group-header-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface MessageListProps {
  groupId: string;
  messages: ChatMessageData[];
  membersInfo: Map<string, AppUser>;
  isLoading?: boolean;
  groupInfo: ChatGroupHeaderInfo | null;
}

export function MessageList({ groupId, messages, membersInfo, isLoading = false, groupInfo }: MessageListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
            <div className="flex flex-col gap-1">
              <Skeleton className={`h-12 w-48 rounded-lg ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
              <Skeleton className="h-3 w-16 self-start" />
            </div>
            {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
          </div>
        ))}
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <Avatar className="h-40 w-40 mb-6 opacity-50">
            <AvatarImage src={groupInfo?.imageUrl || `https://placehold.co/160x160.png`} alt={groupInfo?.name ?? "Group Icon"} data-ai-hint="group logo" className="object-cover"/>
            <AvatarFallback className="bg-primary text-primary-foreground text-5xl">
                {getInitials(groupInfo?.name)}
            </AvatarFallback>
        </Avatar>
        <h3 className="text-xl font-semibold text-foreground">It's quiet in here...</h3>
        <p className="text-muted-foreground">Be the first to send a message in this Poof group!</p>
      </div>
    );
  }


  return (
    <ScrollArea className="flex-1 basis-0" viewportRef={viewportRef}>
      <div className="p-4 space-y-1">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} groupId={groupId} message={msg} senderInfo={membersInfo.get(msg.senderId)} />
        ))}
      </div>
    </ScrollArea>
  );
}
