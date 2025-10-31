import { useEffect, useMemo, useState } from 'react'
import { getPeople, getPipeline } from '../../api/sales'
import { getTasks } from '../../api/task'

const STAGES = ['New', 'In Progress', 'Proposal', 'Won', 'Lost']

export default function Pipeline() {
  const [loading, setLoading] = useState(true)
  const [salespeople, setSalespeople] = useState([])
  const [data, setData] = useState(() => STAGES.reduce((acc, s) => ({ ...acc, [s]: [] }), {}))
  const [tasks, setTasks] = useState([])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [peopleRes, pipeRes, tasksRes] = await Promise.all([getPeople(), getPipeline(), getTasks()])
      const rawPeople = Array.isArray(peopleRes.data?.data) ? peopleRes.data.data : []
      const filteredPeople = rawPeople.filter(sp => !/@example\.com$/i.test(sp?.email || ''))
      setSalespeople(filteredPeople)
      setData(pipeRes.data?.data || {})
      setTasks(tasksRes.data?.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const initials = (name) =>
    (name || '')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'SP'

  const totals = useMemo(
    () =>
      STAGES.map((s) => ({
        stage: s,
        count: (data[s] || []).length,
        amount: (data[s] || []).reduce((sum, d) => sum + Number(d.value || 0), 0),
      })),
    [data]
  )

  const allDeals = useMemo(() => (Object.values(data || {}).flat() || []), [data])
  const newStageDeals = useMemo(() => (data['New'] || []), [data])
  const upcomingCalls = useMemo(() => {
    const now = new Date()
    const list = (tasks || [])
      .filter(t => t.status === 'Open' && t.relatedDealId && t.dueDate && new Date(t.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 8)
    const withDeal = list.map(t => ({
      task: t,
      deal: allDeals.find(d => d.id === t.relatedDealId) || null
    }))
    return withDeal
  }, [tasks, allDeals])

  const perSalesperson = useMemo(() => {
    return salespeople.map(sp => {
      const byStage = STAGES.map(stage => {
        const items = (data[stage] || []).filter(d => d.assignedTo === sp.id)
        const amount = items.reduce((sum, d) => sum + Number(d.value || 0), 0)
        const notes = items.filter(d => d.notes)
        return { stage, items, amount, notes }
      })
      const stageNotes = byStage
        .filter(col => col.notes.length > 0)
        .map(col => ({ stage: col.stage, deals: col.notes }))
      return { sp, byStage, stageNotes }
    })
  }, [salespeople, data])

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Sales Pipeline</h2>
        <button
          className={`px-4 py-2 rounded-lg border text-sm transition ${
            loading
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          onClick={fetchAll}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Scheduled calls overview (read-only) */}
      <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-emerald-900">Upcoming Sales Calls</h3>
            <p className="text-sm text-emerald-800">
              Follow-up times are planned by the sales team. Review their upcoming commitments below.
            </p>
            <p className="mt-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700">
              Need a new follow-up? Ask a salesperson to schedule it from their Sales Dashboard.
            </p>
          </div>

          <div className="w-full md:w-[420px]">
            <h4 className="text-sm font-semibold text-emerald-900">Next 8 scheduled calls</h4>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-emerald-200 bg-white">
              {upcomingCalls.length === 0 ? (
                <div className="px-3 py-2 text-sm text-emerald-800">No upcoming call tasks</div>
              ) : (
                <ul className="divide-y">
                  {upcomingCalls.map(({ task, deal }) => (
                    <li key={task.id} className="px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-slate-900 truncate">{deal?.title || `Deal #${task.relatedDealId}`}</div>
                        <div className="text-xs text-slate-600">{new Date(task.dueDate).toLocaleString()}</div>
                      </div>
                      <div className="text-xs text-slate-600">{task.title}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Totals header */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="grid grid-cols-6 gap-0 text-sm">
          <div className="col-span-1 px-4 py-3 border-r font-medium text-slate-700">Salesperson</div>
          {STAGES.map(s => {
            const t = totals.find(t => t.stage === s)
            return (
              <div key={s} className="px-4 py-3 border-r last:border-r-0 text-slate-700 flex items-center justify-between">
                <span>{s}</span>
                <span className="text-xs text-slate-500">{t?.count || 0} • ₹{Number(t?.amount || 0).toLocaleString()}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rows per salesperson with stage columns */}
      <div className="space-y-4">
        {perSalesperson.map(row => (
          <div key={row.sp.id} className="rounded-xl border bg-white shadow-sm">
            <div className="grid grid-cols-6 gap-0">
              <div className="col-span-1 px-4 py-3 border-r flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  {initials(row.sp.name)}
                </span>
                <div className="text-slate-900 font-medium truncate">{row.sp.name}</div>
              </div>
              {row.byStage.map(col => (
                <div
                  key={col.stage}
                  className="px-3 py-3 border-r last:border-r-0 bg-slate-50/30"
                >
                  <div className="min-h-[84px] space-y-2">
                    {col.items.map(deal => {
                      const friendlyTitle = (() => {
                        const pattern = /^Campaign Lead -\s*(.+?)\s*Opportunity$/i
                        const match = typeof deal.title === 'string' ? deal.title.match(pattern) : null
                        if (match && match[1]) return match[1]
                        return deal.title
                      })()
                      return (
                        <div
                          key={deal.id}
                          className="rounded-lg border bg-white px-3 py-2 transition-all"
                          title={deal.title}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-slate-900 text-sm truncate">{friendlyTitle}</div>
                            <div className="text-xs text-slate-600">₹{Number(deal.value || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      )
                    })}
                    {col.items.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-5 italic">No deals</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {row.stageNotes.length > 0 && (
              <div className="border-t px-4 py-4 bg-slate-50/50">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes for {row.sp.name}</div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {row.stageNotes.map(stageGroup => (
                    <div key={stageGroup.stage} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-sm font-semibold text-slate-800">{stageGroup.stage}</div>
                      <ul className="mt-2 space-y-2 text-xs text-slate-600">
                        {stageGroup.deals.map(deal => (
                          <li key={deal.id} className="rounded-md border border-slate-100 bg-slate-50/60 p-2">
                            <div className="font-medium text-slate-700 truncate">{deal.title || `Deal #${deal.id}`}</div>
                            <p className="mt-1 whitespace-pre-wrap text-slate-600">{deal.notes}</p>
                            {deal.updatedAt && (
                              <span className="mt-1 block text-[10px] text-slate-400">Updated {new Date(deal.updatedAt).toLocaleString()}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
