import { useState } from 'react'
import MarketingStorage from '../Marketing/MarketingStorage'
import { Link } from 'react-router-dom'

export default function MarketingTeam() {
  const [view, setView] = useState('menu') // 'menu' or 'assets'

  return (
    <main className="min-h-[calc(100vh-112px)] bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-10 md:px-8">

        {/* Breadcrumb / Back Navigation */}
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/sales-team"
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors self-start mb-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back</span>
          </Link>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            Marketing Team
          </h1>
          <p className="max-w-3xl text-sm text-slate-600 md:text-base">
            Collaborate on marketing initiatives, manage assets, and track team performance.
          </p>
        </div>

        {/* Menu Grid View */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Company Assets Card */}
          <Link
            to="/dashboard/company-assets"
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Company Assets</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Upload and manage posters, videos, and marketing collateral in one place.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end text-slate-400 group-hover:text-indigo-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </Link>

          {/* Marketing Activities Card */}
          <Link
            to="/dashboard/marketing-team/activities"
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">Marketing Activities</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Plan content, view calendar, and manage posts across channels.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end text-slate-400 group-hover:text-purple-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </Link>

          {/* Email Sequences Card */}
          <Link
            to="/dashboard/marketing-team/sequences"
            className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-green-600 transition-colors">Email Sequences</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Build and automate email drip campaigns for welcome series and nurturing.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end text-slate-400 group-hover:text-green-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </Link>

        </div>
      </div>
    </main>
  )
}
