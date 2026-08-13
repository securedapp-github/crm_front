import React, { useState, useEffect } from 'react'
import ActivityNav from '../../components/activity/ActivityNav'
import UserActivityModal from '../../components/activity/UserActivityModal'
import {
  fetchDashboardStats,
  fetchPolicies,
  exportActivityCSV
} from '../../api/activity'
import { sanitizeDomainPrivacy } from '../../utils/privacyGuard'
import ProductivityGauge from '../../components/activity/ProductivityGauge'
import CategoryBadge from '../../components/activity/CategoryBadge'
import DomainIcon from '../../components/activity/DomainIcon'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import { Download, Clock, Target, CheckCircle2, AlertTriangle, ArrowUpRight, Filter } from 'lucide-react'

export default function ActivityDashboard() {
  const [stats, setStats] = useState(null)
  const [allowlistRules, setAllowlistRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [department, setDepartment] = useState('')
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedUser, setSelectedUser] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      let startDate = new Date()
      if (timeRange === 'today') {
        startDate.setHours(0, 0, 0, 0)
      } else if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30)
        startDate.setHours(0, 0, 0, 0)
      }

      const [res, policyRes] = await Promise.all([
        fetchDashboardStats({
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          department: department || undefined
        }),
        fetchPolicies().catch(() => ({ data: [] }))
      ])

      setStats(res.data)
      const allowlistOnly = (policyRes.data || []).filter(p => p.type === 'allowlist')
      setAllowlistRules(allowlistOnly)
    } catch (err) {
      console.error('Failed to load activity stats:', err)
      setError('Failed to fetch activity metrics. Please ensure backend services are running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [department, timeRange])

  const handleExport = async () => {
    try {
      const res = await exportActivityCSV({ department })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `activity-report-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to export CSV report')
    }
  }

  const summary = stats?.summary || {}

  return (
    <div className="space-y-6">
      <ActivityNav />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Activity Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">Browser usage, productivity distribution, and engagement by employee.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
            <Filter className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Departments</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
              <option value="Tech">Tech</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          {/* Time Range */}
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/60">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                  timeRange === t.id
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total Active Hours',
            value: loading ? '—' : (summary.totalHours || 0),
            unit: 'hrs',
            icon: <Clock className="h-4 w-4 text-slate-500" />,
            sub: 'Tracked session time',
          },
          {
            label: 'Productivity Score',
            value: loading ? '—' : `${summary.productivityScore || 0}%`,
            icon: <Target className="h-4 w-4 text-emerald-500" />,
            sub: 'Work vs non-work ratio',
            accent: 'emerald',
          },
          {
            label: 'Productive Time',
            value: loading ? '—' : (summary.productiveHours || 0),
            unit: 'hrs',
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
            sub: 'Core work applications',
          },
          {
            label: 'Unproductive Time',
            value: loading ? '—' : (summary.unproductiveHours || 0),
            unit: 'hrs',
            icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
            sub: 'Off-task or idle',
            accent: 'amber',
          },
        ].map((card, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">
                {card.label}
              </span>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0">
                {card.icon}
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${
                card.accent === 'emerald' ? 'text-emerald-600' :
                card.accent === 'amber' ? 'text-amber-600' :
                'text-slate-900'
              }`}>
                {card.value}
              </span>
              {card.unit && <span className="text-xs font-medium text-slate-400">{card.unit}</span>}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Productivity Gauge */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Productivity Ratio</h2>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-4">Breakdown by categorized site types</p>
          <ProductivityGauge
            score={summary.productivityScore || 0}
            productiveHours={summary.productiveHours}
            neutralHours={summary.neutralHours}
            unproductiveHours={summary.unproductiveHours}
            blockedHours={summary.blockedHours}
          />
        </div>

        {/* Area Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-800">Activity Over Time</h2>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-4">Daily time distribution across categories (hours)</p>
          <div className="h-56 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : stats?.timeSeries && stats.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timeSeries} margin={{ top: 5, right: 5, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      fontSize: '11px',
                      padding: '8px 12px'
                    }}
                  />
                  <Area type="monotone" dataKey="productive" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.5} name="Productive" />
                  <Area type="monotone" dataKey="neutral" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.4} name="Neutral" />
                  <Area type="monotone" dataKey="unproductive" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} name="Unproductive" />
                  <Area type="monotone" dataKey="blocked" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} name="Blocked" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No activity logs available for this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Tables */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top Domains */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Top Visited Domains</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Most frequented websites across all employees</p>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">Domain</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats?.topDomains && stats.topDomains.length > 0 ? (
                stats.topDomains.map((d) => {
                  const safeDomain = sanitizeDomainPrivacy(d.domain, allowlistRules, true)
                  return (
                    <tr key={d.domain} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <DomainIcon domain={safeDomain} size={16} />
                          <span className={`font-medium ${safeDomain.includes('Private') ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                            {safeDomain}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <CategoryBadge category={safeDomain.includes('Private') ? 'neutral' : d.category} size="small" />
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {Math.round(d.duration / 60)} min
                      </td>
                      <td className="py-3 px-4 text-slate-500">{d.userCount}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400 text-[11px]">
                    No domain data recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Employee Activity Overview */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Employee Activity Overview</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Productivity breakdown by employee</p>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Dept</th>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats?.userOverview && stats.userOverview.length > 0 ? (
                stats.userOverview.map((item) => (
                  <tr key={item.user?.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{item.user?.name || 'Unknown'}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">{item.user?.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{item.user?.department || '—'}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {Number((item.totalDuration / 3600).toFixed(1))} hrs
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedUser(item.user)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                      >
                        View <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400 text-[11px]">
                    No employee logs recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserActivityModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  )
}
