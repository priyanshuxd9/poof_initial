
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, getUsersFromIds, type AppUser, cleanupExpiredGroup } from '@/lib/firebase';
import { GroupChatHeader } from '@/components/chat/group-header-chat';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
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
  isCleaned?: boolean;
}

export default function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !groupId) return;

    const groupDocRef = doc(db, 'groups', groupId);
    const unsubscribe = onSnapshot(
      groupDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Security check: ensure current user is a member
          if (!data.memberUserIds?.includes(user.uid)) {
            console.warn("User not a member of this group.");
            router.replace('/dashboard');
            return;
          }
          const groupData = { id: docSnap.id, ...data } as Group;

          // Check if group is expired and needs cleanup
          if (groupData.selfDestructAt.toDate() < new Date() && !groupData.isCleaned) {
            setIsCleaning(true);
            try {
              await cleanupExpiredGroup(groupId);
              toast({
                title: "Group Archived",
                description: `"${groupData.name}" has been archived and its messages have been deleted.`
              });
              router.replace('/archive');
            } catch (error) {
              console.error("Failed to clean up group:", error);
              toast({
                title: "Cleanup Failed",
                description: "Could not delete the group's messages. Please try again later.",
                variant: "destructive"
              });
              // Proceed to load chat, or redirect to dashboard as a fallback
              router.replace('/dashboard');
            }
            return; // Stop further processing
          }
          
          setGroup(groupData);
          
          // Fetch member profiles if they haven't been fetched or have changed
          if (groupData.memberUserIds && groupData.memberUserIds.length !== members.length) {
            const memberProfiles = await getUsersFromIds(groupData.memberUserIds);
            setMembers(memberProfiles);
          }

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
  }, [groupId, user, authLoading, router, members.length, toast]);

  if (isCleaning) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
            <h2 className="text-xl font-semibold">Archiving Group...</h2>
            <p className="text-muted-foreground">The messages for this group are being deleted.</p>
        </div>
      </div>
    );
  }

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
      <MessageList groupId={groupId} members={members} />
      <MessageInput groupId={groupId} />
    </div>
  );
}
