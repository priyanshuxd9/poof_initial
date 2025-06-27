
"use client";

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, SendHorizonal, Paperclip, X, Video, Smile } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MessageInputProps {
  groupId: string;
}

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const EMOJIS = ['😀', '😂', '👍', '❤️', '🤔', '🎉', '🔥', '🙏', '😢', '😮', '🤯', '😎', '🥳', '😇', '💯', '🙌'];

export function MessageInput({ groupId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textInputRef.current?.focus();
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
        return;
    }

    if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
        toast({
            title: "Invalid file type",
            description: "You can only send images and videos.",
            variant: "destructive"
        });
        return;
    }

    setPreview(URL.createObjectURL(selectedFile));

    if (selectedFile.type.startsWith('image/')) {
        try {
            const options = {
                maxSizeMB: 5, // Compress to a max of 5MB
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            };
            const compressedFile = await imageCompression(selectedFile, options);
            setFile(compressedFile);
        } catch (error) {
            console.error("Image compression error, falling back to original:", error);
            setFile(selectedFile); // Fallback to original file if compression fails
        }
    } else {
        // For videos, just set the file directly
        setFile(selectedFile);
    }
  };
  
  const removeFile = () => {
    setFile(null);
    if(preview) {
        URL.revokeObjectURL(preview);
    }
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }
    const trimmedMessage = message.trim();
    if (trimmedMessage === '' && !file) return;

    setIsSending(true);
    
    try {
      let mediaData: { url: string, type: 'image' | 'video', name: string, size: number } | null = null;
      
      // 1. Upload file if it exists
      if (file) {
        const fileId = uuidv4();
        const filePath = `group-media/${groupId}/${fileId}-${file.name}`;
        const sRef = storageRef(storage, filePath);
        
        console.log("--- DEBUG: Attempting to upload file ---");
        console.log("User UID:", user.uid);
        console.log("Group ID:", groupId);
        console.log("Storage Path:", filePath);

        const uploadResult = await uploadBytes(sRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        mediaData = {
          url: downloadURL,
          type: file.type.startsWith('image/') ? 'image' : 'video',
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
      
      if (message !== '') {
        messagePayload.text = message;
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

  return (
    <div className="flex-shrink-0 p-4 border-t bg-card">
      {preview && file && (
         <div className="relative mb-2 p-2 bg-muted rounded-lg w-fit">
            {file.type.startsWith('image/') ? (
                <Image src={preview} alt="Preview" width={80} height={80} className="rounded-md object-cover h-20 w-20"/>
            ) : (
                <div className="h-20 w-20 flex flex-col items-center justify-center bg-secondary rounded-md">
                    <Video className="h-8 w-8 text-secondary-foreground" />
                    <span className="text-xs text-secondary-foreground mt-1 truncate max-w-full">{file.name}</span>
                </div>
            )}
             <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeFile}
             >
                <X className="h-4 w-4" />
             </Button>
         </div>
      )}
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
            accept="image/*,video/*"
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
