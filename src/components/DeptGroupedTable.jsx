import { useMemo, useState } from 'react'
import { Mail, Eye, CornerUpRight, ChevronUp, ChevronDown, Building2 } from 'lucide-react'
import RouteDeptDropdown from './RouteDeptDropdown'

const DEPT_ORDER = ['tech', 'marketing', 'growth', 'sales', 'hr', 'finance', 'operations']

const deptLabel = (dept = '') => {
  const d = (dept || '').trim().toLowerCase()
  if (!d) return 'Unrouted'
  const map = {
    tech: 'Tech',
    marketing: 'Marketing',
    growth: 'Growth',
    sales: 'Sales',
    hr: 'HR',
    finance: 'Finance',
    operations: 'Operations'
  }
  return map[d] || d.charAt(0).toUpperCase() + d.slice(1)
}

const deptColor = (dept = '') => {
  const d = (dept || '').trim().toLowerCase()
  if (!d) return 'text-rose-700 bg-rose-50 border border-rose-200/60'
  const map = {
    tech: 'text-indigo-700 bg-indigo-50 border border-indigo-100',
    marketing: 'text-purple-700 bg-purple-50 border border-purple-100',
    growth: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
    sales: 'text-amber-700 bg-amber-50 border border-amber-100',
    hr: 'text-rose-700 bg-rose-50 border border-rose-100',
    finance: 'text-sky-700 bg-sky-50 border border-sky-100',
    operations: 'text-slate-700 bg-slate-100 border border-slate-200'
  }
  return map[d] || 'text-slate-600 bg-slate-50 border border-slate-200'
}

const getLastUpdated = (t) => t?.updatedAt || t?.createdAt || null

export default function DeptGroupedTable({
  tickets = [],
  statusBadge,
  priorityBadge,
  formatTimeAgo,
  onRoute,
  onSendReply,
  onView,
  hideSendReply = false,
  routeSubmitting = false
}) {
  const [sortField, setSortField] = useState('department')
  const [sortDir, setSortDir] = useState('asc')

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedTickets = useMemo(() => {
    const list = [...tickets]
    list.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'department': {
          const da = (a.assignedDepartment || '').trim().toLowerCase()
          const db = (b.assignedDepartment || '').trim().toLowerCase()
          // unrouted (-1) always comes first
          const ia = da ? DEPT_ORDER.indexOf(da) : -1
          const ib = db ? DEPT_ORDER.indexOf(db) : -1
          const oa = ia === -1 ? -1 : ia
          const ob = ib === -1 ? -1 : ib
          cmp = oa - ob
          break
        }
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '')
          break
        case 'priority': {
          const pOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 }
          cmp = (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4)
          break
        }
        case 'updated': {
          const ta = getLastUpdated(a) ? new Date(getLastUpdated(a)).getTime() : 0
          const tb = getLastUpdated(b) ? new Date(getLastUpdated(b)).getTime() : 0
          cmp = tb - ta
          break
        }
        default:
          cmp = 0
      }
      // secondary sort by last updated descending
      if (cmp === 0) {
        const ta = getLastUpdated(a) ? new Date(getLastUpdated(a)).getTime() : 0
        const tb = getLastUpdated(b) ? new Date(getLastUpdated(b)).getTime() : 0
        cmp = tb - ta
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [tickets, sortField, sortDir])

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-slate-700" />
      : <ChevronDown className="w-3 h-3 text-slate-700" />
  }

  if (sortedTickets.length === 0) {
    return (
      <div className="py-16 px-4 text-center rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto border border-indigo-100">
          <Building2 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No tickets in this view</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">Tickets will appear here once they are created or routed.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/60">
            <tr>
              <th className="px-4 py-2.5">Ticket # & Subject</th>
              <th
                className="px-3 py-2.5 cursor-pointer select-none group/th"
                onClick={() => toggleSort('department')}
              >
                <span className="inline-flex items-center gap-1">
                  Department <SortIcon field="department" />
                </span>
              </th>
              <th className="px-3 py-2.5">Assignee</th>
              <th
                className="px-3 py-2.5 cursor-pointer select-none group/th"
                onClick={() => toggleSort('status')}
              >
                <span className="inline-flex items-center gap-1">
                  Status <SortIcon field="status" />
                </span>
              </th>
              <th
                className="px-3 py-2.5 cursor-pointer select-none group/th"
                onClick={() => toggleSort('priority')}
              >
                <span className="inline-flex items-center gap-1">
                  Priority <SortIcon field="priority" />
                </span>
              </th>
              <th
                className="px-3 py-2.5 cursor-pointer select-none group/th"
                onClick={() => toggleSort('updated')}
              >
                <span className="inline-flex items-center gap-1">
                  Updated <SortIcon field="updated" />
                </span>
              </th>
              <th className="px-4 py-2.5 text-right w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTickets.map((t) => (
              <tr
                key={t.id}
                className="group/row hover:bg-slate-50/60 transition-colors cursor-pointer"
                onClick={() => onView(t.id)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex flex-col gap-0.5 max-w-xs sm:max-w-md">
                    <span className="text-[10px] font-bold text-indigo-600 font-mono">{t.ticketNumber || `#TCK-${t.id}`}</span>
                    <span className="text-slate-900 font-semibold text-xs line-clamp-1">
                      {(t.title || '').replace(/^Contact Inquiry from/i, '') || 'Support Ticket'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${deptColor(t.assignedDepartment)}`}>
                    {!t.assignedDepartment && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />}
                    {deptLabel(t.assignedDepartment)}
                  </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {t.assignee?.name ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                        {(t.assignee.name || 'U').slice(0, 1).toUpperCase()}
                      </span>
                      {t.assignee.name}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{statusBadge(t.status)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{priorityBadge(t.priority || 'Medium')}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500 font-medium">{formatTimeAgo(getLastUpdated(t))}</td>
                <td className="px-4 py-2.5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <div onClick={(e) => e.stopPropagation()}>
                      <RouteDeptDropdown ticket={t} onRoute={onRoute} submitting={routeSubmitting} />
                    </div>
                    {!hideSendReply && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSendReply(t) }}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="Send resolution reply"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onView(t.id) }}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
