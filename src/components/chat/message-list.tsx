
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareDashed, Loader2 } from "lucide-react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, type AppUser } from "@/lib/firebase";
import { ChatMessage, type Message } from "./chat-message";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";

const DateSeparator = ({ date }: { date: Date }) => {
  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">
          {format(date, "MMMM d, yyyy")}
        </span>
      </div>
    </div>
  );
};

interface MessageListProps {
  groupId: string;
  members: AppUser[];
}

export function MessageList({ groupId, members }: MessageListProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);

  // Create a memoized map of members for quick lookup to prevent re-renders
  const membersMap = useMemo(() => 
    new Map(members.map(member => [member.uid, member])),
    [members]
  );

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

  // Auto-scroll to bottom, but only when new messages are added
  useEffect(() => {
    // Only scroll if the number of messages has increased
    if (messages.length > prevMessagesLength.current) {
        setTimeout(() => {
            if (viewportRef.current) {
                viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
            }
        }, 100); // A small delay to allow the DOM to update
    }
    // Update the ref for the next comparison
    prevMessagesLength.current = messages.length;
  }, [messages.length]);


  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const itemsToRender: React.ReactNode[] = [];
  let lastMessageDateString: string | null = null;

  messages.forEach((message) => {
    if (!message.createdAt) return;

    const messageDate = message.createdAt.toDate();
    const messageDateString = format(messageDate, "yyyy-MM-dd");

    if (messageDateString !== lastMessageDateString) {
      itemsToRender.push(
        <DateSeparator key={`date-${messageDateString}`} date={messageDate} />
      );
    }
    lastMessageDateString = messageDateString;
    
    const sender = membersMap.get(message.senderId);
    const isCurrentUser = message.senderId === user?.uid;
    
    itemsToRender.push(
      <ChatMessage
        key={message.id}
        message={message}
        sender={sender}
        isCurrentUser={isCurrentUser}
        membersMap={membersMap}
      />
    );
  });

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
            itemsToRender
        )}
        </div>
    </ScrollArea>
  );
}
