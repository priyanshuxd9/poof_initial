
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendHorizonal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageInputProps {
  groupId: string;
}

export function MessageInput({ groupId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSendMessage = () => {
    // We will implement message sending in the next step.
    toast({
      title: "Coming Soon!",
      description: "Message sending functionality will be added next.",
    });
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
          disabled // Re-enable this in the next step
        />
        <Button type="submit" size="icon" disabled>
          <SendHorizonal className="h-5 w-5" />
          <span className="sr-only">Send Message</span>
        </Button>
      </form>
    </div>
  );
}
