import React, { useState, useEffect } from 'react'
import { fetchLiveActivity } from '../../api/activity'
import CategoryBadge from '../../components/activity/CategoryBadge'
import DomainIcon from '../../components/activity/DomainIcon'
import ActivityNav from '../../components/activity/ActivityNav'
import UserActivityModal from '../../components/activity/UserActivityModal'
import { Search, RefreshCw, Radio, Clock, ArrowRight } from 'lucide-react'

export default function ActivityLive() {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3.5 w-3.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Live Activity Stream</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              <Radio className="h-3 w-3 animate-pulse text-emerald-600" /> AUTO-SYNC 10S
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time command center monitoring active employee browser sessions and destinations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-700 shadow-2xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none w-48 transition-all"
            />
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({feed.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'active'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('idle')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'idle'
                  ? 'bg-white text-amber-700 shadow-2xs'
                  : 'text-slate-600 hover:text-amber-600'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Idle ({idleCount})
            </button>
            <button
              onClick={() => setFilterStatus('offline')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterStatus === 'offline'
                  ? 'bg-white text-slate-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-slate-300" /> Offline ({offlineCount})
            </button>
          </div>

          <button
            onClick={() => loadFeed()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
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
            <div key={n} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-2xs animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-20 bg-slate-50 rounded-xl border border-slate-100" />
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
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-indigo-400 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 border border-slate-200/60 font-bold text-indigo-700 text-sm">
                        {item.user?.name ? item.user.name[0].toUpperCase() : 'U'}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            isOnline ? 'bg-emerald-500 shadow-xs' : isIdle ? 'bg-amber-400' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {item.user?.name || 'Employee'}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">{item.user?.department || 'General'} • {item.user?.email}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        isOnline
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isIdle
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : isIdle ? 'bg-amber-400' : 'bg-slate-400'}`} />
                      {item.status}
                    </span>
                  </div>

                  {latest ? (
                    <div className="mt-4 rounded-xl bg-slate-50/80 p-3.5 text-xs space-y-2 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <DomainIcon domain={latest.domain} size={18} />
                          <span className="font-semibold text-slate-900 truncate">{latest.domain}</span>
                        </div>
                        <CategoryBadge category={latest.category} size="small" />
                      </div>
                      <p className="text-[11px] text-slate-500 truncate font-mono" title={latest.pageTitle || latest.url}>
                        {latest.pageTitle || latest.url}
                      </p>
                      <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200/50 flex items-center justify-between font-mono">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" /> {Math.round((latest.durationSeconds || 0) / 60)} mins</span>
                        <span>{new Date(latest.endTime || latest.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      No active browsing session recorded
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors pt-2 border-t border-slate-100/60">
                  <span>View full activity modal</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
          No employees match the selected status filter
        </div>
      )}

      {/* Modern Pop-up Dialog for Employee Activity Details */}
      <UserActivityModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  )
}
