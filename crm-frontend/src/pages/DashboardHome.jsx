export default function DashboardHome() {
  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">
            Metrics and activity feeds will appear here once data is connected.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">
          <div>
            <span className="text-slate-400">No widgets configured yet.</span>
            <p className="mt-2 text-xs">Integrate deals, activities, and KPIs to populate your dashboard overview.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
