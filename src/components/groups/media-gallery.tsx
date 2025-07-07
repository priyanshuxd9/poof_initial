
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, FileText, ServerCrash, Download } from "lucide-react";
import NextImage from "next/image";
import { formatFileSize } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MediaMessage {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'file';
  fileName: string;
  fileSize: number;
  createdAt: Timestamp;
}

interface MediaGalleryProps {
  groupId: string;
}

export function MediaGallery({ groupId }: MediaGalleryProps) {
  const [media, setMedia] = useState<MediaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const mediaQuery = query(
      collection(db, "groups", groupId, "messages"),
      where("mediaUrl", "!=", null),
      orderBy("mediaUrl"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(mediaQuery, (snapshot) => {
      const fetchedMedia = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaMessage));
      setMedia(fetchedMedia);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching media gallery:", err);
      setError("Failed to load media. You may need to create a Firestore index for this query.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-destructive bg-destructive/10 p-8 rounded-lg">
        <ServerCrash className="h-12 w-12 mb-4" />
        <h3 className="text-xl font-semibold">An Error Occurred</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed p-8 rounded-lg">
        <ImageIcon className="h-12 w-12 mb-4" />
        <h3 className="text-xl font-semibold">No Media Shared</h3>
        <p>Images and files shared in the chat will appear here.</p>
      </div>
    );
  }

  const images = media.filter(m => m.mediaType === 'image');
  const files = media.filter(m => m.mediaType === 'file');

  return (
    <div className="space-y-8">
      {images.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Images</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {images.map(item => (
              <Dialog key={item.id}>
                <DialogTrigger asChild>
                  <div className="relative group aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                    <NextImage src={item.mediaUrl} alt={item.fileName} layout="fill" className="object-cover" unoptimized/>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </DialogTrigger>
                <DialogContent className="w-screen h-screen max-w-full max-h-full p-2 sm:p-4 bg-black/80 border-none flex items-center justify-center">
                  <DialogHeader className="sr-only">
                    <DialogTitle>{item.fileName || "Image Preview"}</DialogTitle>
                    <DialogDescription>Full-screen preview of the image.</DialogDescription>
                  </DialogHeader>
                  <NextImage
                    src={item.mediaUrl}
                    alt={item.fileName || "Shared image"}
                    width={1920}
                    height={1080}
                    className="rounded-lg object-contain w-full h-auto max-h-screen"
                    unoptimized
                  />
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Files</h3>
          <div className="space-y-2">
            {files.map(item => (
              <a 
                key={item.id}
                href={item.mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.fileName}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(item.fileSize)}</p>
                </div>
                <Download className="h-5 w-5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
