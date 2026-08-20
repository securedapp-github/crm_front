import React from 'react'
import NormalUserTickets from '../Service/NormalUserTickets'

export default function TechTeam() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tech Team Workspace</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Review, investigate, and resolve technical bugs and infrastructure queries routed by Operations.
        </p>
      </div>

      {/* Embedded Routed Tickets Queue */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        <NormalUserTickets />
      </div>
    </div>
  )
}
