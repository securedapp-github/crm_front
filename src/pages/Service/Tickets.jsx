import { useEffect, useState, useMemo, useRef } from 'react'
import { getTickets, getTicketById, createTicket, updateTicket, addTicketComment, deleteTicket } from '../../api/ticket'
import { getStaffUsers } from '../../api/user'
import Modal from '../../components/Modal'
import { useToast } from '../../components/ToastProvider'
import { liquidGlass } from '../../utils/liquid-glass'
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  Paperclip,
  Send,
  MessageSquare,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Trash2,
  ExternalLink,
  Tag,
  ShieldAlert,
  LayoutGrid,
  List,
  Sparkles,
  User,
  Calendar,
  Zap,
  Check,
  RotateCcw,
  FileCode,
  Image as ImageIcon,
  ChevronRight,
  X,
  SlidersHorizontal,
  Layers,
  Activity,
  ArrowUpRight
} from 'lucide-react'

const CATEGORIES = ['All', 'Bug', 'UI Issue', 'Access / Role', 'Feature Request', 'Other']
const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Urgent']
const STATUSES = ['All', 'Open', 'In Progress', 'Resolved', 'Closed']

const CANNED_RESPONSES = [
  '-- Select Quick Reply Macro --',
  '👋 Thank you for reporting this! Our technical team is investigating.',
  '🔎 Could you please provide additional details or browser console logs?',
  '✅ This issue has been identified and fixed in our latest patch.',
  '🔐 Access permissions have been updated for your account.',
  '📌 Marked as Feature Request and queued for our product roadmap.'
]

const getAttachmentUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const rootDomain = apiBase.replace(/\/api\/?$/, '')
  return `${rootDomain}${path}`
}

const isImageFile = (filename = '') => {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename)
}

