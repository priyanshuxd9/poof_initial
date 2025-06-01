
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Loader2 } from "lucide-react";

export function JoinGroupDialog() {
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Invite Code Required",
        description: "Please enter an invite code to join a group.",
        variant: "destructive",
      });
      return;
    }
    setIsJoining(true);
    // Simulate API call for joining group
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // TODO: Implement actual group joining logic here
    // For now, just show a toast and log.
    console.log("Attempting to join group with code:", inviteCode);
    toast({
      title: "Attempting to Join Group",
      description: `Trying to join with code: ${inviteCode}. (Full functionality pending)`,
    });
    setIsJoining(false);
    // Optionally close the dialog after submission attempt
    // Find the close button and click it programmatically or manage open state
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full sm:w-auto">
          <LogIn className="mr-2 h-5 w-5" /> Join with Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join a Poof Group</DialogTitle>
          <DialogDescription>
            Enter the invite code you received to join an existing group.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invite-code" className="text-right">
              Invite Code
            </Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="col-span-3"
              placeholder="Enter code..."
              disabled={isJoining}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isJoining}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={isJoining}>
            {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
