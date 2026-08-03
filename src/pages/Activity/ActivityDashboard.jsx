import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ActivityNav from '../../components/activity/ActivityNav'
import UserActivityModal from '../../components/activity/UserActivityModal'
import {
  fetchDashboardStats,
  exportActivityCSV
} from '../../api/activity'
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

      const res = await fetchDashboardStats({
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        department: department || undefined
      })
      setStats(res.data)
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
    <div className="space-y-8">
      <ActivityNav />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Clock className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity Analytics</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audit employee browser usage, productivity distribution, and web application engagement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-1.5 shadow-2xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Departments</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
              <option value="Tech">Tech</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 text-xs font-semibold">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeRange === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeRange === '7d' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeRange === '30d' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 shadow-2xs transition-all hover:bg-indigo-100 active:scale-95"
          >
            <Download className="h-4 w-4 text-indigo-600" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Active Hours</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{loading ? '...' : summary.totalHours || 0}</span>
            <span className="text-xs font-semibold text-slate-400">hrs</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Tracked employee session time</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/30 to-white p-5 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Productivity Score</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 font-mono">{loading ? '...' : `${summary.productivityScore || 0}%`}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Work vs non-work site ratio</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Productive Time</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{loading ? '...' : summary.productiveHours || 0}</span>
            <span className="text-xs font-semibold text-slate-400">hrs</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Core work applications</p>
        </div>

        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/20 to-white p-5 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Unproductive Time</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 font-mono">{loading ? '...' : summary.unproductiveHours || 0}</span>
            <span className="text-xs font-semibold text-slate-400">hrs</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">Off-task or idle duration</p>
        </div>
      </div>

      {/* Main Grid: Productivity Gauge & Time Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Productivity Ratio */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900">Productivity Ratio</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Breakdown by categorized site types</p>

          <ProductivityGauge
            score={summary.productivityScore || 0}
            productiveHours={summary.productiveHours}
            neutralHours={summary.neutralHours}
            unproductiveHours={summary.unproductiveHours}
            blockedHours={summary.blockedHours}
          />
        </div>

        {/* Time Distribution Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Activity Over Time</h2>
              <p className="text-xs text-slate-500 mt-0.5">Daily time distribution across categories (Hours)</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">Loading chart...</div>
            ) : stats?.timeSeries && stats.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="productive" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.7} name="Productive" />
                  <Area type="monotone" dataKey="neutral" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.7} name="Neutral" />
                  <Area type="monotone" dataKey="unproductive" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.7} name="Unproductive" />
                  <Area type="monotone" dataKey="blocked" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.7} name="Blocked" />
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

      {/* Top Domains Table & User Activity Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Domains */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Top Visited Domains</h2>
          <p className="text-xs text-slate-500 mb-4">Most frequented websites across all employees</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Domain</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Total Time</th>
                  <th className="py-2.5 px-3">Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats?.topDomains && stats.topDomains.length > 0 ? (
                  stats.topDomains.map((d) => (
                    <tr key={d.domain} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <DomainIcon domain={d.domain} size={18} />
                          <span className="font-semibold text-slate-800">{d.domain}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <CategoryBadge category={d.category} size="small" />
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {Math.round(d.duration / 60)} mins
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {d.userCount} users
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">
                      No domain data recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Activity Overview */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Employee Activity Overview</h2>
          <p className="text-xs text-slate-500 mb-4">Recent productivity breakdown by employee</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Total Time</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stats?.userOverview && stats.userOverview.length > 0 ? (
                  stats.userOverview.map((item) => (
                    <tr key={item.user?.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <div>
                          <div className="font-semibold text-slate-900">{item.user?.name || 'Unknown'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.user?.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.user?.department || 'General'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {Number((item.totalDuration / 3600).toFixed(1))} hrs
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => setSelectedUser(item.user)}
                          className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          Quick Modal <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">
                      No employee logs recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Activity Modal */}
      <UserActivityModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  )
}
