
import { CreateGroupForm } from "@/components/groups/create-group-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreateGroupPage() {
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
          <CardTitle className="text-3xl font-bold text-center tracking-tight">Start a New Poof Group</CardTitle>
          <CardDescription className="text-center text-md">
            Configure your temporary group. It will vanish after the set timer!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateGroupForm />
        </CardContent>
      </Card>
    </div>
  );
}
