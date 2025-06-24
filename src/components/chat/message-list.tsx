
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareDashed } from "lucide-react";

interface MessageListProps {
  groupId: string;
}

export function MessageList({ groupId }: MessageListProps) {
  // We'll add real-time message fetching here in the next step.
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 h-full flex flex-col items-center justify-center text-center">
        <MessageSquareDashed className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">Chat is Empty</h3>
        <p className="text-muted-foreground">
          Messages will appear here once you start a conversation.
        </p>
      </div>
    </ScrollArea>
  );
}
