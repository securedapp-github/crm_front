import { useEffect, useMemo, useState } from 'react'
import { getDeals, updateDeal } from '../../api/deal'
import { getCampaigns, getCampaignScoring } from '../../api/campaign'
import { useToast } from '../../components/ToastProvider'
import { getPeople } from '../../api/sales'

export default function LeadScoring({ initialQuery = '' }) {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(initialQuery || '')
  const [campaigns, setCampaigns] = useState([])
  const [campLoading, setCampLoading] = useState(true)
  const [campScores, setCampScores] = useState({})
  const [salespeople, setSalespeople] = useState([])
  const { show } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getDeals()
      setDeals(res.data?.data || [])
    } finally { setLoading(false) }
  }

  const fetchCampaigns = async () => {
    setCampLoading(true)
    try {
      const res = await getCampaigns()
      const rows = Array.isArray(res.data?.data) ? res.data.data : []
      setCampaigns(rows)
      // fetch scoring in background for each campaign
      const promises = rows.map(async (c) => {
        try {
          const r = await getCampaignScoring(c.id)
          const s = r.data?.scoring
          if (s) setCampScores(prev => ({ ...prev, [c.id]: s }))
        } catch {}
      })
      await Promise.allSettled(promises)
    } finally { setCampLoading(false) }
  }

  const fetchSalesPeople = async () => {
    try {
      const res = await getPeople()
      setSalespeople(res.data?.data || [])
    } catch {}
  }

  useEffect(()=>{ fetchData(); fetchCampaigns(); fetchSalesPeople() }, [])
  useEffect(()=>{ setQuery(initialQuery || '') }, [initialQuery])

  const filtered = useMemo(() => {
    return deals.filter(d => [
      d.title,
      d.stage,
      d.contact?.name,
    ].filter(Boolean).some(v => String(v).toLowerCase().includes(query.toLowerCase())))
  }, [deals, query])

  const matchCampaignIdFromDeal = (d) => {
    const t = String(d?.title || '')
    const prefix = 'Campaign Lead - '
    const suffix = ' Opportunity'
    if (t.startsWith(prefix) && t.endsWith(suffix)) {
      const name = t.substring(prefix.length, t.length - suffix.length).trim()
      const found = campaigns.find(c => String(c.name) === name)
      return found?.id || null
    }
    return null
  }

  const computeGrade = (score) => {
    const s = typeof score === 'number' ? score : 0
    if (s >= 90) return 'A+'
    if (s >= 80) return 'A'
    if (s >= 70) return 'B'
    if (s >= 60) return 'C'
    if (s >= 40) return 'D'
    return 'E'
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
              <th className="text-left px-4 py-2">Salesperson</th>
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
            ) : filtered.map(d => {
              const campId = matchCampaignIdFromDeal(d)
              const cs = campId ? campScores[campId] : null
              return (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="text-slate-900 font-medium">{d.contact?.name || d.title}</div>
                    <div className="text-xs text-slate-500">Deal: {d.title}</div>
                  </td>
                  <td className="px-4 py-3">{d.stage}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{(() => { const sp = salespeople.find(p => p.id === d.assignedTo); return sp ? sp.name : '—' })()}</td>
                  <td className="px-4 py-3">
                    <input className="w-24 border rounded px-2 py-1 bg-slate-50" type="number" min={0} max={100} value={(cs?.total_score ?? d.score ?? 0)} readOnly disabled />
                  </td>
                  <td className="px-4 py-3">{cs?.grade || d.grade || computeGrade(d.score)}</td>
                  <td className="px-4 py-3 space-x-2">
                    {cs && cs.total_score > 70 && (
                      <span className={`text-xs px-2 py-1 rounded border bg-amber-100 text-amber-700 border-amber-200`}>
                        Hot
                      </span>
                    )}
                    <button className={`text-xs px-2 py-1 rounded border ${d.isHot ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}`} onClick={()=>toggleHot(d)}>
                      {d.isHot ? 'Hot' : 'Mark Hot'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">Scores {'>'} 70 are Hot</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
