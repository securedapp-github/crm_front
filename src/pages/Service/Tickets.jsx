import { useEffect, useState, useMemo, useRef } from 'react'
import { getTickets, getTicketById, createTicket, updateTicket, addTicketComment, deleteTicket, routeTicket as apiRouteTicket, rerouteTicket as apiRerouteTicket, markTicketDone as apiMarkDone, sendResolutionReply as apiSendReply } from '../../api/ticket'
import { getStaffUsers } from '../../api/user'
import Modal from '../../components/Modal'
import RouteDrawer from '../../components/RouteDrawer'
import DeptGroupedTable from '../../components/DeptGroupedTable'
import MyAssignedCard from '../../components/MyAssignedCard'
import TeamQueuesSidebar from '../../components/TeamQueuesSidebar'
import { useToast } from '../../components/ToastProvider'
import { liquidGlass } from '../../utils/liquid-glass'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import NormalUserTickets from './NormalUserTickets'
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
  ArrowUpRight,
  CornerUpRight,
  Mail,
  Eye
} from 'lucide-react'

const CATEGORIES = ['All', 'Bug', 'UI Issue', 'Access / Role', 'Feature Request', 'Other']
const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Urgent']
const STATUSES = ['All', 'Open', 'In Progress', 'Pending Ops Review', 'Resolved', 'Closed']

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

const matchesDateMonthTime = (ticket, query) => {
  if (!query || !query.trim()) return false
  const q = query.trim().toLowerCase()

  const datesToTest = [ticket.createdAt, ticket.updatedAt].filter(Boolean)
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  for (const dateStr of datesToTest) {
    if (typeof dateStr !== 'string') continue
    const lowerRaw = dateStr.toLowerCase()
    if (lowerRaw.includes(q)) return true

    const d = new Date(dateStr)
    if (isNaN(d.getTime())) continue

    const year = d.getFullYear().toString()
    const monthIndex = d.getMonth()
    const monthNum = (monthIndex + 1).toString()
    const padMonth = monthNum.padStart(2, '0')
    const dayNum = d.getDate().toString()
    const padDay = dayNum.padStart(2, '0')

    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ]
    const monthShorts = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

    const fullMonthName = monthNames[monthIndex]
    const shortMonthName = monthShorts[monthIndex]

    const ticketIsoDate = d.toISOString().slice(0, 10)
    if (q === 'today' && ticketIsoDate === todayStr) return true
    if (q === 'yesterday' && ticketIsoDate === yesterdayStr) return true

    const relativeTime = formatTimeAgo(dateStr).toLowerCase()
    if (relativeTime.includes(q)) return true

    const locDate = d.toLocaleDateString().toLowerCase()
    const locTime = d.toLocaleTimeString().toLowerCase()
    const locDateTime = d.toLocaleString().toLowerCase()
    if (locDate.includes(q) || locTime.includes(q) || locDateTime.includes(q)) return true

    const hours24 = d.getHours().toString().padStart(2, '0')
    const mins = d.getMinutes().toString().padStart(2, '0')
    const time24 = `${hours24}:${mins}`

    const candidates = [
      `${year}-${padMonth}-${padDay}`,
      `${padDay}/${padMonth}/${year}`,
      `${padMonth}/${padDay}/${year}`,
      `${padDay}-${padMonth}-${year}`,
      `${dayNum}/${monthNum}/${year}`,
      `${monthNum}/${dayNum}/${year}`,
      `${shortMonthName} ${dayNum}`,
      `${dayNum} ${shortMonthName}`,
      `${fullMonthName} ${dayNum}`,
      `${dayNum} ${fullMonthName}`,
      `${shortMonthName} ${year}`,
      `${fullMonthName} ${year}`,
      shortMonthName,
      fullMonthName,
      time24
    ]

    if (candidates.some((cand) => cand.toLowerCase().includes(q))) return true
  }

  return false
}

