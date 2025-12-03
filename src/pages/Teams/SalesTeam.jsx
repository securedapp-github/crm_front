import { Link } from 'react-router-dom'

export default function SalesTeam() {
  return (
    <main className="min-h-[calc(100vh-112px)] bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-12 pt-10 md:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Sales Team</h1>
          <p className="mt-2 text-sm text-slate-600">
            Choose where you want to work: manage incoming leads or focus on your deals pipeline.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            to="/dashboard/marketing"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <span className="text-lg">📈</span>
                  <span>Lead Management</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Capture and score leads coming from your marketing campaigns.
                </p>
              </div>
              <span className="text-xl text-slate-300">→</span>
            </div>
          </Link>

          <Link
            to="/dashboard/sales"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <span className="text-lg">🧭</span>
                  <span>Sales Pipeline</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Move deals across stages and track your revenue progress.
                </p>
              </div>
              <span className="text-xl text-slate-300">→</span>
            </div>
          </Link>

          <Link
            to="/dashboard/sales/completed"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <span className="text-lg">✅</span>
                  <span>Completed Deals</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Review everything marked done and track recent closures in one list.
                </p>
              </div>
              <span className="text-xl text-slate-300">→</span>
            </div>
          </Link>

          <Link
            to="/dashboard/sales-team/details"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <span className="text-lg">🕒</span>
                  <span>Sales Person Details</span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Review who is login counts, and total time spent by the team.
                </p>
              </div>
              <span className="text-xl text-slate-300">→</span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  )
}
