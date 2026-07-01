import { useEffect, useState } from 'react'
import { getUsersForPayslip, generatePayslip, getAllPayslips, deletePayslip } from '../../api/payslip'
import { invoiceApi } from '@/invoice/api/invoiceClient'
import { useQuery } from '@tanstack/react-query'
import { printPayslipPDF } from '@/invoice/lib/printUtils'
import PayslipPDFContent from './PayslipPDFContent'
import { toast } from 'sonner'
import { Download } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function PayslipGenerator() {
  const [tab, setTab] = useState('generate')
  const [users, setUsers] = useState([])
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    userId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    basicPay: '0', allowances: '0', deductions: '0', remarks: '',
    employeeId: '', designation: '', department: '',
    bankName: '', accountNumber: '', ifscCode: '', panNumber: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const { data: businessList } = useQuery({
    queryKey: ['business'],
    queryFn: () => invoiceApi.entities.Business.list()
  })
  const business = businessList?.[0] || null

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
    try {
      const res = await generatePayslip({
        ...form,
        basicPay: parseFloat(form.basicPay || 0),
        allowances: parseFloat(form.allowances || 0),
        deductions: parseFloat(form.deductions || 0),
      })
      toast.success(res.data.message || 'Payslip generated!')
      fetchPayslips()
      // reset form
      setForm({ ...form, userId: '', basicPay: '0', allowances: '0', deductions: '0', remarks: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate payslip')
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this payslip?')) return
    await deletePayslip(id)
    fetchPayslips()
  }

  const handleDownload = async (payslipData, targetUser) => {
    toast.info('Generating PDF...');
    try {
      printPayslipPDF(payslipData, targetUser, business);
      toast.success('PDF generated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  }

  const selectedUser = users.find(u => u.id === form.userId)
  const netPay = (parseFloat(form.basicPay || 0) + parseFloat(form.allowances || 0)) - parseFloat(form.deductions || 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">Payslip Generator</h1>
          <p className="text-sm text-slate-500 mt-1">Generate and manage monthly salary slips.</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('generate')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'generate' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
          Generate Payslip
        </button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'history' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
          Payslip History
        </button>
      </div>

      {tab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">New Payslip Details</h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Employee</label>
                  <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="">Select employee...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Employee ID</label>
                  <input type="text" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. EMP-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Designation</label>
                  <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Developer" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Department</label>
                  <input type="text" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Engineering" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Month</label>
                  <select value={form.month} onChange={e => setForm({ ...form, month: parseInt(e.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Year</label>
                  <input type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })} min={2020} max={2050} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Salary Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Basic Pay ($)</label>
                    <input type="number" step="0.01" value={form.basicPay} onChange={e => setForm({ ...form, basicPay: e.target.value })} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Allowances ($)</label>
                    <input type="number" step="0.01" value={form.allowances} onChange={e => setForm({ ...form, allowances: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Deductions ($)</label>
                    <input type="number" step="0.01" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Bank Name</label>
                    <input type="text" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Account Number</label>
                    <input type="text" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">IFSC Code</label>
                    <input type="text" value={form.ifscCode} onChange={e => setForm({ ...form, ifscCode: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">PAN Number</label>
                    <input type="text" value={form.panNumber} onChange={e => setForm({ ...form, panNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Remarks (optional)</label>
                <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <div className="text-sm">
                  <span className="text-slate-500">Net Pay: </span>
                  <span className="font-bold text-lg text-emerald-600">${netPay.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleDownload(form, selectedUser)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                    {submitting ? 'Saving...' : 'Save Payslip'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="hidden lg:block sticky top-4">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1.5 uppercase">
              Live Preview
            </h3>
            <div className="overflow-auto max-h-[calc(100vh-140px)] rounded-2xl">
              <div className="scale-[0.8] origin-top-left w-[125%]">
                <PayslipPDFContent data={form} user={selectedUser} business={business} />
              </div>
            </div>
          </div>
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
                  <tr className="bg-slate-50 text-left text-slate-600 border-b">
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Basic</th>
                    <th className="px-4 py-3 font-medium">Net Pay</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payslips.map(ps => (
                    <tr key={ps.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{ps.user?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-slate-600">{MONTHS[ps.month - 1]} {ps.year}</td>
                      <td className="px-4 py-3 text-slate-600">${parseFloat(ps.basicPay).toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium text-emerald-600">${parseFloat(ps.netPay).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => handleDownload(ps, ps.user)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition inline-flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button onClick={() => handleDelete(ps.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition">
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
