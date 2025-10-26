import { useEffect, useState } from 'react'
import { api } from '../api/auth'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

export default function DashboardHome() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const res = await api.get('/analytics/summary')
      setSummary(res.data?.data || null)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchSummary() }, [])

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-500">Overall view across Marketing, Sales, Service, and Collaboration.</p>
          </div>
          <button className="px-3 py-2 rounded border" onClick={fetchSummary} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </header>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white">
            <div className="p-4 border-b font-semibold text-slate-900">Marketing → Lead Funnel</div>
            <div className="p-4 min-h-[260px]">
              {loading ? 'Loading…' : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={(summary?.funnel?.leadFunnel || []).map(x=>({ name: x.status, count: x.count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Leads" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <div className="p-4 border-b font-semibold text-slate-900">🧭 Sales → Pipeline Overview</div>
            <div className="p-4 min-h-[260px]">
              {loading ? 'Loading…' : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={(summary?.sales?.pipelineOverview || []).map(x=>({ name: x.stage, count: x.count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Deals" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold text-slate-900 mb-2">📈 Key KPIs</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between"><span className="text-slate-700">Total Leads</span><span className="px-2 py-1 bg-slate-100 rounded">{summary?.kpis?.totalLeads ?? 0}</span></li>
              <li className="flex items-center justify-between"><span className="text-slate-700">Hot Leads</span><span className="px-2 py-1 bg-slate-100 rounded">{summary?.kpis?.hotLeads ?? 0}</span></li>
              <li className="flex items-center justify-between"><span className="text-slate-700">Conversion Rate</span><span className="px-2 py-1 bg-slate-100 rounded">{summary?.kpis?.conversionRate ?? 0}%</span></li>
            </ul>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold text-slate-900 mb-2">🧭 Top Salesperson</div>
            {summary?.sales?.topSalespersonByDeals ? (
              <div className="text-sm text-slate-800">
                <div className="font-semibold">{summary.sales.topSalespersonByDeals.name}</div>
                <div className="text-xs text-slate-600">Won deals: {summary.sales.topSalespersonByDeals.won} • Total deals: {summary.sales.topSalespersonByDeals.deals}</div>
              </div>
            ) : <div className="text-sm text-slate-500">No data</div>}
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold text-slate-900 mb-2">🛟 Service & 📝 Collaboration</div>
            <div className="text-sm text-slate-600">Hook up ticket and activity metrics here if needed. Currently not included.</div>
          </div>
        </section>
      </div>
    </main>
  )
}
