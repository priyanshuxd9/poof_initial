"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { formatTimeAgo } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Archive, ServerCrash } from 'lucide-react';

// Simplified type for archived groups
interface ArchivedGroup {
  id: string;
  name: string;
  description: string;
  selfDestructAt: string; // ISO string
}

function ArchivedGroupTile({ group }: { group: ArchivedGroup }) {
    const poofedAgo = formatTimeAgo(new Date(group.selfDestructAt));

    return (
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-tile">
            <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{group.name}</h3>
                    <p className="text-sm text-muted-foreground truncate mt-1">{group.description}</p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">Poofed</p>
                    <p className="text-xs text-muted-foreground">{poofedAgo}</p>
                </div>
            </div>
        </div>
    );
}


export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const [archivedGroups, setArchivedGroups] = useState<ArchivedGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArchivedGroups = async () => {
      if (!user || !user.uid) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const groupsRef = collection(db, 'groups');
        const q = query(
          groupsRef,
          where('memberUserIds', 'array-contains', user.uid),
          where('selfDestructAt', '<=', new Date()),
          orderBy('selfDestructAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const fetchedGroups: ArchivedGroup[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            selfDestructAt: (data.selfDestructAt as Timestamp).toDate().toISOString(),
          };
        });
        setArchivedGroups(fetchedGroups);
      } catch (err) {
        console.error("Error fetching archived groups:", err);
        setError("Failed to load archived groups. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!authLoading) {
        fetchArchivedGroups();
    }
  }, [user, authLoading]);

  const renderContent = () => {
    if (isLoading || authLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
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

    if (archivedGroups.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed p-8 rounded-lg">
            <Archive className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold">No Past Groups</h3>
            <p>Groups that have "poofed" will appear here.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {archivedGroups.map((group) => (
          <ArchivedGroupTile key={group.id} group={group} />
        ))}
      </div>
    );
  };
  
  return (
    <div className="container mx-auto max-w-3xl py-8 sm:py-12 px-4">
      <Button variant="outline" asChild className="mb-6 group">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
      </Button>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Past Groups</CardTitle>
          <CardDescription>A history of your groups that have self-destructed.</CardDescription>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
