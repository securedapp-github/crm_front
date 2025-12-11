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
        } catch { }
      })
      await Promise.allSettled(promises)
    } finally { setCampLoading(false) }
  }

  const fetchSalesPeople = async () => {
    try {
      const res = await getPeople()
      setSalespeople(res.data?.data || [])
    } catch { }
  }

  useEffect(() => { fetchData(); fetchCampaigns(); fetchSalesPeople() }, [])
  useEffect(() => { setQuery(initialQuery || '') }, [initialQuery])

  const filtered = useMemo(() => {
    return deals.filter(d => [
      d.title,
      d.stage,
      d.contact?.name,
    ].filter(Boolean).some(v => String(v).toLowerCase().includes(query.toLowerCase())))
  }, [deals, query])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [query])

  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage])

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Lead Scoring & Qualification</h2>
        <input className="w-full sm:w-auto px-3 py-2 border rounded-md text-sm" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="rounded-lg border bg-white overflow-x-auto">
        <div className="min-w-[800px]">
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
                <tr><td className="px-4 py-3" colSpan={7}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-3 text-slate-500" colSpan={7}>No leads</td></tr>
              ) : paginatedDeals.map(d => {
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
                      <button className={`text-xs px-2 py-1 rounded border ${d.isHot ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}`} onClick={() => toggleHot(d)}>
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

        {/* Pagination Controls */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium">{filtered.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
