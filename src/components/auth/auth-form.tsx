
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).max(20, { message: "Username must be at most 20 characters."}).regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const formSchema = isSignUp ? signUpSchema : signInSchema;
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      ...(isSignUp && { username: "" }),
    },
  });

  const onSubmit = async (values: FormValues) => {
    startTransition(async () => {
      try {
        if (isSignUp) {
          await signUp(values.email, values.password, (values as z.infer<typeof signUpSchema>).username);
          toast({ title: "Account Created", description: "Welcome to Poof! Redirecting..." });
        } else {
          await signIn(values.email, values.password);
          toast({ title: "Signed In", description: "Welcome back! Redirecting..." });
        }
        router.push("/dashboard");
        router.refresh(); // Ensure layout re-renders with new auth state
      } catch (error: any) {
        toast({
          title: "Authentication Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-2xl font-semibold text-center text-foreground">
          {isSignUp ? "Create an Account" : "Sign In to Poof"}
        </h2>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isSignUp && (
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="your_username" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    {...field} 
                    disabled={isPending}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isPending}
                  >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSignUp ? "Sign Up" : "Sign In"}
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <Button
            variant="link"
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              form.reset(); // Reset form on mode toggle
            }}
            className="p-0 h-auto font-semibold text-primary hover:text-accent"
            disabled={isPending}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </Button>
        </p>
      </form>
    </Form>
  );
}

