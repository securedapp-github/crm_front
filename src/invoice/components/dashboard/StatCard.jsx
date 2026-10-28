import React from 'react';
import { cn } from '@/invoice/lib/utils';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className }) {
  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border p-5 lg:p-6 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between relative",
      className
    )}>
      {/* Top Header: Title on left, Icon on right */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate" title={title}>
          {title}
        </p>
        {Icon && (
          <div className="h-9 w-9 rounded-xl bg-accent/80 border border-border/50 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-accent-foreground" />
          </div>
        )}
      </div>

      {/* Main Value & Trend */}
      <div className="mt-3 space-y-1 min-w-0">
        <div
          className="text-xl sm:text-2xl lg:text-[25px] font-bold font-display tracking-tight text-foreground truncate"
          title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
        >
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate" title={subtitle}>
            {subtitle}
          </p>
        )}
        {trend && (
          <p className={cn("text-xs font-medium flex items-center gap-1", trendUp ? "text-emerald-600" : "text-red-500")}>
            <span>{trendUp ? '↑' : '↓'}</span>
            <span>{trend}</span>
          </p>
        )}
      </div>
    </div>
  );
}
