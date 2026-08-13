import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getTickets,
  getTicketById,
  addTicketComment,
  markTicketDone
} from '../api/ticket'
import Modal from './Modal'
import { useToast } from './ToastProvider'
import {
  Inbox,
  Search,
  CheckCircle2,
  ChevronRight,
  Eye,
  MessageSquare,
  Send,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react'

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

const getCleanTitle = (title = '') => {
  if (!title) return 'Support Query'
  if (/^Contact Inquiry from/i.test(title.trim())) {
    return title.replace(/^Contact Inquiry from/i, '').trim() || 'Visitor Inquiry'
  }
  return title
}

const pBadge = (p) => {
  const cfg = {
    Urgent: 'bg-rose-50 text-rose-700 border-rose-200',
    High: 'bg-amber-50 text-amber-700 border-amber-200',
    Medium: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Low: 'bg-slate-100 text-slate-600 border-slate-200'
  }[p] || 'bg-slate-100 text-slate-600 border-slate-200'
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg}`}>{p}</span>
}

const sBadge = (s) => {
  const cfg = {
    Open: 'bg-amber-50 text-amber-700 border-amber-300',
    'In Progress': 'bg-indigo-50 text-indigo-700 border-indigo-300',
    'Pending Ops Review': 'bg-purple-50 text-purple-700 border-purple-300',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    Closed: 'bg-slate-100 text-slate-600 border-slate-300'
  }[s] || 'bg-slate-100 text-slate-600 border-slate-300'
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cfg}`}>{s}</span>
}

