import { useEffect, useState, useMemo, useRef } from 'react'
import { getTickets, getTicketById, createTicket, addTicketComment, markTicketDone } from '../../api/ticket'
import Modal from '../../components/Modal'
import MyAssignedCard from '../../components/MyAssignedCard'
import { useToast } from '../../components/ToastProvider'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  Paperclip,
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  LayoutGrid,
  List,
  Sparkles,
  Activity,
  X,
  Eye,
  Loader2,
  RefreshCw,
  Tag,
  Calendar,
  Check,
  Zap
} from 'lucide-react'

const CATEGORIES = ['All', 'Bug', 'UI Issue', 'Access / Role', 'Feature Request', 'Other']
const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Urgent']
const STATUSES = ['All', 'Open', 'In Progress', 'Pending Ops Review', 'Resolved', 'Closed']

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

const getCleanTitle = (title = '', desc = '', name = '') => {
  if (!title) return 'Support Ticket'
  if (/^Contact Inquiry from/i.test(title.trim())) {
    const cleanSnippet = desc?.split(/---|Contact & Metadata/i)[0]?.trim()
    if (cleanSnippet && cleanSnippet.length > 5) {
      return cleanSnippet.length > 60 ? cleanSnippet.slice(0, 60) + '...' : cleanSnippet
    }
    const cleanName = title.replace(/^Contact Inquiry from/i, '').trim() || name || 'Visitor'
    return `Inquiry from ${cleanName}`
  }
  return title
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
    'Pending Ops Review': 'bg-purple-50/90 text-purple-700 border-purple-300/80 shadow-2xs',
    Resolved: 'bg-emerald-50/90 text-emerald-700 border-emerald-300/80 shadow-2xs',
    Closed: 'bg-slate-100/90 text-slate-600 border-slate-300/80 shadow-2xs'
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${configs[s] || configs.Open}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s === 'Open' ? 'bg-amber-500' : s === 'In Progress' ? 'bg-indigo-500' : s === 'Pending Ops Review' ? 'bg-purple-500' : s === 'Resolved' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
      {s}
    </span>
  )
}

