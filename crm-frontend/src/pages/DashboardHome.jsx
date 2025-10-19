export default function DashboardHome() {
  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>

      <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-slate-500 text-sm">Open deals</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">12</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-slate-500 text-sm">Pipeline value</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">$75,000</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-slate-500 text-sm">Activities due</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">15</div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-lg border border-slate-200 bg-white">
          <div className="p-4 border-b border-slate-200 font-semibold text-slate-900">Deals</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Title</th>
                  <th className="text-left font-medium px-4 py-2">Contact</th>
                  <th className="text-left font-medium px-4 py-2">Amount</th>
                  <th className="text-left font-medium px-4 py-2">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { title: 'Acme Corp.', contact: 'Alice Smith', amount: '$25,000', stage: { label: 'Negotiation', color: 'bg-blue-100 text-blue-700' } },
                  { title: 'Beta Inc.', contact: 'Bob Johnson', amount: '$15,000', stage: { label: 'Proposal', color: 'bg-green-100 text-green-700' } },
                  { title: 'Gamma LLC', contact: 'Carol Danvers', amount: '$20,000', stage: { label: 'Qualification', color: 'bg-purple-100 text-purple-700' } },
                  { title: 'Delta Co.', contact: 'David Lee', amount: '$15,000', stage: { label: 'Needs analysis', color: 'bg-amber-100 text-amber-700' } },
                ].map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-900">{d.title}</td>
                    <td className="px-4 py-2 text-slate-700">{d.contact}</td>
                    <td className="px-4 py-2 text-slate-900">{d.amount}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-1 rounded-md text-xs font-medium ${d.stage.color}`}>{d.stage.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="p-4 border-b border-slate-200 font-semibold text-slate-900">Upcoming activities</div>
          <ul className="p-4 space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-700"><span>📞</span><span>Call with Bob</span></div>
              <div className="text-slate-500">Today</div>
            </li>
            <li className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-700"><span>✉️</span><span>Send Sarah the proposal</span></div>
              <div className="text-slate-500">Tomorrow</div>
            </li>
            <li className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-700"><span>📅</span><span>Demo with Acme Corp.</span></div>
              <div className="text-slate-500">Friday</div>
            </li>
          </ul>
        </div>
      </section>
    </main>
  )
}
