
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNowStrict, format, isToday, isThisYear } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateInviteCode(length: number = 8): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function formatTimeAgo(date: Date | string | number | undefined): string {
  if (!date) return '';
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

export function formatDetailedTimestamp(timestamp: Date | string | number | undefined): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  
  // if today, show "Today, 5:30 PM"
  if (isToday(date)) {
    return `Today, ${format(date, "p")}`;
  }
  
  // if this year, show "Jun 1, 5:30 PM"
  if (isThisYear(date)) {
    return format(date, "MMM d, p");
  }

  // otherwise, show "Jun 1, 2023, 5:30 PM"
  return format(date, "MMM d, yyyy, p");
}

export function getInitials(name?: string | null, fallback: string = "P"): string {
  if (!name) return fallback;
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 1 && nameParts[0].length > 0) {
    return nameParts[0].substring(0, Math.min(2, nameParts[0].length)).toUpperCase();
  }
  if (nameParts.length > 1) {
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  }
  return fallback;
}
