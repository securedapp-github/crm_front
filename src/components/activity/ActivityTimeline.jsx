import React from 'react'

const CATEGORY_COLORS = {
  productive: 'bg-emerald-500 hover:bg-emerald-600',
  neutral: 'bg-slate-400 hover:bg-slate-500',
  unproductive: 'bg-amber-500 hover:bg-amber-600',
  blocked: 'bg-rose-500 hover:bg-rose-600'
}

export default function ActivityTimeline({ activities = [] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-400">
        No timeline data available for selected window
      </div>
    )
  }

  // Calculate total duration for relative width
  const totalDuration = activities.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-0.5">
        <span>Activity Stream</span>
        <span>{Math.round(totalDuration / 60)} mins recorded</span>
      </div>

      <div className="flex h-7 w-full overflow-hidden rounded-xl bg-slate-100 p-1 shadow-inner gap-0.5">
        {activities.map((act, index) => {
          const widthPercent = totalDuration > 0
            ? Math.max(0.5, ((act.durationSeconds || 1) / totalDuration) * 100)
            : 100 / activities.length

          const color = CATEGORY_COLORS[act.category] || CATEGORY_COLORS.neutral

          return (
            <div
              key={act.id || index}
              style={{ width: `${widthPercent}%` }}
              className={`h-full rounded-sm transition-all relative group cursor-pointer ${color}`}
              title={`${act.domain || act.url} — ${act.category} (${Math.round((act.durationSeconds || 0) / 60)}m)`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow-xl z-20 whitespace-nowrap pointer-events-none">
                <span className="font-semibold text-indigo-300">{act.domain || 'Unknown Domain'}</span>
                <span className="text-slate-300 text-[10px] truncate max-w-[200px]">{act.pageTitle || act.url}</span>
                <span className="text-[10px] text-slate-400 capitalize mt-0.5">
                  {act.category} • {Math.round((act.durationSeconds || 0) / 60)} mins
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Productive</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Neutral</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Unproductive</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Blocked</span>
      </div>
    </div>
  )
}
