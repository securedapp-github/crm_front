import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CornerUpRight, X, Users, AlertCircle, ShieldCheck } from 'lucide-react'

const AUTHORIZED_DEPARTMENTS = ['tech', 'marketing', 'sales', 'hr', 'finance', 'growth', 'operations']

const DEPARTMENT_RULES = {
  tech: 'Handles product bugs, system crashes, API integration errors, website downtime, and database issues.',
  marketing: 'Handles campaign inquiries, brand partnerships, event promotions, newsletter subscriptions, and social media queries.',
  sales: 'Handles enterprise pricing, bulk licenses, product demos, quote requests, and client onboarding queries.',
  hr: 'Handles job applications, resume reviews, internship inquiries, and internal employee policy questions.',
  finance: 'Handles subscription billing, invoice requests, refund processing, payment failures, and payout issues.',
  growth: 'Handles user acquisition strategies, SEO recommendations, affiliate program signups, and expansion feedback.',
  operations: 'Handles workspace provisioning, access permission requests, security compliance audits, and general administrative queries.'
}

const getCleanTitle = (title = '', desc = '', name = '') => {
  if (!title) return 'Support Ticket'
  if (/^Contact Inquiry from/i.test(title.trim())) {
    const clean = (desc || '').split(/---|Contact & Metadata/i)[0].trim()
    if (clean && clean !== 'No description provided.' && clean.length > 5) {
      return clean.length > 60 ? clean.slice(0, 60) + '...' : clean
    }
    return 'Inquiry from ' + (title.replace(/^Contact Inquiry from/i, '').trim() || name || 'Visitor')
  }
  return title
}

const getCleanDescriptionSnippet = (desc = '') => {
  if (!desc) return 'No description provided.'
  const clean = desc.split(/---|Contact & Metadata/i)[0].trim()
  return clean || desc
}

export default function RouteDrawer({ ticket, allStaff = [], onClose, onRoute, submitting }) {
  const [department, setDepartment] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  useEffect(() => {
    if (ticket) {
      setDepartment(ticket.assignedDepartment || '')
      setAssigneeId(ticket.assignedToId ? String(ticket.assignedToId) : '')
    }
  }, [ticket])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    if (ticket) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
  }, [ticket, onClose])

  const handleDepartmentChange = (e) => {
    const newDept = e.target.value
    setDepartment(newDept)
    // Reset assignee if they don't match the new department
    if (newDept && assigneeId) {
      const selectedStaff = allStaff.find(u => String(u.id) === assigneeId)
      if (selectedStaff) {
        const staffDept = (selectedStaff.department || selectedStaff.role || '').trim().toLowerCase()
        if (staffDept !== newDept) {
          setAssigneeId('')
        }
      }
    }
  }

  const handleAssigneeChange = (e) => {
    const val = e.target.value
    setAssigneeId(val)
    if (val) {
      const selectedStaff = allStaff.find(u => String(u.id) === val)
      if (selectedStaff) {
        const staffDept = (selectedStaff.department || selectedStaff.role || '').trim().toLowerCase()
        if (staffDept && staffDept !== 'admin' && staffDept !== 'support') {
          setDepartment(staffDept)
        }
      }
    }
  }

  const departments = useMemo(() => {
    const fromStaff = allStaff
      .map((u) => (u.department || u.role || '').trim().toLowerCase())
      .filter((d) => d && d !== 'admin' && d !== 'support')
    return [...new Set([...AUTHORIZED_DEPARTMENTS, ...fromStaff])]
  }, [allStaff])

  const candidates = useMemo(() => {
    if (!department) return allStaff
    return allStaff.filter((u) => (u.department || u.role || '').trim().toLowerCase() === department)
  }, [allStaff, department])

  if (!ticket) return null

  return createPortal(
    <div className="relative z-[99999]" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in cursor-pointer z-0" 
        onClick={onClose} 
      />

      {/* Modal content */}
      <div className="fixed inset-0 z-10 flex items-center justify-center overflow-hidden p-4 sm:p-6">
        <div className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg animate-scale-in border border-slate-100/50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <CornerUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Route Query</h3>
                <p className="text-xs text-slate-500 font-semibold">{ticket.ticketNumber || ('#TCK-' + ticket.id)}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" 
              aria-label="Close routing modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="bg-slate-50/40 px-6 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Ticket Info Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                {getCleanTitle(ticket.title, ticket.description, ticket.createdBy?.name || ticket.externalUserName)}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {getCleanDescriptionSnippet(ticket.description)}
              </p>
              <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                <span className={'px-2.5 py-0.5 rounded-full text-[11px] font-bold border ' + (ticket.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' : ticket.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' : ticket.priority === 'Medium' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200')}>{ticket.priority || 'Medium'}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-300">{ticket.status}</span>
                {ticket.externalUserEmail && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-700">Website Query</span>}
              </div>
              {ticket.externalUserEmail && (
                <p className="pt-2 text-xs text-slate-600 font-medium">
                  <strong>Visitor:</strong> {ticket.externalUserName || '—'} - {ticket.externalUserEmail}
                </p>
              )}
            </div>

            {/* Department Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Route to Department *</label>
              <select
                value={department}
                onChange={handleDepartmentChange}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 capitalize bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
              </select>
            </div>

            {/* Assignee Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Assign to Employee <span className="text-slate-400 font-medium">(optional — leave blank to route to whole team)</span>
              </label>
              <select
                value={assigneeId}
                onChange={handleAssigneeChange}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="">-- Anyone on the team --</option>
                {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}{u.designation ? ' · ' + u.designation : ''}</option>)}
              </select>
            </div>

            {/* Routing Rules & Guidelines */}
            <div className="space-y-2">
              {/* Dynamic rule display */}
              {department && DEPARTMENT_RULES[department.toLowerCase()] && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-800 flex items-start gap-2.5 animate-fade-in">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                  <div>
                    <span className="font-bold block mb-0.5 capitalize">{department} Routing Rule:</span>
                    <span>{DEPARTMENT_RULES[department.toLowerCase()]}</span>
                  </div>
                </div>
              )}

              {/* Warnings & Notices */}
              {!department && (
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold block mb-0.5">Routing Notice:</span>
                    <span>Choose a department. The query status will be updated to <strong>In Progress</strong> and notifications will be sent to the team.</span>
                  </div>
                </div>
              )}

              {/* Extra urgent rule validation check */}
              {ticket.priority === 'Urgent' && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span className="font-bold block mb-0.5">Urgent Routing Rule:</span>
                    <span>This is an urgent ticket. Priority response is required; please verify assignee availability before routing.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-5 bg-white">
            <button 
              onClick={onClose} 
              className="px-4 py-2.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => onRoute(department, assigneeId)}
              disabled={submitting || !department.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> {submitting ? 'Routing...' : 'Route to ' + (department || 'Team')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}