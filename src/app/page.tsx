
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth/signin');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="space-y-4 p-8 rounded-lg shadow-xl bg-card">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-full mt-4" />
      </div>
    </div>
  );
}
