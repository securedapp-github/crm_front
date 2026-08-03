import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchUserActivity, exportActivityCSV } from '../../api/activity'
import CategoryBadge from '../../components/activity/CategoryBadge'
import DomainIcon from '../../components/activity/DomainIcon'
import ActivityTimeline from '../../components/activity/ActivityTimeline'
import ActivityNav from '../../components/activity/ActivityNav'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function ActivityUserDetail() {
  const { userId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const loadUserDetail = async () => {
    setLoading(true)
    try {
      const res = await fetchUserActivity(userId)
      setData(res.data)
    } catch (err) {
      console.error('Failed to load user activity details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) loadUserDetail()
  }, [userId])

  const handleExportUser = async () => {
    try {
      const res = await exportActivityCSV({ userId })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `user-${userId}-activity.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to export user activity')
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-400">Loading employee activity report...</div>
  }

  if (!data || !data.user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Employee activity profile not found.
        <div className="mt-4">
          <Link to="/dashboard/activity" className="text-xs font-semibold text-indigo-600 hover:underline">
            ← Return to Activity Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const { user, stats, topDomains, activities } = data

  const filteredActivities = (activities || []).filter(a => {
    const searchMatch = (a.domain || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.pageTitle || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.url || '').toLowerCase().includes(search.toLowerCase())

    if (categoryFilter === 'all') return searchMatch
    return a.category === categoryFilter && searchMatch
  })

  return (
    <div className="space-y-8">
      <ActivityNav />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <Link to="/dashboard/activity" className="text-xs text-indigo-600 font-medium hover:underline mb-1 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{user.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {user.email} • {user.department || 'Staff'} • {user.designation || 'Team Member'}
          </p>
        </div>

        <button
          onClick={handleExportUser}
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100"
        >
          📥 Download Employee Log
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Hours Tracked</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats?.totalHours || 0} hrs</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Productive Hours</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{stats?.productiveHours || 0} hrs</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Idle Time</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{stats?.idleHours || 0} hrs</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Productivity Score</div>
          <div className="mt-1 text-2xl font-bold text-indigo-600">{stats?.productivityScore || 0}%</div>
        </div>
      </div>

      {/* Visual Activity Stream */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Activity Timeline</h2>
        <ActivityTimeline activities={activities || []} />
      </div>

      {/* Top Visited Sites Bar Chart & History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top 10 Domains Bar Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Top Domains Visited</h2>
          <p className="text-xs text-slate-500 mb-4">Most frequented sites by duration (mins)</p>

          <div className="h-64 w-full">
            {topDomains && topDomains.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDomains.map(d => ({ domain: d.domain, mins: Math.round(d.duration / 60) }))} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="domain" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                  <Bar dataKey="mins" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">No domain breakdown</div>
            )}
          </div>
        </div>

        {/* Detailed History Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Browsing History</h2>
              <p className="text-xs text-slate-500">Detailed list of recorded URLs and focus times</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none w-36"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="productive">Productive</option>
                <option value="neutral">Neutral</option>
                <option value="unproductive">Unproductive</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Site / Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2 max-w-md truncate">
                          <DomainIcon domain={act.domain} size={16} />
                          <div className="truncate">
                            <div className="font-semibold text-slate-800 truncate">{act.domain}</div>
                            <div className="text-[10px] text-slate-400 truncate">{act.pageTitle || act.url}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <CategoryBadge category={act.category} size="small" />
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {Math.round((act.durationSeconds || 0) / 60)} mins
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {new Date(act.startTime).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400">
                      No browsing history found matching filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
