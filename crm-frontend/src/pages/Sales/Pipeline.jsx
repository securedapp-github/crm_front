import { useEffect, useMemo, useState } from 'react'
import { getPeople, getPipeline, moveDealStage } from '../../api/sales'
import { getTasks, createTask } from '../../api/task'

const STAGES = ['New', 'In Progress', 'Proposal', 'Won', 'Lost']

export default function Pipeline() {
  const [loading, setLoading] = useState(true)
  const [salespeople, setSalespeople] = useState([])
  const [data, setData] = useState(() => STAGES.reduce((acc, s) => ({ ...acc, [s]: [] }), {}))
  const [tasks, setTasks] = useState([])
  const [selectedDealId, setSelectedDealId] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [peopleRes, pipeRes, tasksRes] = await Promise.all([getPeople(), getPipeline(), getTasks()])
      setSalespeople((peopleRes.data?.data || []).slice(0, 4))
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

  const scheduleCall = async (days) => {
    const idNum = Number(selectedDealId)
    if (!idNum || Number.isNaN(idNum)) return
    const deal = allDeals.find(d => d.id === idNum)
    const due = new Date()
    due.setDate(due.getDate() + Number(days || 0))
    const title = 'Call follow-up'
    const description = `Auto-scheduled from Call System (${days} day(s))`
    try {
      await createTask({
        title,
        description,
        status: 'Open',
        assignedTo: deal?.assignedTo || null,
        relatedDealId: idNum,
        dueDate: due.toISOString()
      })
      setSelectedDealId('')
      await fetchAll()
    } catch {}
  }

  const onDragStart = (e, deal) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: deal.id }))
  }

  const onDrop = async (e, stage) => {
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain'))
      await moveDealStage(payload.id, stage)
      await fetchAll()
    } catch {}
  }

  const onDragOver = (e) => e.preventDefault()

  const perSalesperson = useMemo(() => {
    return salespeople.map(sp => {
      const byStage = STAGES.map(stage => {
        const items = (data[stage] || []).filter(d => d.assignedTo === sp.id)
        const amount = items.reduce((sum, d) => sum + Number(d.value || 0), 0)
        return { stage, items, amount }
      })
      return { sp, byStage }
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

      {/* Call System */}
      <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-emerald-900">Connect Schedule</h3>
            <p className="text-sm text-emerald-800">Quickly schedule follow-up calls for new leads.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-emerald-900">Select deal</label>
                <select
                  className="mt-1 min-w-[240px] rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={selectedDealId}
                  onChange={(e) => setSelectedDealId(e.target.value)}
                >
                  <option value="">Choose a New-stage deal…</option>
                  {newStageDeals.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scheduleCall(2)}
                  disabled={!selectedDealId}
                  className={`rounded-md px-3 py-2 text-sm font-medium text-white ${selectedDealId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-300 cursor-not-allowed'}`}
                >
                  Call in 2 days
                </button>
                <button
                  onClick={() => scheduleCall(1)}
                  disabled={!selectedDealId}
                  className={`rounded-md px-3 py-2 text-sm font-medium text-white ${selectedDealId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-300 cursor-not-allowed'}`}
                >
                  Call tomorrow
                </button>
                <button
                  onClick={() => scheduleCall(7)}
                  disabled={!selectedDealId}
                  className={`rounded-md px-3 py-2 text-sm font-medium text-white ${selectedDealId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-300 cursor-not-allowed'}`}
                >
                  Call in 1 week
                </button>
              </div>
            </div>
          </div>

          <div className="w-full md:w-[420px]">
            <h4 className="text-sm font-semibold text-emerald-900">Upcoming calls</h4>
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
                  onDrop={(e) => onDrop(e, col.stage)}
                  onDragOver={onDragOver}
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
                          className="rounded-lg border bg-white px-3 py-2 cursor-move hover:shadow-md transition-all"
                          draggable
                          onDragStart={(e) => onDragStart(e, deal)}
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
                      <div className="text-xs text-slate-400 text-center py-5 italic">Drop here</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
