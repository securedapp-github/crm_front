import React, { useState } from 'react'
import { ShieldAlert } from 'lucide-react'

export default function DomainIcon({ domain, size = 20 }) {
  const [error, setError] = useState(false)
  const isPrivate = !domain || domain.includes('Unlisted') || domain.includes('Private')
  const cleanDomain = (domain || '').replace(/^www\./, '').trim()
  const initial = cleanDomain ? cleanDomain[0].toUpperCase() : '🌐'

  if (isPrivate) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 font-semibold border border-slate-200 shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
        title="Private / Unlisted Domain"
      >
        <ShieldAlert style={{ width: `${Math.max(12, size - 6)}px`, height: `${Math.max(12, size - 6)}px` }} className="text-slate-400" />
      </div>
    )
  }

  if (!cleanDomain || error) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-semibold border border-indigo-100 text-xs shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`}
      alt={cleanDomain}
      onError={() => setError(true)}
      className="rounded shrink-0 object-contain"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}
