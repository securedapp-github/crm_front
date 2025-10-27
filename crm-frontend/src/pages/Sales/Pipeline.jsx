import { useEffect, useMemo, useState } from 'react'
import { getPeople, getPipeline, moveDealStage } from '../../api/sales'

const STAGES = ['New', 'In Progress', 'Proposal', 'Won', 'Lost']

export default function Pipeline() {
  const [loading, setLoading] = useState(true)
  const [salespeople, setSalespeople] = useState([])
  const [data, setData] = useState(() => STAGES.reduce((acc, s) => ({ ...acc, [s]: [] }), {}))

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [peopleRes, pipeRes] = await Promise.all([getPeople(), getPipeline()])
      setSalespeople((peopleRes.data?.data || []).slice(0, 4))
      setData(pipeRes.data?.data || {})
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
                    {col.items.map(deal => (
                      <div
                        key={deal.id}
                        className="rounded-lg border bg-white px-3 py-2 cursor-move hover:shadow-md transition-all"
                        draggable
                        onDragStart={(e) => onDragStart(e, deal)}
                        title={deal.title}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-slate-900 text-sm truncate">{deal.title}</div>
                          <div className="text-xs text-slate-600">₹{Number(deal.value || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
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
