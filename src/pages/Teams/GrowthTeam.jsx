import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export default function GrowthTeam() {
  return (
    <main className="min-h-[calc(100vh-112px)] bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-12 pt-10 md:px-8">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/teams"
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors self-start mb-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Growth Team</h1>
            <p className="max-w-3xl text-sm text-slate-600 md:text-base">
              Drive growth initiatives, partnerships, and strategic website inquiries routed by Operations.
            </p>
          </div>
          <Link
            to="/dashboard/tickets"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
          >
            View Tickets <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </main>
  )
}
