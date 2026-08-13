import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, ShieldCheck, Radio } from 'lucide-react'

export default function ActivityNav() {
  const location = useLocation()

  const tabs = [
    { href: '/dashboard/activity', label: 'Overview', icon: BarChart3, exact: true },
    { href: '/dashboard/activity/allowed-domains', label: 'Chosen Domains Only', icon: ShieldCheck },
    { href: '/dashboard/activity/live', label: 'Live Stream', icon: Radio, isLive: true }
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200/70 pb-3 mb-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.exact
            ? location.pathname === tab.href
            : location.pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                {tab.isLive && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
      <a
        href="/extension/activity-tracker-extension.zip"
        download="activity-tracker-extension.zip"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition shadow-xs"
        title="Download Activity Tracker Chrome Extension (.zip)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        Download Extension (.zip)
      </a>
    </div>
  )
}
