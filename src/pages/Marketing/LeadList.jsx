import { Fragment, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeads, updateLead, deleteLead, assignLead, convertLead, createLead, addLeadActivity, getLeadActivities, importLeads } from '../../api/lead'
import { getDeals } from '../../api/deal'
import { getMe, api } from '../../api/auth'
import { createTask } from '../../api/task'
import { useToast } from '../../components/ToastProvider'
import Modal from '../../components/Modal'
import { resolveAccount } from '../../api/account'
import { getSequences, enrollLead as apiEnrollLead, stopSequence } from '../../api/sequence'
import { generateLeadTemplate, parseLeadExcelSheet, exportDuplicateLeadsReport, exportLeadsToExcel } from '../../utils/leadSheetImport'
import { 
  Search, 
  Globe, 
  Calendar, 
  Filter, 
  X, 
  Flame, 
  UserCheck, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown, 
  Check, 
  RotateCcw, 
  Building, 
  Mail, 
  Phone, 
  ExternalLink,
  Layers,
  Tag,
  Briefcase,
  Download
} from 'lucide-react'

const STATUS_COLORS = {
  New: 'bg-slate-100 text-slate-700 border border-slate-200',
  Contacted: 'bg-blue-100 text-blue-700 border border-blue-200',
  Qualified: 'bg-green-100 text-green-700 border border-green-200',
  Converted: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  Lost: 'bg-red-100 text-red-700 border border-red-200',
}

const STAGES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost']

