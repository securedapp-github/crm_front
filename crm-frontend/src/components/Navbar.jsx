import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getMe, logout } from '../api/auth'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [authed, setAuthed] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [checking, setChecking] = useState(true)
  const onDashboard = location.pathname.startsWith('/dashboard')
  const navLinks = useMemo(() => ([
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard', protected: true },
  ]), [])

  useEffect(() => {
    let mounted = true
    setChecking(true)
    getMe()
      .then((res) => {
        if (!mounted) return
        if (res.data?.authenticated) {
          setAuthed(true)
          setName(res.data?.user?.name || '')
          setRole(res.data?.user?.role || '')
        } else {
          setAuthed(false)
          setName('')
          setRole('')
        }
      })
      .catch(() => {
        if (!mounted) return
        setAuthed(false)
        setName('')
        setRole('')
      })
      .finally(() => mounted && setChecking(false))
    return () => { mounted = false }
  }, [location.pathname])

  const onLogout = async () => {
    try {
      await logout()
    } catch {}
    setAuthed(false)
    setName('')
    setRole('')
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3 text-lg font-semibold text-slate-900 md:text-xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">🔐</span>
            <div>
              <p className="leading-none">SecureCRM</p>
              <p className="text-xs font-normal text-slate-500">Customer Intelligence Hub</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <nav className="hidden items-center gap-2 font-medium text-slate-600 md:flex">
            {navLinks.map((link) => {
              if (link.protected && !authed) return null
              const active = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href))
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                      : 'border-transparent hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 md:hidden"
          >
            <span>←</span>
            <span>Home</span>
          </button>

          {authed ? (
            <>
              <div className="hidden flex-col text-right text-xs text-slate-500 md:flex mr-2">
                <span className="font-medium text-slate-700">{name ? `Hi, ${name}` : 'Welcome back'}</span>
                <span>{role === 'sales' ? 'Sales Cloud' : 'Account Owner'}</span>
              </div>
              <nav className="flex items-center gap-2 md:hidden">
                {navLinks.map((link) => {
                  if (link.protected && !authed) return null
                  const active = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href))
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
                        active
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm'
                          : 'border-transparent hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
              <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-rose-600">
                Logout
              </button>
            </>
          ) : checking ? (
            <div className="h-9 w-32 animate-pulse rounded-full bg-slate-200" />
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50">
                Login
              </Link>
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

