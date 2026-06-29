import { useEffect, useState } from 'react'
import { getUsersForPayslip, generatePayslip, getAllPayslips, deletePayslip } from '../../api/payslip'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function PayslipGenerator() {
  const [tab, setTab] = useState('generate')
  const [users, setUsers] = useState([])
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    userId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    basicPay: '', allowances: '0', deductions: '0', remarks: ''
  })
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getUsersForPayslip().then(res => setUsers(res.data.data || []))
    fetchPayslips()
  }, [])

  const fetchPayslips = async () => {
    setLoading(true)
    try {
      const res = await getAllPayslips()
      setPayslips(res.data.data || [])
    } catch { setPayslips([]) }
    setLoading(false)
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await generatePayslip({
        ...form,
        basicPay: parseFloat(form.basicPay),
        allowances: parseFloat(form.allowances),
        deductions: parseFloat(form.deductions),
      })
      setMessage({ type: 'success', text: res.data.message || 'Payslip generated!' })
      fetchPayslips()
      setForm({ ...form, userId: '', basicPay: '', allowances: '0', deductions: '0', remarks: '' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to generate payslip' })
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this payslip?')) return
    await deletePayslip(id)
    fetchPayslips()
  }

  const netPay = (parseFloat(form.basicPay || 0) + parseFloat(form.allowances || 0)) - parseFloat(form.deductions || 0)

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-8">
        <h1 className="text-xl font-bold text-slate-800">Payslip Generator</h1>
        <p className="mt-1 text-sm text-slate-500">Generate and manage monthly salary slips for employees.</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab('generate')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'generate' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
          Generate Payslip
        </button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'history' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
          Payslip History
        </button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {tab === 'generate' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">New Payslip</h2>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
              <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select employee...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                <select value={form.month} onChange={e => setForm({ ...form, month: parseInt(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <input type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} min={2020} max={2050} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Basic Pay ($)</label>
              <input type="number" step="0.01" value={form.basicPay} onChange={e => setForm({ ...form, basicPay: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Allowances ($)</label>
                <input type="number" step="0.01" value={form.allowances} onChange={e => setForm({ ...form, allowances: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deductions ($)</label>
                <input type="number" step="0.01" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <span className="text-slate-600">Net Pay: </span>
              <span className="font-semibold text-slate-800">${netPay.toFixed(2)}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (optional)</label>
              <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
              {submitting ? 'Generating...' : 'Generate Payslip'}
            </button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Payslip History</h2>
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No payslips generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Basic</th>
                    <th className="px-4 py-3 font-medium">Allowances</th>
                    <th className="px-4 py-3 font-medium">Deductions</th>
                    <th className="px-4 py-3 font-medium">Net Pay</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payslips.map(ps => (
                    <tr key={ps.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800">{ps.user?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-slate-600">{MONTHS[ps.month - 1]} {ps.year}</td>
                      <td className="px-4 py-3 text-slate-600">${parseFloat(ps.basicPay).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-600">${parseFloat(ps.allowances).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-600">${parseFloat(ps.deductions).toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">${parseFloat(ps.netPay).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(ps.id)} className="px-3 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
