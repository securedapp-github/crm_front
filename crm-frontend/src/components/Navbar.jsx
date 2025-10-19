import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getMe, logout } from '../api/auth'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [authed, setAuthed] = useState(false)
  const [name, setName] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true
    setChecking(true)
    getMe()
      .then((res) => {
        if (!mounted) return
        if (res.data?.authenticated) {
          setAuthed(true)
          setName(res.data?.user?.name || '')
        } else {
          setAuthed(false)
          setName('')
        }
      })
      .catch(() => {
        if (!mounted) return
        setAuthed(false)
        setName('')
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
    navigate('/')
  }

  return (
    <nav className="w-full bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-slate-900 font-bold text-lg">CRM</div>
        <div className="flex items-center gap-2">
          {/* On dashboard route, never show Login/Sign Up */}
          {location.pathname.startsWith('/dashboard') ? (
            authed ? (
              <>
                <span className="hidden sm:inline text-slate-700 mr-2">{name ? `Hi, ${name}` : ''}</span>
                <button onClick={onLogout} className="px-4 py-2 rounded-md bg-zohoRed text-white hover:opacity-95">Logout</button>
              </>
            ) : null
          ) : authed ? (
            <>
              <span className="hidden sm:inline text-slate-700 mr-2">{name ? `Hi, ${name}` : ''}</span>
              <Link to="/dashboard" className="px-4 py-2 rounded-md border border-slate-300 text-slate-800 hover:bg-slate-50">Dashboard</Link>
              <button onClick={onLogout} className="px-4 py-2 rounded-md bg-zohoRed text-white hover:opacity-95">Logout</button>
            </>
          ) : checking ? (
            // Avoid flashing Login/Sign Up while checking session
            <div className="h-9 w-40 bg-slate-200 rounded animate-pulse" />
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 rounded-md border border-slate-300 text-slate-800 hover:bg-slate-50">Login</Link>
              <Link to="/signup" className="px-4 py-2 rounded-md bg-zohoRed text-white hover:opacity-95">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

