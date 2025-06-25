
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
import { Eye, EyeOff, Loader2, User, Lock } from "lucide-react";

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

const formSchemas = {
    signIn: signInSchema,
    signUp: signUpSchema,
    resetPassword: resetPasswordSchema,
};

type AuthMode = "signIn" | "signUp" | "resetPassword";

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

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

  useEffect(() => {
    form.reset();
  }, [mode, form]);

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
        }
      } catch (error: any) {
        toast({
          title: mode === "resetPassword" ? "Reset Failed" : "Authentication Failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  const getTitle = () => {
    switch (mode) {
        case "signIn": return "Sign In";
        case "signUp": return "Create Account";
        case "resetPassword": return "Reset Password";
    }
  }
  
  const getButtonText = () => {
    switch (mode) {
        case "signIn": return "Sign In";
        case "signUp": return "Sign Up";
        case "resetPassword": return "Send Reset Link";
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-2xl font-bold text-center text-white">
          {getTitle()}
        </h2>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Email</FormLabel>
                <FormControl>
                  <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                    <Input 
                      placeholder="Email" 
                      {...field} 
                      disabled={isPending}
                      className="bg-white/10 border-white/20 placeholder:text-gray-300 text-white pl-10 focus:ring-white/50"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {mode === "signUp" && (
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                      <Input 
                        placeholder="Username" 
                        {...field} 
                        disabled={isPending} 
                        className="bg-white/10 border-white/20 placeholder:text-gray-300 text-white pl-10 focus:ring-white/50"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {mode !== 'resetPassword' && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Password" 
                        {...field} 
                        disabled={isPending}
                        className="bg-white/10 border-white/20 placeholder:text-gray-300 text-white pl-10 focus:ring-white/50"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-300 hover:bg-transparent hover:text-white"
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
        </div>

        {mode === 'signIn' && (
            <div className="text-right">
                 <Button
                    variant="link"
                    type="button"
                    onClick={() => setMode("resetPassword")}
                    className="p-0 h-auto text-sm text-gray-300 hover:text-white"
                    disabled={isPending}
                >
                    Forgot Password?
                </Button>
            </div>
        )}

        <Button type="submit" className="w-full bg-white/20 border border-white/20 text-white hover:bg-white/30" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {getButtonText()}
        </Button>

        <p className="text-sm text-center text-gray-300">
          {mode === 'signIn' && "Don't have an account?"}
          {mode === 'signUp' && "Already have an account?"}
          {mode === 'resetPassword' && "Remember your password?"}{" "}
          <Button
            variant="link"
            type="button"
            onClick={() => setMode(mode === 'signUp' || mode === 'resetPassword' ? "signIn" : "signUp")}
            className="p-0 h-auto font-semibold text-white hover:underline"
            disabled={isPending}
          >
            {mode === 'signUp' || mode === 'resetPassword' ? "Sign In" : "Sign Up"}
          </Button>
        </p>
      </form>
    </Form>
  );
}