export default function AssignedQueries({ title = 'Assigned Queries', accent = 'indigo' }) {
  const { show } = useToast()
  const [tickets, setTickets] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('action') // 'action' | 'review' | 'all'
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [open, setOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [doneId, setDoneId] = useState(null)

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getTickets({ scope: 'all' })
      if (res.data?.success) {
        setTickets(res.data.data || [])
        if (res.data.metrics) setMetrics(res.data.metrics)
      }
    } catch (err) {
      show(err.response?.data?.message || 'Failed to load queries', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = tickets.filter((t) => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || `${t.ticketNumber || ''} ${getCleanTitle(t.title)} ${t.description || ''}`.toLowerCase().includes(q)
    if (tab === 'action') return matchesSearch && ['Open', 'In Progress'].includes(t.status)
    if (tab === 'review') return matchesSearch && t.status === 'Pending Ops Review'
    return matchesSearch
  })

  const actionCount = tickets.filter((t) => ['Open', 'In Progress'].includes(t.status)).length
  const reviewCount = tickets.filter((t) => t.status === 'Pending Ops Review').length

  const openDetail = async (id) => {
    setOpen(true)
    setLoadingDetail(true)
    try {
      const res = await getTicketById(id)
      if (res.data?.success) { setDetail(res.data.data); setNote('') }
    } catch (err) { show(err.response?.data?.message || 'Failed to load details', 'error') } finally { setLoadingDetail(false) }
  }

  const handleMarkDone = async (ticketId) => {
    setDoneId(ticketId)
    try {
      const res = await markTicketDone(ticketId)
      if (res.data?.success) {
        show('Marked as done. Sent to Ops for review.', 'success')
        fetchData()
        if (detail && detail.id === ticketId) setDetail(res.data.data)
      }
    } catch (err) { show(err.response?.data?.message || 'Failed to update', 'error') } finally { setDoneId(null) }
  }

  const handlePostNote = async (e) => {
    e.preventDefault()
    if (!detail || !note.trim()) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('comment', note.trim())
      const res = await addTicketComment(detail.id, fd)
      if (res.data?.success) {
        show('Note posted', 'success')
        setNote('')
        openDetail(detail.id)
      }
    } catch (err) { show(err.response?.data?.message || 'Failed to post note', 'error') } finally { setSubmitting(false) }
  }

  const tabBtn = (key, label, count, color) => (
    <button
      onClick={() => setTab(key)}
      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${tab === key ? `${color} shadow-sm` : 'text-slate-500 hover:text-slate-800 bg-white/70'}`}
    >
      {label}
      {count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab === key ? 'bg-white/30' : 'bg-slate-100 text-slate-600'}`}>{count}</span>}
    </button>
  )

  const accentText = { indigo: 'text-indigo-600', purple: 'text-purple-600', green: 'text-emerald-600', rose: 'text-rose-600', amber: 'text-amber-600', sky: 'text-sky-600' }[accent] || 'text-indigo-600'
  const accentBg = { indigo: 'bg-indigo-50 text-indigo-600', purple: 'bg-purple-50 text-purple-600', green: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600', sky: 'bg-sky-50 text-sky-600' }[accent] || 'bg-indigo-50 text-indigo-600'
  const accentSolid = { indigo: 'bg-indigo-600 hover:bg-indigo-700', purple: 'bg-purple-600 hover:bg-purple-700', green: 'bg-emerald-600 hover:bg-emerald-700', rose: 'bg-rose-600 hover:bg-rose-700', amber: 'bg-amber-600 hover:bg-amber-700', sky: 'bg-sky-600 hover:bg-sky-700' }[accent] || 'bg-indigo-600 hover:bg-indigo-700'

  return (
    <section className="liquid-glass-card rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${accentBg}`}><Inbox className="w-5 h-5" /></div>
          <div>
            <h2 className={`text-base font-black text-slate-900`}>{title}</h2>
            <p className="text-[11px] text-slate-500 font-medium">Queries routed to {currentUser.name ? `${currentUser.name}'s` : 'your'} team · follow up & mark done</p>
          </div>
        </div>
        <Link to="/dashboard/tickets" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors self-start sm:self-auto">
          Open Helpdesk <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
        <div className="inline-flex p-1 bg-slate-200/50 rounded-2xl">
          {tabBtn('action', 'Action Required', actionCount, `${accentSolid} text-white`)}
          {tabBtn('review', 'In Ops Review', reviewCount, 'bg-purple-600 text-white')}
          {tabBtn('all', 'All', tickets.length, 'bg-slate-800 text-white')}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search queries..." className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs font-bold text-slate-500">Loading queries...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 px-4 text-center space-y-2">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto"><Inbox className="w-6 h-6" /></div>
          <p className="text-sm font-bold text-slate-700">No queries in this view</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">When Ops & Admin route a website query to your team it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((t) => (
            <div key={t.id} className="group flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/60 p-3.5 hover:border-indigo-300 hover:bg-white transition-all">
              <button onClick={() => openDetail(t.id)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-extrabold text-indigo-700 font-mono">{t.ticketNumber || `#TCK-${t.id}`}</span>
                  {pBadge(t.priority || 'Medium')}
                  {sBadge(t.status)}
                </div>
                <h3 className={`mt-1 text-sm font-bold text-slate-900 group-hover:${accentText} line-clamp-1`}>{getCleanTitle(t.title)}</h3>
                <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{t.description?.split(/---|Contact & Metadata/i)[0]?.trim() || 'No description.'}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                  <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {t.comments?.length || 0}</span>
                  <span>{formatTimeAgo(t.createdAt)}</span>
                  {t.externalUserEmail && <span className="text-indigo-500 font-bold">Website Query</span>}
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openDetail(t.id)} className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors" title="View details"><Eye className="w-4 h-4" /></button>
                {['Open', 'In Progress'].includes(t.status) && (
                  <button
                    onClick={() => handleMarkDone(t.id)}
                    disabled={doneId === t.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold text-white ${accentSolid} transition-all active:scale-95 disabled:opacity-60`}
                  >
                    {doneId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={detail ? `Query [${detail.ticketNumber || `#TCK-${detail.id}`}]` : 'Query Details'}>
        {loadingDetail || !detail ? (
          <div className="p-10 text-center flex flex-col items-center gap-2 text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /><span className="text-xs font-bold text-slate-500">Loading...</span></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {sBadge(detail.status)}
              {pBadge(detail.priority || 'Medium')}
              {detail.externalUserEmail && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-700">Website Query</span>}
            </div>
            <h2 className="text-lg font-black text-slate-900">{getCleanTitle(detail.title)}</h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{detail.description?.split(/---|Contact & Metadata/i)[0]?.trim() || 'No description provided.'}</p>

            {detail.externalUserEmail && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-slate-700 space-y-1">
                <p className="font-bold text-indigo-700 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Visitor Contact Details</p>
                <p><strong>Name:</strong> {detail.externalUserName || '—'}</p>
                <p><strong>Email:</strong> {detail.externalUserEmail || '—'}</p>
                <p><strong>Phone:</strong> {detail.externalUserPhone || '—'}</p>
              </div>
            )}

            {detail.comments && detail.comments.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 max-h-52 overflow-y-auto pr-1">
                <h4 className="text-xs font-extrabold uppercase text-slate-500">Activity ({detail.comments.length})</h4>
                {detail.comments.map((c) => (
                  <div key={c.id} className={`p-3 rounded-2xl border text-xs ${c.comment?.includes('CLOSED') ? 'bg-emerald-50/80 border-emerald-200' : 'bg-slate-50 border-slate-200/80'}`}>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-1">
                      <span>{c.author?.name || 'User'}</span><span>{formatTimeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap">{c.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {['Open', 'In Progress'].includes(detail.status) && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <form onSubmit={handlePostNote} className="flex items-end gap-2">
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Post a progress note / internal note..." className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                  <button type="submit" disabled={submitting || !note.trim()} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Post
                  </button>
                </form>
                <button onClick={() => handleMarkDone(detail.id)} disabled={doneId === detail.id} className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white ${accentSolid} transition-all active:scale-[0.98] disabled:opacity-60`}>
                  {doneId === detail.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Mark as Done — hand to Ops for review
                </button>
              </div>
            )}

            {detail.status === 'Pending Ops Review' && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5 text-xs text-purple-900 flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>Finished & sent to Ops. Ops will review it and send the final resolution response to the visitor. Open the <Link to="/dashboard/tickets" className="font-bold underline" onClick={() => setOpen(false)}>Helpdesk</Link> to track.</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  )
}