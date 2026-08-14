import React, { useState, useEffect } from 'react'
import { fetchLiveActivity, fetchAllowedDomains } from '../../api/activity'
import CategoryBadge from '../../components/activity/CategoryBadge'
import DomainIcon from '../../components/activity/DomainIcon'
import ActivityNav from '../../components/activity/ActivityNav'
import UserActivityModal from '../../components/activity/UserActivityModal'
import { Search, RefreshCw, Radio, Clock, ArrowRight, ShieldCheck, User } from 'lucide-react'

export default function ActivityLive() {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [allowlistCount, setAllowlistCount] = useState(null)

  const loadFeed = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetchLiveActivity()
      setFeed(res.data.feed || [])
    } catch (err) {
      console.error('Error fetching live activity:', err)
    } finally {
      setLoading(false)
      setTimeout(() => setIsRefreshing(false), 300)
    }
  }

  useEffect(() => {
    loadFeed()
    fetchAllowedDomains().then(res => {
      const domains = res.data?.allowedDomains || []
      setAllowlistCount(domains.filter(d => d.isActive).length)
    }).catch(() => setAllowlistCount(0))

    const interval = setInterval(() => {
      loadFeed()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredFeed = feed.filter((item) => {
    const nameMatch = (item.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase())

    if (filterStatus === 'all') return nameMatch
    return item.status === filterStatus && nameMatch
  })

  const activeCount = feed.filter(f => f.status === 'active').length
  const idleCount = feed.filter(f => f.status === 'idle').length
  const offlineCount = feed.filter(f => f.status === 'offline').length

  return (
    <div className="space-y-6">
      <ActivityNav />

      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Live Activity Stream</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
              <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-600" /> AUTO-SYNC 10S
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time monitoring of active employee browser sessions and destinations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none w-44 transition-all"
            />
          </div>

          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/60 text-xs font-medium">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({feed.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                filterStatus === 'active'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('idle')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                filterStatus === 'idle'
                  ? 'bg-white text-amber-700 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Idle ({idleCount})
            </button>
            <button
              onClick={() => setFilterStatus('offline')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                filterStatus === 'offline'
                  ? 'bg-white text-slate-700 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Offline ({offlineCount})
            </button>
          </div>

          <button
            onClick={() => loadFeed()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Feed Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-200" />
                <div className="space-y-1 flex-1">
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-2 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-16 bg-slate-50 rounded-lg border border-slate-100" />
            </div>
          ))}
        </div>
      ) : filteredFeed.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFeed.map((item) => {
            const latest = item.latestActivity
            const isOnline = item.status === 'active'
            const isIdle = item.status === 'idle'

            return (
              <div
                key={item.user?.id}
                onClick={() => setSelectedUser(item.user)}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 font-bold text-slate-700 text-xs">
                        {item.user?.name ? item.user.name[0].toUpperCase() : 'U'}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                            isOnline ? 'bg-emerald-500' : isIdle ? 'bg-amber-400' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">
                          {item.user?.name || 'Employee'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{item.user?.department || 'Staff'} • {item.user?.email}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${
                        isOnline
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isIdle
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : isIdle ? 'bg-amber-400' : 'bg-slate-400'}`} />
                      {item.status}
                    </span>
                  </div>

                  {latest ? (
                    <div className="mt-3 rounded-lg bg-slate-50/70 p-3 text-xs space-y-1.5 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <DomainIcon domain={latest.domain} size={15} />
                          <span className="font-medium text-slate-800 truncate">{latest.domain}</span>
                        </div>
                        <CategoryBadge category={latest.category} size="small" />
                      </div>
                      <p className="text-[10px] text-slate-400 truncate font-mono" title={latest.pageTitle || latest.url}>
                        {latest.pageTitle || latest.url}
                      </p>
                      <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-200/50 flex items-center justify-between font-mono">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" /> {Math.round((latest.durationSeconds || 0) / 60)} min</span>
                        <span>{new Date(latest.endTime || latest.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-3.5 text-center text-xs text-slate-400">
                      No active browsing session recorded
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900 transition-colors pt-2 border-t border-slate-100">
                  <span className="text-[11px]">View activity details</span>
                  <div className="flex items-center gap-1.5">
                    {allowlistCount !== null && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                        allowlistCount > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        <ShieldCheck className="h-3 w-3" />
                        {allowlistCount > 0 ? `${allowlistCount} domains` : 'No allowlist'}
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
          No employees match the selected status filter
        </div>
      )}

      {/* Pop-up Dialog for Employee Activity Details */}
      <UserActivityModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  )
}
