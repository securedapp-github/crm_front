import { useMemo } from 'react'
import { Layers, ChevronLeft, ChevronRight, Users } from 'lucide-react'

const DEPARTMENTS = [
  { key: 'tech', label: 'Tech' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'growth', label: 'Growth' },
  { key: 'sales', label: 'Sales' },
  { key: 'hr', label: 'HR' }
]

export default function TeamQueuesSidebar({
  tickets = [],
  activeDepartment = null,
  onSelect,
  collapsed = false,
  onToggle
}) {
  const counts = useMemo(() => {
    const map = {}
    tickets.forEach((t) => {
      if (!['Open', 'In Progress'].includes(t.status)) return
      const dept = (t.assignedDepartment || '').trim().toLowerCase()
      if (!dept) return
      map[dept] = (map[dept] || 0) + 1
    })
    return map
  }, [tickets])

  const totalActive = DEPARTMENTS.reduce((sum, d) => sum + (counts[d.key] || 0), 0)

  if (collapsed) {
    return (
      <div className="shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-xs transition-colors cursor-pointer"
          title="Show Team Queues"
        >
          <Layers className="w-4 h-4" />
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3.5 py-3 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100"><Layers className="w-4 h-4" /></div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Team Queues</h3>
              <p className="text-[10px] text-slate-400 font-medium">{totalActive} active</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors cursor-pointer"
            title="Hide Team Queues"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-2 space-y-1">
          {DEPARTMENTS.map((d) => {
            const count = counts[d.key] || 0
            const active = activeDepartment === d.key
            return (
              <button
                key={d.key}
                onClick={() => onSelect(active ? null : d.key)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <Users className={`w-3.5 h-3.5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {d.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  active ? 'bg-white/20 text-white' : count > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="px-3 py-2.5 border-t border-slate-200/80 bg-slate-50/40">
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Open + In Progress tickets per department. Click a queue to filter.
          </p>
        </div>
      </div>
    </aside>
  )
}
