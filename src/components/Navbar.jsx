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
  const onDashboard = location.pathname.startsWith('/dashboard')
  const navLinks = useMemo(() => {
    const links = [{ href: '/', label: 'Home' }]
    if (authed && role === 'sales') {
      links.push(
        { href: '/dashboard/sales-dashboard', label: 'Sales Dashboard', protected: true },
        { href: '/dashboard/sales/completed', label: 'Completed Deals', protected: true }
      )
    } else {
      links.push({ href: '/dashboard', label: 'Dashboard', protected: true })
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-lg">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <div className="flex items-center space-x-3 md:space-x-4">
            {/* Logo */}
            <img
              src={logo}
              alt="SecuredApp Logo"
              className="h-10 w-auto md:h-12 object-contain"
            />

            {/* Divider */}
            <div className="border-l border-slate-300 h-8 md:h-10"></div>

            {/* Brand Text */}
            <div className="flex flex-col justify-center leading-tight">
              <h1 className="text-lg md:text-xl font-semibold text-slate-900 tracking-tight leading-none">
                SecureCRM
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 pt-0.5">
                Customer Relationship Management
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          <nav className="flex items-center gap-2 font-medium text-slate-600">
            {navLinks.map((link) => {
              if (link.protected && !authed) return null
              const active = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${active
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                    : 'border-transparent hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {authed ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col text-right text-xs text-slate-500">
                <span className="font-medium text-slate-700">{name ? `Hi, ${name}` : 'Welcome back'}</span>
                <span>{role === 'sales' ? 'Sales Cloud' : 'Account Owner'}</span>
              </div>
              <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-rose-600">
                Logout
              </button>
            </div>
          ) : checking ? (
            <div className="h-9 w-32 animate-pulse rounded-full bg-slate-200" />
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50">
                Login
              </Link>
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 shadow-lg animate-fade-in">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => {
              if (link.protected && !authed) return null
              const active = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition ${active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-4 border-t border-slate-100 pt-4">
            {authed ? (
              <div className="space-y-3">
                <div className="px-2 text-sm">
                  <div className="font-medium text-slate-900">{name || 'User'}</div>
                  <div className="text-xs text-slate-500">{role === 'sales' ? 'Sales Cloud' : 'Account Owner'}</div>
                </div>
                <button
                  onClick={() => {
                    onLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full rounded-lg bg-rose-50 text-rose-600 px-4 py-2 text-sm font-medium hover:bg-rose-100 text-left"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700"
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

