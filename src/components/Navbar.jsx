import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getMe, logout } from '../api/auth'
import logo from '../assets/securedapp-logo.png'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const onDashboard = location.pathname.startsWith('/dashboard')
  const navLinks = useMemo(() => {
    const links = [{ href: '/', label: 'Home' }]
    if (authed && role === 'sales') {
      links.push(
        { href: '/dashboard/sales-dashboard', label: 'Team Login', protected: true },
        { href: '/dashboard/sales/completed', label: 'Completed Deals', protected: true },
        { href: '/dashboard/sales-team', label: 'Team', protected: true }
      )
    } else {
      links.push({ href: '/dashboard', label: 'Dashboard', protected: true })
    }
    if (authed && role !== 'sales') {
      links.push({ href: '/dashboard/settings', label: 'Settings', protected: true })
    }
    return links
  }, [authed, role])

  const persistUser = (value) => {
    try {
      if (value) {
        localStorage.setItem('user', JSON.stringify(value))
      } else {
        localStorage.removeItem('user')
      }
    } catch { }
  }

  const refreshAuth = () => {
    setChecking(true)
    return getMe()
      .then((res) => {
        if (res.data?.authenticated) {
          setAuthed(true)
          setName(res.data?.user?.name || '')
          setRole(res.data?.user?.role || '')
          persistUser(res.data?.user || null)
        } else {
          setAuthed(false)
          setName('')
          setRole('')
          persistUser(null)
        }
      })
      .catch(() => {
        setAuthed(false)
        setName('')
        setRole('')
        persistUser(null)
      })
      .finally(() => setChecking(false))
  }

  useEffect(() => {
    let mounted = true
    refreshAuth().finally(() => { if (!mounted) return })
    const handleAuthChanged = () => refreshAuth()
    window.addEventListener('auth:changed', handleAuthChanged)
    window.addEventListener('storage', handleAuthChanged)
    return () => {
      mounted = false
      window.removeEventListener('auth:changed', handleAuthChanged)
      window.removeEventListener('storage', handleAuthChanged)
    }
  }, [])

  const onLogout = async () => {
    try {
      await logout()
    } catch { }
    setAuthed(false)
    setName('')
    setRole('')
    persistUser(null)
    window.dispatchEvent(new Event('auth:changed'))
    navigate('/')
  }

  const dashPath = role === 'sales' ? '/dashboard/sales-dashboard' : '/dashboard'

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/70 shadow-sm backdrop-blur-md transition-all duration-300">
      <div className="container mx-auto flex items-center justify-between px-6 py-3.5">
        <div className="flex items-center">
          <div className="flex items-center space-x-3.5">
            {/* Logo */}
            <div className="relative group cursor-pointer p-1.5 rounded-xl bg-white/40 border border-white/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all duration-300 hover:bg-white/60">
              <img
                src={logo}
                alt="SecuredApp Logo"
                className="h-8 w-auto object-contain transition duration-300 group-hover:scale-105"
              />
            </div>

            {/* Divider */}
            <div className="border-l border-slate-200 h-7"></div>

            {/* Brand Text */}
            <div className="flex flex-col justify-center leading-none">
              <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1">
                <span>Secure</span>
                <span className="text-emerald-600">CRM</span>
              </h1>
              <p className="text-[9px] font-medium text-slate-400 mt-0.5 tracking-wider uppercase">
                Enterprise Cloud
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <nav className="flex items-center gap-1 font-medium text-slate-600">
            {navLinks.map((link) => {
              if (link.protected && !authed) return null
              const active = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`relative px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-300 ${active
                    ? 'bg-emerald-50 text-emerald-600 shadow-[0_2px_10px_rgba(16,185,129,0.08)] border border-emerald-100/50'
                    : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-50/80'
                    }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {authed ? (
            <div className="flex items-center gap-4 border-l border-slate-200/60 pl-6 relative">
              <div className="flex flex-col text-right leading-tight">
                <span className="text-xs font-semibold text-slate-700">{name ? `Hi, ${name.split(' ')[0]}` : 'Welcome'}</span>
                <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider">{role === 'sales' ? 'Sales Cloud' : 'Account Owner'}</span>
              </div>
              
              {/* Avatar Dropdown */}
              <div 
                className="relative group cursor-pointer"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white">
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </div>
                
                {/* Dropdown Menu */}
                <div className={`absolute right-0 top-full pt-2 w-48 transition-all duration-200 origin-top-right ${dropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                  <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden py-1">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-xs font-semibold text-slate-800 truncate">{name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{role === 'admin' ? 'Administrator' : 'Sales Rep'}</p>
                    </div>
                    
                    <Link to="/dashboard/settings?tab=account" className="flex items-center px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors">
                      Account Settings
                    </Link>
                    <Link to="/dashboard/settings?tab=security" className="flex items-center px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors">
                      Change Password
                    </Link>
                    
                    <div className="h-px bg-slate-100 my-1"></div>
                    
                    <button onClick={onLogout} className="w-full text-left flex items-center px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors">
                      Log out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : checking ? (
            <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100 pl-6" />
          ) : (
            <div className="flex items-center gap-3 border-l border-slate-200/60 pl-6">
              <Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300">
                Login
              </Link>
              <Link to="/signup" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(16,185,129,0.15)] hover:bg-emerald-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition duration-200"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md px-6 py-5 shadow-xl animate-fade-in">
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              if (link.protected && !authed) return null
              const active = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-5 border-t border-slate-100 pt-5">
            {authed ? (
              <div className="space-y-3">
                <div className="px-4 py-3 bg-slate-50 rounded-xl flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {name ? name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{name || 'User'}</div>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">{role === 'sales' ? 'Sales Cloud' : 'Account Owner'}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/dashboard/settings?tab=account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 rounded-xl bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold hover:bg-slate-100 text-center transition duration-200"
                  >
                    Settings
                  </Link>
                  <Link
                    to="/dashboard/settings?tab=security"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 rounded-xl bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold hover:bg-slate-100 text-center transition duration-200"
                  >
                    Security
                  </Link>
                </div>

                <button
                  onClick={() => {
                    onLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full rounded-xl bg-rose-50 text-rose-600 px-4 py-3 text-xs font-semibold hover:bg-rose-100 text-center transition duration-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-center text-xs font-semibold text-white hover:bg-emerald-700 transition duration-200 shadow-md shadow-emerald-100"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

