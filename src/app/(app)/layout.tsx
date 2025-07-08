
"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AppHeader } from '@/components/shared/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { JoinGroupDialog } from '@/components/groups/join-group-dialog';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isJoinGroupDialogOpen, setJoinGroupDialogOpen, triggerDataRefresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // The chat page uses a different, full-screen layout.
  // This regex matches /groups/[alphanumeric-id] but not sub-pages like /info
  const isChatPage = /^\/groups\/[a-zA-Z0-9]+$/.test(pathname);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin');
    }
  }, [user, loading, router]);
  
  const handleGroupJoined = () => {
    triggerDataRefresh(); // This will update the key in context
    // The dashboard component will see the key change and re-fetch its data.
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b h-16 bg-background/95">
          <div className="container flex h-16 items-center justify-between max-w-screen-2xl px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-8 w-24 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
     // This will be briefly shown before redirection if not loading and no user
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
         <p>Redirecting to sign in...</p>
      </div>
    );
  }
  
  // Render a special, full-screen layout for the chat page
  if (isChatPage) {
    return (
        <div className="h-screen bg-background">
            {children}
        </div>
    );
  }

  // Render the standard layout for all other app pages
  return (
    <>
      <JoinGroupDialog
        open={isJoinGroupDialogOpen}
        onOpenChange={setJoinGroupDialogOpen}
        onGroupJoined={handleGroupJoined}
      />
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </>
  );
}