export default function NormalUserTickets() {
  const { show } = useToast()
  const { user: currentUser } = useCurrentUser()
  const searchInputRef = useRef(null)

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'

  // Search and Filters
  const [mainTab, setMainTab] = useState('unfinished') // 'unfinished' (Active / Unfinished) | 'history' (Ticket History)
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedPriority, setSelectedPriority] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedDateRange, setSelectedDateRange] = useState('All') // 'All' | 'Today' | 'Yesterday' | 'ThisMonth' | 'Custom'
  const [customDate, setCustomDate] = useState('')

  // Raise Ticket Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({ title: '', category: 'Bug', priority: 'Medium', description: '', attachment: null })

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [note, setNote] = useState('')
  const [posting, setPosting] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)

  // Live polling
  const [lastPollAt, setLastPollAt] = useState(null)
  const [nowTick, setNowTick] = useState(Date.now())

  const fetchTicketsData = async (silent = false, signal) => {
    if (!silent) setLoading(true)
    try {
      const res = await getTickets({ scope: 'my' }, { signal })
      if (res.data?.success) {
        let list = res.data.data || []
        list = list.filter((t) => Number(t.assignedToId) === Number(currentUser.id))
        list = list.slice().sort((a, b) => {
          const ta = new Date(a.updatedAt || a.createdAt).getTime()
          const tb = new Date(b.updatedAt || b.createdAt).getTime()
          return tb - ta
        })
        setTickets(list)
        setLastPollAt(Date.now())
      }
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
      if (!silent) show(err.response?.data?.message || 'Failed to load tickets', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    const c = new AbortController()
    fetchTicketsData(false, c.signal)
    return () => c.abort()
  }, [])

  // Seconds ticker for the "Live · updated {n}s ago" indicator
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Keyboard shortcut Cmd/Ctrl + K for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Poll every 12s while tab is visible; pause when hidden
  useEffect(() => {
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
  }, [])

  const secondsSincePoll = lastPollAt ? Math.max(0, Math.floor((nowTick - lastPollAt) / 1000)) : null

  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = tickets.length
    const open = tickets.filter((t) => t.status === 'Open').length
    const inProgress = tickets.filter((t) => t.status === 'In Progress').length
    const pendingOps = tickets.filter((t) => t.status === 'Pending Ops Review').length
    const resolved = tickets.filter((t) => ['Resolved', 'Closed'].includes(t.status)).length
    const urgent = tickets.filter((t) => t.priority === 'Urgent' && t.status !== 'Closed').length
    
    const unfinishedCount = open + inProgress
    const historyCount = pendingOps + resolved

    return { total, open, inProgress, pendingOps, resolved, urgent, unfinishedCount, historyCount }
  }, [tickets])

  const statusOptions = useMemo(() => {
    if (mainTab === 'unfinished') {
      return ['All', 'Open', 'In Progress']
    } else {
      return ['All', 'Pending Ops Review', 'Resolved', 'Closed']
    }
  }, [mainTab])

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    let list = [...tickets]

    // 1. Filter by primary mainTab
    if (mainTab === 'unfinished') {
      list = list.filter((t) => ['Open', 'In Progress'].includes(t.status))
    } else if (mainTab === 'history') {
      list = list.filter((t) => ['Pending Ops Review', 'Resolved', 'Closed'].includes(t.status))
    }

    // 2. Search
    if (search.trim()) {
      list = list.filter((t) => matchesSearch(t, search))
    }

    // 3. Sub-status filter
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
  }, [tickets, mainTab, search, selectedStatus, selectedPriority, selectedCategory, selectedDateRange, customDate])

  const hasActiveFilters = search || selectedStatus !== 'All' || selectedPriority !== 'All' || selectedCategory !== 'All' || selectedDateRange !== 'All'

  const handleResetFilters = () => {
    setSearch('')
    setSelectedStatus('All')
    setSelectedPriority('All')
    setSelectedCategory('All')
    setSelectedDateRange('All')
    setCustomDate('')
  }

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
        show('Ticket submitted successfully!', 'success')
        setCreateForm({ title: '', category: 'Bug', priority: 'Medium', description: '', attachment: null })
        setIsCreateOpen(false)
        fetchTicketsData()
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to submit ticket', 'error')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleMarkDone = async (ticketId) => {
    setMarkingDone(true)
    try {
      const res = await markTicketDone(ticketId)
      if (res.data?.success) {
        show('Marked as done — sent to Ops for review', 'success')
        fetchTicketsData()
        if (selectedTicket && selectedTicket.id === ticketId) setSelectedTicket(res.data.data)
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to mark done', 'error')
    } finally {
      setMarkingDone(false)
    }
  }

  const handlePostNote = async (e) => {
    e.preventDefault()
    if (!selectedTicket || !note.trim()) return
    setPosting(true)
    try {
      const fd = new FormData()
      fd.append('comment', `📝 Internal note: ${note.trim()}`)
      const res = await addTicketComment(selectedTicket.id, fd)
      if (res.data?.success) {
        show('Note added', 'success')
        setNote('')
        fetchTicketsData()
        // Refresh detail view
        openTicketDetail(selectedTicket.id)
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to add note', 'error')
    } finally {
      setPosting(false)
    }
  }

  const openTicketDetail = async (ticketId) => {
    setDetailModalOpen(true)
    setLoadingDetail(true)
    setNote('')
    try {
      const res = await getTicketById(ticketId)
      if (res.data?.success) {
        setSelectedTicket(res.data.data)
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to load details', 'error')
    } finally {
      setLoadingDetail(false)
    }
  }

  const closeDetailModal = () => {
    setDetailModalOpen(false)
    setSelectedTicket(null)
  }

  return (
    <div className="w-full max-w-full space-y-4 px-4 sm:px-6 lg:px-8 py-5 min-h-screen bg-slate-50/60">
      {/* Clean SaaS Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Support & Helpdesk Tickets</h1>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-xs text-slate-500">Tickets assigned directly to you and support requests raised by your team.</p>
            <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-semibold text-slate-500">
              <span>·</span>
              <button
                onClick={() => { setSelectedStatus('All'); setSelectedPriority('All'); setSelectedCategory('All'); }}
                className={`cursor-pointer transition-colors ${selectedStatus === 'All' && selectedPriority === 'All' ? 'text-slate-900 font-bold' : 'hover:text-slate-900'}`}
              >
                {metrics.total} total
              </button>
              <button
                onClick={() => { setSelectedStatus('Open'); setSelectedPriority('All'); }}
                className={`cursor-pointer transition-colors inline-flex items-center gap-1 ${selectedStatus === 'Open' ? 'text-amber-700 font-bold' : 'text-amber-600 hover:text-amber-800'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {metrics.open} open
              </button>
              <button
                onClick={() => { setSelectedStatus('In Progress'); setSelectedPriority('All'); }}
                className={`cursor-pointer transition-colors inline-flex items-center gap-1 ${selectedStatus === 'In Progress' ? 'text-indigo-700 font-bold' : 'text-indigo-600 hover:text-indigo-800'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {metrics.inProgress} in progress
              </button>
              <button
                onClick={() => { setSelectedStatus('Pending Ops Review'); setSelectedPriority('All'); }}
                className={`cursor-pointer transition-colors inline-flex items-center gap-1 ${selectedStatus === 'Pending Ops Review' ? 'text-purple-700 font-bold' : 'text-purple-600 hover:text-purple-800'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                {metrics.pendingOps} ops review
              </button>
              <button
                onClick={() => { setSelectedStatus('Resolved'); setSelectedPriority('All'); }}
                className={`cursor-pointer transition-colors inline-flex items-center gap-1 ${selectedStatus === 'Resolved' ? 'text-emerald-700 font-bold' : 'text-emerald-600 hover:text-emerald-800'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {metrics.resolved} resolved
              </button>
              {metrics.urgent > 0 && (
                <button
                  onClick={() => { setSelectedPriority('Urgent'); setSelectedStatus('All'); }}
                  className={`cursor-pointer inline-flex items-center gap-1 transition-colors ${selectedPriority === 'Urgent' ? 'text-rose-700 font-bold' : 'text-rose-600 hover:text-rose-800'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {metrics.urgent} urgent
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs hover:shadow-slate-900/20 active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Support Ticket</span>
        </button>
      </div>

      {/* Main Navigation Tabs: Active/Unfinished vs History */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => { setMainTab('unfinished'); setSelectedStatus('All'); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
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
            {metrics.unfinishedCount}
          </span>
        </button>

        <button
          onClick={() => { setMainTab('history'); setSelectedStatus('All'); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
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
            {metrics.historyCount}
          </span>
        </button>
      </div>

      {/* Main Container */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Search & Filter Tickets</span>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {statusOptions.map((status) => {
                const count = status === 'All'
                  ? (mainTab === 'unfinished' ? metrics.unfinishedCount : metrics.historyCount)
                  : tickets.filter((t) => t.status === status).length
                const label = status === 'All' ? (mainTab === 'unfinished' ? 'Status: All Active' : 'Status: All History') : `Status: ${status}`
                return (
                  <option key={status} value={status} className="bg-white text-slate-800 font-semibold">
                    {label} ({count})
                  </option>
                )
              })}
            </select>
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, date (e.g. Aug 12), time, month..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Dropdown */}
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">Date: All Time</option>
              <option value="Today">Date: Today</option>
              <option value="Yesterday">Date: Yesterday</option>
              <option value="ThisMonth">Date: This Month</option>
              <option value="Custom">Date: Custom Date...</option>
            </select>

            {selectedDateRange === 'Custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-indigo-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              />
            )}

            {/* Priority Filter Dropdown */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">Priority: All</option>
              <option value="Urgent">Priority: Urgent</option>
              <option value="High">Priority: High</option>
              <option value="Medium">Priority: Medium</option>
              <option value="Low">Priority: Low</option>
            </select>

            {/* Category Filter Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">Category: All</option>
              <option value="Bug">Bug</option>
              <option value="UI Issue">UI Issue</option>
              <option value="Access / Role">Access / Role</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Other">Other</option>
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="p-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                title="Reset filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* View Switcher */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Display */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 liquid-glass-card rounded-3xl">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <span className="text-xs font-bold text-slate-600">Loading your tickets...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-16 px-4 text-center liquid-glass-card rounded-3xl space-y-3">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <LifeBuoy className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-800">
              {hasActiveFilters ? 'No tickets match your filters.' : 'No tickets assigned to you right now.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Tickets assigned to you by Ops or Admin will appear here.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer mt-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTickets.map((t) => (
              <MyAssignedCard
                key={t.id}
                ticket={t}
                statusBadge={renderStatusBadge}
                priorityBadge={renderPriorityBadge}
                formatTimeAgo={formatTimeAgo}
                onMarkDone={handleMarkDone}
                onView={() => openTicketDetail(t.id)}
                onNotePosted={() => fetchTicketsData()}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated Date & Time</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-indigo-600 block">
                          {t.ticketNumber || `#TCK-${t.id}`}
                        </span>
                        <span className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer block truncate max-w-xs" onClick={() => openTicketDetail(t.id)}>
                          {getCleanTitle(t.title, t.description, t.createdBy?.name || t.externalUserName)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        {t.category || 'Bug'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{renderPriorityBadge(t.priority || 'Medium')}</td>
                    <td className="px-4 py-3">{renderStatusBadge(t.status)}</td>
                    <td className="px-4 py-3 text-slate-500 font-medium">
                      <div>
                        <span className="font-semibold text-slate-700 block">{new Date(t.updatedAt || t.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        <span className="text-[10px] text-slate-400">({formatTimeAgo(t.updatedAt || t.createdAt)})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openTicketDetail(t.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        {['Open', 'In Progress'].includes(t.status) && (
                          <button
                            onClick={() => handleMarkDone(t.id)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition-colors cursor-pointer"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Raise Support Ticket Modal */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Raise Support Ticket / Report Issue"
        actions={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSubmit}
              disabled={createSubmitting}
              className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {createSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        }
      >
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
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
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
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
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
                id="normal-ticket-attachment"
                onChange={(e) => setCreateForm((f) => ({ ...f, attachment: e.target.files[0] || null }))}
                className="hidden"
              />
              <label
                htmlFor="normal-ticket-attachment"
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

      {/* Ticket Details Modal */}
      <Modal
        open={detailModalOpen}
        onClose={closeDetailModal}
        title={selectedTicket ? `Ticket [${selectedTicket.ticketNumber || `#TCK-${selectedTicket.id}`}]` : 'Ticket Details'}
      >
        {loadingDetail || !selectedTicket ? (
          <div className="p-8 text-center flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs font-bold text-slate-500">Loading ticket details...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {renderStatusBadge(selectedTicket.status)}
              {renderPriorityBadge(selectedTicket.priority || 'Medium')}
              {selectedTicket.externalUserEmail && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-700">Website Query</span>
              )}
            </div>

            <h2 className="text-lg font-black text-slate-900">
              {getCleanTitle(selectedTicket.title, selectedTicket.description, selectedTicket.createdBy?.name || selectedTicket.externalUserName)}
            </h2>

            <p className="text-sm text-slate-600 whitespace-pre-wrap">
              {selectedTicket.description?.split(/---|Contact & Metadata/i)[0]?.trim() || 'No description provided.'}
            </p>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400">Routed To:</span>
                <span className={'px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize ' + (selectedTicket.assignedDepartment ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-500 border-slate-200')}>
                  {selectedTicket.assignedDepartment || 'Not routed'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400">Assignee:</span>
                <span className="font-semibold text-slate-700">{selectedTicket.assignee?.name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400">Created:</span>
                <span>{formatTimeAgo(selectedTicket.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400">Last Updated:</span>
                <span>{formatTimeAgo(selectedTicket.updatedAt)}</span>
              </div>
            </div>

            {selectedTicket.externalUserEmail && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-slate-700 space-y-1">
                <p className="font-bold text-indigo-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Visitor Contact Details
                </p>
                <p><strong>Name:</strong> {selectedTicket.externalUserName || '—'}</p>
                <p><strong>Email:</strong> {selectedTicket.externalUserEmail || '—'}</p>
                <p><strong>Phone:</strong> {selectedTicket.externalUserPhone || '—'}</p>
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

            {['Open', 'In Progress'].includes(selectedTicket.status) && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <form onSubmit={handlePostNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Post an internal note..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNote('')}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={posting || !note.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Post Note
                    </button>
                  </div>
                </form>
                <button
                  onClick={() => handleMarkDone(selectedTicket.id)}
                  disabled={markingDone}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {markingDone ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Mark as Done — hand to Ops for review
                </button>
              </div>
            )}

            {selectedTicket.status === 'Pending Ops Review' && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5 text-xs text-purple-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>Finished & sent to Ops. Ops will review it and send the final resolution response to the visitor.</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
