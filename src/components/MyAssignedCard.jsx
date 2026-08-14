import { useState } from 'react'
import { CheckCircle2, Eye, MessageSquarePlus, Loader2, Send, X, Calendar } from 'lucide-react'
import { addTicketComment } from '../api/ticket'
import { useToast } from './ToastProvider'

const formatExactDateTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export default function MyAssignedCard({
  ticket,
  statusBadge,
  priorityBadge,
  formatTimeAgo,
  onMarkDone,
  onView,
  onNotePosted
}) {
  const { show } = useToast()
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [posting, setPosting] = useState(false)
  const [markingDone, setMarkingDone] = useState(false)

  const getLastUpdated = () => ticket?.updatedAt || ticket?.createdAt || null

  const handlePostNote = async (e) => {
    e.preventDefault()
    if (!note.trim()) return
    setPosting(true)
    try {
      const fd = new FormData()
      fd.append('comment', `📝 Internal note: ${note.trim()}`)
      await addTicketComment(ticket.id, fd)
      show('Note added', 'success')
      setNote('')
      setNoteOpen(false)
      if (onNotePosted) onNotePosted(ticket.id)
    } catch (err) {
      show(err.response?.data?.message || 'Failed to add note', 'error')
    } finally {
      setPosting(false)
    }
  }

  const handleDone = async () => {
    if (markingDone) return
    setMarkingDone(true)
    try {
      await onMarkDone(ticket.id)
    } catch (err) {
      // toast handled by parent
    } finally {
      setMarkingDone(false)
    }
  }

  return (
    <div className="liquid-glass-card rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-indigo-400/60 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-extrabold text-indigo-700 font-mono bg-indigo-50/90 px-2.5 py-1 rounded-xl border border-indigo-200/60 shadow-2xs">{ticket.ticketNumber || `#TCK-${ticket.id}`}</span>
        </div>
        <div className="flex items-center gap-2">{priorityBadge(ticket.priority || 'Medium')}</div>
      </div>

      <div className="space-y-2">
        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
          {(ticket.title || '').replace(/^Contact Inquiry from/i, '') || 'Support Ticket'}
        </h3>
        
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
          {statusBadge(ticket.status)}
          <span className="inline-flex items-center gap-1 font-semibold text-slate-600" title={getLastUpdated()}>
            <Calendar className="w-3 h-3 text-indigo-500" />
            <span>{formatExactDateTime(getLastUpdated())}</span>
            <span className="text-slate-400">({formatTimeAgo(getLastUpdated())})</span>
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200/60 space-y-2.5">
        {['Open', 'In Progress'].includes(ticket.status) && (
          <button
            onClick={handleDone}
            disabled={markingDone}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {markingDone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Mark Done
          </button>
        )}

        {noteOpen ? (
          <form onSubmit={handlePostNote} className="space-y-2">
            <textarea
              rows={2}
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Type an internal note..."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => { setNoteOpen(false); setNote('') }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
              <button type="submit" disabled={posting || !note.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition-colors disabled:opacity-50 cursor-pointer">
                {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Post Note
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onView(ticket.id)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>
            <button
              onClick={() => setNoteOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" /> Add Note
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
