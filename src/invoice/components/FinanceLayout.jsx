import { Link, Outlet, useLocation } from "react-router-dom"

const TABS = [
  { href: '/dashboard/finance', label: 'Create Invoice' },
  { href: '/dashboard/finance/dashboard', label: 'Dashboard' },
  { href: '/dashboard/finance/invoices', label: 'All Invoices' },
  { href: '/dashboard/finance/customers', label: 'Customers' },
  { href: '/dashboard/finance/payments', label: 'Payments' },
  { href: '/dashboard/finance/catalog', label: 'Product Catalog' },
  { href: '/dashboard/finance/settings', label: 'Settings' },
]

export default function FinanceLayout() {
  const location = useLocation()

  const isActive = (tabHref) => {
    if (tabHref === '/dashboard/finance') {
      return location.pathname === '/dashboard/finance' || location.pathname === '/dashboard/finance/'
    }
    return location.pathname.startsWith(tabHref)
  }

  return (
    <div>
      <div className="flex gap-2 border-b border-slate-200 pb-2 mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
      <Outlet />
    </div>
  )
}
