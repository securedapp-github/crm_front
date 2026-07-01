import { Link, Outlet, useLocation } from "react-router-dom"

const TABS = [
  { href: '/dashboard/finance/invoice-generator', label: 'Create Invoice' },
  { href: '/dashboard/finance/invoice-generator/dashboard', label: 'Dashboard' },
  { href: '/dashboard/finance/invoice-generator/list', label: 'All Invoices' },
  { href: '/dashboard/finance/invoice-generator/customers', label: 'Customers' },
  { href: '/dashboard/finance/invoice-generator/payments', label: 'Payments' },
  { href: '/dashboard/finance/invoice-generator/catalog', label: 'Product Catalog' },
  { href: '/dashboard/finance/invoice-generator/settings', label: 'Settings' },
]

export default function InvoiceLayout() {
  const location = useLocation()

  const isActive = (tabHref) => {
    if (tabHref === '/dashboard/finance/invoice-generator') {
      return location.pathname === '/dashboard/finance/invoice-generator' || location.pathname === '/dashboard/finance/invoice-generator/'
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
