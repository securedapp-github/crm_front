import { useEffect, useRef, useState } from 'react'
import { CornerUpRight, Check, Loader2 } from 'lucide-react'

const DEPARTMENTS = [
  { key: 'tech', label: 'Tech' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'growth', label: 'Growth' },
  { key: 'sales', label: 'Sales' },
  { key: 'hr', label: 'HR' }
]

export default function RouteDeptDropdown({ ticket, onRoute, submitting }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        title="Route / re-route to a department"
      >
        <CornerUpRight className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-300/40">
          <p className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Route to department</p>
          {DEPARTMENTS.map((d) => (
            <button
              key={d.key}
              disabled={submitting}
              onClick={() => { setOpen(false); onRoute(ticket, d.key) }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <Check className="w-3.5 h-3.5 text-emerald-500" />}
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
