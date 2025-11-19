import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCompletedDeals, getPeople } from '../../api/sales'

export default function CompletedDeals() {
  const [deals, setDeals] = useState([])
  const [salespeople, setSalespeople] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchDeals = async () => {
    setLoading(true)
    try {
      const [dealRes, peopleRes] = await Promise.all([getCompletedDeals(), getPeople()])
      setDeals(Array.isArray(dealRes.data?.data) ? dealRes.data.data : [])
      setSalespeople(Array.isArray(peopleRes.data?.data) ? peopleRes.data.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDeals() }, [])

  const totals = useMemo(() => {
    const count = deals.length
    const value = deals.reduce((sum, deal) => sum + Number(deal.value || 0), 0)
    return { count, value }
  }, [deals])

  const salespersonInfo = useMemo(() => {
    const map = new Map()
    salespeople.forEach(sp => {
      const label = sp.userName || sp.name || `Salesperson #${sp.id}`
      map.set(sp.id, label)
    })
    return map
  }, [salespeople])

  return (
    <main className="min-h-[calc(100vh-112px)] bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200">←</span>
              <span>Back</span>
            </button>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sales wrap-up</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">All Completed Deals</h1>
              <p className="text-sm text-slate-600">Everything your team marked as done in the pipeline lives here.</p>
            </div>
            <button
              onClick={fetchDeals}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${loading ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'}`}
            >
              {loading ? 'Refreshing…' : 'Refresh List'}
            </button>
          </div>
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Completed deals</div>
              <div className="text-2xl font-semibold text-slate-900">{totals.count}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Total value</div>
              <div className="text-2xl font-semibold text-slate-900">₹{Number(totals.value).toLocaleString()}</div>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b px-4 py-3 text-sm font-semibold text-slate-900">Completed deal history</div>
          <div className="max-h-[70vh] overflow-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-500">Loading…</div>
            ) : deals.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No completed deals yet. Mark deals as done in the pipeline to see them here.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Deal</th>
                    <th className="px-4 py-2 text-left">Value</th>
                    <th className="px-4 py-2 text-left">Client Email</th>
                    <th className="px-4 py-2 text-left">Completed at</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-900">{deal.title}</td>
                      <td className="px-4 py-2 text-slate-700">₹{Number(deal.value || 0).toLocaleString()}</td>
                      <td className="px-4 py-2 text-slate-600">{deal.contact?.email || '—'}</td>
                      <td className="px-4 py-2 text-slate-600">{deal.completedAt ? new Date(deal.completedAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
