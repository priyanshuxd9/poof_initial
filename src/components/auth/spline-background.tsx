'use client';

import Spline from '@splinetool/react-spline';
import { cn } from "@/lib/utils";

export function SplineBackground({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 z-0", className)}>
      <Spline
        scene="https://my.spline.design/glassmorphismblobs-6c2b6a7a3dee4883a590aac7c8d737b5/scene.splinecode"
        className='pointer-events-none'
      />
    </div>
  );
}
