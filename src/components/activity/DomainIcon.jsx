import React, { useState } from 'react'

export default function DomainIcon({ domain, size = 20 }) {
  const [error, setError] = useState(false)
  const cleanDomain = (domain || '').replace(/^www\./, '').trim()
  const initial = cleanDomain ? cleanDomain[0].toUpperCase() : '🌐'

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
