import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/auth'
import { getCampaigns } from '../api/campaign'
import { getDeals } from '../api/deal'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

export default function DashboardHome() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [deals, setDeals] = useState([])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const [summaryRes, campaignsRes, dealsRes] = await Promise.all([
        api.get('/analytics/summary'),
        getCampaigns(),
        getDeals(),
      ])
      setSummary(summaryRes.data?.data || null)
      setCampaigns(campaignsRes.data?.data || [])
      setDeals(dealsRes.data?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchSummary() }, [])

  const leadFunnelData = useMemo(() => {
    if (!summary) return []
    return (summary.funnel?.leadFunnel || []).map(x => ({ name: x.status, count: x.count }))
  }, [summary])

  const pipelineData = useMemo(() => {
    if (!summary) return []
    return (summary.sales?.pipelineOverview || []).map(x => ({ name: x.stage, count: x.count }))
  }, [summary])

  const captureStats = useMemo(() => {
    const active = campaigns.filter(c => c.status === 'Active').length
    const total = campaigns.length
    const newLeads = leadFunnelData.find(f => f.name === 'New')?.count ?? 0
    return { active, total, newLeads }
  }, [campaigns, leadFunnelData])

  const scoringStats = useMemo(() => {
    const hotDeals = deals.filter(d => d.isHot).length
    const avgScore = deals.length
      ? Math.round(deals.reduce((sum, d) => sum + (typeof d.score === 'number' ? d.score : 0), 0) / deals.length)
      : 0
    const gradeCounts = ['A', 'B', 'C'].map(grade => ({
      grade,
      count: deals.filter(d => d.grade === grade).length,
    }))
    const ungraded = deals.filter(d => !d.grade).length
    if (ungraded) gradeCounts.push({ grade: 'Unscored', count: ungraded })
    return { hotDeals, avgScore, gradeCounts }
  }, [deals])

  const leadStats = useMemo(() => ({
    total: summary?.kpis?.totalLeads ?? 0,
    hotLeads: summary?.kpis?.hotLeads ?? 0,
    conversionRate: summary?.kpis?.conversionRate ?? 0,
  }), [summary])

  const salesStats = useMemo(() => {
    const wonCount = pipelineData.find(p => p.name === 'Won')?.count ?? 0
    const inProgress = pipelineData.find(p => p.name === 'In Progress')?.count ?? 0
    const revenueWon = summary?.kpis?.revenueWon ?? 0
    return { wonCount, inProgress, revenueWon }
  }, [pipelineData, summary])

  const topCampaigns = useMemo(() => summary?.campaigns?.topCampaignsByLeads || [], [summary])
  const mostLeads = useMemo(() => topCampaigns.reduce((max, item) => Math.max(max, item.count), 0) || 1, [topCampaigns])
  const teamPerformance = useMemo(() => summary?.sales?.leadsPerSalesperson || [], [summary])
  const topSalesperson = summary?.sales?.topSalespersonByDeals || null

  return (
    <main className="min-h-[calc(100vh-112px)] bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-2xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-100">control center</p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Customer Growth Command Hub</h1>
              <p className="mt-3 max-w-2xl text-sm text-indigo-100/90">
                Monitor capture, scoring, lead velocity, and sales momentum in one glance. All metrics update automatically as your teams work.
              </p>
            </div>
            <button
              onClick={fetchSummary}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2 text-sm font-medium transition ${loading ? 'cursor-not-allowed bg-white/10 text-white/60' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              <span>{loading ? 'Refreshing…' : 'Refresh Snapshot'}</span>
            </button>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-indigo-100/80">Capture</div>
              <div className="mt-2 text-3xl font-semibold">{captureStats.active}/{captureStats.total}</div>
              <p className="mt-1 text-xs text-indigo-100/70">Active campaigns (total {captureStats.total || 0})</p>
              <p className="mt-2 text-[11px] text-indigo-100/60">New leads waiting: {captureStats.newLeads}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-indigo-100/80">Scoring</div>
              <div className="mt-2 text-3xl font-semibold">{scoringStats.hotDeals}</div>
              <p className="mt-1 text-xs text-indigo-100/70">Hot opportunities flagged</p>
              <p className="mt-2 text-[11px] text-indigo-100/60">Average deal score: {scoringStats.avgScore}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-indigo-100/80">Leads</div>
              <div className="mt-2 text-3xl font-semibold">{leadStats.total}</div>
              <p className="mt-1 text-xs text-indigo-100/70">Total captured across all campaigns</p>
              <p className="mt-2 text-[11px] text-indigo-100/60">Hot leads: {leadStats.hotLeads} • Conversion: {leadStats.conversionRate}%</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-wide text-indigo-100/80">Sales</div>
              <div className="mt-2 text-3xl font-semibold">₹{Number(salesStats.revenueWon || 0).toLocaleString()}</div>
              <p className="mt-1 text-xs text-indigo-100/70">Revenue won in recent cycles</p>
              <p className="mt-2 text-[11px] text-indigo-100/60">Won: {salesStats.wonCount} • In progress: {salesStats.inProgress}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Funnel & Pipeline Health</h2>
              <span className="text-xs text-slate-500">Live capture → qualification → close metrics</span>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-700">Lead Funnel</h3>
                  <span className="text-[11px] text-slate-400">Leads by status</span>
                </div>
                <div className="mt-3 min-h-[240px] rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                  {loading ? 'Loading…' : (
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={leadFunnelData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                        <Legend iconType="circle" />
                        <Bar dataKey="count" name="Leads" fill="#6366f1" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-700">Sales Pipeline</h3>
                  <span className="text-[11px] text-slate-400">Deals by stage</span>
                </div>
                <div className="mt-3 min-h-[240px] rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                  {loading ? 'Loading…' : (
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={pipelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip cursor={{ fill: 'rgba(16,185,129,0.05)' }} />
                        <Legend iconType="circle" />
                        <Bar dataKey="count" name="Deals" fill="#10b981" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Scoring Snapshot</h2>
              <span className="text-[11px] text-slate-400">Deal prioritisation</span>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-indigo-50/60 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Hot Deals</div>
                <div className="mt-1 text-2xl font-semibold text-indigo-900">{scoringStats.hotDeals}</div>
                <p className="text-xs text-indigo-700/80">Average score {scoringStats.avgScore}</p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grade distribution</div>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {scoringStats.gradeCounts.map(item => (
                    <li key={item.grade} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="font-medium">Grade {item.grade}</span>
                      <span className="text-xs text-slate-500">{item.count} deals</span>
                    </li>
                  ))}
                  {!scoringStats.gradeCounts.length && (
                    <li className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">No scored deals yet</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Capture Momentum</h2>
              <span className="text-[11px] text-slate-400">Top campaigns by leads</span>
            </div>
            <div className="mt-6 space-y-3">
              {loading ? 'Loading…' : !topCampaigns.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">No campaigns with leads yet</div>
              ) : topCampaigns.map(c => (
                <div key={c.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                    <span>{c.name}</span>
                    <span className="text-xs text-slate-500">{c.count} leads</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(8, (c.count / mostLeads) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Sales Management</h2>
              <span className="text-[11px] text-slate-400">Performance highlights</span>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Top closer</div>
                {topSalesperson ? (
                  <div className="mt-2 text-sm text-emerald-900">
                    <div className="text-base font-semibold">{topSalesperson.name}</div>
                    <div className="text-xs text-emerald-700/80">Won deals: {topSalesperson.won} • Total managed: {topSalesperson.deals}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-emerald-700/70">No closed deals yet</div>
                )}
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Won revenue</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">₹{Number(salesStats.revenueWon || 0).toLocaleString()}</div>
                <p className="mt-1 text-xs text-slate-500">Closed in the last 30 days</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Team Focus</h2>
              <span className="text-[11px] text-slate-400">Lead workload</span>
            </div>
            <div className="mt-6 space-y-3">
              {loading ? 'Loading…' : !teamPerformance.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">No salespeople yet</div>
              ) : teamPerformance.map(item => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                    <span>{item.name}</span>
                    <span className="text-xs text-slate-500">{item.leads} leads</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                    <div className="h-full rounded-full bg-slate-400" style={{ width: `${teamPerformance.length ? Math.max(6, (item.leads / Math.max(...teamPerformance.map(x => x.leads || 1))) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
