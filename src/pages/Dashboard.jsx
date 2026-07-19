import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { getMe } from "../api/auth"
import { 
  HomeIcon, 
  DashboardIcon, 
  EnvelopeClosedIcon, 
  CheckCircledIcon, 
  ArchiveIcon, 
  SpeakerLoudIcon, 
  PaperPlaneIcon, 
  ClipboardIcon, 
  CardStackIcon, 
  PersonIcon, 
  AvatarIcon, 
  ActivityLogIcon, 
  GearIcon, 
  LaptopIcon 
} from "@radix-ui/react-icons"

const getLandingPath = (user) => {
  if (!user || !user.role) return '/login';
  const roles = user.role.split(',').map(r => r.trim().toLowerCase());
  
  if (roles.includes('admin')) return '/dashboard';
  if (roles.includes('hr')) return '/dashboard/hr-team';
  if (roles.includes('finance')) return '/dashboard/finance';
  if (roles.includes('sales')) return '/dashboard/sales-dashboard';
  if (roles.includes('marketing') || roles.includes('growth')) return '/dashboard';
  if (roles.includes('operations')) return '/dashboard/operations-team';
  if (roles.includes('tech')) return '/dashboard/tech-team';
  
  return '/dashboard/leave';
}

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
    if (checking || !user) return;
    const roles = (user.role || '').split(',').map(r => r.trim().toLowerCase());
    
    // admin is superuser
    if (roles.includes('admin')) return;
    
    // Base prefixes allowed for everyone
    const allowedPrefixes = [
      '/dashboard/settings',
      '/dashboard/leave',
      '/dashboard/team/'
    ];
    
    // Add specific prefixes based on roles
    if (roles.includes('sales')) {
      allowedPrefixes.push('/dashboard/sales-dashboard');
      allowedPrefixes.push('/dashboard/sales/');
    }
    
    if (roles.includes('marketing')) {
      allowedPrefixes.push('/dashboard/marketing');
      allowedPrefixes.push('/dashboard/marketing-team');
    }
    
    if (roles.includes('growth')) {
      allowedPrefixes.push('/dashboard/growth-team');
      allowedPrefixes.push('/dashboard/marketing');
    }
    
    if (roles.includes('hr')) {
      allowedPrefixes.push('/dashboard/hr-team');
    }
    
    if (roles.includes('finance') || roles.includes('sales') || roles.includes('marketing') || roles.includes('growth')) {
      allowedPrefixes.push('/dashboard/finance');
    }
    
    if (roles.includes('operations')) {
      allowedPrefixes.push('/dashboard/operations-team');
    }
    
    if (roles.includes('tech')) {
      allowedPrefixes.push('/dashboard/tech-team');
    }
    
    // Check if user is accessing index /dashboard directly
    if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
      // Dashboard home index is ONLY allowed for admin, sales, marketing, and growth
      const isIndexAllowed = roles.some(r => ['admin', 'sales', 'marketing', 'growth'].includes(r));
      if (!isIndexAllowed) {
        const landing = getLandingPath(user);
        navigate(landing, { replace: true });
        return;
      }
    }
    
    const isAllowed = allowedPrefixes.some(prefix => location.pathname.startsWith(prefix)) || 
                      (location.pathname === '/dashboard' || location.pathname === '/dashboard/');
                      
    if (!isAllowed) {
      const landing = getLandingPath(user);
      navigate(landing, { replace: true });
    }
  }, [checking, user, location.pathname, navigate])

  const sections = useMemo(() => {
    if (checking || !user) return []
    const roles = (user.role || '').split(',').map(r => r.trim().toLowerCase());
    
    const map = {
      dashboard: { href: "/dashboard", label: "Dashboard", icon: <HomeIcon className="w-5 h-5" /> },
      salesDashboard: { href: "/dashboard/sales-dashboard", label: "Sales Dashboard", icon: <DashboardIcon className="w-5 h-5" /> },
      salesMail: { href: "/dashboard/sales/mail", label: "Send Mail", icon: <EnvelopeClosedIcon className="w-5 h-5" /> },
      salesCompleted: { href: "/dashboard/sales/completed", label: "Completed Deals", icon: <CheckCircledIcon className="w-5 h-5" /> },
      salesActivities: { href: "/dashboard/sales/activities", label: "My Marketing Activities", icon: <SpeakerLoudIcon className="w-5 h-5" /> },
      salesSequences: { href: "/dashboard/sales-dashboard/sequences", label: "Email Sequences", icon: <PaperPlaneIcon className="w-5 h-5" /> },
      marketingDashboard: { href: "/dashboard/marketing", label: "Lead Management", icon: <SpeakerLoudIcon className="w-5 h-5" /> },
      marketingTeam: { href: "/dashboard/marketing-team", label: "Marketing Portal", icon: <SpeakerLoudIcon className="w-5 h-5" /> },
      growthTeam: { href: "/dashboard/growth-team", label: "Growth Portal", icon: <ActivityLogIcon className="w-5 h-5" /> },
      operationsTeam: { href: "/dashboard/operations-team", label: "Operations Portal", icon: <GearIcon className="w-5 h-5" /> },
      techTeam: { href: "/dashboard/tech-team", label: "Tech Portal", icon: <LaptopIcon className="w-5 h-5" /> },
      hrTeam: { href: "/dashboard/hr-team", label: "HR Portal", icon: <AvatarIcon className="w-5 h-5" /> },
      finance: { href: "/dashboard/finance", label: "Finance Hub", icon: <CardStackIcon className="w-5 h-5" /> },

      leave: { href: "/dashboard/leave", label: "Leave Requests", icon: <ClipboardIcon className="w-5 h-5" /> }
    };

    if (roles.includes('admin')) {
      return [
        map.dashboard,
        map.salesDashboard,
        map.salesMail,
        map.salesCompleted,
        map.salesActivities,
        map.salesSequences,
        map.marketingDashboard,
        map.marketingTeam,
        map.growthTeam,
        map.operationsTeam,
        map.techTeam,
        map.hrTeam,
        map.finance,

        map.leave
      ];
    }

    const result = [];
    if (roles.includes('marketing') || roles.includes('growth') || roles.includes('sales')) {
      result.push(map.dashboard);
    }
    
    if (roles.includes('sales')) {
      result.push(map.salesDashboard);
      result.push(map.salesMail);
      result.push(map.salesCompleted);
      result.push(map.salesActivities);
      result.push(map.salesSequences);
    }
    
    if (roles.includes('marketing')) {
      result.push(map.marketingDashboard);
      result.push(map.marketingTeam);
    }
    
    if (roles.includes('growth')) {
      result.push(map.growthTeam);
      if (!roles.includes('marketing')) {
        result.push(map.marketingDashboard);
      }
    }
    
    if (roles.includes('hr')) {
      result.push(map.hrTeam);
    }
    
    if (roles.includes('finance') || roles.includes('sales') || roles.includes('marketing') || roles.includes('growth')) {
      result.push(map.finance);
    }
    
    if (roles.includes('operations')) {
      result.push(map.operationsTeam);
    }
    
    if (roles.includes('tech')) {
      result.push(map.techTeam);
    }
    

    result.push(map.leave);
    
    // deduplicate
    const unique = [];
    const hrefs = new Set();
    for (const item of result) {
      if (!hrefs.has(item.href)) {
        hrefs.add(item.href);
        unique.push(item);
      }
    }
    return unique;
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

  const renderNav = (onNavigate) => {
    const renderLink = (item) => {
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
          className={`group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${active
            ? "border-indigo-400 bg-gradient-to-r from-indigo-500/15 via-white to-white text-indigo-600 shadow-sm"
            : "border-transparent text-slate-600 hover:border-indigo-200/80 hover:bg-white hover:text-indigo-600"
            }`}
        >
          <span className="flex items-center gap-3 text-left">
            <span className="flex items-center justify-center w-6 h-6">{item.icon}</span>
            <span>{item.label}</span>
          </span>
          <span className={`text-xs transition ${active ? "text-indigo-500" : "text-slate-300 group-hover:text-indigo-400"}`}>
            →
          </span>
        </Link>
      )
    }

    return (
      <nav className="px-4 py-6 space-y-3 text-sm font-medium">
        <div className="space-y-2">
          {sections.map((item) => (
            <div key={item.href}>{renderLink(item)}</div>
          ))}
        </div>
      </nav>
    )
  }

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-30 lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-slate-900/40 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 transform bg-white shadow-2xl transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
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
