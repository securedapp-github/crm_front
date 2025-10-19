import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/auth'
import { getCampaigns } from '../../api/campaign'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

export default function LeadAnalytics() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [filters, setFilters] = useState({ from: '', to: '', ownerId: '', campaignId: '' })

  const fetchSummary = async (params = {}) => {
    setLoading(true)
    try {
      const res = await api.get('/analytics/summary', { params })
      setSummary(res.data?.data || null)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    (async () => {
      const cs = await getCampaigns()
      setCampaigns(cs.data?.data || [])
      await fetchSummary()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFilters = async () => {
    const params = {}
    if (filters.from) params.from = filters.from
    if (filters.to) params.to = filters.to
    if (filters.ownerId) params.ownerId = filters.ownerId
    if (filters.campaignId) params.campaignId = filters.campaignId
    await fetchSummary(params)
  }

  const ownerOptions = useMemo(() => (summary?.team || []).map(t => ({ id: t.userId, name: t.name })), [summary])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Analytics</h2>

      <div className="rounded-lg border bg-white p-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div>
            <label className="text-xs text-slate-600">From</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={filters.from} onChange={e=>setFilters(f=>({...f, from: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-slate-600">To</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={filters.to} onChange={e=>setFilters(f=>({...f, to: e.target.value}))} />
          </div>
          <div>
            <label className="text-xs text-slate-600">Owner</label>
            <select className="w-full border rounded px-2 py-1" value={filters.ownerId} onChange={e=>setFilters(f=>({...f, ownerId: e.target.value}))}>
              <option value="">All</option>
              {ownerOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Campaign</label>
            <select className="w-full border rounded px-2 py-1" value={filters.campaignId} onChange={e=>setFilters(f=>({...f, campaignId: e.target.value}))}>
              <option value="">All</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded bg-indigo-600 text-white" onClick={applyFilters}>Apply</button>
            <button className="px-3 py-2 rounded border" onClick={()=>{ setFilters({ from:'', to:'', ownerId:'', campaignId:'' }); fetchSummary() }}>Reset</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-slate-500 text-sm">Total Leads</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '…' : (summary?.kpis?.totalLeads ?? 0)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-slate-500 text-sm">Hot Leads</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '…' : (summary?.kpis?.hotLeads ?? 0)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-slate-500 text-sm">Converted Leads</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '…' : (summary?.kpis?.convertedLeads ?? 0)}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-slate-500 text-sm">Conversion Rate</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{loading ? '…' : `${summary?.kpis?.conversionRate ?? 0}%`}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="p-4 border-b font-semibold text-slate-900">Top Campaigns by Leads</div>
        <div className="p-4">
          {loading ? 'Loading…' : !(summary?.campaigns?.topCampaignsByLeads || []).length ? (
            <div className="text-slate-500">No campaign data</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {(summary?.campaigns?.topCampaignsByLeads || []).map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">{c.count} leads</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b font-semibold text-slate-900">Lead Funnel</div>
          <div className="p-4 min-h-[280px]">
            {loading ? 'Loading…' : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(summary?.funnel?.leadFunnel || []).map(x=>({ name: x.status, count: x.count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Leads" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b font-semibold text-slate-900">Deal Stages</div>
          <div className="p-4 min-h-[280px]">
            {loading ? 'Loading…' : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(summary?.funnel?.dealStages || []).map(x=>({ name: x.stage, count: x.count }))}>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b font-semibold text-slate-900">Team Performance</div>
          <div className="p-4">
            {loading ? 'Loading…' : !(summary?.team || []).length ? (
              <div className="text-slate-500">No data</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {summary.team.map(t => (
                  <li key={t.userId} className="flex items-center justify-between">
                    <span className="text-slate-700">{t.name}</span>
                    <span className="text-xs text-slate-500">Leads: {t.leadsAssigned} • Deals: {t.dealsOwned} • Won: {t.dealsWon}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="rounded-lg border bg-white">
          <div className="p-4 border-b font-semibold text-slate-900">Engagement</div>
          <div className="p-4">
            {loading ? 'Loading…' : !summary?.engagement ? (
              <div className="text-slate-500">No engagement data</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {Object.entries(summary.engagement).map(([k,v]) => (
                  <li key={k} className="flex items-center justify-between">
                    <span className="text-slate-700">{k}</span>
                    <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">{v}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="font-semibold text-slate-900">Forecast</div>
        <div className="mt-2 text-slate-700 text-sm">Next 30 days revenue (simple): ₹{loading ? '…' : Number(summary?.forecast?.next30daysRevenue || 0).toLocaleString()}</div>
      </div>
    </div>
  )
}
