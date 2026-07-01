import { useEffect, useState } from 'react'
import { createLeaveRequest, getMyLeaves } from '../../api/leave'

export default function SalesLeave() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '', type: 'other' })
  const [submitting, setLeaveSubmitting] = useState(false)
  const [message, setLeaveMsg] = useState(null)

  const fetchLeaves = async () => {
    setLoading(true)
    try {
      const res = await getMyLeaves()
      setLeaves(res.data?.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaves()
  }, [])

  const handleLeaveSubmit = async (e) => {
    e.preventDefault()
    setLeaveSubmitting(true)
    setLeaveMsg(null)
    try {
      await createLeaveRequest(form)
      setLeaveMsg({ type: 'success', text: 'Leave request submitted successfully!' })
      setLeaveForm({ startDate: '', endDate: '', reason: '', type: 'other' })
      fetchLeaves()
    } catch (err) {
      setLeaveMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit leave request' })
    } finally {
      setLeaveSubmitting(false)
    }
  }

  const leaveStatusBadge = (status) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200'
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Leave Requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Request new leaves and track approval status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Submit Leave Request */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Request Leave</h2>
          {message && (
            <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleLeaveSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setLeaveForm({ ...form, startDate: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">End Date</label>
                <input type="date" value={form.endDate} onChange={e => setLeaveForm({ ...form, endDate: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Type</label>
              <select value={form.type} onChange={e => setLeaveForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="sick">Sick Leave</option>
                <option value="vacation">Vacation</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Reason</label>
              <textarea value={form.reason} onChange={e => setLeaveForm({ ...form, reason: e.target.value })} required rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="State reason for leave..." />
            </div>
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Leave Status History */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Leave Requests Status</h2>
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading leave requests...</div>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Dates</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                        No leave requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    leaves.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">
                          <div className="font-semibold text-xs">{l.startDate}</div>
                          <div className="text-[10px] text-slate-400">to {l.endDate}</div>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600 text-xs">{l.type}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          <div className="max-w-[180px] truncate" title={l.reason}>{l.reason}</div>
                          {l.adminNote && (
                            <div className="text-[10px] text-red-500 mt-1 italic" title={l.adminNote}>
                              Note: {l.adminNote}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${leaveStatusBadge(l.status)}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
