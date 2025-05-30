
import Link from 'next/link';
import { MessageSquareText } from 'lucide-react'; // Using an icon that somewhat relates to chat

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function Logo({ className, iconSize = 32, textSize = "text-3xl" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 group ${className}`}>
      <div className="p-1.5 bg-primary rounded-lg group-hover:bg-accent transition-colors">
         <MessageSquareText size={iconSize * 0.7} className="text-primary-foreground" />
      </div>
      <h1 className={`font-bold ${textSize} text-foreground group-hover:text-accent transition-colors`}>
        poof
      </h1>
    </Link>
  );
}
