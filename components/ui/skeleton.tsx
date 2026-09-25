import { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
  height?: string;
  width?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className = '', children, height, width, variant = 'rectangular' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  return (
    <div
      className={`skeleton ${variantClasses[variant]} ${className}`}
      style={{ height, width }}
    >
      {children}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4 animate-fade-in stagger-1">
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" className="w-10 h-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circular" className="w-10 h-10" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="card p-6 animate-fade-in">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}