export default function LeadList({ initialFilter = 'all' }) {
  const navigate = useNavigate()
  const searchInputRef = useRef(null)
  const filtersDropdownRef = useRef(null)
  
  const [leads, setLeads] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const defaultForm = () => ({ name: '', company: '', accountDomain: '', phone: '', email: '', description: '', isMarketingLead: initialFilter === 'marketing' })
  const [form, setForm] = useState(() => defaultForm())
  const [leadTypeFilter, setLeadTypeFilter] = useState(initialFilter) // 'all' | 'sales' | 'marketing'
  const { show } = useToast()
  const normEmail = (s) => (s && String(s).trim().toLowerCase()) || ''
  const normPhone = (s) => (s ? String(s).replace(/\D/g, '') : '')

  // Search & Filter States
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [datePreset, setDatePreset] = useState('all') // 'all' | 'today' | 'yesterday' | '7d' | 'thisMonth' | '30d' | 'custom'
  const [sourceFilter, setSourceFilter] = useState('all') // 'all' | 'website' | 'sheet' | 'social' | 'api' | 'referral'
  const [websitePageFilter, setWebsitePageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState([]) // array of strings
  const [ownerFilter, setOwnerFilter] = useState('all') // 'all' | 'unassigned' | userId
  const [scoreFilter, setScoreFilter] = useState('all') // 'all' | 'hot' | 'gradeA' | 'gradeB' | 'gradeC'
  const [uploaderFilter, setUploaderFilter] = useState('all') // 'all' | 'system' | uploaderName
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dateMenuOpen, setDateMenuOpen] = useState(false)

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

  // Global keyboard shortcut for search focus (Cmd/Ctrl + K or '/')
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filtersDropdownRef.current && !filtersDropdownRef.current.contains(e.target)) {
        setFiltersOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const applyPreset = (preset) => {
    setDatePreset(preset)
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
      case 'thisMonth': {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        setFromDate(firstDay.toISOString().split('T')[0])
        setToDate(now.toISOString().split('T')[0])
        break
      }
      case '30d':
        from.setDate(now.getDate() - 30)
        setFromDate(from.toISOString().split('T')[0])
        setToDate(now.toISOString().split('T')[0])
        break
      case 'all':
        setFromDate('')
        setToDate('')
        break
      default:
        break
    }
    setDateMenuOpen(false)
  }

  const clearAllFilters = () => {
    setQuery('')
    setFromDate('')
    setToDate('')
    setDatePreset('all')
    setSourceFilter('all')
    setWebsitePageFilter('')
    setStatusFilter([])
    setOwnerFilter('all')
    setScoreFilter('all')
    setUploaderFilter('all')
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

  // Helper to detect if a lead originated from the website / web inquiries
  const isWebsiteLead = (l) => {
    if (!l) return false
    const src = String(l.source || '').toLowerCase()
    const custom = l.customFields || {}
    const extId = String(l.externalUserId || '').toLowerCase()
    return src === 'website' || 
           src.includes('web') || 
           !!custom.page || 
           !!custom.landingPage || 
           !!custom.form || 
           !!custom.serviceOffering ||
           extId.startsWith('web-') ||
           (l.description && l.description.includes('Contact & Metadata'))
  }

  // Helper to get website page / form info
  const getWebsiteLeadOrigin = (l) => {
    if (!l) return null
    const custom = l.customFields || {}
    return custom.page || custom.landingPage || custom.form || custom.serviceOffering || (l.source === 'Website' ? '/contact' : null)
  }

  // Discovered website pages / forms across leads for dropdown
  const availableWebsitePages = useMemo(() => {
    const pages = new Set(['/contact', '/pricing', '/project-inquiry', '/demo', '/security-audit'])
    leads.forEach(l => {
      const origin = getWebsiteLeadOrigin(l)
      if (origin) pages.add(origin)
    })
    return Array.from(pages)
  }, [leads])

  // Discover all unique uploaders dynamically across leads
  const availableUploaders = useMemo(() => {
    const uploaderMap = new Map()
    let systemCount = 0

    leads.forEach(l => {
      const uploaderName = l.uploadedBy?.name || l.uploadedByName
      const uploaderEmail = l.uploadedBy?.email
      const key = uploaderName || (l.uploadedById ? `User #${l.uploadedById}` : null)

      if (key) {
        const existing = uploaderMap.get(key) || { 
          id: l.uploadedById || key, 
          name: key, 
          email: uploaderEmail || null, 
          count: 0 
        }
        existing.count += 1
        uploaderMap.set(key, existing)
      } else {
        systemCount += 1
      }
    })

    const list = Array.from(uploaderMap.values()).sort((a, b) => b.count - a.count)
    return {
      list,
      systemCount
    }
  }, [leads])

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

  // Count active filter pills
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (query) count++
    if (fromDate || toDate) count++
    if (sourceFilter !== 'all') count++
    if (websitePageFilter) count++
    if (statusFilter.length > 0) count += statusFilter.length
    if (ownerFilter !== 'all') count++
    if (scoreFilter !== 'all') count++
    if (uploaderFilter !== 'all') count++
    return count
  }, [query, fromDate, toDate, sourceFilter, websitePageFilter, statusFilter, ownerFilter, scoreFilter, uploaderFilter])

  // Filtered Leads calculation
  const filtered = useMemo(() => {
    const q = String(query || '').toLowerCase().trim()
    return leads.filter(l => {
      // 1. Text Search across name, email, phone, company, domain, customFields
      if (q) {
        const haystack = [
          l?.name,
          l?.firstName,
          l?.lastName,
          l?.email,
          l?.phone,
          l?.company,
          l?.accountDomain,
          l?.jobTitle,
          l?.source,
          l?.sheetSource,
          l?.status,
          l?.industry,
          l?.region,
          l?.uploadedByName,
          l?.uploadedBy?.name,
          l?.uploadedBy?.email,
          l?.owner?.name,
          l?.customFields ? JSON.stringify(l.customFields) : ''
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }

      // 2. Date filtering
      if (fromDate || toDate) {
        const created = new Date(l.createdAt || l.updatedAt)
        const start = fromDate ? new Date(fromDate) : new Date(0)
        start.setHours(0, 0, 0, 0)
        const end = toDate ? new Date(toDate) : new Date()
        end.setHours(23, 59, 59, 999)
        if (created < start || created > end) return false
      }

      // 3. Lead type filtering
      if (leadTypeFilter === 'sales' && l.isMarketingLead) return false
      if (leadTypeFilter === 'marketing' && !l.isMarketingLead) return false

      // 4. Source & Website Origin filter
      if (sourceFilter === 'website') {
        if (!isWebsiteLead(l)) return false
        if (websitePageFilter) {
          const origin = String(getWebsiteLeadOrigin(l) || '').toLowerCase()
          if (!origin.includes(websitePageFilter.toLowerCase())) return false
        }
      } else if (sourceFilter === 'sheet') {
        if (!l.sheetSource && l.source !== 'Sheet Import') return false
      } else if (sourceFilter !== 'all' && sourceFilter) {
        if (String(l.source || '').toLowerCase() !== sourceFilter.toLowerCase()) return false
      }

      // 5. Status filter
      if (statusFilter.length > 0) {
        const st = l.status || 'New'
        if (!statusFilter.includes(st)) return false
      }

      // 6. Assigned Owner filter
      if (ownerFilter === 'unassigned') {
        if (l.assignedTo || l.owner?.name) return false
      } else if (ownerFilter !== 'all' && ownerFilter) {
        if (String(l.assignedTo) !== String(ownerFilter) && String(l.owner?.id) !== String(ownerFilter)) return false
      }

      // 7. Score & Priority filter
      if (scoreFilter === 'hot') {
        if (!l.isHot && (l.score || 0) < 70) return false
      } else if (scoreFilter === 'gradeA') {
        if (l.grade !== 'A') return false
      } else if (scoreFilter === 'gradeB') {
        if (l.grade !== 'B') return false
      } else if (scoreFilter === 'gradeC') {
        if (l.grade !== 'C') return false
      }

      // 8. Uploaded By (CRM User) filter
      if (uploaderFilter !== 'all' && uploaderFilter) {
        if (uploaderFilter === 'system') {
          const hasUser = !!(l.uploadedBy?.name || l.uploadedByName || l.uploadedById)
          if (hasUser) return false
        } else {
          const uName = (l.uploadedBy?.name || l.uploadedByName || (l.uploadedById ? `User #${l.uploadedById}` : '')).toLowerCase()
          const target = String(uploaderFilter).toLowerCase()
          if (uName !== target && String(l.uploadedById) !== target && String(l.uploadedBy?.id) !== target) {
            return false
          }
        }
      }

      return true
    })
  }, [leads, query, fromDate, toDate, leadTypeFilter, sourceFilter, websitePageFilter, statusFilter, ownerFilter, scoreFilter, uploaderFilter])

  // Dynamic quick-chip counts
  const websiteCount = useMemo(() => leads.filter(isWebsiteLead).length, [leads])
  const todayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    return leads.filter(l => (l.createdAt || '').startsWith(todayStr)).length
  }, [leads])
  const hotCount = useMemo(() => leads.filter(l => l.isHot || (l.score || 0) >= 70).length, [leads])
  const unassignedCount = useMemo(() => leads.filter(l => !l.assignedTo && !l.owner?.name).length, [leads])

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

  // Bulk Upload & Download Logic
  const downloadTemplate = () => {
    generateLeadTemplate()
    show('Sample upload template downloaded successfully', 'success')
  }

  const handleExportLeads = () => {
    if (!filtered || filtered.length === 0) {
      show('No leads found in current view to export', 'error')
      return
    }
    const todayStr = new Date().toISOString().split('T')[0]
    const filename = `CRM_Leads_Export_${todayStr}.xlsx`
    exportLeadsToExcel(filtered, filename)
    show(`Exported ${filtered.length} leads to Excel (${filename})`, 'success')
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
          <span className="text-[11px] text-amber-600 font-medium">Matching search & active filters</span>
        </div>
      </div>

      {/* Main Omni-Search & Filter Suite */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3.5">
        
        {/* Row 1: Omni-Search Bar & Action Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Omni-Search Input */}
          <div className="relative flex-1 group">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-600" />
            <input
              ref={searchInputRef}
              className="w-full pl-10 pr-24 py-2.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
              placeholder="Search leads, companies, domains, emails..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                  title="Clear query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right Controls: Date Selector, More Filters Popover, and Add Lead */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            
            {/* Date Preset & Range Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDateMenuOpen(prev => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all active:scale-[0.98] shadow-2xs ${
                  fromDate || toDate
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {datePreset === 'today' ? 'Today' :
                   datePreset === 'yesterday' ? 'Yesterday' :
                   datePreset === '7d' ? 'Last 7 Days' :
                   datePreset === 'thisMonth' ? 'This Month' :
                   datePreset === '30d' ? 'Last 30 Days' :
                   fromDate && toDate ? `${fromDate} → ${toDate}` :
                   fromDate ? `From ${fromDate}` :
                   toDate ? `To ${toDate}` :
                   'Date Range'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {dateMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800">Date Presets</span>
                    {(fromDate || toDate) && (
                      <button onClick={() => applyPreset('all')} className="text-[11px] font-semibold text-rose-600 hover:underline">Reset</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => applyPreset('today')} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${datePreset === 'today' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>Today</button>
                    <button onClick={() => applyPreset('yesterday')} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${datePreset === 'yesterday' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>Yesterday</button>
                    <button onClick={() => applyPreset('7d')} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${datePreset === '7d' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>Last 7 Days</button>
                    <button onClick={() => applyPreset('thisMonth')} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${datePreset === 'thisMonth' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>This Month</button>
                    <button onClick={() => applyPreset('30d')} className={`col-span-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${datePreset === '30d' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>Last 30 Days</button>
                  </div>
                  <div className="border-t border-slate-100 pt-2.5 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Custom Range</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">From</label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={e => { setFromDate(e.target.value); setDatePreset('custom') }}
                          className="w-full text-xs px-2 py-1 rounded border border-slate-200 bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">To</label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={e => { setToDate(e.target.value); setDatePreset('custom') }}
                          className="w-full text-xs px-2 py-1 rounded border border-slate-200 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Expandable "More Filters" Popover */}
            <div className="relative" ref={filtersDropdownRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen(prev => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-2xs ${
                  activeFiltersCount > 0
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-indigo-700">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {filtersOpen && (
                <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-40 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-bold text-slate-900">Advanced Filters</span>
                    </div>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear All
                      </button>
                    )}
                  </div>

                  {/* Filter 1: Lead Stage / Status Pills */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Lead Stage / Status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {STAGES.map(stage => {
                        const active = statusFilter.includes(stage)
                        return (
                          <button
                            key={stage}
                            type="button"
                            onClick={() => {
                              setStatusFilter(prev => active ? prev.filter(s => s !== stage) : [...prev, stage])
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
                              active
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {active && <Check className="w-3 h-3 text-indigo-600" />}
                            {stage}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Filter 2: Website Landing Page / Form */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      🌐 Website Page / Form
                    </label>
                    <div className="space-y-1.5">
                      <select
                        value={websitePageFilter}
                        onChange={e => {
                          setWebsitePageFilter(e.target.value)
                          if (e.target.value && sourceFilter !== 'website') setSourceFilter('website')
                        }}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">All Website Pages & Inquiries</option>
                        {availableWebsitePages.map(page => (
                          <option key={page} value={page}>{page}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Filter 3: Assigned Sales Rep */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      👤 Assigned Owner
                    </label>
                    <select
                      value={ownerFilter}
                      onChange={e => setOwnerFilter(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Sales Owners</option>
                      <option value="unassigned">⏳ Unassigned Leads Only</option>
                      {eligibleSalesUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter 4: Priority & Score */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      🔥 Priority & Lead Score
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setScoreFilter(scoreFilter === 'hot' ? 'all' : 'hot')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between ${
                          scoreFilter === 'hot' ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>🔥 Hot Leads (70+)</span>
                        {scoreFilter === 'hot' && <Check className="w-3 h-3 text-amber-600" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setScoreFilter(scoreFilter === 'gradeA' ? 'all' : 'gradeA')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between ${
                          scoreFilter === 'gradeA' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>⭐ Grade A Leads</span>
                        {scoreFilter === 'gradeA' && <Check className="w-3 h-3 text-emerald-600" />}
                      </button>
                    </div>
                  </div>

                  {/* Filter 5: Uploaded By (CRM User) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        📤 Uploaded By (CRM User)
                      </label>
                      {uploaderFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setUploaderFilter('all')}
                          className="text-[10px] font-semibold text-rose-600 hover:underline"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <select
                      value={uploaderFilter}
                      onChange={e => setUploaderFilter(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Uploaders & Sources</option>
                      {availableUploaders.list.map(u => (
                        <option key={u.name} value={u.name}>
                          👤 {u.name} {u.email ? `(${u.email})` : ''} — {u.count} lead{u.count === 1 ? '' : 's'}
                        </option>
                      ))}
                      {availableUploaders.systemCount > 0 && (
                        <option value="system">
                          ⚙️ System Admin / Direct Sheet ({availableUploaders.systemCount} leads)
                        </option>
                      )}
                    </select>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Import Button */}
            <button
              onClick={() => setBulkUploadOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shrink-0 shadow-2xs flex items-center gap-1.5 transition-all hover:border-slate-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span>Import (.xlsx)</span>
            </button>

            {/* Download / Export Filtered Leads Button */}
            <button
              onClick={handleExportLeads}
              disabled={filtered.length === 0}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold shrink-0 shadow-2xs flex items-center gap-1.5 transition-all ${
                filtered.length === 0
                  ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
                  : 'border-emerald-200 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 hover:border-emerald-300 active:scale-[0.98]'
              }`}
              title={filtered.length > 0 ? `Download ${filtered.length} filtered leads to Excel (.xlsx)` : 'No leads to download'}
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download (.xlsx)</span>
              {filtered.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
                  {filtered.length}
                </span>
              )}
            </button>

            {/* Add Lead Button */}
            <button
              onClick={() => setOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shrink-0 shadow-sm transition-all flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              <span>+ Add Lead</span>
            </button>
          </div>
        </div>

        {/* Row 2: Quick-Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          
          {/* All */}
          <button
            type="button"
            onClick={() => { setSourceFilter('all'); setWebsitePageFilter(''); setScoreFilter('all'); setOwnerFilter('all') }}
            className={`px-3.5 py-1.5 rounded-full text-xs shrink-0 transition-all border flex items-center gap-1.5 active:scale-[0.98] ${
              sourceFilter === 'all' && !websitePageFilter && scoreFilter === 'all' && ownerFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                : 'bg-slate-100/70 hover:bg-slate-200/70 text-slate-600 border-slate-200/80 hover:border-slate-300 font-medium'
            }`}
          >
            <span>All</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${sourceFilter === 'all' && !websitePageFilter && scoreFilter === 'all' && ownerFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'bg-white text-slate-700 border border-slate-200/60 font-semibold shadow-2xs'}`}>
              {leads.length}
            </span>
          </button>

          {/* Website Leads Quick Chip */}
          <button
            type="button"
            onClick={() => {
              if (sourceFilter === 'website') {
                setSourceFilter('all')
                setWebsitePageFilter('')
              } else {
                setSourceFilter('website')
              }
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs shrink-0 transition-all border flex items-center gap-1.5 active:scale-[0.98] ${
              sourceFilter === 'website'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-200 font-semibold'
                : 'bg-blue-50/60 hover:bg-blue-100/70 text-blue-700 border-blue-200/70 hover:border-blue-300 font-medium'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Website Inquiries</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${sourceFilter === 'website' ? 'bg-white/20 text-white font-bold' : 'bg-white text-blue-800 border border-blue-200/60 font-semibold shadow-2xs'}`}>
              {websiteCount}
            </span>
          </button>

          {/* Added Today */}
          <button
            type="button"
            onClick={() => {
              if (datePreset === 'today') {
                applyPreset('all')
              } else {
                applyPreset('today')
              }
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs shrink-0 transition-all border flex items-center gap-1.5 active:scale-[0.98] ${
              datePreset === 'today'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-200 font-semibold'
                : 'bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-700 border-indigo-200/70 hover:border-indigo-300 font-medium'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Added Today</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${datePreset === 'today' ? 'bg-white/20 text-white font-bold' : 'bg-white text-indigo-800 border border-indigo-200/60 font-semibold shadow-2xs'}`}>
              {todayCount}
            </span>
          </button>

          {/* Hot Leads */}
          <button
            type="button"
            onClick={() => setScoreFilter(scoreFilter === 'hot' ? 'all' : 'hot')}
            className={`px-3.5 py-1.5 rounded-full text-xs shrink-0 transition-all border flex items-center gap-1.5 active:scale-[0.98] ${
              scoreFilter === 'hot'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs shadow-amber-200 font-semibold'
                : 'bg-amber-50/60 hover:bg-amber-100/70 text-amber-800 border-amber-200/70 hover:border-amber-300 font-medium'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Hot Leads</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${scoreFilter === 'hot' ? 'bg-white/20 text-white font-bold' : 'bg-white text-amber-800 border border-amber-200/60 font-semibold shadow-2xs'}`}>
              {hotCount}
            </span>
          </button>

          {/* Unassigned */}
          <button
            type="button"
            onClick={() => setOwnerFilter(ownerFilter === 'unassigned' ? 'all' : 'unassigned')}
            className={`px-3.5 py-1.5 rounded-full text-xs shrink-0 transition-all border flex items-center gap-1.5 active:scale-[0.98] ${
              ownerFilter === 'unassigned'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-200 font-semibold'
                : 'bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 border-emerald-200/70 hover:border-emerald-300 font-medium'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Unassigned</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${ownerFilter === 'unassigned' ? 'bg-white/20 text-white font-bold' : 'bg-white text-emerald-800 border border-emerald-200/60 font-semibold shadow-2xs'}`}>
              {unassignedCount}
            </span>
          </button>

          {/* Sheet Imports */}
          <button
            type="button"
            onClick={() => setSourceFilter(sourceFilter === 'sheet' ? 'all' : 'sheet')}
            className={`px-3.5 py-1.5 rounded-full text-xs shrink-0 transition-all border flex items-center gap-1.5 active:scale-[0.98] ${
              sourceFilter === 'sheet'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs shadow-purple-200 font-semibold'
                : 'bg-purple-50/60 hover:bg-purple-100/70 text-purple-800 border-purple-200/70 hover:border-purple-300 font-medium'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Excel Imports</span>
          </button>
        </div>

        {/* Row 3: Active Filters Removable Badges */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Active Filters:</span>

            {query && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                <span>Search: <strong>"{query}"</strong></span>
                <button onClick={() => setQuery('')} className="hover:text-slate-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            {sourceFilter === 'website' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                <Globe className="w-3 h-3" />
                <span>Source: <strong>Website</strong></span>
                <button onClick={() => { setSourceFilter('all'); setWebsitePageFilter('') }} className="hover:text-blue-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            {websitePageFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                <span>Page: <strong>{websitePageFilter}</strong></span>
                <button onClick={() => setWebsitePageFilter('')} className="hover:text-blue-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            {sourceFilter === 'sheet' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs">
                <span>Source: <strong>Excel Import</strong></span>
                <button onClick={() => setSourceFilter('all')} className="hover:text-purple-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            {(fromDate || toDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                <Calendar className="w-3 h-3" />
                <span>Date: <strong>{datePreset !== 'custom' ? datePreset : `${fromDate || 'start'} → ${toDate || 'end'}`}</strong></span>
                <button onClick={() => applyPreset('all')} className="hover:text-indigo-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            {statusFilter.map(st => (
              <span key={st} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                <span>Status: <strong>{st}</strong></span>
                <button onClick={() => setStatusFilter(prev => prev.filter(s => s !== st))} className="hover:text-slate-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            ))}

            {ownerFilter === 'unassigned' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                <span>Owner: <strong>Unassigned</strong></span>
                <button onClick={() => setOwnerFilter('all')} className="hover:text-emerald-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            {ownerFilter !== 'all' && ownerFilter !== 'unassigned' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                <span>Owner: <strong>{users.find(u => String(u.id) === String(ownerFilter))?.name || ownerFilter}</strong></span>
                <button onClick={() => setOwnerFilter('all')} className="hover:text-emerald-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            {scoreFilter === 'hot' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs">
                <Flame className="w-3 h-3 text-amber-500" />
                <span><strong>Hot Leads</strong></span>
                <button onClick={() => setScoreFilter('all')} className="hover:text-amber-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            {scoreFilter === 'gradeA' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                <span><strong>Grade A</strong></span>
                <button onClick={() => setScoreFilter('all')} className="hover:text-emerald-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            {uploaderFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs">
                <span>Uploaded By: <strong>{uploaderFilter === 'system' ? 'System Admin / Direct Sheet' : uploaderFilter}</strong></span>
                <button onClick={() => setUploaderFilter('all')} className="hover:text-violet-900 ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline ml-auto"
            >
              Clear All ({activeFiltersCount})
            </button>
          </div>
        )}
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

      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 w-12"></th>
                  <th className="text-left px-4 py-3">Lead Name</th>
                  <th className="text-left px-4 py-3">Origin / Source</th>
                  <th className="text-left px-4 py-3">Owner</th>
                  <th className="text-left px-4 py-3">Status</th>
                  {initialFilter !== 'marketing' && <th className="text-left px-4 py-3">Type</th>}
                  <th className="text-left px-4 py-3">Company</th>
                  <th className="text-left px-4 py-3">Mobile</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Created Date</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td className="px-4 py-6 text-center text-slate-400" colSpan={12}>Loading leads database...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center" colSpan={12}>
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-lg">🔍</div>
                        <p className="text-sm font-semibold text-slate-700">No matching leads found</p>
                        <p className="text-xs text-slate-400">Try adjusting your search query, date range, or active filters</p>
                        {activeFiltersCount > 0 && (
                          <button
                            onClick={clearAllFilters}
                            className="mt-2 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            Reset all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(l => (
                  <Fragment key={l.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 align-middle">
                        <button
                          onClick={() => toggleExpand(l.id)}
                          className="h-6 w-6 rounded-md border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                          {expanded === l.id ? '−' : '+'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{l.name}</span>
                          {(l.isHot || (l.score || 0) >= 70) && (
                            <span title={`Hot Lead (Score: ${l.score || 70})`} className="text-amber-500 text-xs">🔥</span>
                          )}
                        </div>
                        {l.jobTitle && <span className="text-[11px] text-slate-400 block">{l.jobTitle}</span>}
                      </td>

                      {/* Origin & Source Column */}
                      <td className="px-4 py-3 text-slate-700">
                        {(() => {
                          const isWeb = isWebsiteLead(l)
                          const origin = getWebsiteLeadOrigin(l)
                          if (isWeb) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80" title={`Website Lead: ${origin || 'Inquiry'}`}>
                                <Globe className="w-3 h-3 text-blue-500" />
                                <span>Website{origin ? `: ${origin}` : ''}</span>
                              </span>
                            )
                          }
                          if (l.sheetSource || l.source === 'Sheet Import') {
                            return (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/80" title={`Excel: ${l.sheetSource || 'Import'}`}>
                                <Layers className="w-3 h-3 text-purple-500" />
                                <span>Sheet: {l.sheetSource || 'Import'}</span>
                              </span>
                            )
                          }
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              👤 {l.source || 'Manual'}
                            </span>
                          )
                        })()}
                      </td>

                      {/* Owner Column */}
                      <td className="px-4 py-3 text-slate-700">
                        {l.owner?.name ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-xs text-slate-800">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            {l.owner.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 font-medium">
                            ⏳ Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[l.status] || 'bg-slate-100 text-slate-700'}`}>
                          {l.status || 'New'}
                        </span>
                      </td>

                      {initialFilter !== 'marketing' && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${l.isMarketingLead ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                            {l.isMarketingLead ? '📣 Marketing' : '💼 Sales'}
                          </span>
                        </td>
                      )}
                      
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        <div>{l.company || '-'}</div>
                        {l.accountDomain && <span className="text-[11px] text-slate-400 font-normal">{l.accountDomain}</span>}
                      </td>

                      <td className="px-4 py-3 text-slate-700 font-mono text-xs">{l.phone || '-'}</td>
                      
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[150px]" title={l.email}>{l.email || '-'}</span>
                          {l.email ? (() => { const id = workIdFor(l.email); return id ? (<span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-700 border border-slate-200 font-mono" title={id}>{id}</span>) : null })() : null}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 text-slate-700">
                        {l.createdAt ? (
                          <div className="text-xs">
                            <div className="font-medium text-slate-800">{new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div className="text-slate-400 text-[11px]">{new Date(l.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                          </div>
                        ) : '-'}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            className="text-xs px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 font-semibold transition-colors"
                            onClick={() => {
                              setAssigningLead(l)
                              setAssignTarget(l.assignedTo ? String(l.assignedTo) : '')
                              setAssignOpen(true)
                            }}
                          >
                            Assign
                          </button>
                          <button className="text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium" onClick={() => { setEditingId(l.id); setEditForm({ name: l.name || '', company: l.company || '', accountDomain: l.accountDomain || '', phone: l.phone || '', email: l.email || '', description: '' }); setEditOpen(true) }}>Edit</button>
                          <button className="text-xs px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium" onClick={() => setConfirmDeleteId(l.id)}>Delete</button>
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
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Added By</p>
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

