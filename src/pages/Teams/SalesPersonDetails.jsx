import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSalesActivity } from '../../api/sales'

const formatDateTime = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

const formatHours = (hrs) => `${Number(hrs || 0).toFixed(1)}h`
const formatDuration = (minutes = 0) => {
  const totalMinutes = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours > 0) {
    return `${hours}h ${mins.toString().padStart(2, '0')}m`
  }
  return `${mins}m`
}

export default function SalesPersonDetails() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activity, setActivity] = useState(null)
  const [activityFetchedAt, setActivityFetchedAt] = useState(null)
  const [nowTick, setNowTick] = useState(Date.now())

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  }, [])
  const isAdmin = user?.role === 'admin'

  const loadActivity = useCallback(
    async (withSpinner = true) => {
      if (!isAdmin) return
      if (withSpinner) {
        setLoading(true)
        setError('')
      }
      try {
        const res = await getSalesActivity()
        setActivity(res.data?.data || null)
        setActivityFetchedAt(Date.now())
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load sales activity')
      } finally {
        if (withSpinner) {
          setLoading(false)
        }
      }
    },
    [isAdmin]
  )

  useEffect(() => {
    loadActivity(true)
  }, [loadActivity])

  useEffect(() => {
    if (!isAdmin) return
    const refreshInterval = setInterval(() => {
      loadActivity(false)
    }, 60000)
    return () => clearInterval(refreshInterval)
  }, [isAdmin, loadActivity])

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-112px)] bg-slate-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-12 pt-10 md:px-8">
          <section className="rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
            <p className="text-lg font-medium text-rose-600">Restricted</p>
            <p className="mt-1 text-sm text-slate-500">Only admins can view sales person login details.</p>
            <Link to="/dashboard/sales-team" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
              ← Back to Sales Team
            </Link>
          </section>
        </div>
      </main>
    )
  }

  const summary = activity?.summary || {}
  const timeline = activity?.timeline || []
  const people = activity?.people || []
  const sessions = activity?.sessions || []

  const hasActivity =
    (summary.loggedInInWindow ?? 0) > 0 ||
    (summary.currentlyOnline ?? 0) > 0 ||
    (summary.totalHours ?? 0) > 0 ||
    timeline.length > 0 ||
    sessions.length > 0

  const currentlyOnlinePeople = people.filter(p => p.currentlyOnline)

  return (
    <main className="min-h-[calc(100vh-112px)] bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-10 md:px-8">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm text-slate-500">Sales Team</p>
            <h1 className="text-2xl font-semibold text-slate-900">Sales Person Details</h1>
            <p className="text-sm text-slate-600">Track logins, active sessions, and time spent by SalesTeam</p>
          </div>
          <Link
            to="/dashboard/sales-team"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Salespeople</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalSalespeople ?? '—'}</p>
          </div>

          {hasActivity && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Logged In (7d)</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.loggedInInWindow ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Active Now</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.currentlyOnline ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Hours (7d)</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalHours ? formatHours(summary.totalHours) : '—'}</p>
              </div>
            </>
          )}
        </section>

        {currentlyOnlinePeople.length > 0 && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-emerald-900">Currently Online Sales People</h2>
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                {currentlyOnlinePeople.length} Active
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {currentlyOnlinePeople.map((person) => (
                <div key={person.userId} className="rounded-lg border border-emerald-200 bg-white px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{person.name || 'Unknown'}</p>
                      {person.email && <p className="text-xs text-slate-500">{person.email}</p>}
                      <p className="mt-2 text-xs text-slate-600">
                        Logged in: {formatDateTime(person.lastLoginAt)}
                      </p>
                      <p className="text-xs font-medium text-emerald-700">
                        Session time: {person.hours}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      Online
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">People</h2>
            <span className="text-xs text-slate-500">Sorted A → Z</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Hours</th>
                  <th className="px-3 py-2">Login</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                      Loading people…
                    </td>
                  </tr>
                ) : people.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                      No activity captured yet.
                    </td>
                  </tr>
                ) : (
                  people.map((person) => {
                    const baseMinutes = person.minutes ?? person.hours * 60 ?? 0
                    const additionalMinutes = person.currentlyOnline && activityFetchedAt
                      ? Math.max(0, (nowTick - activityFetchedAt) / 60000)
                      : 0
                    const liveMinutes = person.currentlyOnline ? baseMinutes + additionalMinutes : baseMinutes
                    return (
                      <tr key={`${person.userId}-${person.salespersonId}`} className="border-t border-slate-100">
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900">{person.name || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">{person.email || '—'}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-slate-900">{formatDuration(liveMinutes)}</div>
                          <p className="text-xs text-slate-500">Updated {formatDateTime(nowTick)}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          <div className="flex items-center gap-2">
                            {person.currentlyOnline && (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                              </span>
                            )}
                            <span>{formatDateTime(person.lastLoginAt)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
