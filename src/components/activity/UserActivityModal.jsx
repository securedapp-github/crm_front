import React, { useState, useEffect } from 'react'
import { X, Clock, Target, CheckCircle2, AlertTriangle, ExternalLink, Calendar, Search, Filter, ShieldCheck, User } from 'lucide-react'
import CategoryBadge from './CategoryBadge'
import DomainIcon from './DomainIcon'
import ActivityTimeline from './ActivityTimeline'
import { fetchUserActivity, exportActivityCSV } from '../../api/activity'
import { sanitizeDomainPrivacy } from '../../utils/privacyGuard'

export default function UserActivityModal({ isOpen, onClose, user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && user?.id) {
      loadUserActivity()
    }
  }, [isOpen, user?.id])

  const loadUserActivity = async () => {
    setLoading(true)
    try {
      const res = await fetchUserActivity(user.id)
      setData(res.data || {})
    } catch (err) {
      console.error('Failed to load user activity details:', err)
      setData({})
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!user?.id) return
    try {
      const res = await exportActivityCSV({ userId: user.id })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${(user.name || 'employee').toLowerCase().replace(/\s+/g, '-')}-activity-report.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to export employee activity log')
    }
  }

  if (!isOpen) return null

  const stats = data?.stats || {}
  const activities = Array.isArray(data?.activities) ? data.activities : []
  const topDomains = Array.isArray(data?.topDomains) ? data.topDomains : []

  const formatMins = (seconds) => {
    const sec = Number(seconds) || 0
    if (sec <= 0) return '0 mins'
    if (sec < 60) return `${sec}s`
    return `${Math.round(sec / 60)} mins`
  }

  const formatTime = (ts) => {
    if (!ts) return 'Just now'
    const date = new Date(ts)
    if (isNaN(date.getTime())) return 'Recently'
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const filteredActivities = activities.filter(a => {
    const searchMatch = (a.domain || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.pageTitle || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.url || '').toLowerCase().includes(search.toLowerCase())

    if (categoryFilter === 'all') return searchMatch
    return a.category === categoryFilter && searchMatch
  })

  // Dynamic user status configuration
  const userStatus = user?.status || 'active'
  const isOnline = userStatus === 'active'
  const isIdle = userStatus === 'idle'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 animate-in fade-in duration-200">
      {/* Backdrop with blur */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity cursor-pointer"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-extrabold text-sm shadow-sm shadow-indigo-500/20 ring-2 ring-white">
              {user?.name ? user.name[0].toUpperCase() : <User className="h-5 w-5" />}
              <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                isOnline ? 'bg-emerald-500' : isIdle ? 'bg-amber-400' : 'bg-slate-300'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900">{user?.name || 'Employee Profile'}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase border ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isIdle
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : isIdle ? 'bg-amber-400' : 'bg-slate-400'}`} />
                  {userStatus}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {user?.email || 'no-email'} • <span className="text-slate-700 font-semibold">{user?.department || 'Staff'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-2xs hover:bg-indigo-50 transition-all active:scale-95 cursor-pointer"
            >
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 bg-white px-5 pt-2">
          {[
            { id: 'overview', label: 'Overview & Stats' },
            { id: 'timeline', label: 'Visual Timeline' },
            { id: 'history', label: `Browsing History (${activities.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-bold transition-all relative border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-slate-200 border-t-indigo-600" />
              <p className="text-xs font-semibold text-slate-400">Loading employee activity metrics...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Metric Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Total Tracked</span>
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">{Number(stats?.totalHours || 0).toFixed(1)} <span className="text-xs text-slate-400 font-sans font-normal">hrs</span></div>
                    </div>

                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        <span>Productive</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <div className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">{Number(stats?.productiveHours || 0).toFixed(1)} <span className="text-xs text-emerald-600/70 font-sans font-normal">hrs</span></div>
                    </div>

                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                        <span>Idle Time</span>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div className="text-xl font-extrabold text-amber-600 mt-1 font-mono">{Number(stats?.idleHours || 0).toFixed(1)} <span className="text-xs text-amber-600/70 font-sans font-normal">hrs</span></div>
                    </div>

                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        <span>Score</span>
                        <Target className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      <div className="text-xl font-extrabold text-indigo-600 mt-1 font-mono">{Math.round(stats?.productivityScore || 0)}%</div>
                    </div>
                  </div>                  {/* Top Frequented Destinations */}
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Top Frequented Destinations</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {topDomains.length > 0 ? (
                        topDomains.map((d, index) => {
                          const safeDomain = sanitizeDomainPrivacy(d.domain)
                          return (
                            <div key={`${d.domain}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 px-3 shadow-2xs hover:border-indigo-300 transition-colors">
                              <div className="flex items-center gap-2.5 truncate">
                                <DomainIcon domain={safeDomain} size={18} />
                                <div className="truncate">
                                  <div className={`font-bold text-xs truncate ${safeDomain.includes('Private') ? 'text-slate-500 italic' : 'text-slate-900'}`}>{safeDomain}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{formatMins(d.duration)} focused</div>
                                </div>
                              </div>
                              <CategoryBadge category={safeDomain.includes('Private') ? 'neutral' : d.category} size="small" />
                            </div>
                          )
                        })
                      ) : (
                        <div className="col-span-2 rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                          No top destinations recorded yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Visual Session Activity Line</h3>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                    <ActivityTimeline activities={activities} />
                  </div>
                </div>
              )}

              {/* TAB 3: BROWSING HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search URL or page title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-slate-400" />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        <option value="productive">Productive</option>
                        <option value="neutral">Neutral</option>
                        <option value="unproductive">Unproductive</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/90 backdrop-blur-xs text-slate-500 font-semibold uppercase tracking-wider z-10">
                          <tr>
                            <th className="py-2.5 px-3">Destination / Page</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Duration</th>
                            <th className="py-2.5 px-3">Recorded At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredActivities.length > 0 ? (
                            filteredActivities.map((act, index) => {
                              const safeDomain = sanitizeDomainPrivacy(act.domain)
                              const isPrivate = safeDomain.includes('Private')
                              return (
                                <tr key={act.id || `${act.domain}-${index}`} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2.5 max-w-md truncate">
                                      <DomainIcon domain={safeDomain} size={16} />
                                      <div className="truncate">
                                        <div className={`font-bold truncate ${isPrivate ? 'text-slate-500 italic' : 'text-slate-900'}`}>{safeDomain}</div>
                                        <div className="text-[10px] text-slate-400 font-mono truncate" title={isPrivate ? 'Protected Private Site' : (act.pageTitle || act.url)}>
                                          {isPrivate ? 'Title & URL hidden to protect privacy' : (act.pageTitle || act.url)}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <CategoryBadge category={isPrivate ? 'neutral' : act.category} size="small" />
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-700">
                                    {formatMins(act.durationSeconds)}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                                    {formatTime(act.startTime || act.createdAt || act.updatedAt)}
                                  </td>
                                </tr>
                              )
                            })
                          ) : (
                            <tr>
                              <td colSpan="4" className="py-8 text-center text-slate-400">
                                No browsing logs recorded matching filters
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-400">Press ESC or click outside to dismiss</span>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
