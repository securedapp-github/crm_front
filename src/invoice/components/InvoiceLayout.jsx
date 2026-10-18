import React, { useEffect, useCallback } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useQueryClient } from "@tanstack/react-query"
import { invoiceApi } from "@/invoice/api/invoiceClient"

const TABS = [
  { href: '/dashboard/finance/invoice-generator', label: 'Create Invoice', id: 'create' },
  { href: '/dashboard/finance/invoice-generator/dashboard', label: 'Dashboard', id: 'dashboard' },
  { href: '/dashboard/finance/invoice-generator/list', label: 'All Invoices', id: 'invoices' },
  { href: '/dashboard/finance/invoice-generator/customers', label: 'Customers', id: 'customers' },
  { href: '/dashboard/finance/invoice-generator/payments', label: 'Payments', id: 'payments' },
  { href: '/dashboard/finance/invoice-generator/catalog', label: 'Product Catalog', id: 'products' },
  { href: '/dashboard/finance/invoice-generator/settings', label: 'Settings', id: 'settings' },
]

export default function InvoiceLayout() {
  const location = useLocation()
  const queryClient = useQueryClient()

  const prefetchTab = useCallback((tabId) => {
    try {
      if (tabId === 'customers' || tabId === 'dashboard') {
        queryClient.prefetchQuery({
          queryKey: ['customers'],
          queryFn: () => invoiceApi.entities.Customer.list('-created_date', 200),
          staleTime: 5 * 60 * 1000,
        })
      }
      if (tabId === 'invoices' || tabId === 'dashboard') {
        queryClient.prefetchQuery({
          queryKey: ['invoices'],
          queryFn: () => invoiceApi.entities.Invoice.list('-created_date', 200),
          staleTime: 5 * 60 * 1000,
        })
      }
      if (tabId === 'create' || tabId === 'invoices' || tabId === 'settings') {
        queryClient.prefetchQuery({
          queryKey: ['business'],
          queryFn: () => invoiceApi.entities.Business.list(),
          staleTime: 5 * 60 * 1000,
        })
      }
      if (tabId === 'payments') {
        queryClient.prefetchQuery({
          queryKey: ['payments'],
          queryFn: () => invoiceApi.entities.Payment.list('-created_date', 200),
          staleTime: 5 * 60 * 1000,
        })
      }
      if (tabId === 'products') {
        queryClient.prefetchQuery({
          queryKey: ['products'],
          queryFn: () => invoiceApi.entities.Product.list('-updated_date', 200),
          staleTime: 5 * 60 * 1000,
        })
      }
    } catch (_) {}
  }, [queryClient])

  // Warm up cache for all invoice tabs as soon as user opens invoice generator
  useEffect(() => {
    const timer = setTimeout(() => {
      prefetchTab('dashboard')
      prefetchTab('customers')
      prefetchTab('invoices')
      prefetchTab('payments')
      prefetchTab('products')
      prefetchTab('settings')
    }, 50)
    return () => clearTimeout(timer)
  }, [prefetchTab])

  const isActive = (tabHref) => {
    if (tabHref === '/dashboard/finance/invoice-generator') {
      return location.pathname === '/dashboard/finance/invoice-generator' || location.pathname === '/dashboard/finance/invoice-generator/'
    }
    return location.pathname.startsWith(tabHref)
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
        <Link to="/dashboard/finance" className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500 hover:text-slate-800" title="Back to Finance Hub">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex gap-2">
          {TABS.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                to={tab.href}
                onMouseEnter={() => prefetchTab(tab.id)}
                onTouchStart={() => prefetchTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200/50'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="animate-fade-up">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}
