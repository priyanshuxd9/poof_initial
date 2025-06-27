
"use client";

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, SendHorizonal, Paperclip, X, Smile, FileText, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatFileSize } from '@/lib/utils';
import NextImage from "next/image";


interface MessageInputProps {
  groupId: string;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const EMOJIS = ['😀', '😂', '👍', '❤️', '🤔', '🎉', '🔥', '🙏', '😢', '😮', '🤯', '😎', '🥳', '😇', '💯', '🙌'];

export function MessageInput({ groupId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textInputRef.current?.focus();
  };
  
  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        toast({
            title: "File is too large",
            description: `Please select a file smaller than ${MAX_FILE_SIZE_MB}MB.`,
            variant: "destructive"
        });
        removeFile();
        return;
    }
    setFile(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSendMessage = async () => {
    if (!user || !user.uid) {
      toast({ title: "Not authenticated", description: "You must be signed in to send messages.", variant: "destructive" });
      return;
    }
    const trimmedMessage = message.trim();
    if (trimmedMessage === '' && !file) return;

    setIsSending(true);
    
    try {
      let mediaData: { url: string, type: 'image' | 'video' | 'file', name: string, size: number } | null = null;
      
      // 1. Upload file if it exists
      if (file) {
        const fileId = uuidv4();
        // The path MUST include the user's UID to satisfy the new, reliable security rule.
        const filePath = `group-media/${groupId}/${user.uid}/${fileId}`;
        const sRef = storageRef(storage, filePath);
        
        const uploadResult = await uploadBytes(sRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        let mediaType: 'image' | 'video' | 'file' = 'file';
        if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type.startsWith('video/')) mediaType = 'video';
        
        mediaData = {
          url: downloadURL,
          type: mediaType,
          name: file.name,
          size: file.size
        };
      }

      // 2. Create message in Firestore
      const batch = writeBatch(db);
      
      const messagesColRef = collection(db, 'groups', groupId, 'messages');
      const newMessageRef = doc(messagesColRef); 
      
      const messagePayload: any = {
        senderId: user.uid,
        createdAt: serverTimestamp(),
        reactions: {},
      };
      
      if (trimmedMessage !== '') {
        messagePayload.text = trimmedMessage;
      }

      if (mediaData) {
        messagePayload.mediaUrl = mediaData.url;
        messagePayload.mediaType = mediaData.type;
        messagePayload.fileName = mediaData.name;
        messagePayload.fileSize = mediaData.size;
      }

      batch.set(newMessageRef, messagePayload);

      const groupDocRef = doc(db, 'groups', groupId);
      batch.update(groupDocRef, {
        lastActivity: serverTimestamp(),
      });
      
      await batch.commit();
      
      setMessage('');
      removeFile();

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
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const renderFilePreview = () => {
    if (!file) return null;

    return (
        <div className="relative mb-2 p-2 bg-muted rounded-lg w-fit">
            <div className="flex items-center gap-2">
                {filePreview ? (
                    <NextImage src={filePreview} alt="Image preview" width={40} height={40} className="rounded object-cover h-10 w-10" />
                ) : (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="text-sm">
                    <p className="font-medium text-foreground truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
            </div>
             <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeFile}
             >
                <X className="h-4 w-4" />
             </Button>
         </div>
    );
  };

  return (
    <div className="flex-shrink-0 p-4 border-t bg-card">
      {renderFilePreview()}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-start gap-2"
      >
        <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            aria-label="Attach file"
            className="self-center"
        >
            <Paperclip className="h-5 w-5" />
        </Button>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className="hidden" 
            disabled={isSending}
        />
        <div className="relative flex-1">
            <Textarea
              ref={textInputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={file ? "Add a caption..." : "Type a message..."}
              autoComplete="off"
              disabled={isSending}
              rows={1}
              className="flex-1 resize-none max-h-32 pr-10 py-2.5"
            />
            <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" disabled={isSending} aria-label="Add emoji" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                        <Smile className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 mb-2" side="top" align="end">
                    <div className="grid grid-cols-8 gap-1 rounded-lg bg-popover border p-2 shadow-lg">
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                className="text-2xl rounded-md hover:bg-accent p-1 transition-colors"
                                onClick={() => handleEmojiSelect(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        <Button type="submit" size="icon" disabled={isSending || (message.trim() === '' && !file)} className="self-center">
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
          <span className="sr-only">Send Message</span>
        </Button>
      </form>
    </div>
  );
}
