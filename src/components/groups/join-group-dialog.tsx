
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
import { db } from "@/lib/firebase";
import { useGroupKeys } from "@/hooks/use-group-keys";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";


interface JoinGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JoinGroupDialog({ open, onOpenChange }: JoinGroupDialogProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { setKey: setLocalEncryptionKey } = useGroupKeys();
  
  useEffect(() => {
    // Reset state when dialog is closed for a clean slate next time
    if (!open) {
      setInviteCode("");
      setEncryptionKey("");
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
    if (!inviteCode.trim()) {
      toast({
        title: "Invite Code Required",
        description: "Please enter an invite code.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("inviteCode", "==", inviteCode.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: "Group Not Found",
          description: "No group found with that invite code. Please check the code (it's case-sensitive) and try again.",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }

      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();
      const groupId = groupDoc.id;

      // A group is considered encrypted if `isEncrypted` is not explicitly false.
      // This enforces the key requirement for all new groups and old groups (where the flag is undefined).
      if (groupData.isEncrypted !== false && !encryptionKey.trim()) {
        toast({
          title: "Encryption Key Required",
          description: "This group is end-to-end encrypted. Please provide the encryption key to join.",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }

      if (groupData.memberUserIds && groupData.memberUserIds.includes(user.uid)) {
        toast({
          title: "Already a Member",
          description: `You are already a member of "${groupData.name}".`,
        });
        onOpenChange(false);
        router.push(`/groups/${groupId}`);
        return;
      }
      
      const selfDestructTimestamp = groupData.selfDestructAt as Timestamp;
      if (selfDestructTimestamp.toDate() < new Date()) {
         toast({
          title: "Group Expired",
          description: "This group has already self-destructed and cannot be joined.",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }

      const groupDocRef = doc(db, "groups", groupId);
      await updateDoc(groupDocRef, {
        memberUserIds: arrayUnion(user.uid),
        lastActivity: serverTimestamp(),
      });

      // Save the encryption key to local storage for this group if it's an encrypted group
      if (groupData.isEncrypted !== false) {
        setLocalEncryptionKey(groupId, encryptionKey);
      }

      toast({
        title: "Successfully Joined Group!",
        description: `You are now a member of "${groupData.name}".`,
      });
      onOpenChange(false);
      router.refresh(); 

    } catch (error: any) {
      console.error("Error joining group:", error);
      toast({
        title: "Failed to Join Group",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
       setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join a Poof Group</DialogTitle>
          <DialogDescription>
            Enter the invite code and encryption key to join an existing group. The key is required for all groups now.
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
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="encryption-key">Encryption Key</Label>
            <Input
              id="encryption-key"
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
              placeholder="Required for all groups..."
              disabled={isJoining}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isJoining}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={isJoining || !inviteCode.trim() || !encryptionKey.trim()}>
            {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
