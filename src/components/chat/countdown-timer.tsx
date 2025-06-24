
"use client";

import { useState, useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
    selfDestructAt: Date;
    createdAt: Date;
}

export function CountdownTimer({ selfDestructAt, createdAt }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState({ text: 'Calculating...', percent: 100, isLow: false });

    useEffect(() => {
        const calculateRemainingTime = () => {
            const now = new Date().getTime();
            const destructTime = selfDestructAt.getTime();
            const createdTime = createdAt.getTime();
            
            const totalDuration = destructTime - createdTime;
            const timeRemaining = destructTime - now;

            if (timeRemaining <= 0) {
                setTimeLeft({ text: 'Poofed!', percent: 0, isLow: true });
                return;
            }
            
            const percent = totalDuration > 0 ? Math.max(0, (timeRemaining / totalDuration) * 100) : 0;
            const isLow = percent < 15;

            const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

            let text;
            if (days > 0) {
                text = `${days}d ${hours}h left`;
            } else if (hours > 0) {
                text = `${hours}h ${minutes}m left`;
            } else if (minutes > 0) {
                text = `${minutes}m left`;
            } else {
                text = "<1m left";
            }
            
            setTimeLeft({ text, percent, isLow });
        };

        calculateRemainingTime();
        const intervalId = setInterval(calculateRemainingTime, 30000); // Update every 30 seconds
        return () => clearInterval(intervalId);
    }, [selfDestructAt, createdAt]);

    return (
        <div className="flex flex-col gap-1.5">
            <div className={`flex items-center gap-1.5 text-xs ${timeLeft.isLow ? 'text-destructive' : 'text-muted-foreground'}`}>
                <Clock className="h-3 w-3" />
                <span>{timeLeft.text}</span>
            </div>
            <Progress value={timeLeft.percent} className={`h-1 ${timeLeft.isLow ? '[&>div]:bg-destructive' : ''}`} />
        </div>
    )
}
