import { useEffect, useMemo, useState } from 'react'
import { getPipeline, moveDealStage, getPeople } from '../../api/sales'
import { useToast } from '../../components/ToastProvider'

const STAGES = ['New','In Progress','Proposal','Won','Lost']

export default function LeadPipeline() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(() => STAGES.reduce((acc, s) => ({ ...acc, [s]: [] }), {}))
  const [salespeople, setSalespeople] = useState([])
  const { show } = useToast()

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pipeRes, peopleRes] = await Promise.all([
        getPipeline(),
        getPeople()
      ])
      setData(pipeRes.data?.data || {})
      setSalespeople(peopleRes.data?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const totals = useMemo(() => STAGES.map((s) => ({
    stage: s,
    count: (data[s] || []).length,
    amount: (data[s] || []).reduce((sum, d) => sum + Number(d.value || 0), 0)
  })), [data])

  const onDragStart = (e, deal) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: deal.id }))
  }
  const onDrop = async (e, stage) => {
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain'))
      await moveDealStage(payload.id, stage)
      await fetchAll()
      show('Deal moved', 'success')
    } catch {
      show('Failed to move deal', 'error')
    }
  }
  const onDragOver = (e) => e.preventDefault()

  const salespersonName = (id) => salespeople.find(p => p.id === id)?.name || '—'
  const initials = (name) => (name || '')
    .split(' ').map(w => w[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || 'SP'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Sales Pipeline</h2>
        <button className="px-3 py-2 rounded border" onClick={fetchAll} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {STAGES.map((stage) => (
          <div key={stage} className="rounded-lg border bg-white flex flex-col"
               onDrop={(e)=>onDrop(e, stage)} onDragOver={onDragOver}>
            <div className="border-b p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">{stage}</div>
                <div className="text-xs text-slate-500">{totals.find(t=>t.stage===stage)?.count || 0} Deals - ₹{Number(totals.find(t=>t.stage===stage)?.amount || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="p-3 space-y-3 min-h-[200px]">
              {(data[stage] || []).map(deal => (
                <div key={deal.id} className="rounded-md border p-3 cursor-move hover:shadow" draggable onDragStart={(e)=>onDragStart(e, deal)}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-900 text-sm truncate" title={deal.title}>{deal.title}</div>
                    <div className="text-xs text-slate-600">₹{Number(deal.value || 0).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200" title={salespersonName(deal.assignedTo)}>
                      {initials(salespersonName(deal.assignedTo))}
                    </span>
                    <span>{salespersonName(deal.assignedTo)}</span>
                  </div>
                </div>
              ))}
              {(!data[stage] || data[stage].length === 0) && (
                <div className="text-xs text-slate-400">Drop deals here</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
