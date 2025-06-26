
"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, SendHorizonal, Paperclip, X, FileImage, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { formatFileSize } from '@/lib/utils';
import Image from 'next/image';

interface MessageInputProps {
  groupId: string;
}

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function MessageInput({ groupId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
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
    if (message.trim() === '' && !file) return;

    setIsSending(true);
    
    try {
      let mediaData: { url: string, type: 'image' | 'video', name: string, size: number } | null = null;
      
      // 1. Upload file if it exists
      if (file) {
        const fileId = uuidv4();
        const filePath = `group-media/${groupId}/${fileId}-${file.name}`;
        const sRef = storageRef(storage, filePath);
        
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
      
      if (message.trim()) {
        messagePayload.text = message.trim();
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

  return (
    <div className="flex-shrink-0 p-4 border-t bg-card">
      {preview && file && (
         <div className="relative mb-2 p-2 bg-muted rounded-lg w-fit">
            {file.type.startsWith('image/') ? (
                <Image src={preview} alt="Preview" width={80} height={80} className="rounded-md object-cover h-20 w-20"/>
            ) : (
                <div className="h-20 w-20 flex flex-col items-center justify-center bg-secondary rounded-md">
                    <Video className="h-8 w-8 text-secondary-foreground" />
                    <span className="text-xs text-secondary-foreground mt-1 truncate">{file.name}</span>
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
        className="flex items-center gap-2"
      >
        <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            aria-label="Attach file"
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
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={file ? "Add a caption..." : "Type a message..."}
          autoComplete="off"
          disabled={isSending}
        />
        <Button type="submit" size="icon" disabled={isSending || (message.trim() === '' && !file)}>
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizonal className="h-5 w-5" />}
          <span className="sr-only">Send Message</span>
        </Button>
      </form>
    </div>
  );
}
