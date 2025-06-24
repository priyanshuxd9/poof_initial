
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GroupChatHeader } from '@/components/chat/group-header-chat';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { Skeleton } from '@/components/ui/skeleton';

export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  ownerId: string;
  memberUserIds: string[];
  selfDestructAt: Timestamp;
  createdAt: Timestamp;
  inviteCode: string;
}

export default function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user || !groupId) return;

    const groupDocRef = doc(db, 'groups', groupId);
    const unsubscribe = onSnapshot(
      groupDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Security check: ensure current user is a member
          if (!data.memberUserIds?.includes(user.uid)) {
            console.warn("User not a member of this group.");
            router.replace('/dashboard');
            return;
          }
          setGroup({ id: docSnap.id, ...data } as Group);
        } else {
          console.log("Group does not exist.");
          router.replace('/dashboard');
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching group:", error);
        setLoading(false);
        router.replace('/dashboard');
      }
    );

    return () => unsubscribe();
  }, [groupId, user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="ml-4 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex-1 p-4"></div>
        <div className="p-4 border-t">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!group) {
    return null; // The useEffect handles redirection, so this is a temporary state
  }

  return (
    <div className="flex flex-col h-full">
      <GroupChatHeader group={group} />
      <MessageList groupId={groupId} />
      <MessageInput groupId={groupId} />
    </div>
  );
}
