
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, getUsersFromIds, type AppUser } from '@/lib/firebase';
import { GroupChatHeader } from '@/components/chat/group-header-chat';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Effect for fetching the main group data
  useEffect(() => {
    if (authLoading || !user || !groupId) return;

    setLoading(true);
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
          
          const groupData = { id: docSnap.id, ...data } as Group;

          // Check if group is expired
          if (groupData.selfDestructAt.toDate() < new Date()) {
            toast({
              title: "Group Archived",
              description: `"${groupData.name}" has been archived and its messages have been deleted.`
            });
            router.replace('/archive');
            return; // Stop further processing
          }
          
          setGroup(groupData);

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
  }, [groupId, user, authLoading, router, toast]);

  // Memoize the sorted list of member IDs. This string will only change when the members actually change.
  const memberIds = useMemo(() => JSON.stringify(group?.memberUserIds?.sort() ?? []), [group]);

  // Effect for fetching member profiles whenever the list of member IDs changes.
  useEffect(() => {
    if (group?.memberUserIds && group.memberUserIds.length > 0) {
      const parsedMemberIds = JSON.parse(memberIds) as string[];
      getUsersFromIds(parsedMemberIds).then(memberProfiles => {
        setMembers(memberProfiles);
      });
    } else {
      setMembers([]);
    }
  }, [memberIds, group?.memberUserIds]);

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
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-16 w-3/4 ml-auto rounded-lg" />
          <Skeleton className="h-20 w-3/4 rounded-lg" />
          <Skeleton className="h-16 w-3/4 ml-auto rounded-lg" />
        </div>
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
      <div className="relative flex-1 min-h-0">
        <MessageList groupId={groupId} members={members} />
        <MessageInput groupId={groupId} />
      </div>
    </div>
  );
}
