import { useEffect, useState } from 'react'
import { getMe } from '../../api/auth'
import { createLeaveRequest, getMyLeaves, getAllLeaves, approveLeave, rejectLeave, assignLeave } from '../../api/leave'
import { getEmployees, getEmployeeById, createEmployee, updateEmployee, toggleEmployeeStatus } from '../../api/employee'
import { Search, Plus, Edit2, User as UserIcon, Calendar, CreditCard, X, Eye, Phone, MapPin, Briefcase, Heart, Shield, DollarSign, Key, FileText, Home, Globe, Download, FileSpreadsheet } from 'lucide-react'
import { printPayslipPDF, downloadPayslipPDF } from '@/utils/pdfManager'
import { invoiceApi } from '@/invoice/api/invoiceClient'
import { toast } from 'sonner'

export default function HRTeam() {
  const [user, setUser] = useState(null)
  const [mainTab, setMainTab] = useState('employees') // 'employees' or 'leaves' or 'profile'
  const [leaveTab, setLeaveTab] = useState('dashboard') // nested tab for leaves

  useEffect(() => {
    getMe().then(res => {
      if (res.data?.authenticated) {
        const u = res.data.user
        setUser(u)
        // If not admin, default to profile or leaves
        if (u.role !== 'admin') {
          setMainTab('profile')
        }
      }
    })
  }, [])

  if (!user) return null

  const isAdmin = user.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">HR Team Portal</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin 
            ? 'Manage employee records, leave requests, and payroll parameters.' 
            : 'Access your profile details, bank settings, and leaves dashboard.'}
        </p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px flex-wrap">
        {isAdmin && (
          <button 
            onClick={() => setMainTab('employees')} 
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-all ${
              mainTab === 'employees' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Employee Manager
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setMainTab('leaves')} 
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-all ${
              mainTab === 'leaves' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Leave Manager
          </button>
        )}
        {!isAdmin && (
          <button 
            onClick={() => setMainTab('profile')} 
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-all ${
              mainTab === 'profile' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            My Profile
          </button>
        )}
        {!isAdmin && (
          <button 
            onClick={() => setMainTab('leaves')} 
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-all ${
              mainTab === 'leaves' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Leave Dashboard
          </button>
        )}
      </div>

      {/* Content Rendering */}
      {mainTab === 'employees' && isAdmin && <EmployeeDirectory />}
      
      {mainTab === 'leaves' && (
        <div className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => setLeaveTab('dashboard')} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                leaveTab === 'dashboard' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              Leave Dashboard
            </button>
            {isAdmin && (
              <button 
                onClick={() => setLeaveTab('assign')} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  leaveTab === 'assign' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                Assign Leave
              </button>
            )}
            {!isAdmin && (
              <button 
                onClick={() => setLeaveTab('request')} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  leaveTab === 'request' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                Request Leave
              </button>
            )}
          </div>

          {leaveTab === 'dashboard' && <LeaveDashboard user={user} isAdmin={isAdmin} />}
          {leaveTab === 'request' && !isAdmin && <LeaveRequestForm user={user} />}
          {leaveTab === 'assign' && isAdmin && <AssignLeaveForm />}
        </div>
      )}

      {mainTab === 'profile' && !isAdmin && <EmployeeProfileView employeeId={user.id} />}
    </div>
  )
}

/* ==========================================================================
   Employee Manager Sub-Module Components
   ========================================================================== */

