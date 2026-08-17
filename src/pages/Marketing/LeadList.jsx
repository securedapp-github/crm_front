import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeads, updateLead, deleteLead, assignLead, convertLead, createLead, addLeadActivity, getLeadActivities, importLeads } from '../../api/lead'
import { getDeals } from '../../api/deal'
import { getMe, api } from '../../api/auth'
import { createTask } from '../../api/task'
import { useToast } from '../../components/ToastProvider'
import Modal from '../../components/Modal'
import { resolveAccount } from '../../api/account'
import { getSequences, enrollLead as apiEnrollLead, stopSequence } from '../../api/sequence'
import { generateLeadTemplate, parseLeadExcelSheet, exportDuplicateLeadsReport } from '../../utils/leadSheetImport'

const STATUS_COLORS = {
  New: 'bg-slate-100 text-slate-700',
  Contacted: 'bg-blue-100 text-blue-700',
  Qualified: 'bg-green-100 text-green-700',
  Converted: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-red-100 text-red-700',
}

const STAGES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost']

export default function LeadList({ initialFilter = 'all' }) {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const defaultForm = () => ({ name: '', company: '', accountDomain: '', phone: '', email: '', description: '', isMarketingLead: initialFilter === 'marketing' })
  const [form, setForm] = useState(() => defaultForm())
  const [leadTypeFilter, setLeadTypeFilter] = useState(initialFilter) // 'all' | 'sales' | 'marketing'
  const { show } = useToast()
  const normEmail = (s) => (s && String(s).trim().toLowerCase()) || ''
  const normPhone = (s) => (s ? String(s).replace(/\D/g, '') : '')

  const [editingId, setEditingId] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', company: '', accountDomain: '', phone: '', email: '', description: '' })
  const [expanded, setExpanded] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletePending, setDeletePending] = useState(false)
  const [verification, setVerification] = useState({ status: 'idle', exists: null })
  const [domainError, setDomainError] = useState('')
  const [activitiesById, setActivitiesById] = useState({})
  const [activitiesLoading, setActivitiesLoading] = useState(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Sequence State
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollTargetId, setEnrollTargetId] = useState(null)
  const [availableSequences, setAvailableSequences] = useState([])
  const [selectedSeqId, setSelectedSeqId] = useState('')



  // Bulk Upload State
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [importSummary, setImportSummary] = useState(null)

  // Assign Owner State
  const [users, setUsers] = useState([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigningLead, setAssigningLead] = useState(null)
  const [assignTarget, setAssignTarget] = useState('')
  const [assignSaving, setAssignSaving] = useState(false)

  const applyPreset = (preset) => {
    const now = new Date()
    const from = new Date()
    switch (preset) {
      case 'today':
        setFromDate(now.toISOString().split('T')[0])
        setToDate(now.toISOString().split('T')[0])
        break
      case 'yesterday':
        from.setDate(now.getDate() - 1)
        setFromDate(from.toISOString().split('T')[0])
        setToDate(from.toISOString().split('T')[0])
        break
      case '7d':
        from.setDate(now.getDate() - 7)
        setFromDate(from.toISOString().split('T')[0])
        setToDate(now.toISOString().split('T')[0])
        break
      default:
        break
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lres, dres, ures] = await Promise.all([getLeads(), getDeals(), api.get('/auth/users')])
      setLeads(Array.isArray(lres.data?.data) ? lres.data.data : [])
      setDeals(Array.isArray(dres.data?.data) ? dres.data.data : [])
      setUsers(Array.isArray(ures.data?.data) ? ures.data.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const eligibleSalesUsers = useMemo(() => (users || []).filter(u => (u.role || '').toLowerCase().includes('sales')), [users])

  // Verify company domain like Campaigns (.com, .io, .in)
  useEffect(() => {
    const raw = form.accountDomain || ''
    if (!raw) { setVerification({ status: 'idle', exists: null }); setDomainError(''); return }
    const normalized = String(raw).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    const allowed = /\.(com|io|in)$/i.test(normalized)
    if (!allowed) {
      setDomainError('Only .com, .io, and .in domains are allowed')
      setVerification({ status: 'idle', exists: null })
      return
    }
    setDomainError('')
    setVerification({ status: 'loading', exists: null })
    const t = setTimeout(async () => {
      try {
        const res = await resolveAccount({ domain: normalized })
        const exists = !!res.data?.data?.exists
        setVerification({ status: 'done', exists })
      } catch {
        setVerification({ status: 'done', exists: false })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [form.accountDomain])

  const filtered = useMemo(() => {
    const q = String(query || '').toLowerCase()
    return leads.filter(l => {
      const haystack = [
        l?.name,
        l?.email,
        l?.phone,
        l?.company,
        l?.source,
        l?.status,
        // optional fallbacks
        l?.firstName,
        l?.lastName
      ].filter(Boolean).join(' ').toLowerCase()

      // Date filtering
      let dateMatch = true
      if (fromDate || toDate) {
        const created = new Date(l.createdAt || l.updatedAt) // Fallback to updatedAt if createdAt missing
        const start = fromDate ? new Date(fromDate) : new Date(0)
        const end = toDate ? new Date(toDate) : new Date()
        end.setHours(23, 59, 59, 999)
        dateMatch = created >= start && created <= end
      }

      // Lead type filtering
      let typeMatch = true
      if (leadTypeFilter === 'sales') typeMatch = !l.isMarketingLead
      if (leadTypeFilter === 'marketing') typeMatch = l.isMarketingLead === true

      return haystack.includes(q) && dateMatch && typeMatch
    })
  }, [leads, query, fromDate, toDate, leadTypeFilter])

  const handleStatusChange = async (id, status) => {
    await updateLead(id, { status })
    fetchData()
  }

  const stripSuffix = (s) => String(s || '').replace(/-W\d{3}$/i, '').trim()
  const workIdFor = (baseRaw) => {
    const base = stripSuffix(baseRaw)
    if (!base) return ''
    const matched = (deals || []).filter(d => {
      const t = String(d.title || '')
      if (!t.startsWith(base)) return false
      const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-W\\d{3})?$`, 'i')
      return re.test(t)
    })
    if (matched.length === 0) return ''
    let max = 0
    matched.forEach(d => {
      const m = String(d.title || '').match(/-W(\d{3})$/i)
      if (m) { const n = parseInt(m[1], 10); if (!isNaN(n)) max = Math.max(max, n) }
    })
    const seq = max || 1
    return `${base}-W${String(seq).padStart(3, '0')}`
  }

  const createFollowUp = async (l) => {
    const title = `Call ${l.name} in 3 days`
    const description = `Auto follow-up for lead #${l.id} (${l.email || l.phone || 'no contact provided'})`
    await createTask({ title, description, status: 'Open', assignedTo: l.assignedTo || null, relatedDealId: null })
  }

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = prev === id ? null : id
      if (next && !activitiesById[next]) {
        (async () => {
          try {
            setActivitiesLoading(next)
            const res = await getLeadActivities(next)
            const acts = Array.isArray(res.data?.data) ? res.data.data : []
            setActivitiesById(prevMap => ({ ...prevMap, [next]: acts }))
          } catch { }
          finally { setActivitiesLoading(null) }
        })()
      }
      return next
    })
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    setDeletePending(true)
    try {
      await deleteLead(confirmDeleteId)
      show('Lead deleted', 'success')
      if (expanded === confirmDeleteId) setExpanded(null)
      await fetchData()
    } catch (e) {
      show(e.response?.data?.message || 'Delete failed', 'error')
    } finally {
      setDeletePending(false)
      setConfirmDeleteId(null)
    }
  }

  const openEnrollModal = async (leadId) => {
    setEnrollTargetId(leadId)
    setEnrollOpen(true)
    try {
      const res = await getSequences()
      setAvailableSequences(res.data?.data?.filter(s => s.isActive) || [])
    } catch { show('Failed to load sequences', 'error') }
  }

  const handleEnrollSubmit = async () => {
    if (!enrollTargetId || !selectedSeqId) return
    try {
      await apiEnrollLead({ leadId: enrollTargetId, sequenceId: selectedSeqId })
      show('Lead enrolled in sequence', 'success')
      setEnrollOpen(false)
      setEnrollTargetId(null)
      setSelectedSeqId('')
      fetchData()
    } catch (e) { show(e.response?.data?.message || 'Enrollment failed', 'error') }
  }

  const handleStopSeq = async (leadId, seqId) => {
    if (!window.confirm('Stop this sequence?')) return
    try {
      await stopSequence({ leadId, sequenceId: seqId })
      show('Sequence stopped', 'success')
      fetchData()
    } catch (e) { show('Failed to stop sequence', 'error') }
  }



  // Bulk Upload Logic
  const downloadTemplate = () => {
    generateLeadTemplate()
    show('Sample upload template downloaded successfully', 'success')
  }

  const handleBulkUpload = async () => {
    if (!uploadedFile) { show('Please select a file', 'error'); return }

    setBulkUploading(true)
    try {
      const { leadsToCreate, totalRowsParsed, sheetNames, sheetBreakdown } = await parseLeadExcelSheet(
        uploadedFile,
        initialFilter === 'marketing'
      )

      if (!leadsToCreate || leadsToCreate.length === 0) {
        show('No rows found in Excel workbook.', 'error')
        setBulkUploading(false)
        return
      }

      const res = await importLeads({ leads: leadsToCreate, isMarketingLead: initialFilter === 'marketing' })
      const resData = res.data?.data || {}
      const createdCount = resData.created ?? leadsToCreate.length
      const dupsCount = resData.skippedDuplicates ?? 0

      setImportSummary({
        totalRowsParsed,
        created: createdCount,
        skippedDuplicates: dupsCount,
        errors: resData.errors ?? 0,
        sheetBreakdown: resData.sheetBreakdown || sheetBreakdown || {},
        duplicateList: resData.duplicateList || []
      })

      let msg = `Successfully imported ${createdCount} leads across ${sheetNames.length} sheet(s)`
      if (dupsCount > 0) msg += ` (${dupsCount} duplicates skipped)`
      show(msg, 'success')

      setBulkUploadOpen(false)
      setUploadedFile(null)
      setSummaryModalOpen(true)
      fetchData()
    } catch (err) {
      console.error(err)
      show(err.message || err.response?.data?.message || 'Failed to parse Excel file, please check format', 'error')
    } finally {
      setBulkUploading(false)
    }
  }

  return (
    <div className="space-y-5 w-full max-w-full overflow-hidden p-1">
      {/* Top Header & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-slate-200/80 p-4 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads</span>
            <span className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">📊</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{leads.length}</p>
          <span className="text-[11px] text-slate-500 font-medium">All active database records</span>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-slate-200/80 p-4 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales Pipeline</span>
            <span className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">💼</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{leads.filter(l => !l.isMarketingLead).length}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Auto-assigned to sales reps</span>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-slate-200/80 p-4 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Marketing Leads</span>
            <span className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">📣</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{leads.filter(l => l.isMarketingLead).length}</p>
          <span className="text-[11px] text-purple-600 font-medium">Campaign & sequence targets</span>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-slate-200/80 p-4 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered View</span>
            <span className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">🎯</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{filtered.length}</p>
          <span className="text-[11px] text-amber-600 font-medium">Matching search & date range</span>
        </div>
      </div>

      {/* Main Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Leads Directory</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">{filtered.length} shown</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage, filter, auto-assign and bulk import contacts into CRM</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              placeholder="Search by name, email, company..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setBulkUploadOpen(true)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shrink-0 shadow-xs flex items-center gap-1.5 transition-all hover:border-slate-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            Bulk Import (.xlsx)
          </button>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shrink-0 shadow-sm transition-all flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            + Add Lead
          </button>
        </div>
      </div>

      {/* Date Filters & Range Bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 shadow-xs">
        <div className="w-full sm:w-auto sm:flex-1 min-w-[140px]">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="w-full sm:w-auto sm:flex-1 min-w-[140px]">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
          <button onClick={() => applyPreset('today')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shrink-0 transition-all">Today</button>
          <button onClick={() => applyPreset('yesterday')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shrink-0 transition-all">Yesterday</button>
          <button onClick={() => applyPreset('7d')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shrink-0 transition-all">Last 7 Days</button>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate('') }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 shrink-0 transition-all">Clear Filters</button>
          )}
        </div>
      </div>

      {/* Lead Type Tabs */}
      {initialFilter !== 'marketing' && (
        <div className="flex items-center gap-2 border-b border-slate-200/80 px-1 pt-1">
          <button
            onClick={() => setLeadTypeFilter('all')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${leadTypeFilter === 'all' ? 'bg-white border-t-2 border-x border-slate-200 border-t-indigo-600 text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <span>All Leads</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">{leads.length}</span>
          </button>
          <button
            onClick={() => setLeadTypeFilter('sales')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${leadTypeFilter === 'sales' ? 'bg-white border-t-2 border-x border-slate-200 border-t-emerald-600 text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <span>💼 Sales</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-bold">{leads.filter(l => !l.isMarketingLead).length}</span>
          </button>
          <button
            onClick={() => setLeadTypeFilter('marketing')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 ${leadTypeFilter === 'marketing' ? 'bg-white border-t-2 border-x border-slate-200 border-t-purple-600 text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <span>📣 Marketing</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700 font-bold">{leads.filter(l => l.isMarketingLead).length}</span>
          </button>
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2 w-12"></th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Uploaded By</th>
                  <th className="text-left px-4 py-2">Owner</th>
                  <th className="text-left px-4 py-2">Status</th>
                  {initialFilter !== 'marketing' && <th className="text-left px-4 py-2">Type</th>}
                  <th className="text-left px-4 py-2">Company</th>
                  <th className="text-left px-4 py-2">Company domain</th>
                  <th className="text-left px-4 py-2">Mobile number</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Created At</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td className="px-4 py-3" colSpan={12}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="px-4 py-3 text-slate-500" colSpan={12}>No leads</td></tr>
                ) : filtered.map(l => (
                  <Fragment key={l.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 align-top">
                        <button
                          onClick={() => toggleExpand(l.id)}
                          className="h-6 w-6 rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          {expanded === l.id ? '−' : '+'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{l.name}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="inline-flex items-center gap-1 font-medium text-xs text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200" title={l.uploadedBy?.email || l.uploadedByName}>
                          👤 {l.uploadedBy?.name || l.uploadedByName || (l.sheetSource ? `Sheet: ${l.sheetSource}` : 'Admin')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {l.owner?.name ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-xs text-slate-800">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            {l.owner.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[l.status] || 'bg-slate-100 text-slate-700'}`}>{l.status || 'New'}</span>
                      </td>
                      {initialFilter !== 'marketing' && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${l.isMarketingLead ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                            {l.isMarketingLead ? '📣 Marketing' : '💼 Sales'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-700">{l.company || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{l.accountDomain || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{l.phone || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span>{l.email || '-'}</span>
                          {l.email ? (() => { const id = workIdFor(l.email); return id ? (<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 border border-slate-200" title={id}>{id}</span>) : null })() : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {l.createdAt ? (
                          <div className="text-xs">
                            <div className="font-medium">{new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div className="text-slate-500">{new Date(l.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs px-2.5 py-1 rounded-md border border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 font-medium transition-colors"
                            onClick={() => {
                              setAssigningLead(l)
                              setAssignTarget(l.assignedTo ? String(l.assignedTo) : '')
                              setAssignOpen(true)
                            }}
                          >
                            Assign
                          </button>
                          <button className="text-xs px-2 py-1 rounded border" onClick={() => { setEditingId(l.id); setEditForm({ name: l.name || '', company: l.company || '', accountDomain: l.accountDomain || '', phone: l.phone || '', email: l.email || '', description: '' }); setEditOpen(true) }}>Edit</button>
                          <button className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-600" onClick={() => setConfirmDeleteId(l.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                    {expanded === l.id && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={12} className="px-6 py-5">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                              {activitiesLoading === l.id ? (
                                <p className="mt-1 text-sm text-slate-500">Loading…</p>
                              ) : (
                                (() => {
                                  const acts = activitiesById[l.id] || []; const note = (acts.find(a => a?.note) || {}).note; return (
                                    <p className="mt-1 text-sm text-slate-800">{note || '—'}</p>
                                  )
                                })()
                              )}
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</p>
                              <p className="mt-1 text-sm text-slate-800">{l.source || '—'}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Uploaded By</p>
                              <p className="mt-1 text-sm text-slate-800 font-medium">{l.uploadedBy?.name || l.uploadedByName || (l.sheetSource ? `Sheet: ${l.sheetSource}` : 'System Admin')}</p>
                              {l.sheetSource && <p className="text-[11px] text-slate-400 mt-0.5">Sheet tab: {l.sheetSource}</p>}
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</p>
                                <button
                                  onClick={() => {
                                    setAssigningLead(l)
                                    setAssignTarget(l.assignedTo ? String(l.assignedTo) : '')
                                    setAssignOpen(true)
                                  }}
                                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                  {l.owner?.name ? 'Change Owner' : '+ Assign'}
                                </button>
                              </div>
                              <p className="mt-1 text-sm text-slate-800 font-medium">{l.owner?.name || 'Unassigned'}</p>
                            </div>

                            {/* Sequence Card */}
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email Sequence</p>
                              {(() => {
                                const activeSeq = l.sequences?.find(s => s.status === 'ACTIVE')
                                if (activeSeq) {
                                  return (
                                    <div className="mt-2">
                                      <p className="text-sm font-medium text-indigo-700">{activeSeq.sequence?.name}</p>
                                      <p className="text-xs text-slate-500">Step: {activeSeq.currentStep?.subject || 'Pending'}</p>
                                      <button onClick={() => handleStopSeq(l.id, activeSeq.sequenceId)} className="mt-2 text-xs text-rose-600 border border-rose-200 px-2 py-1 rounded hover:bg-rose-50">Stop Sequence</button>
                                    </div>
                                  )
                                } else {
                                  return (
                                    <button onClick={() => openEnrollModal(l.id)} className="mt-2 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded hover:bg-indigo-100">Enroll in Sequence</button>
                                  )
                                }
                              })()}
                            </div>

                            {/* Excel Data & Custom Fields Card */}
                            {(l.sheetSource || (l.customFields && Object.keys(l.customFields).length > 0)) && (
                              <div className="col-span-full rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Excel Data & Custom Fields</p>
                                  {l.sheetSource && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      Sheet: {l.sheetSource}
                                    </span>
                                  )}
                                </div>
                                {l.customFields && Object.keys(l.customFields).length > 0 ? (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                                    {Object.entries(l.customFields).map(([key, val]) => (
                                      <div key={key} className="bg-white p-2 rounded border border-slate-200 text-xs">
                                        <span className="text-slate-500 font-medium block truncate" title={key}>{key}</span>
                                        <span className="text-slate-900 font-semibold block truncate" title={String(val)}>{String(val)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">No extra custom fields</p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => { if (!saving) setOpen(false) }}
        title="Add Lead"
        actions={(
          <div className="flex items-center gap-2">
            <button onClick={() => { if (!saving) { setOpen(false); setForm(defaultForm()) } }} className="px-3 py-2 rounded-md border">Cancel</button>
            <button
              onClick={async () => {
                if (!form.name.trim()) { show('Name is required', 'error'); return }
                if (initialFilter === 'marketing' && !form.isMarketingLead) { show('Please mark as Marketing Lead to save in this view', 'error'); return }
                try {
                  await getMe()
                } catch (e) {
                  const status = e?.response?.status
                  const msg = e?.response?.data?.message || (status === 401 ? 'Please login to create leads' : 'Not authorized')
                  show(msg, 'error')
                  return
                }
                setSaving(true)
                try {
                  const payload = {
                    name: form.name.trim(),
                    email: form.email?.trim() || undefined,
                    phone: form.phone?.trim() || undefined,
                    company: form.company?.trim() || undefined,
                    autoAssign: !form.isMarketingLead,
                    isMarketingLead: form.isMarketingLead
                  }
                  Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined || payload[k] === null) delete payload[k] })
                  const res = await createLead(payload)
                  show(form.isMarketingLead ? 'Marketing lead created' : 'Lead created', 'success')
                  setForm(defaultForm())
                  setOpen(false)
                  await fetchData()
                } catch (e) {
                  const status = e?.response?.status
                  const msg = e?.response?.data?.message || (status === 403 || status === 401 ? 'Not authorized. Please login.' : 'Failed to create lead')
                  show(msg, 'error')
                } finally {
                  setSaving(false)
                }
              }}
              className={`px-3 py-2 rounded-md text-white ${saving ? 'bg-indigo-400' : 'bg-indigo-600'}`}
              disabled={saving}
            >{saving ? 'Saving…' : 'Save Lead'}</button>
          </div>
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm text-slate-700">Name</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Company</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Company domain</label>
            <input className="w-full px-3 py-2 border rounded-md" placeholder="example.com" value={form.accountDomain} onChange={e => setForm(f => ({ ...f, accountDomain: e.target.value }))} />
            {form.accountDomain ? (
              <div className="mt-1 text-xs">
                {domainError && <div className="text-rose-600">{domainError}</div>}
                {verification.status === 'loading' && <span className="text-slate-500">Checking...</span>}
                {verification.status === 'done' && verification.exists === true && <span className="text-emerald-600">✅ Verified organization.</span>}
                {verification.status === 'done' && verification.exists === false && <span className="text-amber-600"> New company</span>}
              </div>
            ) : null}
          </div>
          <div>
            <label className="block text-sm text-slate-700">Mobile number</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Email</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-slate-700">Description</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          {/* Marketing Lead Toggle */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <div className="font-medium text-slate-800">Marketing Lead</div>
                <div className="text-xs text-slate-500">Skip sales assignment, auto-enroll in marketing sequences</div>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isMarketingLead: !f.isMarketingLead }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isMarketingLead ? 'bg-purple-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isMarketingLead ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => { if (!editSaving) { setEditOpen(false); setEditingId(null) } }}
        title="Edit Lead"
        actions={(
          <div className="flex items-center gap-2">
            <button onClick={() => { if (!editSaving) { setEditOpen(false); setEditingId(null) } }} className="px-3 py-2 rounded-md border">Cancel</button>
            <button
              onClick={async () => {
                if (!editingId) return
                setEditSaving(true)
                try {
                  const payload = {
                    name: editForm.name?.trim() || undefined,
                    company: editForm.company?.trim() || undefined,
                    email: editForm.email?.trim() || undefined,
                    phone: editForm.phone?.trim() || undefined
                  }
                  Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k] })
                  await updateLead(editingId, payload)
                  if (editForm.description?.trim() || editForm.accountDomain?.trim()) {
                    try { await addLeadActivity(editingId, { type: 'Update', note: editForm.description?.trim() || null, meta: { domain: editForm.accountDomain?.trim() || null } }) } catch { }
                  }
                  show('Lead updated', 'success')
                  setEditOpen(false)
                  setEditingId(null)
                  await fetchData()
                } catch (e) {
                  show(e.response?.data?.message || 'Failed to update lead', 'error')
                } finally {
                  setEditSaving(false)
                }
              }}
              className={`px-3 py-2 rounded-md text-white ${editSaving ? 'bg-indigo-400' : 'bg-indigo-600'}`}
              disabled={editSaving}
            >{editSaving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm text-slate-700">Name</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Company</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Company domain</label>
            <input className="w-full px-3 py-2 border rounded-md" placeholder="example.com" value={editForm.accountDomain} onChange={e => setEditForm(f => ({ ...f, accountDomain: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Mobile number</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Email</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm text-slate-700">Description</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmDeleteId != null}
        onClose={() => { if (!deletePending) setConfirmDeleteId(null) }}
        title="Delete Lead"
        actions={(
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmDeleteId(null)}
              disabled={deletePending}
              className="px-3 py-2 rounded-md border"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deletePending}
              className="px-3 py-2 rounded-md bg-rose-600 text-white"
            >
              {deletePending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      >
        <p className="text-sm text-slate-600">This will remove the lead permanently. Are you sure?</p>
      </Modal>

      <Modal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title="Enroll in Email Sequence"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setEnrollOpen(false)} className="px-3 py-2 border rounded">Cancel</button>
            <button onClick={handleEnrollSubmit} className="px-3 py-2 bg-indigo-600 text-white rounded">Enroll</button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Select an active email sequence to start for this lead.</p>
          <select className="w-full border rounded px-3 py-2" value={selectedSeqId} onChange={e => setSelectedSeqId(e.target.value)}>
            <option value="">Select Sequence...</option>
            {availableSequences.map(s => <option key={s.id} value={s.id}>{s.name} ({s.triggerType})</option>)}
          </select>
        </div>
      </Modal>



      <Modal
        open={bulkUploadOpen}
        onClose={() => !bulkUploading && setBulkUploadOpen(false)}
        title="Bulk Import Leads"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkUploadOpen(false)}
              disabled={bulkUploading}
              className="px-3 py-2 rounded-md border"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUpload}
              disabled={!uploadedFile || bulkUploading}
              className={`px-3 py-2 rounded-md text-white ${!uploadedFile || bulkUploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {bulkUploading ? 'Importing...' : 'Start Import'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-3">
              Upload an Excel file (.xlsx) with columns: <strong>Name</strong>, <strong>Company</strong>, <strong>Company domain</strong>, <strong>Mobile number</strong>, <strong>Email</strong>, <strong>Description</strong>.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4">
              <p className="text-xs text-blue-700 mb-2 font-semibold">
                Use the standard template for best results:
              </p>
              <button
                onClick={downloadTemplate}
                className="text-xs flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 underline"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download Excel Template
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-2">Select Excel File</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              disabled={bulkUploading}
            />
            {uploadedFile && (
              <p className="mt-2 text-xs text-slate-600">
                Selected: <strong>{uploadedFile.name}</strong> ({(uploadedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Detailed Post-Import Summary Modal */}
      <Modal
        open={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title="Excel Import Summary Report"
        actions={
          <div className="flex items-center gap-2">
            {importSummary?.duplicateList && importSummary.duplicateList.length > 0 && (
              <button
                onClick={() => exportDuplicateLeadsReport(importSummary.duplicateList)}
                className="px-3 py-2 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 font-semibold text-xs border border-amber-300 flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download Duplicates (.xlsx)
              </button>
            )}
            <button
              onClick={() => setSummaryModalOpen(false)}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 text-xs"
            >
              Close Report
            </button>
          </div>
        }
      >
        {importSummary && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-600 uppercase">Leads Created</p>
                <p className="text-xl font-bold text-emerald-700">{importSummary.created}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-semibold text-amber-600 uppercase">Duplicates Skipped</p>
                <p className="text-xl font-bold text-amber-700">{importSummary.skippedDuplicates}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase">Total Rows</p>
                <p className="text-xl font-bold text-slate-800">{importSummary.totalRowsParsed}</p>
              </div>
            </div>

            {/* Sheet Breakdown */}
            {importSummary.sheetBreakdown && Object.keys(importSummary.sheetBreakdown).length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3 bg-white">
                <p className="text-xs font-semibold text-slate-700 mb-2 uppercase">Worksheet Breakdown</p>
                <div className="space-y-1">
                  {Object.entries(importSummary.sheetBreakdown).map(([sheet, count]) => (
                    <div key={sheet} className="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-700">📄 {sheet}</span>
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold">{count} leads</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate details */}
            {importSummary.duplicateList && importSummary.duplicateList.length > 0 && (
              <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/50 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-amber-800 mb-2 uppercase">Skipped Duplicates (Matched by Email/Phone)</p>
                <div className="space-y-1">
                  {importSummary.duplicateList.map((dup, idx) => (
                    <div key={idx} className="text-xs text-amber-900 flex justify-between gap-2 border-b border-amber-100 py-1 last:border-0">
                      <span className="truncate font-medium">{dup.name || 'Lead'}</span>
                      <span className="text-amber-700 shrink-0">{dup.email || dup.phone || 'Duplicate'} ({dup.sheetSource})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Assign Lead Owner Modal */}
      <Modal
        open={assignOpen}
        onClose={() => !assignSaving && setAssignOpen(false)}
        title="Assign Lead Owner"
        actions={(
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAssignOpen(false)}
              disabled={assignSaving}
              className="px-3 py-2 rounded-md border text-slate-700 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!assigningLead || !assignTarget) return
                setAssignSaving(true)
                try {
                  await assignLead({ leadId: assigningLead.id, userId: Number(assignTarget) })
                  const assignedUser = eligibleSalesUsers.find(u => Number(u.id) === Number(assignTarget))
                  show(`Lead assigned to ${assignedUser?.name || 'team member'} successfully`, 'success')
                  setAssignOpen(false)
                  setAssignTarget('')
                  setAssigningLead(null)
                  await fetchData()
                } catch (e) {
                  show(e.response?.data?.message || 'Failed to assign lead', 'error')
                } finally {
                  setAssignSaving(false)
                }
              }}
              disabled={!assignTarget || assignSaving}
              className={`px-4 py-2 rounded-md text-white text-xs font-semibold shadow-xs ${!assignTarget || assignSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {assignSaving ? 'Assigning…' : 'Assign Owner'}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600">
              Assign an owner for lead: <strong className="text-slate-900 font-semibold">{assigningLead?.name}</strong>
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Select Owner</label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={assignTarget}
              onChange={(e) => setAssignTarget(e.target.value)}
            >
              <option value="">Choose owner…</option>
              {eligibleSalesUsers.map(user => (
                <option key={user.id} value={user.id}>{user.name || user.email || `User #${user.id}`}</option>
              ))}
            </select>
            {eligibleSalesUsers.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">No active salespeople found in team directory.</p>
            )}
          </div>
        </div>
      </Modal>

    </div>
  )
}

