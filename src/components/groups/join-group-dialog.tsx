"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { joinGroupWithCode } from "@/lib/firebase";


interface JoinGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JoinGroupDialog({ open, onOpenChange }: JoinGroupDialogProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!open) {
      setInviteCode("");
      setIsJoining(false);
    }
  }, [open]);


  const handleSubmit = async () => {
    if (!user || !user.uid) {
      toast({
        title: "Not Authenticated",
        description: "You must be logged in to join a group.",
        variant: "destructive",
      });
      return;
    }
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      toast({
        title: "Invite Code Required",
        description: "Please enter an invite code.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      const result = await joinGroupWithCode(trimmedCode, user.uid);
      
      toast({
        title: "Successfully Joined Group!",
        description: `Welcome to "${result.groupName}".`,
      });
      onOpenChange(false);
      router.refresh(); 

    } catch (error: any) {
      toast({
        title: "Failed to Join Group",
        description: error.message || "Please check the invite code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join a Poof Group</DialogTitle>
          <DialogDescription>
            Enter the 8-character invite code to join an existing group.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter code..."
              disabled={isJoining}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isJoining}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={isJoining || !inviteCode.trim()}>
            {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
