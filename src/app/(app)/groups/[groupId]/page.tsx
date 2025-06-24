
"use client";

import { useParams } from "next/navigation";
import React, { useState, useEffect } from "react";
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

  // Effect for Group Info and fetching all member profiles once
  useEffect(() => {
    if (!groupId || !user?.uid) {
      return;
    }

    const groupDocRef = doc(db, "groups", groupId);
    const unsubscribeGroup = onSnapshot(groupDocRef, async (docSnap) => {
      if (docSnap.exists() && docSnap.data().memberUserIds?.includes(user.uid)) {
        const data = docSnap.data();
        const memberIds = data.memberUserIds || [];
        
        setGroupInfo({
          id: docSnap.id,
          name: data.name,
          memberCount: memberIds.length,
          imageUrl: data.imageUrl,
          selfDestructAt: (data.selfDestructAt as Timestamp).toDate().toISOString(),
          createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
          inviteCode: data.inviteCode,
        });

        // Fetch all member profiles at once when group info is loaded
        if (memberIds.length > 0) {
            try {
                const users = await getUsersFromIds(memberIds);
                const membersMap: { [key: string]: AppUser } = {};
                users.forEach(u => {
                    membersMap[u.uid] = u;
                });
                setMembersInfo(membersMap);
            } catch (error) {
                console.error("Error fetching member profiles:", error);
            }
        }
      } else {
        setGroupInfo(null);
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Error fetching group details:", error);
      setGroupInfo(null);
      setIsLoading(false);
    });

    return () => unsubscribeGroup();
  }, [groupId, user?.uid]);

  // Effect for Messages
  useEffect(() => {
    if (!groupId) {
      return;
    }

    const messagesColRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesColRef, orderBy("timestamp", "asc"));
    
    const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
      const newMessagesData: ChatMessageData[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            senderId: data.senderId,
            text: data.text,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            timestamp: (data.timestamp as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
            reactions: data.reactions || {},
          };
      });
      
      setMessages(newMessagesData);
      setIsLoading(false); // Stop loading after the first batch of messages is fetched

    }, (error) => {
      console.error("Error fetching messages:", error);
      setIsLoading(false);
    });

    return () => unsubscribeMessages();
  }, [groupId]);

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
