
"use client";

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import { ThumbsUp, SmilePlus, Lock, AlertTriangle } from "lucide-react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, type AppUser } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDetailedTimestamp, getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { importKey, decrypt } from "@/lib/crypto";

export interface ChatMessageData {
  id: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  timestamp: string | Date;
  reactions?: { [emoji: string]: string[] }; // Map of emoji to array of user UIDs
}

interface ChatMessageProps {
  message: ChatMessageData;
  senderInfo?: AppUser;
  groupId: string;
  encryptionKey?: string;
}

export function ChatMessage({ message, senderInfo, groupId, encryptionKey }: ChatMessageProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const isCurrentUserMessage = message.senderId === currentUser?.uid;
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [decryptedText, setDecryptedText] = useState("...");
  const [decryptionStatus, setDecryptionStatus] = useState<"pending" | "success" | "unencrypted" | "no_key" | "error">("pending");
  
  const senderUsername = senderInfo?.username || '...';
  const senderAvatarUrl = senderInfo?.photoURL;
  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  useEffect(() => {
    async function decryptMessage() {
      if (!message.text) {
        setDecryptionStatus("success");
        setDecryptedText("");
        return;
      }
      
      // Heuristic to check if message is likely encrypted (contains a colon)
      // This is to handle old plaintext messages.
      if (!message.text.includes(':')) {
        setDecryptionStatus("unencrypted");
        setDecryptedText(message.text);
        return;
      }

      if (!encryptionKey) {
        setDecryptionStatus("no_key");
        setDecryptedText("Missing encryption key on this device.");
        return;
      }

      try {
        const key = await importKey(encryptionKey);
        const decrypted = await decrypt(message.text, key);
        setDecryptionStatus("success");
        setDecryptedText(decrypted);
      } catch (e) {
        console.error("Decryption failed:", e);
        setDecryptionStatus("error");
        setDecryptedText("This message could not be decrypted.");
      }
    }
    
    decryptMessage();
    
  }, [message.text, encryptionKey]);


  const handleReaction = async (emoji: string) => {
    if (!currentUser || !groupId) return;
    setIsPickerOpen(false); // Close picker after reacting

    const messageRef = doc(db, "groups", groupId, "messages", message.id);
    const userHasReacted = message.reactions?.[emoji]?.includes(currentUser.uid);
    const fieldPath = `reactions.${emoji}`;
    
    try {
        if (userHasReacted) {
            await updateDoc(messageRef, { [fieldPath]: arrayRemove(currentUser.uid) });
        } else {
            await updateDoc(messageRef, { [fieldPath]: arrayUnion(currentUser.uid) });
        }
    } catch (error) {
        console.error("Error updating reaction:", error);
        toast({
            title: "Reaction Failed",
            description: "Could not save your reaction. Please try again.",
            variant: "destructive"
        });
    }
  };

  const ReactionPicker = () => (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/50" onClick={() => handleReaction("👍")}>
        <ThumbsUp size={14} className="text-muted-foreground" />
      </Button>
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/50">
              <SmilePlus size={14} className="text-muted-foreground" />
              </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1 bg-background/80 backdrop-blur-md rounded-full shadow-lg border-border/40">
              <div className="flex gap-1">
              {availableReactions.map(emoji => (
                  <Button
                  key={emoji}
                  variant="ghost"
                  size="icon"
                  className="text-lg rounded-full h-8 w-8 hover:bg-accent/50"
                  onClick={() => handleReaction(emoji)}
                  >
                  {emoji}
                  </Button>
              ))}
              </div>
          </PopoverContent>
      </Popover>
    </div>
  );

  const getMessageIcon = () => {
    switch (decryptionStatus) {
      case "pending": return null;
      case "success": return null; // Could add a Lock icon for successfully decrypted messages if desired
      case "unencrypted": return <AlertTriangle size={12} className="text-yellow-500 flex-shrink-0" title="This message was not encrypted." />;
      case "no_key": return <Lock size={12} className="text-destructive/80 flex-shrink-0" title="You are missing the key to decrypt this message." />;
      case "error": return <Lock size={12} className="text-destructive/80 flex-shrink-0" title="A decryption error occurred." />;
      default: return null;
    }
  }


  return (
    <div className={cn("flex gap-3 py-1 px-2 group", isCurrentUserMessage ? "justify-end" : "justify-start")}>
      {!isCurrentUserMessage && (
        <Avatar className="h-8 w-8 self-end">
          <AvatarImage src={senderAvatarUrl || `https://placehold.co/40x40.png`} alt={senderUsername} data-ai-hint="user avatar" />
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            {getInitials(senderUsername)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[70%] space-y-1 flex flex-col", isCurrentUserMessage ? "items-end" : "items-start")}>
        <Card className={cn(
            "rounded-2xl shadow-sm", 
            isCurrentUserMessage ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none",
            (decryptionStatus === "error" || decryptionStatus === "no_key" || decryptionStatus === "unencrypted") && "bg-destructive/10 border-destructive/20"
        )}>
          <CardContent className="p-3 space-y-2">
            {!isCurrentUserMessage && (
              <p className="text-xs font-medium">{senderUsername}</p>
            )}
            {message.text !== undefined && (
                 <p className={cn("text-sm whitespace-pre-wrap break-words flex items-center gap-1.5",
                    decryptionStatus !== "success" && "text-destructive/90"
                 )}>
                   {getMessageIcon()}
                   <span>{decryptedText}</span>
                 </p>
            )}
            {message.mediaUrl && message.mediaType === "image" && (
              <Image
                src={message.mediaUrl}
                alt="Shared image"
                width={300}
                height={200}
                className="rounded-lg object-cover max-w-full h-auto"
                data-ai-hint="chat image"
              />
            )}
            {message.mediaUrl && message.mediaType === "video" && (
              <video controls src={message.mediaUrl} className="rounded-lg max-w-full h-auto" width={300}>
                Your browser does not support the video tag.
              </video>
            )}
          </CardContent>
        </Card>

        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-1 px-2" style={{ clear: 'both' }}>
            {Object.entries(message.reactions).map(([emoji, users]) => {
              if (users.length === 0) return null;
              const currentUserReacted = users.includes(currentUser?.uid ?? '');
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={cn(
                    "flex items-center gap-1 text-xs rounded-full px-2 py-0.5 transition-colors",
                    currentUserReacted 
                      ? 'bg-primary-foreground text-primary' 
                      : 'bg-muted hover:bg-muted/80'
                  )}
                  aria-label={`React with ${emoji}`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{users.length}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className={cn("flex items-center gap-2 px-1", isCurrentUserMessage ? "justify-end" : "justify-start")}>
            {isCurrentUserMessage ? (
              <>
                <ReactionPicker />
                <span className="text-xs text-muted-foreground">{formatDetailedTimestamp(message.timestamp)}</span>
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">{formatDetailedTimestamp(message.timestamp)}</span>
                <ReactionPicker />
              </>
            )}
        </div>
      </div>
       {isCurrentUserMessage && (
        <Avatar className="h-8 w-8 self-end">
          <AvatarImage src={currentUser?.photoURL || `https://placehold.co/40x40.png`} alt={currentUser?.username || "You"} data-ai-hint="user avatar"/>
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {getInitials(currentUser?.username || currentUser?.email, "Me")}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