const matchesSearch = (t, query) => {
  if (!query || !query.trim()) return true
  const q = query.trim().toLowerCase()

  if ((t.title || '').toLowerCase().includes(q)) return true
  if ((t.description || '').toLowerCase().includes(q)) return true
  if ((t.ticketNumber || '').toLowerCase().includes(q)) return true
  if ((t.category || '').toLowerCase().includes(q)) return true
  if ((t.priority || '').toLowerCase().includes(q)) return true
  if ((t.status || '').toLowerCase().includes(q)) return true
  if ((t.externalUserName || '').toLowerCase().includes(q)) return true
  if ((t.externalUserEmail || '').toLowerCase().includes(q)) return true
  if ((t.externalUserPhone || '').toLowerCase().includes(q)) return true
  if ((t.createdBy?.name || '').toLowerCase().includes(q)) return true
  if ((t.createdBy?.email || '').toLowerCase().includes(q)) return true
  if ((t.assignee?.name || '').toLowerCase().includes(q)) return true
  if ((t.assignedDepartment || '').toLowerCase().includes(q)) return true

  return matchesDateMonthTime(t, q)
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

  const { user: currentUser, isStaff, isOps, isDeptMember } = useCurrentUser()

  // RBAC: normal users (not admin, not operations) get a simplified view
  if (!isOps) {
    return <NormalUserTickets />
  }

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('ticket_view_mode') || 'grid')
  const [tickets, setTickets] = useState([])
  const [metrics, setMetrics] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, urgent: 0 })
  const [loading, setLoading] = useState(true)
  const [staffUsers, setStaffUsers] = useState([])
  const [roleLoading, setRoleLoading] = useState(true)
  const [scope, setScope] = useState(isStaff ? 'all' : 'my')
  const [queueTab, setQueueTab] = useState('all') // ops/admin: 'all' | 'pending' | 'unrouted' | 'my'
  const [mainTab, setMainTab] = useState('unfinished') // 'unfinished' | 'history'
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedDateRange, setSelectedDateRange] = useState('All')
  const [customDate, setCustomDate] = useState('')
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

  // Query Routing Drawer (Ops/Admin)
  const [routeTicket, setRouteTicket] = useState(null)
  const [routeSubmitting, setRouteSubmitting] = useState(false)

  // Ops final reply (email visitor)
  const [opsReply, setOpsReply] = useState({ subject: '', message: '' })
  const [opsReplySubmitting, setOpsReplySubmitting] = useState(false)

  // Dept-Grouped Table / row actions
  const [resolutionTicket, setResolutionTicket] = useState(null) // Send Resolution Reply modal
  const [resolutionMessage, setResolutionMessage] = useState('')
  const [resolutionSubmitting, setResolutionSubmitting] = useState(false)
  const [rerouteSubmitting, setRerouteSubmitting] = useState(false)

  // Team Queues sidebar
  const [deptFilter, setDeptFilter] = useState(null) // client-side dept filter (sidebar)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  // Live polling
  const [lastPollAt, setLastPollAt] = useState(null)
  const [nowTick, setNowTick] = useState(Date.now())

  const openRouteDrawer = (ticket, e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    setRouteTicket(ticket)
  }

  const handleRouteSubmit = async (department, assigneeId) => {
    if (!routeTicket) return
    if (!department.trim()) {
      show('Select a department to route this query to', 'error')
      return
    }
    setRouteSubmitting(true)
    try {
      const res = await apiRouteTicket(routeTicket.id, {
        assignedDepartment: department.trim().toLowerCase(),
        assignedToId: assigneeId || null
      })
      if (res.data?.success) {
        show('Query routed successfully!', 'success')
        setRouteTicket(null)
        fetchTicketsData()
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to route query', 'error')
    } finally {
      setRouteSubmitting(false)
    }
  }

  const handleDeptReroute = async (ticket, department) => {
    if (!ticket || !department) return
    setRerouteSubmitting(true)
    try {
      const res = await apiRerouteTicket(ticket.id, department)
      if (res.data?.success) {
        show(`Routed to ${department} team`, 'success')
        fetchTicketsData()
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to re-route query', 'error')
    } finally {
      setRerouteSubmitting(false)
    }
  }

  const openResolutionModal = (ticket) => {
    setResolutionTicket(ticket)
    setResolutionMessage('')
  }

  const handleResolutionSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!resolutionTicket || !resolutionMessage.trim()) return
    setResolutionSubmitting(true)
    try {
      const res = await apiSendReply(resolutionTicket.id, {
        replyMessage: resolutionMessage.trim(),
        replySubject: `Response to your query [${resolutionTicket.ticketNumber || `#TCK-${resolutionTicket.id}`}]`
      })
      if (res.data?.success) {
        show('Response emailed to visitor & ticket marked resolved', 'success')
        setResolutionTicket(null)
        setResolutionMessage('')
        fetchTicketsData()
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to send response', 'error')
    } finally {
      setResolutionSubmitting(false)
    }
  }

  const handleMarkDone = async (ticketId, e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    try {
      const res = await apiMarkDone(ticketId)
      if (res.data?.success) {
        show('Marked as done — sent to Ops for review', 'success')
        fetchTicketsData()
        if (selectedTicket && selectedTicket.id === ticketId) setSelectedTicket(res.data.data)
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to mark done', 'error')
    }
  }

  const handleOpsReplySubmit = async (e) => {
    e.preventDefault()
    if (!selectedTicket || !opsReply.message.trim()) return
    setOpsReplySubmitting(true)
    try {
      const res = await apiSendReply(selectedTicket.id, {
        replyMessage: opsReply.message.trim(),
        replySubject: opsReply.subject.trim() || `Response to your query [${selectedTicket.ticketNumber || `#TCK-${selectedTicket.id}`}]`
      })
      if (res.data?.success) {
        show('Response emailed to visitor & query marked resolved!', 'success')
        setOpsReply({ subject: '', message: '' })
        openTicketDetail(selectedTicket.id)
        fetchTicketsData()
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to send response', 'error')
    } finally {
      setOpsReplySubmitting(false)
    }
  }

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

  const fetchTicketsData = async (silent = false, signal) => {
    if (!silent) setLoading(true)
    try {
      const effectiveScope = isOps ? (queueTab === 'my' ? 'my' : 'all') : 'my'
      const statusParam = isOps && queueTab === 'pending' ? 'Pending Ops Review' : selectedStatus
      const res = await getTickets({ scope: effectiveScope, search, status: statusParam, priority: selectedPriority, category: selectedCategory }, { signal })
      if (res.data?.success) {
        setTickets(res.data.data || [])
        if (res.data.metrics) setMetrics(res.data.metrics)
        setLastPollAt(Date.now())
      }
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
      if (!silent) show(err.response?.data?.message || 'Failed to load tickets', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchStaff = async (signal) => {
    try {
      const res = await getStaffUsers({ signal })
      if (res.data?.success) setStaffUsers(res.data.data || [])
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
      console.error(err)
    } finally {
      setRoleLoading(false)
    }
  }

  useEffect(() => {
    if (roleLoading) return
    const c = new AbortController()
    fetchTicketsData(false, c.signal)
    return () => c.abort()
  }, [roleLoading, scope, selectedStatus, selectedPriority, selectedCategory])
  useEffect(() => {
    if (roleLoading || !isOps) return
    const c = new AbortController()
    fetchTicketsData(false, c.signal)
    return () => c.abort()
  }, [roleLoading, queueTab, isOps])
  useEffect(() => {
    if (!isStaff) return
    const c = new AbortController()
    fetchStaff(c.signal)
    return () => c.abort()
  }, [isStaff])

  // Seconds ticker for the "Live · updated {n}s ago" indicator
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Poll every 12s while tab is visible; pause when hidden (Page Visibility API)
  useEffect(() => {
    if (roleLoading) return
    const c = new AbortController()
    const poll = () => {
      if (document.visibilityState === 'visible') fetchTicketsData(true, c.signal)
    }
    const id = setInterval(poll, 12000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchTicketsData(true, c.signal)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      c.abort()
    }
  }, [roleLoading, scope, selectedStatus, selectedPriority, selectedCategory, queueTab, isOps])

  const secondsSincePoll = lastPollAt ? Math.max(0, Math.floor((nowTick - lastPollAt) / 1000)) : null

  const unfinishedCount = useMemo(() => {
    return tickets.filter((t) => ['Open', 'In Progress'].includes(t.status)).length
  }, [tickets])

  const pendingOpsCount = useMemo(() => {
    return tickets.filter((t) => t.status === 'Pending Ops Review').length
  }, [tickets])

  const unroutedCount = useMemo(() => {
    return tickets.filter((t) => !t.assignedDepartment && !t.assignedToId && t.status !== 'Closed').length
  }, [tickets])

  const historyCount = useMemo(() => {
    return tickets.filter((t) => ['Pending Ops Review', 'Resolved', 'Closed'].includes(t.status)).length
  }, [tickets])

  const myCount = useMemo(() => {
    return tickets.filter((t) => Number(t.assignedToId) === Number(currentUser.id)).length
  }, [tickets])

  const handleTabChange = (tabKey) => {
    setMainTab(tabKey)
    setSelectedStatus('All')
    setSelectedPriority('All')
    setSelectedCategory('All')
    setSearch('')
    setSelectedDateRange('All')
    setCustomDate('')
    setDeptFilter(null)
  }

  const visibleTickets = useMemo(() => {
    let list = tickets

    if (mainTab === 'unfinished') {
      list = list.filter((t) => ['Open', 'In Progress'].includes(t.status))
    } else if (mainTab === 'pending') {
      list = list.filter((t) => t.status === 'Pending Ops Review')
    } else if (mainTab === 'unrouted') {
      list = list.filter((t) => !t.assignedDepartment && !t.assignedToId && t.status !== 'Closed')
    } else if (mainTab === 'history') {
      list = list.filter((t) => ['Pending Ops Review', 'Resolved', 'Closed'].includes(t.status))
    } else if (mainTab === 'my') {
      list = list.filter((t) => Number(t.assignedToId) === Number(currentUser.id))
    }

    if (deptFilter) {
      list = list.filter((t) => (t.assignedDepartment || '').trim().toLowerCase() === deptFilter)
    }

    if (search && search.trim()) {
      list = list.filter((t) => matchesSearch(t, search))
    }

    if (selectedStatus !== 'All') {
      list = list.filter((t) => t.status === selectedStatus)
    }

    if (selectedPriority !== 'All') {
      list = list.filter((t) => t.priority === selectedPriority)
    }

    if (selectedCategory !== 'All') {
      list = list.filter((t) => t.category === selectedCategory)
    }

    if (selectedDateRange !== 'All') {
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 10)

      list = list.filter((t) => {
        const dStr = t.createdAt || t.updatedAt
        if (!dStr) return false
        const d = new Date(dStr)
        if (isNaN(d.getTime())) return false
        const ticketIso = d.toISOString().slice(0, 10)

        if (selectedDateRange === 'Today') return ticketIso === todayStr
        if (selectedDateRange === 'Yesterday') return ticketIso === yesterdayStr
        if (selectedDateRange === 'ThisMonth') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        if (selectedDateRange === 'Custom' && customDate) return ticketIso === customDate
        return true
      })
    }

    return list
  }, [tickets, mainTab, deptFilter, search, selectedStatus, selectedPriority, selectedCategory, selectedDateRange, customDate, currentUser.id])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchSubmit = (e) => { e.preventDefault(); fetchTicketsData() }
  const handleResetFilters = () => { setSearch(''); setSelectedStatus('All'); setSelectedPriority('All'); setSelectedCategory('All'); setSelectedDateRange('All'); setCustomDate(''); setDeptFilter(null); }
  const hasActiveFilters = search || selectedStatus !== 'All' || selectedPriority !== 'All' || selectedCategory !== 'All' || selectedDateRange !== 'All' || deptFilter

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
        setCreateForm({ title: '', category: 'Bug', priority: 'Medium', description: '', attachment: null })
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
    const textColors = {
      Urgent: 'text-rose-600',
      High: 'text-amber-600',
      Medium: 'text-indigo-600',
      Low: 'text-slate-500'
    }
    const dotColors = {
      Urgent: 'bg-rose-500',
      High: 'bg-amber-500',
      Medium: 'bg-indigo-500',
      Low: 'bg-slate-400'
    }
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${textColors[p] || textColors.Low}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[p] || 'bg-slate-400'}`} />
        <span>{p}</span>
      </span>
    )
  }

  const renderStatusBadge = (s) => {
    const textColors = {
      Open: 'text-amber-600',
      'In Progress': 'text-indigo-600',
      'Pending Ops Review': 'text-purple-600',
      Resolved: 'text-emerald-600',
      Closed: 'text-slate-500'
    }
    const dotColors = {
      Open: 'bg-amber-500',
      'In Progress': 'bg-indigo-500',
      'Pending Ops Review': 'bg-purple-500',
      Resolved: 'bg-emerald-500',
      Closed: 'bg-slate-400'
    }
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${textColors[s] || textColors.Open}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[s] || 'bg-slate-400'}`} />
        <span>{s}</span>
      </span>
    )
  }

  return (
    <div className="w-full max-w-full space-y-4 px-4 sm:px-6 lg:px-8 py-5 min-h-screen">
      {/* Compact Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Support & Helpdesk Tickets</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-slate-400">Manage, track, assign, and resolve support requests.</p>
            <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-semibold">
              <span className="text-slate-500">·</span>
              <button onClick={() => { setSelectedStatus('All'); setSelectedPriority('All'); setSelectedCategory('All'); }} className={`cursor-pointer transition-colors ${selectedStatus === 'All' && selectedPriority === 'All' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-700'}`}>{metrics.total || 0} total</button>
              <button onClick={() => { setSelectedStatus('Open'); setSelectedPriority('All'); }} className={`cursor-pointer transition-colors ${selectedStatus === 'Open' ? 'text-amber-700 font-bold' : 'text-amber-500 hover:text-amber-700'}`}>{metrics.open || 0} open</button>
              <button onClick={() => { setSelectedStatus('In Progress'); setSelectedPriority('All'); }} className={`cursor-pointer transition-colors ${selectedStatus === 'In Progress' ? 'text-indigo-700 font-bold' : 'text-indigo-500 hover:text-indigo-700'}`}>{metrics.inProgress || 0} in progress</button>
              <button onClick={() => { setSelectedStatus('Resolved'); setSelectedPriority('All'); }} className={`cursor-pointer transition-colors ${selectedStatus === 'Resolved' ? 'text-emerald-700 font-bold' : 'text-emerald-500 hover:text-emerald-700'}`}>{metrics.resolved || 0} resolved</button>
              {(metrics.urgent || 0) > 0 && (
                <button onClick={() => { setSelectedPriority('Urgent'); setSelectedStatus('All'); }} className={`cursor-pointer inline-flex items-center gap-1 transition-colors ${selectedPriority === 'Urgent' ? 'text-rose-700 font-bold' : 'text-rose-500 hover:text-rose-700'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {metrics.urgent} urgent
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Raise New Ticket</span>
        </button>
      </div>

      {/* Unified Primary Navigation Segmented Control Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto [::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button
          onClick={() => handleTabChange('unfinished')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            mainTab === 'unfinished'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Active / Unfinished</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            mainTab === 'unfinished' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {unfinishedCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('pending')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            mainTab === 'pending'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Ops Review</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            mainTab === 'pending' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700'
          }`}>
            {pendingOpsCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('unrouted')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            mainTab === 'unrouted'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Needs Routing</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            mainTab === 'unrouted' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
          }`}>
            {unroutedCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('history')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            mainTab === 'history'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Ticket History</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            mainTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {historyCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('all')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            mainTab === 'all'
              ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>All Tickets</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            mainTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {tickets.length}
          </span>
        </button>
      </div>

      {roleLoading ? (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="h-9 w-64 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-9 w-80 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="flex flex-col lg:flex-row gap-5 items-start">
      <div className="flex-1 min-w-0 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3">
          <div className="text-xs font-extrabold text-slate-800 flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Filter & Search</span>
            {deptFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-700">
                Team: {deptFilter.toUpperCase()}
                <button onClick={() => setDeptFilter(null)} className="hover:text-indigo-900 cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input ref={searchInputRef} type="text" placeholder="Search title, date (e.g. Aug 12), time..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-7 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-slate-50/50" />
              {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-3 h-3" /></button>}
            </form>
            <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-slate-50/50 text-slate-700 focus:outline-none cursor-pointer">
              <option value="All">Priority: All</option>
              {PRIORITIES.filter((p) => p !== 'All').map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-slate-50/50 text-slate-700 focus:outline-none cursor-pointer">
              <option value="All">Status: All</option>
              {STATUSES.filter((s) => s !== 'All').map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {hasActiveFilters && (
              <button onClick={handleResetFilters} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer" title="Reset all filters"><RotateCcw className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
          <span className="text-xs font-medium text-slate-600">Loading support tickets...</span>
        </div>
      ) : visibleTickets.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto border border-indigo-100"><LifeBuoy className="w-6 h-6" /></div>
          <h3 className="text-sm font-bold text-slate-900">No support tickets match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Try resetting your search query or category filters, or click below to submit a new ticket.</p>
          <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all shadow-xs cursor-pointer"><Plus className="w-3.5 h-3.5" /> <span>Raise New Ticket</span></button>
        </div>
      ) : isOps ? (
        <DeptGroupedTable
          tickets={visibleTickets}
          statusBadge={renderStatusBadge}
          priorityBadge={renderPriorityBadge}
          formatTimeAgo={formatTimeAgo}
          onRoute={handleDeptReroute}
          onSendReply={openResolutionModal}
          onView={openTicketDetail}
          hideSendReply={queueTab === 'unrouted'}
          routeSubmitting={rerouteSubmitting}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleTickets.map((t) => (
            <MyAssignedCard
              key={t.id}
              ticket={t}
              statusBadge={renderStatusBadge}
              priorityBadge={renderPriorityBadge}
              formatTimeAgo={formatTimeAgo}
              onMarkDone={handleMarkDone}
              onView={openTicketDetail}
              onNotePosted={() => fetchTicketsData()}
            />
          ))}
        </div>
      )}
      </div>

      {isOps && (
        <TeamQueuesSidebar
          tickets={tickets}
          activeDepartment={deptFilter}
          onSelect={setDeptFilter}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      )}
      </div>
      )}

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Raise Support Ticket / Report Issue" actions={
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
          <button onClick={handleCreateSubmit} disabled={createSubmitting} className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50">
            {createSubmitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      }>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ticket Title *</label>
            <input 
              type="text" 
              placeholder="Brief summary of the issue or request..." 
              value={createForm.title} 
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
              required 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="Bug">Bug / Defect</option>
                <option value="UI Issue">UI / UX Issue</option>
                <option value="Access / Role">Access / Permissions</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Other">Other Query</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority *</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description *</label>
            <textarea 
              rows={4} 
              placeholder="Provide complete details, steps to reproduce, or context for the issue..." 
              value={createForm.description} 
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} 
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">File Attachment <span className="text-slate-400 font-medium">(optional — screenshots, logs, or documents)</span></label>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                id="create-ticket-attachment"
                onChange={(e) => setCreateForm((f) => ({ ...f, attachment: e.target.files[0] || null }))}
                className="hidden"
              />
              <label 
                htmlFor="create-ticket-attachment" 
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <Paperclip className="w-4 h-4 text-slate-500" />
                {createForm.attachment ? 'Change File' : 'Attach File'}
              </label>
              {createForm.attachment && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                  <span className="truncate max-w-[200px]">{createForm.attachment.name}</span>
                  <button 
                    type="button" 
                    onClick={() => setCreateForm((f) => ({ ...f, attachment: null }))}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
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

              <div className="flex items-center gap-2 flex-wrap">
                {isOps && selectedTicket.status !== 'Closed' && (
                  <button
                    onClick={(e) => openRouteDrawer(selectedTicket, e)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <CornerUpRight className="w-4 h-4" /> Route to Team
                  </button>
                )}
                {isOps && (
                  selectedTicket.status !== 'Closed' ? (
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
                  )
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

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400">Routed To:</span>
                  <span className={'px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize ' + (selectedTicket.assignedDepartment ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200')}>{selectedTicket.assignedDepartment || 'Not routed'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-400">Assignee:</span>
                  <span className="font-semibold text-slate-700">{selectedTicket.assignee?.name || 'Unassigned'}</span>
                </div>
                {isStaff && !isOps && ['Open', 'In Progress'].includes(selectedTicket.status) && (
                  <button onClick={() => handleMarkDone(selectedTicket.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] transition-all active:scale-95 cursor-pointer">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Done
                  </button>
                )}
              </div>
            </div>

            {/* External / Visitor Identity Details */}
            {(selectedTicket.externalUserEmail || selectedTicket.externalUserName || selectedTicket.source === 'External API') && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-indigo-800 text-xs flex items-center gap-1.5">
                    <span>🌐 Website Visitor Submission</span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-mono">
                      {selectedTicket.source || 'External API'}
                    </span>
                  </p>
                  {selectedTicket.externalUserId && (
                    <span className="text-[11px] font-mono text-slate-500">ID: {selectedTicket.externalUserId}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-800 font-medium">
                  <div><strong>Name:</strong> {selectedTicket.externalUserName || '—'}</div>
                  <div><strong>Email:</strong> <a href={`mailto:${selectedTicket.externalUserEmail}`} className="text-indigo-600 hover:underline">{selectedTicket.externalUserEmail || '—'}</a></div>
                  <div><strong>Phone:</strong> {selectedTicket.externalUserPhone || '—'}</div>
                </div>
              </div>
            )}

            {/* Attachment Section */}
            {selectedTicket.attachmentUrl && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Uploaded Attachment</span>
                  </span>
                  <a 
                    href={getAttachmentUrl(selectedTicket.attachmentUrl)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:text-indigo-800 text-[11px]"
                  >
                    View / Download <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                {isImageFile(selectedTicket.attachmentUrl) ? (
                  <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-56 bg-slate-50 flex items-center justify-center">
                    <img 
                      src={getAttachmentUrl(selectedTicket.attachmentUrl)} 
                      alt="Ticket Attachment" 
                      className="max-h-56 w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between font-mono text-[11px] text-slate-700">
                    <span className="truncate max-w-[280px]">{selectedTicket.attachmentUrl.split('/').pop()}</span>
                    <a 
                      href={getAttachmentUrl(selectedTicket.attachmentUrl)} 
                      download 
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Custom Metadata (Web3 / Custom Payload details) */}
            {selectedTicket.metadata && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs space-y-2">
                <span className="font-extrabold text-slate-600 uppercase tracking-wider text-[10px] block">
                  Additional Metadata / Web3 Context
                </span>
                {(() => {
                  try {
                    const parsed = typeof selectedTicket.metadata === 'string' 
                      ? JSON.parse(selectedTicket.metadata) 
                      : selectedTicket.metadata;
                    if (typeof parsed === 'object' && parsed !== null) {
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(parsed).map(([key, val]) => (
                            <div key={key} className="bg-white p-2.5 rounded-xl border border-slate-200/60 font-mono text-[11px]">
                              <span className="text-slate-400 font-bold block uppercase text-[9px]">{key}</span>
                              <span className="text-slate-800 font-semibold break-all">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                  } catch (e) {
                    // Fallback to plain text
                  }
                  return <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap">{String(selectedTicket.metadata)}</pre>;
                })()}
              </div>
            )}

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

            {isOps && selectedTicket.status !== 'Closed' && (
              <form onSubmit={handleOpsReplySubmit} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-800">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  Send Final Response to Visitor & Mark Resolved
                </div>
                <input
                  type="text"
                  placeholder={"Subject — e.g. Response to your query [" + (selectedTicket.ticketNumber || ('#TCK-' + selectedTicket.id)) + "]"}
                  value={opsReply.subject}
                  onChange={(e) => setOpsReply((o) => ({ ...o, subject: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <textarea
                  rows={3}
                  required
                  placeholder="Write the resolution reply that will be emailed to the visitor..."
                  value={opsReply.message}
                  onChange={(e) => setOpsReply((o) => ({ ...o, message: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button type="submit" disabled={opsReplySubmitting || !opsReply.message.trim()} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all disabled:opacity-50 cursor-pointer">
                  <Send className="w-3.5 h-3.5" /> {opsReplySubmitting ? 'Sending...' : 'Send Response & Mark Resolved'}
                </button>
              </form>
            )}

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <textarea rows={3} placeholder="Add reply or progress note..." value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm" />
              <button onClick={handleReplySubmit} disabled={replySubmitting} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors">Post Response</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Send Resolution Reply Modal */}
      <Modal
        open={!!resolutionTicket}
        onClose={() => setResolutionTicket(null)}
        title={resolutionTicket ? `Send Resolution [${resolutionTicket.ticketNumber || `#TCK-${resolutionTicket.id}`}]` : 'Send Resolution'}
        actions={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setResolutionTicket(null)}
              className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleResolutionSubmit}
              disabled={resolutionSubmitting || !resolutionMessage.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" /> {resolutionSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        }
      >
        {resolutionTicket && (
          <form onSubmit={handleResolutionSubmit} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <h4 className="text-sm font-bold text-slate-900 leading-snug">{getCleanTitle(resolutionTicket.title, resolutionTicket.description, resolutionTicket.createdBy?.name || resolutionTicket.externalUserName)}</h4>
              {resolutionTicket.externalUserEmail && (
                <p className="mt-1.5 text-[11px] text-slate-500 font-medium"><strong>Visitor:</strong> {resolutionTicket.externalUserName || '—'} · {resolutionTicket.externalUserEmail}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Reply (emailed to visitor) *</label>
              <textarea
                rows={4}
                autoFocus
                required
                placeholder="Write the resolution reply that will be emailed to the visitor..."
                value={resolutionMessage}
                onChange={(e) => setResolutionMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-[11px] text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>On send, the reply is emailed to the visitor and this ticket is marked <strong>Resolved</strong>.</span>
            </div>
          </form>
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

      <RouteDrawer
        ticket={routeTicket}
        allStaff={staffUsers}
        onClose={() => setRouteTicket(null)}
        onRoute={handleRouteSubmit}
        submitting={routeSubmitting}
      />
    </div>
  )
}
