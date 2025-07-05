
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useTransition, useEffect } from "react";
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
import { Eye, EyeOff, Loader2, Mail, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signUpSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).max(20, { message: "Username must be at most 20 characters."}).regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const resetPasswordSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
});

const magicLinkSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
});


const formSchemas = {
    signIn: signInSchema,
    signUp: signUpSchema,
    resetPassword: resetPasswordSchema,
    magicLink: magicLinkSchema,
    magicLinkSent: magicLinkSchema, // No validation needed, but keeps type consistency
};

type AuthMode = "signIn" | "signUp" | "resetPassword" | "magicLink" | "magicLinkSent";

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { signIn, signUp, sendPasswordReset, sendSignInLink, checkAndSignInWithMagicLink, isProcessingMagicLink } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Effect to handle the magic link when the user clicks it and returns to the app
  useEffect(() => {
    checkAndSignInWithMagicLink();
  }, [checkAndSignInWithMagicLink]);


  const formSchema = formSchemas[mode];
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    startTransition(async () => {
      try {
        if (mode === "signUp") {
          await signUp(values.email, values.password, (values as z.infer<typeof signUpSchema>).username);
          toast({ title: "Account Created", description: "Welcome to Poof! Redirecting..." });
          router.push("/dashboard");
          router.refresh();
        } else if (mode === "signIn") {
          await signIn(values.email, values.password);
          toast({ title: "Signed In", description: "Welcome back! Redirecting..." });
          router.push("/dashboard");
          router.refresh();
        } else if (mode === "resetPassword") {
            await sendPasswordReset(values.email);
            toast({ title: "Password Reset Email Sent", description: "Please check your inbox for instructions." });
            setMode("signIn");
        } else if (mode === "magicLink") {
            await sendSignInLink(values.email);
            setMode("magicLinkSent");
        }
      } catch (error: any) {
        let description = "An unexpected error occurred. Please try again.";
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    description = "This email is already registered. Please sign in or use a different email.";
                    break;
                case 'auth/weak-password':
                    description = "The password is too weak. Please use a stronger password (at least 6 characters).";
                    break;
                case 'auth/invalid-email':
                    description = "The email address is not valid. Please check and try again.";
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                     description = "Invalid email or password. Please try again.";
                     break;
                case 'auth/missing-or-insufficient-permissions':
                     description = "A permissions error occurred. This could be due to a username already being taken.";
                     break;
                default:
                    description = error.message || "An unexpected error occurred. Please try again.";
            }
        } else if (error.message) {
            description = error.message;
        }
        
        toast({
          title: mode === "resetPassword" ? "Reset Failed" : mode === 'magicLink' ? "Failed to Send" : "Authentication Failed",
          description: description,
          variant: "destructive",
        });
      }
    });
  };

  if (isProcessingMagicLink) {
    return (
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">Verifying your link...</h2>
            <p className="text-muted-foreground">Please wait while we sign you in.</p>
        </div>
    );
  }

  if (mode === 'magicLinkSent') {
    return (
        <div className="text-center space-y-6">
             <Alert>
                <Mail className="h-4 w-4" />
                <AlertTitle className="font-bold">Check your email!</AlertTitle>
                <AlertDescription>
                   We've sent a magic sign-in link to <span className="font-semibold">{form.getValues("email")}</span>. Click the link to sign in.
                </AlertDescription>
            </Alert>
            <Button
                variant="link"
                onClick={() => {
                    setMode("signIn");
                    form.reset();
                }}
            >
                Back to Sign In
            </Button>
        </div>
    )
  }


  const getTitle = () => {
    switch (mode) {
        case "signIn": return "Sign In to Poof";
        case "signUp": return "Create your Account";
        case "resetPassword": return "Reset Password";
        case "magicLink": return "Sign in with Magic Link";
    }
  }
  
  const getButtonText = () => {
    switch (mode) {
        case "signIn": return "Sign In";
        case "signUp": return "Sign Up";
        case "resetPassword": return "Send Reset Link";
        case "magicLink": return "Send Magic Link";
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-2xl font-bold text-center text-foreground">
          {getTitle()}
        </h2>

        {mode === "signUp" && (
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="poofmaster" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {mode !== 'magicLinkSent' && (
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input placeholder="you@example.com" {...field} disabled={isPending}/>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        
        {mode !== 'resetPassword' && mode !== 'magicLink' && mode !== 'magicLinkSent' && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex justify-between items-center">
                    <FormLabel>Password</FormLabel>
                    {mode === 'signIn' && (
                        <Button
                            variant="link"
                            type="button"
                            onClick={() => setMode("resetPassword")}
                            className="p-0 h-auto text-sm"
                            disabled={isPending}
                        >
                            Forgot Password?
                        </Button>
                    )}
                </div>
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
        )}

        <div className="space-y-4">
            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getButtonText()}
            </Button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                    OR
                    </span>
                </div>
            </div>

            {mode === 'signIn' && (
                 <Button type="button" variant="secondary" className="w-full" onClick={() => setMode('magicLink')} disabled={isPending}>
                    <Mail className="mr-2 h-4 w-4" />
                    Sign in with Magic Link
                </Button>
            )}

            {(mode === 'signUp' || mode === 'resetPassword' || mode === 'magicLink') && (
                <p className="text-sm text-center text-muted-foreground">
                {mode === 'signUp' && "Already have an account?"}
                {mode === 'resetPassword' && "Remember your password?"}
                {mode === 'magicLink' && "Want to use a password?"}{" "}
                <Button
                    variant="link"
                    type="button"
                    onClick={() => setMode("signIn")}
                    className="p-0 h-auto font-semibold"
                    disabled={isPending}
                >
                    Sign In
                </Button>
                </p>
            )}

            {mode === 'signIn' && (
                <p className="text-sm text-center text-muted-foreground">
                    Don't have an account?{" "}
                    <Button
                        variant="link"
                        type="button"
                        onClick={() => setMode("signUp")}
                        className="p-0 h-auto font-semibold"
                        disabled={isPending}
                    >
                        Sign Up
                    </Button>
                </p>
            )}
        </div>
      </form>
    </Form>
  );
}
