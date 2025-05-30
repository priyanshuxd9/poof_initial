
"use client";

import Link from "next/link";
import { PlusCircle, LogIn, ListChecks, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GroupCard, type Group } from "@/components/groups/group-card";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data for groups - replace with actual data fetching
const mockGroups: Group[] = [
  {
    id: "1",
    name: "Weekend Adventurers",
    description: "Planning epic weekend trips and sharing cool finds. Open to all thrill-seekers!",
    memberCount: 12,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    imageUrl: "https://placehold.co/600x338.png",
    selfDestructAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days from now
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // Created 2 days ago (Total 7 days)
  },
  {
    id: "2",
    name: "Project Poof Planning",
    description: "Internal discussion for the Poof app development. Next deadline: UI freeze.",
    memberCount: 5,
    lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    imageUrl: "https://placehold.co/600x338.png",
    selfDestructAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(), // 1 day from now
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString(), // Created 29 days ago (Total 30 days)
  },
    {
    id: "3",
    name: "Book Club Readers",
    description: "Discussing the latest sci-fi novel and classic literature. Spoilers allowed!",
    memberCount: 25,
    imageUrl: "https://placehold.co/600x338.png",
    selfDestructAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days from now
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // Created 5 days ago (Total 20 days)
  },
];

export default function DashboardPage() {
  const { user, loading } = useAuth();
  // TODO: Fetch actual groups for the user
  const groups = mockGroups;

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <Skeleton className="h-10 w-48" />
          <div className="flex space-x-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user?.username || user?.email}!</h1>
          <p className="text-muted-foreground">Manage your Poof groups or start a new one.</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/groups/create">
              <PlusCircle className="mr-2 h-5 w-5" /> Create Group
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            <LogIn className="mr-2 h-5 w-5" /> Join with Code
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <Alert className="max-w-2xl mx-auto shadow-md">
          <Info className="h-4 w-4" />
          <AlertTitle className="font-semibold">No Groups Yet!</AlertTitle>
          <AlertDescription>
            You're not part of any Poof groups. Why not create one or join using an invite code?
            Poof groups are temporary and will disappear after a set time.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">Your Active Groups</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
