import { Link } from "react-router-dom"

const FINANCE_CARDS = [
  {
    href: '/dashboard/finance/invoice-generator',
    icon: '🧾',
    label: 'Invoice Generator',
    description: 'Create, manage, and track invoices for your clients.',
    disabled: false,
  },
  {
    href: '#',
    icon: '💸',
    label: 'Payslip Generator',
    description: 'Generate and download monthly salary slips for employees.',
    disabled: true,
  },
]

export default function FinanceHub() {
  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
        <h1 className="text-xl font-bold text-slate-800">Business Tools</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your financial operations and business documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {FINANCE_CARDS.map((card) =>
          card.disabled ? (
            <div
              key={card.label}
              className="relative rounded-xl border border-slate-200 bg-white p-6 opacity-60 select-none"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{card.icon}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Coming Soon
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-800">{card.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{card.description}</p>
            </div>
          ) : (
            <Link
              key={card.href}
              to={card.href}
              className="group rounded-xl border border-slate-200 bg-white p-6 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-sm text-slate-300 group-hover:text-indigo-400 transition-colors">
                  →
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                {card.label}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{card.description}</p>
            </Link>
          )
        )}
      </div>
    </div>
  )
}
