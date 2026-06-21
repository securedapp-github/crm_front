import { useEffect, useState } from 'react'
import { getMe } from '../../api/auth'
import { createLeaveRequest, getMyLeaves, getAllLeaves, approveLeave, rejectLeave, assignLeave } from '../../api/leave'

export default function HRTeam() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('dashboard')

  useEffect(() => {
    getMe().then(res => {
      if (res.data?.authenticated) setUser(res.data.user)
    })
  }, [])

  if (!user) return null

  const isAdmin = user.role === 'admin'

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
        <h1 className="text-xl font-bold text-slate-800">HR Team</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin ? 'Manage employee leave requests and attendance.' : 'Submit and track your leave requests.'}
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
          Leave Dashboard
        </button>
        {isAdmin && (
          <button onClick={() => setTab('assign')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'assign' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
            Assign Leave
          </button>
        )}
        {!isAdmin && (
          <button onClick={() => setTab('request')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'request' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
            Request Leave
          </button>
        )}
      </div>

      {tab === 'dashboard' && <LeaveDashboard user={user} isAdmin={isAdmin} />}
      {tab === 'request' && !isAdmin && <LeaveRequestForm user={user} />}
      {tab === 'assign' && isAdmin && <AssignLeaveForm />}
    </div>
  )
}

function LeaveDashboard({ user, isAdmin }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchLeaves = async () => {
    setLoading(true)
    try {
      const res = isAdmin ? await getAllLeaves(filter !== 'all' ? { status: filter } : {}) : await getMyLeaves()
      setLeaves(res.data.data || [])
    } catch { setLeaves([]) }
    setLoading(false)
  }

  useEffect(() => { fetchLeaves() }, [isAdmin, filter])

  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  }

  const handleApprove = async (id) => {
    await approveLeave(id, {})
    fetchLeaves()
  }

  const handleReject = async (id) => {
    const note = prompt('Reason for rejection (optional):')
    await rejectLeave(id, { adminNote: note || null })
    fetchLeaves()
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} color="text-slate-800" />
        <StatCard label="Pending" value={stats.pending} color="text-amber-600" />
        <StatCard label="Approved" value={stats.approved} color="text-emerald-600" />
        <StatCard label="Rejected" value={stats.rejected} color="text-red-600" />
      </div>

      {isAdmin && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filter === s ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-200'}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No leave requests found.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                {isAdmin && <th className="px-4 py-3 font-medium">Employee</th>}
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaves.map(leave => (
                <tr key={leave.id} className="hover:bg-slate-50">
                  {isAdmin && <td className="px-4 py-3 text-slate-800">{leave.user?.name || 'Unknown'}</td>}
                  <td className="px-4 py-3 capitalize text-slate-600">{leave.type}</td>
                  <td className="px-4 py-3 text-slate-600">{leave.startDate}</td>
                  <td className="px-4 py-3 text-slate-600">{leave.endDate}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{leave.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(leave.status)}`}>
                      {leave.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {leave.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(leave.id)} className="px-3 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                            Approve
                          </button>
                          <button onClick={() => handleReject(leave.id)} className="px-3 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LeaveRequestForm({ user }) {
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '', type: 'other' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      await createLeaveRequest(form)
      setMessage({ type: 'success', text: 'Leave request submitted!' })
      setForm({ startDate: '', endDate: '', reason: '', type: 'other' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to submit' })
    }
    setSubmitting(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Request Leave</h2>
      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="sick">Sick Leave</option>
            <option value="vacation">Vacation</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
          <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  )
}

function AssignLeaveForm() {
  const [form, setForm] = useState({ userId: '', startDate: '', endDate: '', reason: '', type: 'other', status: 'approved' })
  const [users, setUsers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    import('../../api/payslip').then(mod => {
      mod.getUsersForPayslip().then(res => setUsers(res.data.data || []))
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      await assignLeave(form)
      setMessage({ type: 'success', text: 'Leave assigned successfully!' })
      setForm({ userId: '', startDate: '', endDate: '', reason: '', type: 'other', status: 'approved' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to assign leave' })
    }
    setSubmitting(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 max-w-lg">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Assign Leave to Employee</h2>
      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
          <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Select employee...</option>
            {users.filter(u => u.role !== 'sales').map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="sick">Sick Leave</option>
            <option value="vacation">Vacation</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
          <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
          {submitting ? 'Assigning...' : 'Assign Leave'}
        </button>
      </form>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function statusBadge(status) {
  switch (status) {
    case 'approved': return 'bg-emerald-50 text-emerald-700'
    case 'rejected': return 'bg-red-50 text-red-700'
    case 'pending': return 'bg-amber-50 text-amber-700'
    default: return 'bg-slate-50 text-slate-600'
  }
}
