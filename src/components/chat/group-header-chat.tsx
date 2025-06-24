
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Share2, Copy, Check } from 'lucide-react';
import type { Group } from '@/app/(app)/groups/[groupId]/page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CountdownTimer } from './countdown-timer';

interface GroupChatHeaderProps {
  group: Group;
}

export function GroupChatHeader({ group }: GroupChatHeaderProps) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(group.inviteCode).then(() => {
      setHasCopied(true);
      toast({ title: "Copied!", description: "Invite code copied to clipboard." });
      setTimeout(() => setHasCopied(false), 2000);
    });
  };

  return (
    <header className="flex-shrink-0 flex items-center p-3 sm:p-4 border-b bg-card">
      <Button variant="ghost" size="icon" className="mr-2 sm:mr-4 lg:hidden" onClick={() => router.push('/dashboard')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Link href={`/groups/${group.id}/info`} className="flex items-center flex-1 min-w-0 mr-4 group">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src={group.imageUrl} alt={group.name} data-ai-hint="group avatar"/>
          <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate group-hover:underline">{group.name}</h2>
          <div className="w-full">
            <CountdownTimer selfDestructAt={group.selfDestructAt.toDate()} createdAt={group.createdAt.toDate()} />
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/groups/${group.id}/info`}>
            <Users className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Info</span>
          </Link>
        </Button>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Invite</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite members to {group.name}</DialogTitle>
              <DialogDescription>
                Share this code with others to let them join this group.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="invite-code">Invite Code</Label>
              <div className="flex items-center gap-2">
                <Input id="invite-code" value={group.inviteCode} readOnly />
                <Button size="icon" onClick={handleCopy}>
                  {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
