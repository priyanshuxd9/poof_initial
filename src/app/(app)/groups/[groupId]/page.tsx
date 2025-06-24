
"use client";

import { useParams } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { GroupHeaderChat, type ChatGroupHeaderInfo } from "@/components/chat/group-header-chat";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { db, getUsersFromIds, type AppUser } from "@/lib/firebase";
import { doc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessageData } from "@/components/chat/chat-message";


export default function GroupChatPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [groupInfo, setGroupInfo] = useState<ChatGroupHeaderInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [membersInfo, setMembersInfo] = useState<{ [key: string]: AppUser }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Use a ref to track which user profiles have already been fetched
  // to prevent re-fetching and avoid infinite loops.
  const fetchedUserIds = useRef(new Set<string>());


  useEffect(() => {
    if (!groupId || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchedUserIds.current.clear(); // Clear on group change
    setMessages([]);
    setMembersInfo({});

    // Listener for Group Info
    const groupDocRef = doc(db, "groups", groupId);
    const unsubscribeGroup = onSnapshot(groupDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Security check: ensure current user is a member
        if (!data.memberUserIds?.includes(user.uid)) {
            setGroupInfo(null);
            setIsLoading(false);
            return;
        }
        setGroupInfo({
          id: docSnap.id,
          name: data.name,
          memberCount: data.memberUserIds?.length || 0,
          imageUrl: data.imageUrl,
          selfDestructAt: (data.selfDestructAt as Timestamp).toDate().toISOString(),
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
          inviteCode: data.inviteCode,
        });
      } else {
        setGroupInfo(null);
        setIsLoading(false);
      }
    }, (error) => {
        console.error("Error fetching group details:", error);
        setGroupInfo(null);
        setIsLoading(false);
    });

    // Listener for Messages
    const messagesColRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesColRef, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: ChatMessageData[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          reactions: data.reactions,
        };
      });
      setMessages(fetchedMessages);
      
      const allSenderIds = [...new Set(fetchedMessages.map(m => m.senderId).filter(Boolean))];
      const newSenderIdsToFetch = allSenderIds.filter(id => !fetchedUserIds.current.has(id as string));

      if (newSenderIdsToFetch.length > 0) {
        // Immediately mark these IDs as "being fetched" to prevent redundant calls
        newSenderIdsToFetch.forEach(id => fetchedUserIds.current.add(id as string));
        
        getUsersFromIds(newSenderIdsToFetch as string[]).then(newUsers => {
            const newMembersData = newUsers.reduce((acc, u) => {
                acc[u.uid] = u;
                return acc;
            }, {} as {[key: string]: AppUser});
            
            // Use functional update to safely merge new user data
            setMembersInfo(prev => ({...prev, ...newMembersData}));
        });
      }
      
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setIsLoading(false);
    });

    // Cleanup listeners on component unmount
    return () => {
        unsubscribeGroup();
        unsubscribeMessages();
    };
  }, [groupId, user]); // Only re-run when groupId or user changes


  const handleSendMessage = async (message: { text?: string; file?: File }) => {
    if (!user || !groupId || (!message.text?.trim() && !message.file)) return;
    setIsSending(true);

    if (message.file) {
      toast({
        title: "Feature not available",
        description: "File sharing is coming soon!",
        variant: "destructive"
      });
      setIsSending(false);
      return;
    }

    try {
        const textToSend = message.text?.trim() ?? "";
        
        const messagesColRef = collection(db, 'groups', groupId, 'messages');
        await addDoc(messagesColRef, {
            senderId: user.uid,
            text: textToSend,
            timestamp: serverTimestamp(),
            mediaUrl: null,
            mediaType: null,
            reactions: {},
        });
        
        const groupDocRef = doc(db, 'groups', groupId);
        await updateDoc(groupDocRef, {
            lastActivity: serverTimestamp()
        });

    } catch (error) {
        console.error("Error sending message:", error);
        toast({
            title: "Error Sending Message",
            description: "Could not send your message. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Skeleton for Header */}
        <div className="bg-card border-b p-2 shadow-sm">
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
          <Skeleton className="h-1.5 mt-2 w-full" />
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
    return <div className="flex items-center justify-center h-full text-xl text-destructive">Group not found, it may have expired, or you don't have access.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <GroupHeaderChat group={groupInfo} />
      <MessageList groupId={groupId} messages={messages} membersInfo={membersInfo} isLoading={false} groupInfo={groupInfo}/>
      <MessageInput onSendMessage={handleSendMessage} isSending={isSending} />
    </div>
  );
}
