
"use client";

import { useParams } from "next/navigation";
import React, { useState, useEffect, useMemo } from "react";
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

  // Memoize member IDs to prevent unnecessary re-fetches of profiles
  const memberIds = useMemo(() => groupInfo?.memberCount ? (groupInfo as any).memberUserIds || [] : [], [groupInfo]);

  // Effect 1: Listen to the group document for metadata changes
  useEffect(() => {
    if (!groupId || !user?.uid) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    const groupDocRef = doc(db, "groups", groupId);
    const unsubscribeGroup = onSnapshot(groupDocRef, (groupSnap) => {
      if (!groupSnap.exists() || !groupSnap.data()?.memberUserIds?.includes(user.uid)) {
        setGroupInfo(null);
        setMessages([]);
        setIsLoading(false);
        return;
      }
      const groupData = groupSnap.data();
      setGroupInfo({
        id: groupSnap.id,
        name: groupData.name,
        memberCount: groupData.memberUserIds?.length || 0,
        imageUrl: groupData.imageUrl,
        selfDestructAt: (groupData.selfDestructAt as Timestamp).toDate().toISOString(),
        createdAt: (groupData.createdAt as Timestamp).toDate().toISOString(),
        inviteCode: groupData.inviteCode,
        // Keep memberUserIds here for the other effect to use
        memberUserIds: groupData.memberUserIds,
      });
    }, (error) => {
      console.error("Error fetching group details:", error);
      setGroupInfo(null);
      setIsLoading(false);
    });

    return () => unsubscribeGroup();
  }, [groupId, user?.uid]);

  // Effect 2: Fetch member profiles ONLY when the list of member IDs changes
  useEffect(() => {
    if (memberIds.length === 0) return;
    
    // Determine which members we haven't fetched yet
    const newMemberIds = memberIds.filter((id: string) => !membersInfo[id]);

    if (newMemberIds.length > 0) {
        getUsersFromIds(newMemberIds).then(newUsers => {
            setMembersInfo(prev => {
                const updatedMembers = { ...prev };
                newUsers.forEach(u => {
                    updatedMembers[u.uid] = u;
                });
                return updatedMembers;
            });
        }).catch(error => console.error("Error fetching member profiles:", error));
    }
  }, [memberIds, membersInfo]);


  // Effect 3: Listen for messages
  useEffect(() => {
    if (!groupId) return;

    const messagesColRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesColRef, orderBy("timestamp", "asc"));
    
    const unsubscribeMessages = onSnapshot(q, (messagesSnap) => {
      const newMessagesData: ChatMessageData[] = messagesSnap.docs.map(doc => {
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
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast({ title: "Error", description: "Could not load messages.", variant: "destructive"});
      setIsLoading(false);
    });

    return () => unsubscribeMessages();
  }, [groupId, toast]);

  const handleSendMessage = async (text: string) => {
    if (!user || !groupId || !text.trim()) return;
    setIsSending(true);

    try {
        const messagesColRef = collection(db, 'groups', groupId, 'messages');
        await addDoc(messagesColRef, {
            senderId: user.uid,
            text: text.trim(),
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

  if (isLoading && !groupInfo) {
    return (
      <div className="flex flex-col h-full">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           {[...Array(3)].map((_, i) => (
             <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
               {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
               <Skeleton className={`h-16 w-56 rounded-lg ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
               {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
             </div>
           ))}
        </div>
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

  if (!groupInfo && !isLoading) {
    return <div className="flex items-center justify-center h-full text-xl text-destructive">Group not found, it may have expired, or you don't have access.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {groupInfo && <GroupHeaderChat group={groupInfo} />}
      <MessageList groupId={groupId} messages={messages} membersInfo={membersInfo} isLoading={isLoading} groupInfo={groupInfo}/>
      <MessageInput onSendMessage={handleSendMessage} isSending={isSending} />
    </div>
  );
}