function EmployeeDirectory() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [selectedEmpId, setSelectedEmpId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [toggleStatusModal, setToggleStatusModal] = useState({ isOpen: false, employee: null })

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (deptFilter !== 'all') params.department = deptFilter
      if (statusFilter !== 'all') params.status = statusFilter
      
      const res = await getEmployees(params)
      setEmployees(res.data.data || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEmployees()
  }, [search, deptFilter, statusFilter])

  const handleToggleStatus = (emp) => {
    setToggleStatusModal({ isOpen: true, employee: emp })
  }

  const confirmToggleStatus = async () => {
    const emp = toggleStatusModal.employee
    setToggleStatusModal({ isOpen: false, employee: null })
    if (!emp) return
    try {
      await toggleEmployeeStatus(emp.id)
      toast.success(emp.isActive ? 'Employee account deactivated' : 'Employee account activated')
      fetchEmployees()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status')
    }
  }

  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations', 'Finance']

  return (
    <div className="space-y-6">
      {/* Filters & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search employee, email, ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select 
            value={deptFilter} 
            onChange={e => setDeptFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button 
          onClick={() => {
            setEditingEmp(null)
            setIsFormOpen(true)
          }}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Employees Grid/Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading directory...</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No employees match criteria.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                  <th className="px-6 py-3.5 font-medium">Employee</th>
                  <th className="px-6 py-3.5 font-medium">ID</th>
                  <th className="px-6 py-3.5 font-medium">Department</th>
                  <th className="px-6 py-3.5 font-medium">Designation</th>
                  <th className="px-6 py-3.5 font-medium">Join Date</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 border flex items-center justify-center font-bold text-sm">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-slate-800 block">{emp.name}</span>
                        <span className="text-xs text-slate-400">{emp.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{emp.employeeId || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{emp.department || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{emp.designation || '—'}</td>
                    <td className="px-6 py-4 text-slate-600">{emp.joinDate || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        emp.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => setSelectedEmpId(emp.id)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition inline-flex items-center gap-1"
                        title="View profile summary"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingEmp(emp)
                          setIsFormOpen(true)
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition inline-flex items-center gap-1"
                        title="Edit details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(emp)}
                        className={`px-2 py-1 text-xs font-semibold rounded-md border transition ${
                          emp.isActive 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {emp.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <EmployeeFormModal 
          employee={editingEmp} 
          onClose={() => setIsFormOpen(false)} 
          onSave={() => {
            setIsFormOpen(false)
            fetchEmployees()
          }} 
        />
      )}
 
      {/* Custom Confirmation Modal */}
      {toggleStatusModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border p-6">
            <h3 className="text-lg font-bold text-slate-800">Confirm Status Change</h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to {toggleStatusModal.employee?.isActive ? 'deactivate' : 'activate'} employee <strong>{toggleStatusModal.employee?.name}</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setToggleStatusModal({ isOpen: false, employee: null })}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={confirmToggleStatus}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Side-Drawer / Modal */}
      {selectedEmpId && (
        <EmployeeDetailModal 
          employeeId={selectedEmpId} 
          onClose={() => setSelectedEmpId(null)} 
        />
      )}
    </div>
  )
}

