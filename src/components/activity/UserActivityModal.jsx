import React, { useState, useEffect } from 'react'
import { X, Clock, Target, CheckCircle2, AlertTriangle, Search, Filter, ShieldCheck, User, Globe, Plus, ArrowUpRight } from 'lucide-react'
import CategoryBadge from './CategoryBadge'
import DomainIcon from './DomainIcon'
import ActivityTimeline from './ActivityTimeline'
import { fetchUserActivity, exportActivityCSV, fetchAllowedDomains } from '../../api/activity'
import { sanitizeDomainPrivacy } from '../../utils/privacyGuard'

export default function UserActivityModal({ isOpen, onClose, user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [allowedDomains, setAllowedDomains] = useState([])
  const [allowedDomainsLoading, setAllowedDomainsLoading] = useState(false)

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
      loadAllowedDomains()
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

  const loadAllowedDomains = async () => {
    setAllowedDomainsLoading(true)
    try {
      const res = await fetchAllowedDomains(user.id)
      setAllowedDomains(res.data?.allowedDomains || [])
    } catch (err) {
      console.error('Failed to load allowed domains:', err)
      setAllowedDomains([])
    } finally {
      setAllowedDomainsLoading(false)
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
    if (sec <= 0) return '0 min'
    if (sec < 60) return `${sec}s`
    return `${Math.round(sec / 60)} min`
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

  const userStatus = user?.status || 'active'
  const isOnline = userStatus === 'active'
  const isIdle = userStatus === 'idle'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity cursor-pointer"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm">
              {user?.name ? user.name[0].toUpperCase() : <User className="h-4 w-4" />}
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                isOnline ? 'bg-emerald-500' : isIdle ? 'bg-amber-400' : 'bg-slate-300'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">{user?.name || 'Employee Profile'}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isIdle
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : isIdle ? 'bg-amber-400' : 'bg-slate-400'}`} />
                  {userStatus}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {user?.email || 'no-email'} • <span className="text-slate-600 font-medium">{user?.department || 'Staff'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
            >
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 bg-white px-5 pt-2">
          {[
            { id: 'overview', label: 'Overview & Stats' },
            { id: 'timeline', label: 'Visual Timeline' },
            { id: 'history', label: `Browsing History (${activities.length})` },
            { id: 'allowed', label: `Allowed Domains (${allowedDomains.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs transition-all relative border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-slate-900 font-semibold text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
              <p className="text-xs font-medium text-slate-400">Loading metrics...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        <span>Total Tracked</span>
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-900 mt-1">{Number(stats?.totalHours || 0).toFixed(1)} <span className="text-xs text-slate-400 font-sans font-normal">hrs</span></div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        <span>Productive</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <div className="text-xl font-bold font-mono text-emerald-600 mt-1">{Number(stats?.productiveHours || 0).toFixed(1)} <span className="text-xs text-slate-400 font-sans font-normal">hrs</span></div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        <span>Idle Time</span>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div className="text-xl font-bold font-mono text-amber-600 mt-1">{Number(stats?.idleHours || 0).toFixed(1)} <span className="text-xs text-slate-400 font-sans font-normal">hrs</span></div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        <span>Score</span>
                        <Target className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-900 mt-1">{Math.round(stats?.productivityScore || 0)}%</div>
                    </div>
                  </div>

                  {/* Top Frequented Destinations */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-800">Top Frequented Destinations</h3>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `/dashboard/activity/allowed-domains?userId=${user.id}`
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3 text-slate-500" />
                        Add Rule for {user?.name ? user.name.split(' ')[0] : 'Employee'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {topDomains.length > 0 ? (
                        topDomains.map((d, index) => {
                          const safeDomain = sanitizeDomainPrivacy(d.domain)
                          return (
                            <div key={`${d.domain}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 px-3">
                              <div className="flex items-center gap-2 truncate">
                                <DomainIcon domain={safeDomain} size={16} />
                                <div className="truncate">
                                  <div className={`font-medium text-xs truncate ${safeDomain.includes('Private') ? 'text-slate-400 italic' : 'text-slate-800'}`}>{safeDomain}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{formatMins(d.duration)}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <CategoryBadge category={safeDomain.includes('Private') ? 'neutral' : d.category} size="small" />
                                {!safeDomain.includes('Private') && (
                                  <button
                                    title={`Add rule for ${safeDomain}`}
                                    onClick={() => {
                                      window.location.href = `/dashboard/activity/allowed-domains?userId=${user.id}&domain=${encodeURIComponent(safeDomain)}`
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="col-span-2 py-6 text-center text-xs text-slate-400">
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
                  <h3 className="text-xs font-semibold text-slate-800">Visual Session Activity Line</h3>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <ActivityTimeline activities={activities} />
                  </div>
                </div>
              )}

              {/* TAB 3: BROWSING HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search URL or page title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-1.5 bg-white shadow-xs">
                      <Filter className="h-3.5 w-3.5 text-slate-400" />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        <option value="productive">Productive</option>
                        <option value="neutral">Neutral</option>
                        <option value="unproductive">Unproductive</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/90 text-slate-400 uppercase tracking-wider text-[10px] font-semibold z-10">
                          <tr>
                            <th className="py-2.5 px-4">Destination / Page</th>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4">Duration</th>
                            <th className="py-2.5 px-4">Recorded At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {filteredActivities.length > 0 ? (
                            filteredActivities.map((act, index) => {
                              const safeDomain = sanitizeDomainPrivacy(act.domain)
                              const isPrivate = safeDomain.includes('Private')
                              return (
                                <tr key={act.id || `${act.domain}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-2 max-w-md truncate">
                                      <DomainIcon domain={safeDomain} size={16} />
                                      <div className="truncate">
                                        <div className={`font-medium truncate ${isPrivate ? 'text-slate-400 italic' : 'text-slate-800'}`}>{safeDomain}</div>
                                        <div className="text-[10px] text-slate-400 font-mono truncate" title={isPrivate ? 'Protected Private Site' : (act.pageTitle || act.url)}>
                                          {isPrivate ? 'Title & URL hidden' : (act.pageTitle || act.url)}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <CategoryBadge category={isPrivate ? 'neutral' : act.category} size="small" />
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                                    {formatMins(act.durationSeconds)}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-400 font-mono text-[10px]">
                                    {formatTime(act.startTime || act.createdAt || act.updatedAt)}
                                  </td>
                                </tr>
                              )
                            })
                          ) : (
                            <tr>
                              <td colSpan="4" className="py-8 text-center text-slate-400 text-[11px]">
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

              {/* TAB 4: ALLOWED DOMAINS */}
              {activeTab === 'allowed' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-800">Allowed Domains for {user?.name?.split(' ')[0] || 'Employee'}</h3>
                      <p className="text-[11px] text-slate-400">Global rules + employee-specific rules combined.</p>
                    </div>
                    <button
                      onClick={() => {
                        window.location.href = `/dashboard/activity/allowed-domains?userId=${user.id}`
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Domain
                    </button>
                  </div>

                  {allowedDomainsLoading ? (
                    <div className="py-8 text-center">
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
                      <p className="text-xs text-slate-400 mt-2">Loading allowed domains...</p>
                    </div>
                  ) : allowedDomains.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                          <tr>
                            <th className="py-2.5 px-4">Domain / App</th>
                            <th className="py-2.5 px-4">Pattern</th>
                            <th className="py-2.5 px-4">Scope</th>
                            <th className="py-2.5 px-4">Category</th>
                            <th className="py-2.5 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {allowedDomains.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  <DomainIcon domain={d.domainPattern} size={16} />
                                  <span className="font-medium text-slate-800 truncate max-w-[120px]">{d.name}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 font-mono text-emerald-600 font-semibold text-[11px]">{d.domainPattern}</td>
                              <td className="py-2.5 px-4">
                                {d.userId ? (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    <User className="h-2.5 w-2.5" /> Personal
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    <Globe className="h-2.5 w-2.5" /> Global
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                <CategoryBadge category={d.category || 'productive'} size="small" />
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                                  d.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${d.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  {d.isActive ? 'Active' : 'Disabled'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                      <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No allowlist rules found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Strict allowlist is inactive or no rules assigned.</p>
                      <button
                        onClick={() => { window.location.href = `/dashboard/activity/allowed-domains?userId=${user.id}` }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add First Rule
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">Press ESC or click outside to close</span>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
