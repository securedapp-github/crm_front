import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { getMe } from "../api/auth"

const DEFAULT_SECTIONS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/dashboard/marketing", label: "Marketing", icon: "📈" },
  { href: "/dashboard/sales", label: "Sales", icon: "🧭" },
  { href: "/dashboard/service", label: "Service", icon: "🛟" },
  { href: "/dashboard/collaboration", label: "Collaboration", icon: "📝" },
]

const SALES_SECTIONS = [
  { href: "/dashboard/sales-dashboard", label: "Sales Dashboard", icon: "🧭" },
]

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true
    setChecking(true)
    getMe()
      .then((res) => {
        if (!mounted) return
        if (res.data?.authenticated) {
          setUser(res.data.user || null)
        } else {
          setUser(null)
        }
      })
      .catch(() => {
        if (!mounted) return
        setUser(null)
      })
      .finally(() => {
        if (mounted) setChecking(false)
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (checking) return
    if (user?.role === 'sales') {
      const allowedPrefixes = ['/dashboard/sales-dashboard']
      const isAllowed = allowedPrefixes.some((prefix) => location.pathname.startsWith(prefix))
      if (!isAllowed) {
        navigate('/dashboard/sales-dashboard', { replace: true })
      }
    }
  }, [checking, user, location.pathname, navigate])

  const sections = useMemo(() => {
    if (checking) return []
    return user?.role === 'sales' ? SALES_SECTIONS : DEFAULT_SECTIONS
  }, [checking, user])

  if (checking) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Preparing your workspace...
        </div>
      </div>
    )
  }

  const renderNav = (onNavigate) => (
    <nav className="px-4 py-6 space-y-1 text-sm font-medium">
      {sections.map((item) => {
        const active = item.href === "/dashboard"
          ? location.pathname === item.href
          : location.pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => {
              if (onNavigate) onNavigate()
            }}
            className={`group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${
              active
                ? "border-indigo-400 bg-gradient-to-r from-indigo-500/15 via-white to-white text-indigo-600 shadow-sm"
                : "border-transparent text-slate-600 hover:border-indigo-200/80 hover:bg-white hover:text-indigo-600"
            }`}
          >
            <span className="flex items-center gap-3 text-left">
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </span>
            <span className={`text-xs transition ${active ? "text-indigo-500" : "text-slate-300 group-hover:text-indigo-400"}`}>→</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-30 lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-slate-900/40 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 transform bg-white shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Menu</h2>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
              title="Close"
            >
              ×
            </button>
          </div>
          {renderNav(() => setMobileOpen(false))}
          <div className="mt-auto px-5 py-4 text-xs text-slate-400">© 2025 SecureCRM</div>
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-[64px] hidden h-[calc(100vh-64px)] w-72 shrink-0 flex-col overflow-hidden border-r border-white/50 bg-white/85 backdrop-blur-xl shadow-lg shadow-indigo-100/40 lg:flex">
        <div className="border-b border-white/60 bg-gradient-to-br from-indigo-100/40 via-white to-slate-100 px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-700">Navigation</h2>
        </div>
        <div className="flex-1 overflow-y-auto">{renderNav()}</div>
        <div className="border-t border-white/60 px-6 py-4 text-xs text-slate-400">
          <p className="font-medium text-slate-500">Need help?</p>
          <p>support@securecrm.io</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <div className="lg:hidden px-4 pt-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <span className="text-lg">☰</span>
            <span>Menu</span>
          </button>
        </div>
        <div className="px-4 pb-12 pt-4 lg:px-10 lg:pt-10">
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