function EmployeeFormModal({ employee, onClose, onSave }) {
  const isEdit = !!employee
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  
  const [formTab, setFormTab] = useState('core')

  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'user',
    employeeId: '', department: '', designation: '', joinDate: '',
    basicPay: '0', bankName: '', accountNumber: '', ifscCode: '', panNumber: '',
    uan: '', pfNumber: '',
    contactNumber: '', reportingManager: '', officeLocation: '',
    employmentType: '', employmentStatus: '', lastWorkingDay: '', reasonForLeaving: '',
    personalAddress: '', personalEmail: '', emergencyContactName: '',
    emergencyContactRelationship: '', emergencyContactPhone: '', dateOfBirth: '',
    aadhaarNumber: '', passportNumber: '', variablePay: '0', appraisalCycle: '', consentLogId: ''
  })

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || '',
        email: employee.email || '',
        password: '',
        role: employee.role || 'user',
        employeeId: employee.employeeId || '',
        department: employee.department || '',
        designation: employee.designation || '',
        joinDate: employee.joinDate || '',
        basicPay: employee.basicPay?.toString() || '0',
        bankName: employee.bankName || '',
        accountNumber: employee.accountNumber || '',
        ifscCode: employee.ifscCode || '',
        panNumber: employee.panNumber || '',
        uan: employee.uan || '',
        pfNumber: employee.pfNumber || '',
        contactNumber: employee.contactNumber || '',
        reportingManager: employee.reportingManager || '',
        officeLocation: employee.officeLocation || '',
        employmentType: employee.employmentType || '',
        employmentStatus: employee.employmentStatus || '',
        lastWorkingDay: employee.lastWorkingDay || '',
        reasonForLeaving: employee.reasonForLeaving || '',
        personalAddress: employee.personalAddress || '',
        personalEmail: employee.personalEmail || '',
        emergencyContactName: employee.emergencyContactName || '',
        emergencyContactRelationship: employee.emergencyContactRelationship || '',
        emergencyContactPhone: employee.emergencyContactPhone || '',
        dateOfBirth: employee.dateOfBirth || '',
        aadhaarNumber: employee.aadhaarNumber || '',
        passportNumber: employee.passportNumber || '',
        variablePay: employee.variablePay?.toString() || '0',
        appraisalCycle: employee.appraisalCycle || '',
        consentLogId: employee.consentLogId || ''
      })
    }
  }, [employee])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = { ...form }
      if (!isEdit && !payload.password) {
        throw new Error('Default password is required on creation')
      }
      // If edit and password is empty, don't send it to backend to avoid changing it
      if (isEdit && !payload.password) {
        delete payload.password
      }

      // Input format validations
      if (payload.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(payload.panNumber.trim().toUpperCase())) {
        throw new Error('Invalid PAN number format (expected ABCDE1234F)')
      }
      if (payload.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payload.ifscCode.trim().toUpperCase())) {
        throw new Error('Invalid IFSC code format (expected ABCD0123456)')
      }
      const cleanAadhaar = payload.aadhaarNumber.replace(/\s+/g, '')
      if (payload.aadhaarNumber && !/^[2-9][0-9]{11}$/.test(cleanAadhaar)) {
        throw new Error('Invalid Aadhaar number (expected 12 digits, starting with 2-9)')
      }
      const cleanAccount = payload.accountNumber.replace(/\s+/g, '')
      if (payload.accountNumber && !/^\d{9,18}$/.test(cleanAccount)) {
        throw new Error('Invalid Bank Account Number (expected 9-18 digits)')
      }
      if (payload.uan && !/^\d{12}$/.test(payload.uan.trim())) {
        throw new Error('Invalid UAN format (expected 12 digits)')
      }
      if (payload.pfNumber && !(/^[A-Z]{2}\/[A-Z]{3}\/\d{7}\/\d{3}\/\d{7}$/.test(payload.pfNumber.trim().toUpperCase()) || /^[A-Z]{2}[A-Z]{3}\d{17}$/.test(payload.pfNumber.trim().toUpperCase()))) {
        throw new Error('Invalid PF account number format (expected e.g. MH/BAN/0012345/000/0000123)')
      }
      
      if (isEdit) {
        await updateEmployee(employee.id, payload)
      } else {
        await createEmployee(payload)
      }
      onSave()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed')
    }
    setSubmitting(false)
  }

  const TABS = [
    { key: 'core', label: 'Core Profile', icon: UserIcon },
    { key: 'employment', label: 'Employment', icon: Briefcase },
    { key: 'personal', label: 'Personal Info', icon: Heart },
    { key: 'financial', label: 'Financial & Compliance', icon: Shield },
    { key: 'system', label: 'System & Metadata', icon: Key }
  ]

  const renderTabFields = () => {
    switch (formTab) {
      case 'core':
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 mb-4">Basic identification, contact, role, and position details.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email Address <span className="text-red-500">*</span></label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Contact Number</label>
                <input type="text" value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. +91 9876543210" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Employee ID</label>
                <input type="text" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. EMP-105" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
                <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white">
                  <option value="">Select Department...</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="HR">HR</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Designation</label>
                <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Junior Developer" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Reporting Manager</label>
                <input type="text" value={form.reportingManager} onChange={e => setForm({ ...form, reportingManager: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Jane Doe" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Office Location</label>
                <input type="text" value={form.officeLocation} onChange={e => setForm({ ...form, officeLocation: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Bangalore" />
              </div>
            </div>
          </div>
        )
      case 'employment':
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">Job lifecycle, compensation, and exit tracking.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Join Date</label>
                <input type="date" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Employment Type</label>
                <select value={form.employmentType} onChange={e => setForm({ ...form, employmentType: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white">
                  <option value="">Select...</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                  <option value="Probation">Probation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Employment Status</label>
                <select value={form.employmentStatus} onChange={e => setForm({ ...form, employmentStatus: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white">
                  <option value="">Select...</option>
                  <option value="Active">Active</option>
                  <option value="On Notice">On Notice</option>
                  <option value="Terminated">Terminated</option>
                  <option value="Resigned">Resigned</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Last Working Day</label>
                <input type="date" value={form.lastWorkingDay} onChange={e => setForm({ ...form, lastWorkingDay: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Basic Salary (₹/mo)</label>
                <input type="number" step="0.01" value={form.basicPay} onChange={e => setForm({ ...form, basicPay: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Variable Pay (₹/mo)</label>
                <input type="number" step="0.01" value={form.variablePay} onChange={e => setForm({ ...form, variablePay: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Appraisal Cycle</label>
                <input type="text" value={form.appraisalCycle} onChange={e => setForm({ ...form, appraisalCycle: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Annual (Jan)" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Reason for Leaving</label>
                <input type="text" value={form.reasonForLeaving} onChange={e => setForm({ ...form, reasonForLeaving: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="Optional notes on exit..." />
              </div>
            </div>
          </div>
        )
      case 'personal':
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">Personal details and emergency contacts.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Personal Email</label>
                <input type="email" value={form.personalEmail} onChange={e => setForm({ ...form, personalEmail: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. personal@email.com" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Personal Address</label>
                <input type="text" value={form.personalAddress} onChange={e => setForm({ ...form, personalAddress: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="Full residential address..." />
              </div>
              <div className="md:col-span-2 border-t pt-3">
                <h5 className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-2"><Phone className="w-3.5 h-3.5" /> Emergency Contact</h5>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Contact Name</label>
                <input type="text" value={form.emergencyContactName} onChange={e => setForm({ ...form, emergencyContactName: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Relationship & Phone</label>
                <div className="flex gap-2">
                  <input type="text" value={form.emergencyContactRelationship} onChange={e => setForm({ ...form, emergencyContactRelationship: e.target.value })} className="w-1/3 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Spouse" />
                  <input type="text" value={form.emergencyContactPhone} onChange={e => setForm({ ...form, emergencyContactPhone: e.target.value })} className="w-2/3 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. +91 9876543210" />
                </div>
              </div>
            </div>
          </div>
        )
      case 'financial':
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">Banking, government IDs, and compliance details.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bank Name</label>
                <input type="text" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. HDFC Bank" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Account Number</label>
                <input type="text" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. 1234567890" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">IFSC Code</label>
                <input type="text" value={form.ifscCode} onChange={e => setForm({ ...form, ifscCode: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. HDFC0001234" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">PAN Number</label>
                <input type="text" value={form.panNumber} onChange={e => setForm({ ...form, panNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. ABCDE1234F" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">UAN Number</label>
                <input type="text" value={form.uan} onChange={e => setForm({ ...form, uan: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. 123456789012" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">PF Account</label>
                <input type="text" value={form.pfNumber} onChange={e => setForm({ ...form, pfNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. PF/1234567" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Aadhaar Number</label>
                <input type="text" value={form.aadhaarNumber} onChange={e => setForm({ ...form, aadhaarNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. 1234 5678 9012" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Passport Number</label>
                <input type="text" value={form.passportNumber} onChange={e => setForm({ ...form, passportNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. A1234567" />
              </div>
            </div>
          </div>
        )
      case 'system':
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">System access, authentication, and metadata.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {isEdit ? 'New Password (leave empty to keep current)' : 'Default Password'}
                </label>
                <input required={!isEdit} type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder={isEdit ? 'Leave blank to keep current' : 'Employee password'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Portal Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white">
                  <option value="user">Employee</option>
                  <option value="admin">Admin</option>
                  <option value="sales">Intern</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Consent Log ID</label>
                <input type="text" value={form.consentLogId} onChange={e => setForm({ ...form, consentLogId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. CL-2024-001" />
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl h-fit max-h-[85vh] overflow-hidden border flex flex-col">
        <div className="flex justify-between items-center border-b px-6 py-4 shrink-0">
          <h3 className="font-semibold text-lg text-slate-800">
            {isEdit ? `Edit: ${employee.name}` : 'Add New Employee'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-slate-200 bg-slate-50 p-2 space-y-1 shrink-0 overflow-y-auto">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFormTab(tab.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                    formTab === tab.key
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Form Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200 mb-4">
                  {error}
                </div>
              )}
              {renderTabFields()}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4 shrink-0 bg-white">
              <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Employee Details'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmployeeDetailModal({ employeeId, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto border p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4 p-1 hover:bg-slate-100 rounded-full text-slate-400">
          <X className="w-5 h-5" />
        </button>
        <EmployeeProfileView employeeId={employeeId} />
      </div>
    </div>
  )
}

function EmployeeProfileView({ employeeId }) {
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState('profile') // 'profile', 'leaves', 'payslips'
  const [business, setBusiness] = useState(null)
  const [historySearch, setHistorySearch] = useState('')
  const [historyMonth, setHistoryMonth] = useState('all')
  const [historyYear, setHistoryYear] = useState('all')
  const [revealFields, setRevealFields] = useState({})

  const maskValue = (val, visibleCount = 4) => {
    if (!val) return '—';
    const str = String(val).trim();
    if (str.length <= visibleCount) return str;
    return '•'.repeat(str.length - visibleCount) + str.slice(-visibleCount);
  };

  const renderSensitiveField = (label, val, fieldKey, visibleCount = 4) => {
    const isRevealed = !!revealFields[fieldKey];
    return (
      <>
        <span className="font-medium">{label}:</span>
        <span className="inline-flex items-center gap-2">
          <span>{isRevealed ? (val || '—') : maskValue(val, visibleCount)}</span>
          {val && (
            <button
              onClick={() => setRevealFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }))}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold focus:outline-none ml-1 cursor-pointer"
            >
              {isRevealed ? 'Hide' : 'Reveal'}
            </button>
          )}
        </span>
      </>
    );
  };

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getEmployeeById(employeeId),
      invoiceApi.entities.Business.list().catch(() => [])
    ])
      .then(([empRes, busList]) => {
        setEmployee(empRes.data.data)
        setBusiness(busList?.[0] || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [employeeId])

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

  const handleExportCSV = (list) => {
    const headers = ['Period', 'Basic Pay', 'Allowances', 'Deductions', 'Net Payout'];
    const rows = list.map(ps => {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      return [
        `${months[ps.month - 1]} ${ps.year}`,
        ps.basicPay,
        ps.allowances || 0,
        ps.deductions || 0,
        ps.netPay
      ]
    });

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payslip_log_${employee?.name?.replace(/\s+/g, '_') || 'employee'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredPayslips = (employee?.payslips || []).filter(ps => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const periodStr = `${months[ps.month - 1]} ${ps.year}`.toLowerCase()
    const matchesSearch = !historySearch || 
      periodStr.includes(historySearch.toLowerCase()) ||
      ps.basicPay?.toString().includes(historySearch) ||
      ps.netPay?.toString().includes(historySearch)
    
    const matchesMonth = historyMonth === 'all' || ps.month === parseInt(historyMonth)
    const matchesYear = historyYear === 'all' || ps.year === parseInt(historyYear)

    return matchesSearch && matchesMonth && matchesYear
  })

  if (loading) return <div className="text-center py-12 text-slate-400">Loading details...</div>
  if (!employee) return <div className="text-center py-12 text-slate-400">Could not load employee info.</div>

  return (
    <div className="space-y-6">
      {/* Short Card Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-2xl">
          {employee.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
          <p className="text-sm text-slate-500">{employee.designation || 'Position Undefined'} • {employee.department || 'No Department'}</p>
          <span className={`inline-flex items-center rounded-full mt-1.5 px-2 py-0.5 text-xs font-medium border ${
            employee.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {employee.isActive ? 'Active Employee' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b text-sm">
        <button onClick={() => setActiveSubTab('profile')} className={`pb-2 font-medium ${activeSubTab === 'profile' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Overview
        </button>
        <button onClick={() => setActiveSubTab('leaves')} className={`pb-2 font-medium ${activeSubTab === 'leaves' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Leave History
        </button>
        <button onClick={() => setActiveSubTab('payslips')} className={`pb-2 font-medium ${activeSubTab === 'payslips' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>
          Payslip Log
        </button>
      </div>

      {/* Overview Details */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6 text-sm">
          {/* Core Profile */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h4 className="font-semibold text-slate-700 border-b pb-1 flex items-center gap-1.5"><UserIcon className="w-4 h-4 text-indigo-500" /> Core Profile</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-slate-600">
              <span className="font-medium">Employee ID:</span> <span>{employee.employeeId || '—'}</span>
              <span className="font-medium">Name:</span> <span>{employee.name}</span>
              <span className="font-medium">Email:</span> <span>{employee.email}</span>
              <span className="font-medium">Contact:</span> <span>{employee.contactNumber || '—'}</span>
              <span className="font-medium">Department:</span> <span>{employee.department || '—'}</span>
              <span className="font-medium">Designation:</span> <span>{employee.designation || '—'}</span>
              <span className="font-medium">Reporting Manager:</span> <span>{employee.reportingManager || '—'}</span>
              <span className="font-medium">Office Location:</span> <span>{employee.officeLocation || '—'}</span>
            </div>
          </div>

          {/* Employment */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h4 className="font-semibold text-slate-700 border-b pb-1 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-indigo-500" /> Employment & Lifecycle</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-slate-600">
              <span className="font-medium">Join Date:</span> <span>{employee.joinDate || '—'}</span>
              <span className="font-medium">Employment Type:</span> <span>{employee.employmentType || '—'}</span>
              <span className="font-medium">Employment Status:</span> <span>{employee.employmentStatus || '—'}</span>
              <span className="font-medium">Last Working Day:</span> <span>{employee.lastWorkingDay || '—'}</span>
              <span className="font-medium">Reason for Leaving:</span> <span className="truncate">{employee.reasonForLeaving || '—'}</span>
              <span className="font-medium">Basic Salary:</span> <span className="font-semibold text-emerald-600">₹{parseFloat(employee.basicPay || 0).toFixed(2)}/mo</span>
              <span className="font-medium">Variable Pay:</span> <span>₹{parseFloat(employee.variablePay || 0).toFixed(2)}/mo</span>
              <span className="font-medium">Appraisal Cycle:</span> <span>{employee.appraisalCycle || '—'}</span>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h4 className="font-semibold text-slate-700 border-b pb-1 flex items-center gap-1.5"><Heart className="w-4 h-4 text-indigo-500" /> Personal Info</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-slate-600">
              <span className="font-medium">Date of Birth:</span> <span>{employee.dateOfBirth || '—'}</span>
              <span className="font-medium">Personal Email:</span> <span>{employee.personalEmail || '—'}</span>
              <span className="font-medium">Address:</span> <span className="truncate">{employee.personalAddress || '—'}</span>
              <span className="font-medium">Emergency Contact:</span> <span>{employee.emergencyContactName || '—'}</span>
              <span className="font-medium">Relationship:</span> <span>{employee.emergencyContactRelationship || '—'}</span>
              <span className="font-medium">Emergency Phone:</span> <span>{employee.emergencyContactPhone || '—'}</span>
            </div>
          </div>

          {/* Financial & Compliance */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h4 className="font-semibold text-slate-700 border-b pb-1 flex items-center gap-1.5"><Shield className="w-4 h-4 text-indigo-500" /> Financial & Compliance</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-slate-600">
              <span className="font-medium">Bank Name:</span> <span>{employee.bankName || '—'}</span>
              {renderSensitiveField('Account Number', employee.accountNumber, 'accountNumber')}
              {renderSensitiveField('IFSC Code', employee.ifscCode, 'ifscCode')}
              {renderSensitiveField('PAN', employee.panNumber, 'pan', 4)}
              {renderSensitiveField('UAN', employee.uan, 'uan', 4)}
              {renderSensitiveField('PF Number', employee.pfNumber, 'pfNumber', 4)}
              {renderSensitiveField('Aadhaar', employee.aadhaarNumber, 'aadhaarNumber', 4)}
              {renderSensitiveField('Passport', employee.passportNumber, 'passport', 4)}
            </div>
          </div>

          {/* System & Metadata */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h4 className="font-semibold text-slate-700 border-b pb-1 flex items-center gap-1.5"><Key className="w-4 h-4 text-indigo-500" /> System & Metadata</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-slate-600">
              <span className="font-medium">Portal Role:</span> <span className="capitalize">{employee.role === 'admin' ? 'Admin' : employee.role === 'sales' ? 'Intern' : 'Employee'}</span>
              <span className="font-medium">Account Status:</span> <span>{employee.isActive ? 'Active' : 'Inactive'}</span>
              <span className="font-medium">Consent Log ID:</span> <span>{employee.consentLogId || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaves tab */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-slate-700">Leave Requests Summary</h4>
          {(!employee.leaveRequests || employee.leaveRequests.length === 0) ? (
            <div className="text-center py-6 text-slate-400 text-sm">No leave records registered yet.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600 border-b">
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">From</th>
                    <th className="px-4 py-2 font-medium">To</th>
                    <th className="px-4 py-2 font-medium">Reason</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {employee.leaveRequests.map(l => (
                    <tr key={l.id}>
                      <td className="px-4 py-2 capitalize font-medium">{l.type}</td>
                      <td className="px-4 py-2">{l.startDate}</td>
                      <td className="px-4 py-2">{l.endDate}</td>
                      <td className="px-4 py-2 truncate max-w-[200px]">{l.reason}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          l.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payslips Tab */}
      {activeSubTab === 'payslips' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h4 className="font-semibold text-sm text-slate-700">Salary Slip Audits</h4>
            {employee.payslips && employee.payslips.length > 0 && (
              <button
                onClick={() => handleExportCSV(filteredPayslips)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
                title="Export CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
              </button>
            )}
          </div>

          {employee.payslips && employee.payslips.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by period, basic pay, net pay..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={historyMonth}
                  onChange={e => setHistoryMonth(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Months</option>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={historyYear}
                  onChange={e => setHistoryYear(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Years</option>
                  {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {(!employee.payslips || employee.payslips.length === 0) ? (
            <div className="text-center py-6 text-slate-400 text-sm">No payslips generated.</div>
          ) : filteredPayslips.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">No matching payslips found.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600 border-b">
                    <th className="px-4 py-2 font-medium">Period</th>
                    <th className="px-4 py-2 font-medium">Basic Pay</th>
                    <th className="px-4 py-2 font-medium">Allowances</th>
                    <th className="px-4 py-2 font-medium">Deductions</th>
                    <th className="px-4 py-2 font-medium">Net Payout</th>
                    <th className="px-4 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredPayslips.map(ps => {
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                    return (
                      <tr key={ps.id}>
                        <td className="px-4 py-2 font-medium">{months[ps.month - 1]} {ps.year}</td>
                        <td className="px-4 py-2">₹{parseFloat(ps.basicPay).toFixed(2)}</td>
                        <td className="px-4 py-2">₹{parseFloat(ps.allowances || 0).toFixed(2)}</td>
                        <td className="px-4 py-2">₹{parseFloat(ps.deductions || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 font-semibold text-emerald-600">₹{parseFloat(ps.netPay).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex gap-1">
                            <button onClick={() => handlePrintPayslip(ps, employee)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition inline-flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> Print
                            </button>
                            <button onClick={() => handleDownloadPayslip(ps, employee)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition inline-flex items-center gap-1">
                              <Download className="w-3.5 h-3.5" /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   Existing Leave Manager Sub-Module Components (Preserved logic)
   ========================================================================== */

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
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                  {isAdmin && <td className="px-4 py-3 text-slate-800 font-medium">{leave.user?.name || 'Unknown'}</td>}
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
    case 'approved': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'rejected': return 'bg-red-50 text-red-700 border border-red-200'
    case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200'
    default: return 'bg-slate-50 text-slate-600 border border-slate-200'
  }
}
