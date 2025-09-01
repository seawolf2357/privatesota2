'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface YuriBadgeProps {
  className?: string;
  showVersion?: boolean;
}

export function YuriBadge({ className, showVersion = false }: YuriBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "bg-gradient-to-r from-purple-600 to-purple-400 text-white border-0",
        className
      )}
    >
      <span className="mr-1">🌟</span>
      Yuri (유리)
      {showVersion && <span className="ml-1 text-xs opacity-80">v2.0</span>}
    </Badge>
  );
}