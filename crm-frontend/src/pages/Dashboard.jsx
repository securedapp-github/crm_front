import { Link, Outlet, useLocation } from "react-router-dom"

export default function Dashboard() {
  const location = useLocation()

  return (
    <div className="min-h-[calc(100vh-56px)] flex bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white/80 backdrop-blur-xl shadow-md rounded-r-2xl">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-blue-600 tracking-tight">
            ⚡ CRM
          </h1>
          <p className="text-xs text-slate-500">Customer Management</p>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-5 space-y-2 text-sm font-medium">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
              location.pathname === "/dashboard"
                ? "bg-blue-500 text-white shadow-md"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </Link>

          <div className="pt-2 mt-2 border-t border-slate-200" />

          <Link
            to="/dashboard/marketing"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
              location.pathname.includes("/dashboard/marketing")
                ? "bg-blue-500 text-white shadow-md"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>📈</span>
            <span>Marketing & Lead Management</span>
          </Link>

          <Link
            to="/dashboard/sales"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
              location.pathname.includes("/dashboard/sales")
                ? "bg-blue-500 text-white shadow-md"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>🧭</span>
            <span>Sales Management</span>
          </Link>
          <Link
            to="/dashboard/service"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
              location.pathname.includes("/dashboard/service")
                ? "bg-blue-500 text-white shadow-md"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>🛟</span>
            <span>Customer Service</span>
          </Link>
          <Link
            to="/dashboard/collaboration"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
              location.pathname.includes("/dashboard/collaboration")
                ? "bg-blue-500 text-white shadow-md"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>📝</span>
            <span>Collaboration</span>
          </Link>
        </nav>

        {/* Footer */}
        <div className="mt-auto px-4 py-3 border-t border-slate-200 text-xs text-slate-500">
          © 2025 SecureCRM
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 p-6">
        <div className="bg-white/80 backdrop-blur-lg border border-slate-200 rounded-2xl shadow-sm p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