const getInitials = (name = '') => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][1]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const getAvatarColor = (str = '') => {
  const colors = [
    'bg-indigo-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-purple-600 text-white',
    'bg-sky-600 text-white',
    'bg-teal-600 text-white'
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

const formatTimeAgo = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}

const getCleanDescriptionSnippet = (desc = '') => {
  if (!desc) return 'No description provided.'
  const clean = desc.split(/---|Contact & Metadata/i)[0].trim()
  return clean || desc
}

const parseDescriptionDetails = (desc = '') => {
  if (!desc) return { message: 'No description provided.', metadataItems: [] }
  const parts = desc.split(/--- Contact & Metadata ---|---|Contact & Metadata/i)
  const message = (parts[0] || desc).trim()
  
  const metadataItems = []
  if (parts.length > 1) {
    const rawMeta = parts.slice(1).join(' ').trim()
    rawMeta.split(/\n|\|/).forEach((item) => {
      const trimmed = item.trim()
      if (trimmed) {
        const [k, ...v] = trimmed.split(':')
        if (v.length > 0) {
          metadataItems.push({ key: k.trim(), value: v.join(':').trim() })
        } else {
          metadataItems.push({ key: 'Detail', value: trimmed })
        }
      }
    })
  }

  return { message, metadataItems }
}

const getCleanTitle = (title = '', desc = '', name = '') => {
  if (!title) return 'Support Ticket'
  if (/^Contact Inquiry from/i.test(title.trim())) {
    const cleanSnippet = getCleanDescriptionSnippet(desc)
    if (cleanSnippet && cleanSnippet !== 'No description provided.' && cleanSnippet.length > 5) {
      return cleanSnippet.length > 60 ? cleanSnippet.slice(0, 60) + '...' : cleanSnippet
    }
    const cleanName = title.replace(/^Contact Inquiry from/i, '').trim() || name || 'Visitor'
    return `Inquiry from ${cleanName}`
  }
  return title
}

function GlassCard({ children, onClick, className = '' }) {
  const cardRef = useRef(null)

  useEffect(() => {
    if (cardRef.current) {
      const glass = liquidGlass(cardRef.current, { scale: -90, blur: 4, saturate: 1.4 })
      return () => glass.destroy()
    }
  }, [])

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`liquid-glass-card cursor-pointer rounded-3xl p-6 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  )
}

export default function Tickets() {
  const { show } = useToast()
  const searchInputRef = useRef(null)

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }, [])

  const isStaff = useMemo(() => {
    const roleStr = currentUser.role || ''
    const roles = roleStr.split(',').map((r) => r.trim().toLowerCase())
    return roles.some((r) => ['admin', 'tech', 'operations', 'support', 'hr'].includes(r))
  }, [currentUser])

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('ticket_view_mode') || 'grid')
  const [tickets, setTickets] = useState([])
  const [metrics, setMetrics] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, urgent: 0 })
  const [loading, setLoading] = useState(true)
  const [staffUsers, setStaffUsers] = useState([])
  const [scope, setScope] = useState(isStaff ? 'all' : 'my')
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [createForm, setCreateForm] = useState({ title: '', category: 'Bug', priority: 'Medium', description: '', attachment: null })
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyAttachment, setReplyAttachment] = useState(null)
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyStatusUpdate, setReplyStatusUpdate] = useState('')

  // Close Ticket Resolution Modal State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [closingTicket, setClosingTicket] = useState(null)
  const [closeForm, setCloseForm] = useState({ category: 'Resolved / Fixed', note: '' })
  const [closeSubmitting, setCloseSubmitting] = useState(false)

  const openCloseModal = (ticket, e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    setClosingTicket(ticket)
    setCloseForm({ category: 'Resolved / Fixed', note: '' })
    setIsCloseModalOpen(true)
  }

  const handleCloseSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!closingTicket) return
    if (!closeForm.note.trim()) {
      show('Please provide a resolution note before closing.', 'error')
      return
    }

    setCloseSubmitting(true)
    try {
      const commentData = new FormData()
      commentData.append('comment', `✅ [TICKET CLOSED - ${closeForm.category}]\nResolution Note: ${closeForm.note.trim()}`)
      commentData.append('status', 'Closed')
      await addTicketComment(closingTicket.id, commentData)

      const res = await updateTicket(closingTicket.id, { status: 'Closed' })
      if (res.data?.success) {
        show('Ticket closed & resolution recorded!', 'success')
        setIsCloseModalOpen(false)
        setClosingTicket(null)
        fetchTicketsData()
        if (selectedTicket && selectedTicket.id === closingTicket.id) {
          openTicketDetail(closingTicket.id)
        }
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to close ticket', 'error')
    } finally {
      setCloseSubmitting(false)
    }
  }

  const handleReopenTicket = async (ticketId, e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    try {
      const commentData = new FormData()
      commentData.append('comment', '🔄 Ticket reopened for further investigation and follow-up.')
      commentData.append('status', 'In Progress')
      await addTicketComment(ticketId, commentData)

      const res = await updateTicket(ticketId, { status: 'In Progress' })
      if (res.data?.success) {
        show('Ticket reopened successfully!', 'success')
        fetchTicketsData()
        if (selectedTicket && selectedTicket.id === ticketId) {
          openTicketDetail(ticketId)
        }
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to reopen ticket', 'error')
    }
  }

  const toggleViewMode = (mode) => {
    setViewMode(mode)
    localStorage.setItem('ticket_view_mode', mode)
  }

  const fetchTicketsData = async () => {
    setLoading(true)
    try {
      const res = await getTickets({ scope, search, status: selectedStatus, priority: selectedPriority, category: selectedCategory })
      if (res.data?.success) {
        setTickets(res.data.data || [])
        if (res.data.metrics) setMetrics(res.data.metrics)
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to load tickets', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const res = await getStaffUsers()
      if (res.data?.success) setStaffUsers(res.data.data || [])
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchTicketsData() }, [scope, selectedStatus, selectedPriority, selectedCategory])
  useEffect(() => { if (isStaff) fetchStaff() }, [isStaff])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchSubmit = (e) => { e.preventDefault(); fetchTicketsData() }
  const handleResetFilters = () => { setSearch(''); setSelectedStatus('All'); setSelectedPriority('All'); setSelectedCategory('All') }
  const hasActiveFilters = search || selectedStatus !== 'All' || selectedPriority !== 'All' || selectedCategory !== 'All'

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!createForm.title.trim() || !createForm.description.trim()) {
      show('Title and Description required', 'error')
      return
    }
    setCreateSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('title', createForm.title.trim())
      formData.append('category', createForm.category)
      formData.append('priority', createForm.priority)
      formData.append('description', createForm.description.trim())
      if (createForm.attachment) formData.append('attachment', createForm.attachment)
      const res = await createTicket(formData)
      if (res.data?.success) {
        show('Ticket submitted!', 'success')
        setIsCreateOpen(false)
        fetchTicketsData()
      }
    } catch (err) { show(err.response?.data?.message || 'Failed to submit', 'error') } finally { setCreateSubmitting(false) }
  }

  const openTicketDetail = async (ticketId) => {
    setDetailModalOpen(true)
    setLoadingDetail(true)
    try {
      const res = await getTicketById(ticketId)
      if (res.data?.success) { setSelectedTicket(res.data.data); setReplyStatusUpdate(res.data.data.status) }
    } catch (err) { show(err.response?.data?.message || 'Failed to load details', 'error') } finally { setLoadingDetail(false) }
  }

  const handleReplySubmit = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    setReplySubmitting(true)
    try {
      const formData = new FormData()
      formData.append('comment', replyText.trim())
      if (replyStatusUpdate && replyStatusUpdate !== selectedTicket.status) formData.append('status', replyStatusUpdate)
      if (replyAttachment) formData.append('attachment', replyAttachment)
      const res = await addTicketComment(selectedTicket.id, formData)
      if (res.data?.success) { show('Reply posted', 'success'); setReplyText(''); setReplyAttachment(null); openTicketDetail(selectedTicket.id); fetchTicketsData() }
    } catch (err) { show(err.response?.data?.message || 'Failed to post', 'error') } finally { setReplySubmitting(false) }
  }

  const handleQuickUpdate = async (ticketId, fields) => {
    try {
      const res = await updateTicket(ticketId, fields)
      if (res.data?.success) {
        show('Updated', 'success')
        fetchTicketsData()
        if (selectedTicket && selectedTicket.id === ticketId) setSelectedTicket(res.data.data)
      }
    } catch (err) { show(err.response?.data?.message || 'Failed update', 'error') }
  }

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Confirm delete?')) return
    try {
      const res = await deleteTicket(ticketId)
      if (res.data?.success) { show('Deleted', 'success'); if (selectedTicket?.id === ticketId) setDetailModalOpen(false); fetchTicketsData() }
    } catch (err) { show(err.response?.data?.message || 'Failed delete', 'error') }
  }

  const renderPriorityBadge = (p) => {
    const configs = {
      Urgent: 'bg-rose-50/90 text-rose-700 border-rose-200/80 ring-1 ring-rose-500/20 shadow-2xs animate-pulse',
      High: 'bg-amber-50/90 text-amber-700 border-amber-200/80 ring-1 ring-amber-500/20 shadow-2xs',
      Medium: 'bg-indigo-50/90 text-indigo-700 border-indigo-200/80 ring-1 ring-indigo-500/20 shadow-2xs',
      Low: 'bg-slate-100/90 text-slate-700 border-slate-200 shadow-2xs'
    }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${configs[p] || configs.Low}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${p === 'Urgent' ? 'bg-rose-600' : p === 'High' ? 'bg-amber-500' : p === 'Medium' ? 'bg-indigo-600' : 'bg-slate-400'}`}></span>
        {p}
      </span>
    )
  }

  const renderStatusBadge = (s) => {
    const configs = {
      Open: 'bg-amber-50/90 text-amber-700 border-amber-300/80 shadow-2xs',
      'In Progress': 'bg-indigo-50/90 text-indigo-700 border-indigo-300/80 shadow-2xs',
      Resolved: 'bg-emerald-50/90 text-emerald-700 border-emerald-300/80 shadow-2xs',
      Closed: 'bg-slate-100/90 text-slate-600 border-slate-300/80 shadow-2xs'
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${configs[s] || configs.Open}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s === 'Open' ? 'bg-amber-500' : s === 'In Progress' ? 'bg-indigo-500' : s === 'Resolved' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
        {s}
      </span>
    )
  }

  return (
    <div className="w-full max-w-full space-y-6 px-4 sm:px-6 lg:px-8 py-6 bg-slate-100/60 min-h-screen">
      <div className="liquid-glass-hero relative overflow-hidden p-6 sm:p-8 rounded-3xl text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-200 text-xs font-bold tracking-wide backdrop-blur-md">
              <LifeBuoy className="w-3.5 h-3.5 text-indigo-300" />
              <span>Operations Helpdesk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Support & Helpdesk Tickets
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Manage, track, assign, and resolve internal and customer support requests efficiently.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/40 active:scale-95 border border-indigo-400/40 backdrop-blur-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Raise New Ticket</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* TOTAL QUEUE */}
        <div
          onClick={() => { setSelectedStatus('All'); setSelectedPriority('All'); setSelectedCategory('All'); }}
          className={`liquid-glass-card group cursor-pointer p-4 sm:p-5 rounded-3xl transition-all duration-300 ${selectedStatus === 'All' && selectedPriority === 'All' && selectedCategory === 'All' ? 'ring-2 ring-indigo-500 shadow-md bg-white' : 'hover:border-indigo-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Queue</span>
            <div className="p-2 rounded-xl bg-slate-100/80 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{metrics.total || 0}</div>
            <span className="text-xs text-slate-400 font-medium">All logged</span>
          </div>
        </div>

        {/* OPEN */}
        <div
          onClick={() => { setSelectedStatus('Open'); setSelectedPriority('All'); }}
          className={`liquid-glass-card group cursor-pointer p-4 sm:p-5 rounded-3xl transition-all duration-300 ${selectedStatus === 'Open' ? 'ring-2 ring-amber-500 shadow-md bg-amber-50/20' : 'hover:border-amber-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">Open</span>
            <div className="p-2 rounded-xl bg-amber-50/80 text-amber-600 group-hover:bg-amber-100 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-amber-600 tracking-tight">{metrics.open || 0}</div>
            <span className="text-xs text-amber-600 font-bold font-mono">{metrics.total ? Math.round(((metrics.open || 0) / metrics.total) * 100) : 0}%</span>
          </div>
        </div>

        {/* IN PROGRESS */}
        <div
          onClick={() => { setSelectedStatus('In Progress'); setSelectedPriority('All'); }}
          className={`liquid-glass-card group cursor-pointer p-4 sm:p-5 rounded-3xl transition-all duration-300 ${selectedStatus === 'In Progress' ? 'ring-2 ring-indigo-500 shadow-md bg-indigo-50/20' : 'hover:border-indigo-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">In Progress</span>
            <div className="p-2 rounded-xl bg-indigo-50/80 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-indigo-600 tracking-tight">{metrics.inProgress || 0}</div>
            <span className="text-xs text-indigo-600 font-bold font-mono">{metrics.total ? Math.round(((metrics.inProgress || 0) / metrics.total) * 100) : 0}%</span>
          </div>
        </div>

        {/* RESOLVED */}
        <div
          onClick={() => { setSelectedStatus('Resolved'); setSelectedPriority('All'); }}
          className={`liquid-glass-card group cursor-pointer p-4 sm:p-5 rounded-3xl transition-all duration-300 ${selectedStatus === 'Resolved' ? 'ring-2 ring-emerald-500 shadow-md bg-emerald-50/20' : 'hover:border-emerald-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Resolved</span>
            <div className="p-2 rounded-xl bg-emerald-50/80 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-emerald-600 tracking-tight">{metrics.resolved || 0}</div>
            <span className="text-xs text-emerald-600 font-bold font-mono">{metrics.total ? Math.round(((metrics.resolved || 0) / metrics.total) * 100) : 0}%</span>
          </div>
        </div>

        {/* CLOSED */}
        <div
          onClick={() => { setSelectedStatus('Closed'); setSelectedPriority('All'); }}
          className={`liquid-glass-card group cursor-pointer p-4 sm:p-5 rounded-3xl transition-all duration-300 ${selectedStatus === 'Closed' ? 'ring-2 ring-slate-600 shadow-md bg-slate-100/50' : 'hover:border-slate-400'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Closed</span>
            <div className="p-2 rounded-xl bg-slate-100/90 text-slate-600 group-hover:bg-slate-200 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-slate-700 tracking-tight">{metrics.closed || 0}</div>
            <span className="text-xs text-slate-500 font-bold font-mono">{metrics.total ? Math.round(((metrics.closed || 0) / metrics.total) * 100) : 0}%</span>
          </div>
        </div>

        {/* URGENT */}
        <div
          onClick={() => { setSelectedPriority('Urgent'); setSelectedStatus('All'); }}
          className={`liquid-glass-card group cursor-pointer p-4 sm:p-5 rounded-3xl transition-all duration-300 ${selectedPriority === 'Urgent' ? 'ring-2 ring-rose-500 shadow-md bg-rose-50/20' : 'hover:border-rose-300'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              Urgent {metrics.urgent > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
            </span>
            <div className="p-2 rounded-xl bg-rose-50/80 text-rose-600 group-hover:bg-rose-100 transition-colors">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black text-rose-600 tracking-tight">{metrics.urgent || 0}</div>
            <span className="text-[11px] text-rose-600 font-bold">Critical</span>
          </div>
        </div>
      </div>

      <div className="liquid-glass-card p-5 rounded-3xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {isStaff ? (
            <div className="inline-flex p-1 bg-slate-200/50 rounded-2xl text-xs font-extrabold text-slate-600 backdrop-blur-md">
              <button onClick={() => setScope('all')} className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${scope === 'all' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'hover:text-slate-900'}`}>
                <Layers className="w-3.5 h-3.5" /> <span>All Queue Tickets</span>
              </button>
              <button onClick={() => setScope('my')} className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${scope === 'my' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'hover:text-slate-900'}`}>
                <User className="w-3.5 h-3.5" /> <span>My Tickets</span>
              </button>
            </div>
          ) : (
            <div className="text-sm font-black text-slate-800 flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600"><Tag className="w-4 h-4" /></div>
              <span>Support Ticket Queue</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input ref={searchInputRef} type="text" placeholder="Search ticket #, title... (Ctrl+K)" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-9 py-2 border border-slate-200/80 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white/60 backdrop-blur-md" />
              {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
            </form>
            <div className="inline-flex p-1 bg-slate-200/50 rounded-2xl text-slate-500 backdrop-blur-md">
              <button onClick={() => toggleViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-800'}`}><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => toggleViewMode('table')} className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-2xs' : 'hover:text-slate-800'}`}><List className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase mr-1">Category:</span>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white/80 hover:bg-slate-200/80 text-slate-600 border border-slate-200/60'}`}>{cat}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-2xl text-xs font-bold bg-white/80 text-slate-700 focus:outline-none">
              <option value="All">Priority: All</option>
              {PRIORITIES.filter((p) => p !== 'All').map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-2xl text-xs font-bold bg-white/80 text-slate-700 focus:outline-none">
              <option value="All">Status: All</option>
              {STATUSES.filter((s) => s !== 'All').map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {hasActiveFilters && (
              <button onClick={handleResetFilters} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl text-xs font-extrabold text-rose-600 bg-rose-50/80 hover:bg-rose-100 transition-colors"><RotateCcw className="w-3 h-3" /> <span>Reset</span></button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 liquid-glass-card rounded-3xl">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-bold text-slate-600">Loading support tickets...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-16 px-4 text-center liquid-glass-card rounded-3xl space-y-3">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><LifeBuoy className="w-7 h-7" /></div>
          <h3 className="text-lg font-black text-slate-800">No support tickets match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Try resetting your search query or category filters, or click below to submit a new ticket.</p>
          <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white font-extrabold text-xs hover:bg-indigo-700 transition-all shadow-sm"><Plus className="w-4 h-4" /> <span>Raise New Ticket</span></button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tickets.map((t) => (
            <GlassCard key={t.id} onClick={() => openTicketDetail(t.id)} className="group relative flex flex-col justify-between space-y-4 hover:border-indigo-400/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-extrabold text-indigo-700 font-mono bg-indigo-50/90 px-2.5 py-1 rounded-xl border border-indigo-200/60 shadow-2xs">{t.ticketNumber || `#TCK-${t.id}`}</span>
                  {t.category && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100/80 text-slate-600 border border-slate-200/60">{t.category}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {renderPriorityBadge(t.priority || 'Medium')}
                  <div className="p-1 rounded-full text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors"><ArrowUpRight className="w-4 h-4" /></div>
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">{getCleanTitle(t.title, t.description, t.createdBy?.name || t.externalUserName)}</h3>
                <p className="text-xs text-slate-500 font-normal leading-relaxed line-clamp-2">{getCleanDescriptionSnippet(t.description)}</p>
              </div>
              <div className="pt-3 border-t border-slate-200/60 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${getAvatarColor(t.createdBy?.name || t.externalUserName || 'User')}`}>{getInitials(t.createdBy?.name || t.externalUserName || 'User')}</div>
                    <span className="text-xs font-bold text-slate-800 truncate">{t.createdBy?.name || t.externalUserName || 'User'}</span>
                  </div>
                  {renderStatusBadge(t.status)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-0.5">
                  <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> {t.comments?.length || 0} replies</span>
                  {t.status !== 'Closed' ? (
                    <button onClick={(e) => openCloseModal(t, e)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Close Ticket
                    </button>
                  ) : (
                    <button onClick={(e) => handleReopenTicket(t.id, e)} className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline transition-colors flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Reopen Ticket
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="liquid-glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/90 border-b border-slate-200/80 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                <tr><th className="px-5 py-4">Ticket # & Subject</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Priority</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Requester</th><th className="px-4 py-4">Assignee</th><th className="px-4 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-white/90 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2"><span className="text-xs font-bold text-indigo-600 font-mono">{t.ticketNumber || `#TCK-${t.id}`}</span></div>
                        <button onClick={() => openTicketDetail(t.id)} className="text-slate-900 font-bold hover:text-indigo-600 text-left line-clamp-1 transition-colors text-sm">{getCleanTitle(t.title, t.description, t.createdBy?.name || t.externalUserName)}</button>
                        <span className="text-[11px] text-slate-400">{formatTimeAgo(t.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-600"><span className="px-2.5 py-1 bg-slate-100 rounded-xl border border-slate-200/60">{t.category || 'Bug'}</span></td>
                    <td className="px-4 py-4">{renderPriorityBadge(t.priority || 'Medium')}</td>
                    <td className="px-4 py-4">{isStaff ? <select value={t.status} onChange={(e) => handleQuickUpdate(t.id, { status: e.target.value })} className="px-2.5 py-1 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:outline-none">{STATUSES.filter((s) => s !== 'All').map((s) => <option key={s} value={s}>{s}</option>)}</select> : renderStatusBadge(t.status)}</td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-800">{t.createdBy?.name || t.externalUserName || 'Internal User'}</div></td>
                    <td className="px-4 py-4">{isStaff ? <select value={t.assignedToId || ''} onChange={(e) => handleQuickUpdate(t.id, { assignedToId: e.target.value })} className="px-2 py-1 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none"><option value="">-- Unassigned --</option>{staffUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select> : <span className="text-xs">{t.assignee?.name || 'Unassigned'}</span>}</td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button onClick={() => openTicketDetail(t.id)} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors">View</button>
                      {t.status !== 'Closed' ? (
                        <button onClick={(e) => openCloseModal(t, e)} className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">Close</button>
                      ) : (
                        <button onClick={(e) => handleReopenTicket(t.id, e)} className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors">Reopen</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Raise Support Ticket / Report Issue" actions={
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleCreateSubmit} disabled={createSubmitting} className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm">Submit Ticket</button>
        </div>
      }>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Title</label><input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm" required /></div>
          <div><label className="block text-xs font-bold text-slate-700 mb-1">Description</label><textarea rows={4} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm" required /></div>
        </form>
      </Modal>

      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={selectedTicket ? `Ticket [${selectedTicket.ticketNumber || `#TCK-${selectedTicket.id}`}]` : 'Detail'}>
        {loadingDetail || !selectedTicket ? <div className="p-8 text-center">Loading...</div> : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold font-mono text-indigo-600">{selectedTicket.ticketNumber || `#TCK-${selectedTicket.id}`}</span>
                  {renderPriorityBadge(selectedTicket.priority || 'Medium')}
                  {renderStatusBadge(selectedTicket.status)}
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-1">{getCleanTitle(selectedTicket.title, selectedTicket.description, selectedTicket.createdBy?.name || selectedTicket.externalUserName)}</h2>
              </div>

              <div>
                {selectedTicket.status !== 'Closed' ? (
                  <button
                    onClick={(e) => openCloseModal(selectedTicket, e)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Close Ticket
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleReopenTicket(selectedTicket.id, e)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Reopen Ticket
                  </button>
                )}
              </div>
            </div>

            {selectedTicket.status === 'Closed' && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>CLOSED & RESOLVED</span>
                </div>
                <p className="text-slate-700">This ticket has been marked as resolved and closed. Click <strong>Reopen Ticket</strong> above if further assistance is required.</p>
              </div>
            )}

            <p className="text-sm text-slate-600 whitespace-pre-wrap">{parseDescriptionDetails(selectedTicket.description).message}</p>

            {selectedTicket.comments && selectedTicket.comments.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-extrabold uppercase text-slate-500">Activity & Resolution History ({selectedTicket.comments.length})</h4>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedTicket.comments.map((c) => (
                    <div key={c.id} className={`p-3 rounded-2xl border text-xs ${c.comment?.includes('CLOSED') ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-50 border-slate-200/80'}`}>
                      <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1 font-semibold">
                        <span>{c.author?.name || c.user?.name || selectedTicket.createdBy?.name || selectedTicket.externalUserName || 'User'}</span>
                        <span>{formatTimeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-slate-800 font-medium whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <textarea rows={3} placeholder="Add reply or progress note..." value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm" />
              <button onClick={handleReplySubmit} disabled={replySubmitting} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors">Post Response</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Close Ticket Resolution Modal */}
      <Modal
        open={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title={closingTicket ? `Close Ticket [${closingTicket.ticketNumber || `#TCK-${closingTicket.id}`}]` : 'Close Ticket'}
        actions={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setIsCloseModalOpen(false)}
              className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCloseSubmit}
              disabled={closeSubmitting}
              className="px-5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm cursor-pointer"
            >
              {closeSubmitting ? 'Closing Ticket...' : 'Confirm & Close Ticket'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleCloseSubmit} className="space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Resolution Summary Required:</strong> Provide a brief resolution note and category. This will be posted as an official resolution update for the user.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Category</label>
            <select
              value={closeForm.category}
              onChange={(e) => setCloseForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="Resolved / Fixed">Resolved / Fixed</option>
              <option value="Workaround Provided">Workaround Provided</option>
              <option value="Duplicate Ticket">Duplicate Ticket</option>
              <option value="As Designed / Not a Bug">As Designed / Not a Bug</option>
              <option value="WontFix / Out of Scope">WontFix / Out of Scope</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Closing Resolution Note / Summary *</label>
            <textarea
              rows={4}
              required
              placeholder="Explain how the issue was resolved or why the ticket is being closed..."
              value={closeForm.note}
              onChange={(e) => setCloseForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
