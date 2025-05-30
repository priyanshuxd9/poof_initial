
import { Logo } from '@/components/shared/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo iconSize={40} textSize="text-4xl" />
        </div>
        <div className="bg-card p-8 rounded-xl shadow-2xl">
          {children}
        </div>
         <p className="text-center text-sm text-muted-foreground">
          Poof! group chats that vanish without a trace.
        </p>
      </div>
    </div>
  );
}
