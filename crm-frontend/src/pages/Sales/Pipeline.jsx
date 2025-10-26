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

  // Build per-salesperson stats using pipeline data
  const perSalesperson = useMemo(() => {
    return salespeople.map(sp => {
      const byStage = STAGES.map(stage => {
        const items = (data[stage] || []).filter(d => d.assignedTo === sp.id)
        const amount = items.reduce((sum, d) => sum + Number(d.value || 0), 0)
        return { stage, count: items.length, amount }
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

      {/* Kanban Board */}
      <div>
        <section>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {STAGES.map((stage) => {
              const stageData = data[stage] || []
              const total = totals.find((t) => t.stage === stage)
              return (
                <div
                  key={stage}
                  className="rounded-xl border bg-white flex flex-col shadow-sm hover:shadow-md transition"
                  onDrop={(e) => onDrop(e, stage)}
                  onDragOver={onDragOver}
                >
                  <div className="border-b p-3 bg-slate-50 rounded-t-xl flex items-center justify-between">
                    <div className="font-semibold text-slate-800">{stage}</div>
                    <div className="text-xs text-slate-500">
                      {total?.count || 0} deals • ₹
                      {Number(total?.amount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 space-y-3 min-h-[240px] bg-slate-50/30">
                    {stageData.map((deal) => (
                      <div
                        key={deal.id}
                        className="rounded-lg border bg-white p-3 cursor-move hover:shadow-md transition-all"
                        draggable
                        onDragStart={(e) => onDragStart(e, deal)}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="font-medium text-slate-900 text-sm truncate"
                            title={deal.title}
                          >
                            {deal.title}
                          </div>
                          <div className="text-xs text-slate-600">
                            ₹{Number(deal.value || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200"
                            title="Sales person"
                          >
                            {initials(deal.salesPerson || 'SP')}
                          </span>
                          <span>{deal.salesPerson || 'Sales Person'}</span>
                        </div>
                      </div>
                    ))}
                    {stageData.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-6 italic">
                        Drop deals here
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
