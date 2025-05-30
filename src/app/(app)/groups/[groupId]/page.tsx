
"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { GroupHeaderChat, type ChatGroupHeaderInfo } from "@/components/chat/group-header-chat";
import { MessageList, type ChatMessageData } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton"; // Added missing import

// Mock group data fetching function
async function fetchGroupDetails(groupId: string): Promise<ChatGroupHeaderInfo | null> {
  console.log(`Fetching details for group ${groupId}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  if (groupId === "1" || groupId === "2" || groupId === "3" || groupId.startsWith("mockGroupId")) {
    return {
      id: groupId,
      name: groupId.startsWith("mockGroupId") ? "Newly Created Group" : `Group ${groupId}`,
      memberCount: groupId === "1" ? 12 : (groupId === "2" ? 5 : (groupId === "3" ? 25 : 2)),
      imageUrl: "https://placehold.co/100x100.png",
      selfDestructAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * (parseInt(groupId.slice(-1)) || 7)).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      inviteCode: "MOCK" + groupId + "CODE",
    };
  }
  return null;
}

// Mock messages data fetching function
async function fetchMessages(groupId: string): Promise<ChatMessageData[]> {
   console.log(`Fetching messages for group ${groupId}`);
   await new Promise(resolve => setTimeout(resolve, 700));
   return [
    { id: "m1", senderId: "user2", senderUsername: "Alice", text: "Hey everyone! How's it going?", timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), senderAvatarUrl: "https://placehold.co/40x40.png?text=A" },
    { id: "m2", senderId: "user123", senderUsername: "TestUser", text: "Hi Alice! Doing well, thanks. Excited for this Poof group!", timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), senderAvatarUrl: "https://placehold.co/40x40.png?text=T" },
    { id: "m3", senderId: "user2", senderUsername: "Alice", text: "Me too! This self-destruct timer is cool.", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), senderAvatarUrl: "https://placehold.co/40x40.png?text=A" },
    { id: "m4", senderId: "user3", senderUsername: "Bob", mediaUrl: "https://placehold.co/300x200.png", mediaType: "image", timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), senderAvatarUrl: "https://placehold.co/40x40.png?text=B" },
   ];
}


export default function GroupChatPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { user } = useAuth();

  const [groupInfo, setGroupInfo] = useState<ChatGroupHeaderInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (groupId) {
      setIsLoadingGroup(true);
      fetchGroupDetails(groupId).then(data => {
        setGroupInfo(data);
        setIsLoadingGroup(false);
      });

      setIsLoadingMessages(true);
      fetchMessages(groupId).then(data => {
        setMessages(data);
        setIsLoadingMessages(false);
      });
    }
  }, [groupId]);

  const handleSendMessage = async (message: { text?: string; file?: File }) => {
    if (!user || !groupInfo) return;
    setIsSending(true);
    // Simulate sending message
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newMessage: ChatMessageData = {
      id: `msg-${Date.now()}`,
      senderId: user.uid,
      senderUsername: user.username || user.email?.split('@')[0] || "You",
      senderAvatarUrl: user.photoURL || undefined,
      text: message.text,
      timestamp: new Date().toISOString(),
    };
    if (message.file) {
      newMessage.mediaUrl = URL.createObjectURL(message.file); // Mock URL
      newMessage.mediaType = message.file.type.startsWith("image/") ? "image" : "video";
    }
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setIsSending(false);
  };

  if (isLoadingGroup) {
    return (
      <div className="flex flex-col h-screen">
        {/* Skeleton for Header */}
        <div className="bg-card border-b p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 rounded" />
          </div>
          <Skeleton className="h-1.5 mt-3 w-full" />
        </div>
        {/* Skeleton for Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           {[...Array(3)].map((_, i) => (
             <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
               {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
               <Skeleton className={`h-16 w-56 rounded-lg ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
               {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
             </div>
           ))}
        </div>
        {/* Skeleton for Message Input */}
        <div className="bg-card border-t p-4">
          <div className="flex items-end gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!groupInfo) {
    return <div className="flex items-center justify-center h-screen text-xl text-destructive">Group not found or an error occurred.</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <GroupHeaderChat group={groupInfo} />
      <MessageList messages={messages} isLoading={isLoadingMessages} />
      <MessageInput onSendMessage={handleSendMessage} isSending={isSending} />
    </div>
  );
}

