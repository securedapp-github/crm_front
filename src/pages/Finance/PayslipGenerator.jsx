import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getUsersForPayslip, generatePayslip, getAllPayslips, deletePayslip, updatePayslip, getLeavePreviewForPayslip } from '../../api/payslip'
import { getEmployeeById } from '../../api/employee'
import { invoiceApi } from '@/invoice/api/invoiceClient'
import { exportToCSV } from '@/invoice/lib/exportUtils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { printPayslipPDF, downloadPayslipPDF } from '@/utils/pdfManager'
import PayslipPDFContent from './PayslipPDFContent'
import { toast } from 'sonner'
import { getFullFileUrl } from '@/invoice/lib/invoiceUtils'
import { Download, ArrowLeft, Save, Building2, Search, Trash2, Edit2, FileSpreadsheet, Eye } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function PayslipGenerator() {
  const [tab, setTab] = useState('generate')
  const [users, setUsers] = useState([])
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [historySearch, setHistorySearch] = useState('')
  const [historyMonth, setHistoryMonth] = useState('all')
  const [historyYear, setHistoryYear] = useState('all')
  const [editingPayslipId, setEditingPayslipId] = useState(null)
  
  const [leaveSummary, setLeaveSummary] = useState(null)
  const [leaveLoading, setLeaveLoading] = useState(false)

  const [form, setForm] = useState({
    userId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    basicPay: '0', hra: '0', conveyance: '0', specialAllowance: '0',
    providentFund: '0', professionalTax: '0', tds: '0', remarks: '',
    employeeId: '', designation: '', department: '',
    bankName: '', accountNumber: '', ifscCode: '', panNumber: '',
    uan: '', pfNumber: '',
    companyName: '', addressLine1: '', city: '', state: '', pincode: '',
    leaveDeduction: '0'
  })
  const [submitting, setSubmitting] = useState(false)
  const skipAutofillRef = useRef(false)

  const { data: businessList } = useQuery({
    queryKey: ['business'],
    queryFn: () => invoiceApi.entities.Business.list()
  })
  const business = businessList?.[0] || null
  const queryClient = useQueryClient()

  const [settingsForm, setSettingsForm] = useState({
    company_name: '', logo_url: '',
    address_line1: '', address_line2: '', city: '', state: '', pincode: '', country: 'India',
  })

  useEffect(() => {
    if (business) {
      setSettingsForm(prev => ({
        company_name: business.company_name || '',
        logo_url: business.logo_url || '',
        address_line1: business.address_line1 || '',
        address_line2: business.address_line2 || '',
        city: business.city || '',
        state: business.state || '',
        pincode: business.pincode || '',
        country: business.country || 'India',
      }))
    }
  }, [business])

  const saveSettingsMutation = useMutation({
    mutationFn: (dataToSave) => {
      if (business?.id) return invoiceApi.entities.Business.update(business.id, dataToSave);
      return invoiceApi.entities.Business.create(dataToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success('Company settings saved successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save company settings');
    }
  })

  const handleSettingsLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { file_url } = await invoiceApi.integrations.Core.UploadFile({ file });
      setSettingsForm(prev => ({ ...prev, logo_url: file_url }));
    } catch (err) {
      toast.error('Failed to upload logo');
    }
  }

  useEffect(() => {
    getUsersForPayslip().then(res => setUsers(res.data.data || []))
    fetchPayslips()
  }, [])

  useEffect(() => {
    if (business) {
      setForm(prev => ({
        ...prev,
        companyName: business.company_name || '',
        addressLine1: business.address_line1 || '',
        city: business.city || '',
        state: business.state || '',
        pincode: business.pincode || '',
      }))
    }
  }, [business])

  const calculateBreakdown = (basicPay) => {
    const bp = parseFloat(basicPay || 0);
    const hra = (bp * 0.5).toFixed(2);
    const conveyance = '1600';
    const pf = Math.min(bp * 0.12, 1800).toFixed(2);
    const pt = bp > 15000 ? '200' : '0';
    return { hra, conveyance, providentFund: pf, professionalTax: pt };
  };

  useEffect(() => {
    if (skipAutofillRef.current) {
      skipAutofillRef.current = false;
      return;
    }
    if (form.userId) {
      getEmployeeById(form.userId)
        .then(res => {
          const emp = res.data.data;
          if (emp) {
            const bp = emp.basicPay?.toString() || '0';
            const auto = calculateBreakdown(bp);
            setForm(prev => ({
              ...prev,
              employeeId: emp.employeeId || '',
              designation: emp.designation || '',
              department: emp.department || '',
              basicPay: bp,
              ...auto,
              bankName: emp.bankName || '',
              accountNumber: emp.accountNumber || '',
              ifscCode: emp.ifscCode || '',
              panNumber: emp.panNumber || '',
              uan: emp.uan || '',
              pfNumber: emp.pfNumber || ''
            }));
          }
        })
        .catch(err => {
          console.error('Failed to load employee details for payslip:', err);
        });
    } else {
      // Clear employee details when userId is empty
      setForm(prev => ({
        ...prev,
        employeeId: '',
        designation: '',
        department: '',
        basicPay: '0',
        hra: '0',
        conveyance: '0',
        specialAllowance: '0',
        providentFund: '0',
        professionalTax: '0',
        tds: '0',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        panNumber: '',
        uan: '',
        pfNumber: ''
      }));
    }
  }, [form.userId])

  useEffect(() => {
    if (form.userId && form.month && form.year) {
      setLeaveLoading(true);
      getLeavePreviewForPayslip(form.userId, form.month, form.year)
        .then(res => {
          const data = res.data.data;
          setLeaveSummary(data);
          
          if (data && data.leaveDays > 0) {
            const bp = parseFloat(form.basicPay || 0);
            const deduct = (data.leaveDays * (bp / 26)).toFixed(2);
            setForm(prev => ({ ...prev, leaveDeduction: deduct }));
          } else {
            setForm(prev => ({ ...prev, leaveDeduction: '0' }));
          }
        })
        .catch(err => {
          console.error('Failed to fetch leave preview', err);
          setLeaveSummary(null);
        })
        .finally(() => setLeaveLoading(false));
    } else {
      setLeaveSummary(null);
    }
  }, [form.userId, form.month, form.year, form.basicPay])

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
      const payload = {
        userId: form.userId,
        month: form.month,
        year: form.year,
        basicPay: parseFloat(form.basicPay || 0),
        hra: parseFloat(form.hra || 0),
        conveyance: parseFloat(form.conveyance || 0),
        specialAllowance: parseFloat(form.specialAllowance || 0),
        providentFund: parseFloat(form.providentFund || 0),
        professionalTax: parseFloat(form.professionalTax || 0),
        tds: parseFloat(form.tds || 0),
        remarks: '',
        leaveDays: leaveSummary?.leaveDays || 0,
        leaveDeduction: parseFloat(form.leaveDeduction || 0),
        leaveDates: leaveSummary?.leaveDates || null
      }
      
      let res;
      if (editingPayslipId) {
        res = await updatePayslip(editingPayslipId, payload)
        toast.success(res.data.message || 'Payslip updated!')
      } else {
        res = await generatePayslip(payload)
        toast.success(res.data.message || 'Payslip generated!')
      }
      
      fetchPayslips()
      setEditingPayslipId(null)
      setTab('history')
      // Reset form: advance month/year to next month for convenience
      const monthNum = parseInt(form.month, 10);
      const yearNum = parseInt(form.year, 10);
      const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
      const nextYear = monthNum === 12 ? yearNum + 1 : yearNum;
      setForm(prev => ({
        ...prev,
        userId: '',
        remarks: '',
        month: nextMonth,
        year: nextYear,
      }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save payslip')
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this payslip?')) return
    await deletePayslip(id)
    fetchPayslips()
  }

  const handlePrintPayslip = (payslipData, targetUser) => {
    const merged = {
      ...payslipData,
      uan: payslipData.uan || targetUser?.uan || '',
      pfNumber: payslipData.pfNumber || targetUser?.pfNumber || ''
    };
    printPayslipPDF(merged, targetUser, business);
  }

  const handleDownloadPayslip = (payslipData, targetUser) => {
    const merged = {
      ...payslipData,
      uan: payslipData.uan || targetUser?.uan || '',
      pfNumber: payslipData.pfNumber || targetUser?.pfNumber || ''
    };
    downloadPayslipPDF(merged, targetUser, business);
  }

  const handleEditPayslip = (ps) => {
    setEditingPayslipId(ps.id);
    skipAutofillRef.current = true;
    setForm({
      userId: ps.userId || '',
      month: ps.month || new Date().getMonth() + 1,
      year: ps.year || new Date().getFullYear(),
      basicPay: ps.basicPay?.toString() || '0',
      hra: ps.hra?.toString() || '0',
      conveyance: ps.conveyance?.toString() || '0',
      specialAllowance: ps.specialAllowance?.toString() || '0',
      providentFund: ps.providentFund?.toString() || '0',
      professionalTax: ps.professionalTax?.toString() || '0',
      tds: ps.tds?.toString() || '0',
      remarks: ps.remarks || '',
      employeeId: ps.user?.employeeId || '',
      designation: ps.user?.designation || '',
      department: ps.user?.department || '',
      bankName: ps.user?.bankName || '',
      accountNumber: ps.user?.accountNumber || '',
      ifscCode: ps.user?.ifscCode || '',
      panNumber: ps.user?.panNumber || '',
      uan: ps.user?.uan || '',
      pfNumber: ps.user?.pfNumber || '',
      companyName: business?.company_name || '',
      addressLine1: business?.address_line1 || '',
      city: business?.city || '',
      state: business?.state || '',
      pincode: business?.pincode || ''
    });
    setTab('generate');
    toast.success('Loaded payslip details for editing.');
  }

  const handleExportCSV = (list) => {
    exportToCSV(list, [
      { label: 'Employee', accessor: (r) => r.user?.name || 'Unknown' },
      { label: 'Period', accessor: (r) => `${MONTHS[r.month - 1]} ${r.year}` },
      { label: 'Basic Pay', accessor: (r) => r.basicPay },
      { label: 'HRA', accessor: (r) => r.hra },
      { label: 'Conveyance', accessor: (r) => r.conveyance },
      { label: 'Special Allowance', accessor: (r) => r.specialAllowance },
      { label: 'PF', accessor: (r) => r.providentFund },
      { label: 'Professional Tax', accessor: (r) => r.professionalTax },
      { label: 'TDS', accessor: (r) => r.tds },
      { label: 'Net Pay', accessor: (r) => r.netPay },
      { label: 'Remarks', accessor: (r) => r.remarks || '' }
    ], `payslip_history_${new Date().toISOString().slice(0, 10)}`);
  }

  const filteredPayslips = payslips.filter(ps => {
    const matchesSearch = !historySearch || 
      ps.user?.name?.toLowerCase().includes(historySearch.toLowerCase()) ||
      ps.user?.email?.toLowerCase().includes(historySearch.toLowerCase()) ||
      ps.user?.employeeId?.toLowerCase().includes(historySearch.toLowerCase()) ||
      ps.user?.department?.toLowerCase().includes(historySearch.toLowerCase()) ||
      ps.user?.designation?.toLowerCase().includes(historySearch.toLowerCase())
    
    const matchesMonth = historyMonth === 'all' || ps.month === parseInt(historyMonth)
    const matchesYear = historyYear === 'all' || ps.year === parseInt(historyYear)

    return matchesSearch && matchesMonth && matchesYear
  })

  const selectedUser = users.find(u => u.id == form.userId)
  const totalEarnings = parseFloat(form.basicPay || 0) + parseFloat(form.hra || 0) + parseFloat(form.conveyance || 0) + parseFloat(form.specialAllowance || 0)
  const totalDeductions = parseFloat(form.providentFund || 0) + parseFloat(form.professionalTax || 0) + parseFloat(form.tds || 0)
  const netPay = totalEarnings - totalDeductions

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Payslip Generator</h2>
            <p className="text-sm text-slate-500 mt-1">Generate and manage monthly salary slips.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('generate')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'generate' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'}`}>
          Generate Payslip
        </button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'}`}>
          Payslip History
        </button>
        <button onClick={() => setTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'settings' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'}`}>
          Settings
        </button>
      </div>

      {tab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 max-h-[calc(100vh-140px)] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">New Payslip Details</h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Company Details</h3>
                {business && business.company_name ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-sm space-y-1 border border-slate-100 mb-4">
                    <p className="font-semibold text-slate-800">{business.company_name}</p>
                    {business.address_line1 && (
                      <p className="text-slate-500">
                        {business.address_line1}{business.city ? `, ${business.city}` : ''}{business.state ? `, ${business.state}` : ''} {business.pincode}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 pt-1">Company details can be updated in the Settings tab.</p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl text-sm text-center text-slate-500 border border-slate-100 border-dashed mb-4">
                    No business settings configured. Please update in the Settings tab.
                  </div>
                )}
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Employee Details</h3>
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
                <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Earnings (₹)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Basic Pay (₹)</label>
                    <input type="number" step="0.01" value={form.basicPay} onChange={e => {
                      const bp = e.target.value;
                      const auto = calculateBreakdown(bp);
                      setForm(prev => ({ ...prev, basicPay: bp, ...auto }));
                    }} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">HRA (₹)</label>
                    <input type="number" step="0.01" value={form.hra} onChange={e => setForm({ ...form, hra: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Conveyance (₹)</label>
                    <input type="number" step="0.01" value={form.conveyance} onChange={e => setForm({ ...form, conveyance: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Special Allowance (₹)</label>
                    <input type="number" step="0.01" value={form.specialAllowance} onChange={e => setForm({ ...form, specialAllowance: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Deductions (₹)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Provident Fund (₹)</label>
                    <input type="number" step="0.01" value={form.providentFund} onChange={e => setForm({ ...form, providentFund: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Professional Tax (₹)</label>
                    <input type="number" step="0.01" value={form.professionalTax} onChange={e => setForm({ ...form, professionalTax: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Income Tax / TDS (₹)</label>
                    <input type="number" step="0.01" value={form.tds} onChange={e => setForm({ ...form, tds: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Leave Deduction (₹)</label>
                    <input type="number" step="0.01" value={form.leaveDeduction} onChange={e => setForm({ ...form, leaveDeduction: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>

              {leaveLoading && <div className="text-sm text-indigo-600 font-medium py-2">Calculating leaves...</div>}
              {leaveSummary && leaveSummary.leaveDays > 0 && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-4 text-sm">
                  <p className="font-semibold text-amber-800">Leave Deduction Applied</p>
                  <p className="text-amber-700">
                    Found <strong>{leaveSummary.leaveDays}</strong> approved leave days in this month. 
                    A deduction of <strong>₹{form.leaveDeduction}</strong> has been auto-calculated.
                  </p>
                </div>
              )}

              <div className="pt-2">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b pb-2">Bank & PF Details</h3>
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
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">UAN (Universal Account Number)</label>
                    <input type="text" value={form.uan} onChange={e => setForm({ ...form, uan: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">PF Account Number</label>
                    <input type="text" value={form.pfNumber} onChange={e => setForm({ ...form, pfNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </div>



              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <div className="text-sm space-y-0.5">
                  <div className="text-slate-500">Total Earnings: <span className="font-semibold text-slate-700">₹{totalEarnings.toFixed(2)}</span></div>
                  <div className="text-slate-500">Total Deductions: <span className="font-semibold text-slate-700">₹{totalDeductions.toFixed(2)}</span></div>
                  <div><span className="text-slate-800 font-semibold">Net Pay: </span>
                  <span className="font-bold text-lg text-emerald-600">₹{netPay.toFixed(2)}</span></div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                    {submitting ? 'Saving...' : (editingPayslipId ? 'Update Payslip' : 'Save Payslip')}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="hidden lg:block sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 uppercase">
                Live Preview
              </h3>
              <div className="flex gap-1.5">
                <button onClick={() => handlePrintPayslip(form, selectedUser)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={() => handleDownloadPayslip(form, selectedUser)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
              </div>
            </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Payslip History</h2>
            <button
              onClick={() => handleExportCSV(filteredPayslips)}
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
              title="Export CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by employee name or email..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={historyMonth}
                onChange={e => setHistoryMonth(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Months</option>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select
                value={historyYear}
                onChange={e => setHistoryYear(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Years</option>
                {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : filteredPayslips.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No payslips found.</div>
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
                  {filteredPayslips.map(ps => (
                    <tr key={ps.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{ps.user?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-slate-600">{MONTHS[ps.month - 1]} {ps.year}</td>
                      <td className="px-4 py-3 text-slate-600">₹{parseFloat(ps.basicPay).toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium text-emerald-600">₹{parseFloat(ps.netPay).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => handlePrintPayslip(ps, ps.user)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Print
                        </button>
                        <button onClick={() => handleDownloadPayslip(ps, ps.user)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition inline-flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button onClick={() => handleEditPayslip(ps)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition inline-flex items-center gap-1">
                          <Edit2 className="w-3.5 h-3.5" /> Edit
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

      {tab === 'settings' && (
        <div className="max-w-2xl">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Company Settings</h2>
              <button
                onClick={() => saveSettingsMutation.mutate(settingsForm)}
                disabled={saveSettingsMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="relative">
                  {settingsForm.logo_url ? (
                    <img src={getFullFileUrl(settingsForm.logo_url)} alt="Company Logo" className="h-16 w-16 rounded-xl object-contain border" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center border border-dashed text-xs text-slate-400">
                      Logo
                    </div>
                  )}
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleSettingsLogoUpload} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Company Logo</p>
                  <p className="text-xs text-slate-400">Click to upload (PNG, JPG)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Company Name</label>
                  <input type="text" value={settingsForm.company_name} onChange={e => setSettingsForm({ ...settingsForm, company_name: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Address Line 1</label>
                  <input type="text" value={settingsForm.address_line1} onChange={e => setSettingsForm({ ...settingsForm, address_line1: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Address Line 2</label>
                  <input type="text" value={settingsForm.address_line2} onChange={e => setSettingsForm({ ...settingsForm, address_line2: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">City</label>
                  <input type="text" value={settingsForm.city} onChange={e => setSettingsForm({ ...settingsForm, city: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">State</label>
                  <input type="text" value={settingsForm.state} onChange={e => setSettingsForm({ ...settingsForm, state: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Pincode</label>
                  <input type="text" value={settingsForm.pincode} onChange={e => setSettingsForm({ ...settingsForm, pincode: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Country</label>
                  <input type="text" value={settingsForm.country} onChange={e => setSettingsForm({ ...settingsForm, country: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
