import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getMe } from '../api/auth'

export default function ProtectedRoute({ children }) {
  const localUser = JSON.parse(localStorage.getItem('user') || 'null')

  const [loading, setLoading] = useState(!localUser)
  const [authed, setAuthed] = useState(!!localUser)

  useEffect(() => {
    let mounted = true
    getMe()
      .then((res) => {
        if (!mounted) return
        const serverAuthed = !!res.data?.authenticated
        if (!serverAuthed) localStorage.removeItem('user')
        setAuthed(serverAuthed)
      })
      .catch(() => {
        if (mounted && !localUser) setAuthed(false)
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Checking session...</div>
  }
  return authed ? children : <Navigate to="/login" replace />
}

