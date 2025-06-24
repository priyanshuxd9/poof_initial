
"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareDashed, Loader2 } from "lucide-react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, type AppUser } from "@/lib/firebase";
import { ChatMessage, type Message } from "./chat-message";
import { useAuth } from "@/contexts/auth-context";

interface MessageListProps {
  groupId: string;
  members: AppUser[];
}

export function MessageList({ groupId, members }: MessageListProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Create a map of members for quick lookup
  const membersMap = new Map(members.map(member => [member.uid, member]));

  useEffect(() => {
    if (!groupId) return;

    setIsLoading(true);
    const q = query(
      collection(db, "groups", groupId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(fetchedMessages);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      if (viewportRef.current) {
          viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
    }, 100); // A small delay to allow the DOM to update
  }, [messages]);


  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" viewportRef={viewportRef}>
        <div className="p-4 space-y-4">
        {messages.length === 0 ? (
             <div className="p-4 h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <MessageSquareDashed className="h-12 w-12 mb-4" />
                <h3 className="text-xl font-semibold">Chat is Empty</h3>
                <p>Be the first to say something!</p>
            </div>
        ) : (
            messages.map((message) => {
                const sender = membersMap.get(message.senderId);
                const isCurrentUser = message.senderId === user?.uid;
                return (
                    <ChatMessage
                        key={message.id}
                        message={message}
                        sender={sender}
                        isCurrentUser={isCurrentUser}
                    />
                );
            })
        )}
        </div>
    </ScrollArea>
  );
}
