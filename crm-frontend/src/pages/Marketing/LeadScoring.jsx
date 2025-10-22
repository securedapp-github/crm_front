import { useEffect, useMemo, useState } from 'react'
import { getDeals, updateDeal } from '../../api/deal'
import { useToast } from '../../components/ToastProvider'

export default function LeadScoring() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const { show } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getDeals()
      setDeals(res.data?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ fetchData() }, [])

  const filtered = useMemo(() => {
    return deals.filter(d => [
      d.title,
      d.stage,
      d.contact?.name,
    ].filter(Boolean).some(v => String(v).toLowerCase().includes(query.toLowerCase())))
  }, [deals, query])

  const saveScore = async (d, newScore) => {
    try {
      await updateDeal(d.id, { score: newScore })
      show('Score updated', 'success')
      fetchData()
    } catch { show('Failed to update score', 'error') }
  }

  const toggleHot = async (d) => {
    try {
      await updateDeal(d.id, { isHot: !d.isHot })
      show('Hot flag updated', 'success')
      fetchData()
    } catch { show('Failed to update hot flag', 'error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Lead Scoring & Qualification</h2>
        <input className="px-3 py-2 border rounded-md text-sm" placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)} />
      </div>
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Lead</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Score</th>
              <th className="text-left px-4 py-2">Grade</th>
              <th className="text-left px-4 py-2">Hot</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td className="px-4 py-3" colSpan={6}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-3 text-slate-500" colSpan={6}>No leads</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="text-slate-900 font-medium">{d.contact?.name || d.title}</div>
                  <div className="text-xs text-slate-500">Deal: {d.title}</div>
                </td>
                <td className="px-4 py-3">{d.stage}</td>
                <td className="px-4 py-3">
                  <input className="w-24 border rounded px-2 py-1" type="number" min={0} max={100} defaultValue={d.score ?? 0} onBlur={(e)=> saveScore(d, Number(e.target.value || 0))} />
                </td>
                <td className="px-4 py-3">{d.grade || '-'}</td>
                <td className="px-4 py-3">
                  <button className={`text-xs px-2 py-1 rounded border ${d.isHot ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}`} onClick={()=>toggleHot(d)}>
                    {d.isHot ? 'Hot' : 'Mark Hot'}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">Scores {'>'} 70 are Hot</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}
