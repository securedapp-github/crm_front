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
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-4 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.exact
          ? location.pathname === tab.href
          : location.pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            to={tab.href}
            className={`group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 ring-2 ring-slate-900/10'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 shadow-2xs'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'}`} />
              {tab.isLive && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
