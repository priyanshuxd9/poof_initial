
"use client";

import React, { useState } from "react";
import { Send, Smile, Mic, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  onSendMessage: (text: string) => Promise<void>;
  isSending?: boolean;
}

export function MessageInput({ onSendMessage, isSending }: MessageInputProps) {
  const [text, setText] = useState("");

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    // Auto-resize textarea
    event.target.style.height = 'auto';
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!text.trim()) return;

    await onSendMessage(text);
    setText("");
    // Reset textarea height after sending
    const textarea = document.getElementById('message-textarea');
    if (textarea) textarea.style.height = 'auto';
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };


  return (
    <div className="bg-card border-t p-3 sm:p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Button variant="ghost" size="icon" type="button" disabled={true} title="File attachments coming soon!">
          <Paperclip className="h-5 w-5 text-muted-foreground/50" />
        </Button>
        
        <Textarea
          id="message-textarea"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 resize-none min-h-[40px] max-h-[120px] rounded-full px-4 py-2 text-sm border-input focus-visible:ring-primary"
          rows={1}
          disabled={isSending}
        />
        <Button variant="ghost" size="icon" type="button" disabled={true} title="Emoji picker coming soon!">
          <Smile className="h-5 w-5 text-muted-foreground/50" />
        </Button>
        {text.trim() ? (
          <Button type="submit" size="icon" className="rounded-full bg-primary hover:bg-primary/90" disabled={isSending}>
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 text-primary-foreground" />}
          </Button>
        ) : (
          <Button type="button" size="icon" className="rounded-full" disabled={true} title="Voice messages coming soon!">
            <Mic className="h-5 w-5 text-muted-foreground/50" />
          </Button>
        )}
      </form>
    </div>
  );
}
