
'use client';

import Spline from '@splinetool/react-spline';
import { cn } from "@/lib/utils";

export function SplineBackground({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 z-0", className)}>
      <Spline
        scene="https://prod.spline.design/VvN4-zC13eDWiWf5/scene.splinecode"
        className='pointer-events-none'
      />
    </div>
  );
}
