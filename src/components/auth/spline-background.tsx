'use client';

import Spline from '@splinetool/react-spline';
import { cn } from "@/lib/utils";

export function SplineBackground({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 z-0", className)}>
      <Spline
        scene="https://prod.spline.design/SSBqB6tS3q4S2nDf/scene.splinecode"
        className='pointer-events-none'
      />
    </div>
  );
}
