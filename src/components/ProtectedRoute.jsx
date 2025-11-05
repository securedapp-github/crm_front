import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getMe } from '../api/auth'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let mounted = true
    getMe()
      .then((res) => {
        if (!mounted) return
        setAuthed(!!res.data?.authenticated)
      })
      .catch(() => {
        if (!mounted) return
        setAuthed(false)
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Checking session...</div>
  }
  return authed ? children : <Navigate to="/login" />
}
