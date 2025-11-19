import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CampaignList from './CampaignList'
import LeadScoring from './LeadScoring'

export default function Marketing() {
  const [tab, setTab] = useState('capture')
  const tabs = useMemo(() => ([
    { id: 'capture', label: 'Capture', description: 'Campaigns' },
    { id: 'scoring', label: 'Scoring', description: 'Grades & prioritisation' }
  ]), [])

  return (
    <main className="min-h-[calc(100vh-112px)] bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-10 md:px-8">
        <Link 
          to="/dashboard/sales-team" 
          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors self-start mb-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <span>Back</span>
        </Link>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Lead Management</h1>
            <p className="max-w-3xl text-sm text-slate-600 md:text-base">
              Manage campaigns, track lead quality, and coordinate nurturing workflows. Choose a focus area below to review data and actions for that part of the funnel.
            </p>
          </div>
        </section>

        <nav className="flex flex-wrap gap-3">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`group flex min-w-[160px] flex-1 items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 sm:flex-none ${
                tab === item.id
                  ? 'border-indigo-500 bg-white shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              <span>
                <span className={`block text-base font-semibold ${tab === item.id ? 'text-slate-900' : 'text-slate-700'}`}>{item.label}</span>
                <span className="mt-1 block text-xs text-slate-500 sm:text-sm">{item.description}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {tab === 'capture' && <CampaignList />}
          {tab === 'scoring' && <LeadScoring />}
        </div>
      </div>
    </main>
  )
}
