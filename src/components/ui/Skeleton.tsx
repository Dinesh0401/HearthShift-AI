import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse rounded-lg bg-zinc-200/70 ${className}`} aria-hidden="true" />
);
