
"use client";

import React, { useState, useRef } from "react";
import { Send, Paperclip, Smile, Mic, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface MessageInputProps {
  onSendMessage: (message: { text?: string; file?: File }) => Promise<void>;
  isSending?: boolean;
}

export function MessageInput({ onSendMessage, isSending }: MessageInputProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    // Auto-resize textarea (simple version)
    event.target.style.height = 'auto';
    event.target.style.height = `${event.target.scrollHeight}px`;

  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 30 * 1024 * 1024) { // 30MB limit
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 30MB.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(selectedFile));
      } else {
        setFilePreview(null); // Or a generic file icon preview
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!text.trim() && !file) return;

    try {
      await onSendMessage({ text: text.trim(), file: file || undefined });
      setText("");
      handleRemoveFile();
      // Reset textarea height
      const textarea = document.getElementById('message-textarea');
      if(textarea) textarea.style.height = 'auto';
      
    } catch (error) {
      toast({
        title: "Error Sending Message",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };


  return (
    <div className="bg-card border-t p-3 sm:p-4">
      {filePreview && file?.type.startsWith("image/") && (
        <div className="mb-2 p-2 border rounded-lg relative max-w-xs">
          <Image src={filePreview} alt="File preview" width={80} height={80} className="rounded object-cover" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 h-6 w-6 bg-background/50 hover:bg-destructive/20"
            onClick={handleRemoveFile}
          >
            <X size={14} />
          </Button>
          <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
        </div>
      )}
      {file && !file.type.startsWith("image/") && (
         <div className="mb-2 p-2 border rounded-lg relative max-w-xs bg-muted/30">
          <Paperclip size={24} className="text-primary mb-1" />
          <p className="text-sm text-foreground font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / (1024*1024)).toFixed(2)} MB</p>
           <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 bg-background/50 hover:bg-destructive/20"
            onClick={handleRemoveFile}
          >
            <X size={14} />
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
        
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
        <Button variant="ghost" size="icon" type="button" disabled={isSending}>
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
        {text.trim() || file ? (
          <Button type="submit" size="icon" className="rounded-full bg-primary hover:bg-primary/90" disabled={isSending}>
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 text-primary-foreground" />}
          </Button>
        ) : (
          <Button type="button" size="icon" className="rounded-full" disabled={isSending}>
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>
        )}
      </form>
    </div>
  );
}
