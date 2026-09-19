import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getMe } from '../api/auth'

export default function ProtectedRoute({ children }) {
  let localUser = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw && raw !== 'undefined') {
      localUser = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse local user session:', e);
    localStorage.removeItem('user');
  }

  const [loading, setLoading] = useState(!localUser)
  const [authed, setAuthed] = useState(!!localUser)

  useEffect(() => {
    let mounted = true
    getMe()
      .then((res) => {
        if (!mounted) return
        const serverAuthed = !!res.data?.authenticated
        if (!serverAuthed) {
          localStorage.removeItem('user')
          setAuthed(false)
        } else {
          setAuthed(true)
        }
      })
      .catch(() => {
        if (mounted) {
          if (!localUser) setAuthed(false)
        }
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500 shadow-sm">
          Checking session...
        </div>
      </div>
    );
  }

  return authed ? children : <Navigate to="/login" replace />
}


