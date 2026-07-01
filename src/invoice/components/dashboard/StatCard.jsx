import React from 'react';
import { cn } from '@/invoice/lib/utils';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className }) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all duration-300", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold font-display tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn("text-xs font-medium", trendUp ? "text-emerald-600" : "text-red-500")}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center">
            <Icon className="h-5 w-5 text-accent-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
