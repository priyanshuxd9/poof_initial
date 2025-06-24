
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, SendHorizonal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, writeBatch } from 'firebase/firestore';

interface MessageInputProps {
  groupId: string;
}

export function MessageInput({ groupId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSendMessage = async () => {
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    if (message.trim() === '') return;

    setIsSending(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Add new message to the messages subcollection
      const messagesColRef = collection(db, 'groups', groupId, 'messages');
      const newMessageRef = doc(messagesColRef); // Create a new ref to get ID before batch
      batch.set(newMessageRef, {
        text: message.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
        reactions: {},
      });

      // 2. Update the lastActivity timestamp on the group document
      const groupDocRef = doc(db, 'groups', groupId);
      batch.update(groupDocRef, {
        lastActivity: serverTimestamp(),
      });
      
      await batch.commit();
      
      setMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error sending message",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-shrink-0 p-4 border-t bg-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          autoComplete="off"
          disabled={isSending}
        />
        <Button type="submit" size="icon" disabled={isSending || message.trim() === ''}>
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
          <span className="sr-only">Send Message</span>
        </Button>
      </form>
    </div>
  );
}
