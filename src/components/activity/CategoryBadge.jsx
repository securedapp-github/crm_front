import React from 'react'

const CATEGORY_CONFIG = {
  productive: { style: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/60', dot: 'bg-emerald-500' },
  neutral: { style: 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100/60', dot: 'bg-slate-400' },
  unproductive: { style: 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/60', dot: 'bg-amber-500' },
  blocked: { style: 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100/60', dot: 'bg-rose-500' }
}

export default function CategoryBadge({ category = 'neutral', size = 'normal', showIcon = true }) {
  const normalizedCategory = (category || 'neutral').toLowerCase()
  const config = CATEGORY_CONFIG[normalizedCategory] || CATEGORY_CONFIG.neutral
  const isSmall = size === 'small'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border transition-colors ${
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${config.style}`}
    >
      {showIcon && <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />}
      <span className="capitalize">{normalizedCategory}</span>
    </span>
  )
}
