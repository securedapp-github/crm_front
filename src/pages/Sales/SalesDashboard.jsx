import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPipeline, moveDealStage, getPeople } from '../../api/sales'
import { getTasks, updateTask, createTask } from '../../api/task'
import { updateDealNotes } from '../../api/deal'
import { getCampaigns } from '../../api/campaign'
import Modal from '../../components/Modal'

const STAGES = ['New', 'In Progress', 'Proposal', 'Deal Closed', 'Lost']

export default function SalesDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})
  const [tasks, setTasks] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [people, setPeople] = useState([])
  const [scheduleDealId, setScheduleDealId] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarDate, setCalendarDate] = useState('')
  const [calendarTime, setCalendarTime] = useState('')
  const [calendarAmPm, setCalendarAmPm] = useState('AM')
  const [selectedDealId, setSelectedDealId] = useState('')
  const [noteDealId, setNoteDealId] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  }, [])
  const myUserId = Number(user?.id || 0)
  const myEmail = useMemo(() => String(user?.email || '').trim().toLowerCase(), [user])
  const mySalespersonId = useMemo(() => {
    // people endpoint returns items with userId (app user) and base Salesperson id
    const me = (people || []).find(p => (Number(p.userId || 0) === myUserId) || (String(p.email || '').toLowerCase() === myEmail))
    return Number(me?.id || 0)
  }, [people, myUserId, myEmail])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pipeRes, taskRes, peopleRes, campRes] = await Promise.all([getPipeline(), getTasks(), getPeople(), getCampaigns()])
      setData(pipeRes.data?.data || {})
      setTasks(taskRes.data?.data || [])
      setPeople(peopleRes.data?.data || [])
      setCampaigns(Array.isArray(campRes.data?.data) ? campRes.data.data : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const allDeals = useMemo(() => (Object.values(data || {}).flat() || []), [data])
  const myDeals = useMemo(() => (allDeals.filter(d => Number(d.assignedTo) === mySalespersonId)), [allDeals, mySalespersonId])

  const stageTotals = useMemo(() => {
    return STAGES.map(stage => {
      const items = (data[stage] || []).filter(d => Number(d.assignedTo) === mySalespersonId)
      const amount = items.reduce((sum, deal) => sum + Number(deal.value || 0), 0)
      return { stage, count: items.length, amount }
    })
  }, [data, mySalespersonId])

  const stageColumns = useMemo(() => {
    return STAGES.map(stage => {
      const items = (data[stage] || []).filter(d => Number(d.assignedTo) === mySalespersonId)
      return { stage, items }
    })
  }, [data, mySalespersonId])


  const stageNotes = useMemo(() => stageColumns.map(col => ({
    stage: col.stage,
    items: col.items.filter(d => d.notes)
  })), [stageColumns])

  const hasStageNotes = useMemo(() => stageNotes.some(col => col.items.length > 0), [stageNotes])

  const flatNotes = useMemo(() => stageNotes.flatMap(col => col.items.map(deal => ({ stage: col.stage, deal }))), [stageNotes])

  const myTasks = useMemo(() => {
    const setDealIds = new Set(myDeals.map(d => d.id))
    return (tasks || []).filter(t => t.relatedDealId && setDealIds.has(t.relatedDealId))
  }, [tasks, myDeals])

  const upcoming = useMemo(() => {
    const now = new Date()
    return myTasks
      .filter(t => t.status === 'Open' && t.dueDate && new Date(t.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 10)
  }, [myTasks])

  const completedSummary = useMemo(() => {
    const summary = new Map()
    for (const task of myTasks) {
      if (task.status !== 'Completed' || !task.relatedDealId) continue
      const entry = summary.get(task.relatedDealId) || { dealId: task.relatedDealId, count: 0, lastCompleted: null }
      entry.count += 1
      const completedAt = task.updatedAt
        ? new Date(task.updatedAt).getTime()
        : (task.dueDate ? new Date(task.dueDate).getTime() : null)
      if (completedAt && (!entry.lastCompleted || completedAt > entry.lastCompleted)) {
        entry.lastCompleted = completedAt
      }
      summary.set(task.relatedDealId, entry)
    }
    return Array.from(summary.values()).sort((a, b) => b.count - a.count)
  }, [myTasks])

  const dealTitle = (id) => myDeals.find(d => d.id === id)?.title || `Deal #${id}`

  const initials = (name) =>
    (name || '')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'SP'

  useEffect(() => {
    if (!noteDealId) {
      setNoteText('')
      return
    }
    // Don't auto-fill the textbox - keep it empty for new entries
    setNoteText('')
  }, [noteDealId])

  const setStatus = async (task, status) => {
    try {
      await updateTask(task.id, { status })
      await fetchAll()
    } catch { }
  }

  const friendlyTitle = (deal) => {
    if (!deal || !deal.title) return 'Untitled Deal'

    // Try different patterns to extract a cleaner title
    const patterns = [
      /^Campaign Lead -\s*(.+?)(?:\s*Opportunity)?$/i,
      /^Campaign:\s*(.+?)(?:\s*\|.*)?$/i,
      /^(.+?)(?:\s*\|.*)?$/
    ]

    for (const pattern of patterns) {
      const match = String(deal.title).match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return deal.title
  }

  const normalise = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

  const formatCallDate = (value) => {
    if (!value) return '—'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatCallTime = (value) => (value ? value : '—')

  const campaignByName = useMemo(() => {
    const map = new Map()
    for (const c of campaigns) {
      const key = normalise(c?.name)
      if (key && !map.has(key)) map.set(key, c)
    }
    return map
  }, [campaigns])

  const campaignByCompany = useMemo(() => {
    const map = new Map()
    for (const c of campaigns) {
      const key = normalise(c?.accountCompany)
      if (key && !map.has(key)) map.set(key, c)
    }
    return map
  }, [campaigns])

  const findCampaignForDeal = (deal) => {
    if (!deal) return null

    const candidateKeys = new Set()
    const pushKey = (value) => {
      const key = normalise(value)
      if (key) candidateKeys.add(key)
    }

    if (deal.title) {
      const raw = String(deal.title)
      pushKey(raw)
      const stripped = raw
        .replace(/^Campaign\s*Lead\s*-\s*/i, '')
        .replace(/\s*Opportunity$/i, '')
        .replace(/-W\d{3}$/i, '')
      pushKey(stripped)

      const patterns = [
        /^Campaign Lead -\s*(.+?)(?:\s*Opportunity)?$/i,
        /^(.+?)(?:\s*Opportunity)?$/i,
        /^Campaign:\s*(.+?)(?:\s*\|.*)?$/i,
        /^(.+?)(?:\s*\|.*)?$/i
      ]
      for (const pattern of patterns) {
        const match = raw.match(pattern)
        if (match && match[1]) pushKey(match[1])
      }
    }

    if (deal.contact) {
      pushKey(deal.contact.name)
      pushKey(deal.contact.company)
      if (deal.contact.email && deal.contact.email.includes('@')) {
        pushKey(deal.contact.email.split('@')[0])
      }
    }

    pushKey(deal.accountCompany)
    pushKey(deal.accountDomain)

    for (const key of candidateKeys) {
      const byName = campaignByName.get(key)
      if (byName) return byName
      const byCompany = campaignByCompany.get(key)
      if (byCompany) return byCompany
    }

    // Partial containment fallback
    if (deal.title) {
      const dealTitle = normalise(deal.title)
      const matched = Array.from(campaignByName.entries()).find(([name]) => dealTitle.includes(name))
      if (matched) return matched[1]
    }

    return null
  }

  const onDragStart = (e, deal) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: deal.id }))
  }

  const onDrop = async (e, stage) => {
    try {
      const payload = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (!payload?.id) return
      await moveDealStage(payload.id, stage)
      await fetchAll()
    } catch { }
  }

  const onDragOver = (e) => e.preventDefault()

  const saveNotes = async () => {
    if (!noteDealId) return
    setNoteSaving(true)
    try {
      await updateDealNotes(Number(noteDealId), noteText)
      setNoteText('') // Clear textbox after save
      await fetchAll()
    } finally {
      setNoteSaving(false)
    }
  }

  const openCalendar = () => {
    if (!scheduleDealId) return
    const now = new Date()
    setCalendarDate(now.toISOString().slice(0, 10))
    // initialise as 12-hour time and AM/PM
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const isPM = hours >= 12
    const h12 = hours % 12 === 0 ? 12 : hours % 12
    const mm = String(minutes).padStart(2, '0')
    const hh = String(h12).padStart(2, '0')
    setCalendarTime(`${hh}:${mm}`)
    setCalendarAmPm(isPM ? 'PM' : 'AM')
    setCalendarOpen(true)
  }

  const scheduleFollowUpQuick = async (days) => {
    const idNum = Number(scheduleDealId)
    if (!idNum) return
    const due = new Date()
    due.setDate(due.getDate() + Number(days || 0))
    await createFollowUpTask(idNum, due, `Scheduled from Quick picker (+${days}d)`) // eslint-disable-line no-use-before-define
  }

  const createFollowUpTask = async (dealId, dueDateObj, description) => {
    try {
      await createTask({
        title: 'Follow-up Call',
        description,
        status: 'Open',
        assignedTo: myUserId || null,
        relatedDealId: dealId,
        dueDate: dueDateObj.toISOString()
      })
      setScheduleDealId('')
      await fetchAll()
    } catch { }
  }

  const onCalendarSubmit = async () => {
    if (!scheduleDealId || !calendarDate) return
    const datePart = calendarDate
    const timePart = calendarTime || '09:00'
    // interpret timePart as 12-hour input and convert using AM/PM selector
    const [hhStr, mmStr] = (timePart || '09:00').split(':')
    let hh = Math.max(1, Math.min(12, parseInt(hhStr || '9', 10) || 9))
    const mm = Math.max(0, Math.min(59, parseInt(mmStr || '0', 10) || 0))
    if (calendarAmPm === 'PM' && hh !== 12) hh += 12
    if (calendarAmPm === 'AM' && hh === 12) hh = 0
    const due = new Date(`${datePart}T00:00:00`)
    due.setHours(hh, mm, 0, 0)
    if (Number.isNaN(due.getTime())) {
      return
    }
    await createFollowUpTask(Number(scheduleDealId), due, 'Scheduled from Sales Dashboard calendar')
    setCalendarOpen(false)
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Sales Dashboard</h2>
        <button onClick={fetchAll} disabled={loading} className={`px-4 py-2 rounded-lg text-sm ${loading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{loading ? 'Refreshing...' : 'Refresh Data'}</button>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Quick Schedule</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <select
                className="min-w-[240px] rounded-md border px-3 py-2 text-sm"
                value={scheduleDealId}
                onChange={(e) => { setScheduleDealId(e.target.value); setSelectedDealId(e.target.value); }}
              >
                <option value="">Select your deal…</option>
                {myDeals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <button disabled={!scheduleDealId} onClick={openCalendar} className={`rounded-md px-3 py-2 text-sm font-medium ${scheduleDealId ? 'border border-emerald-500 text-emerald-700 hover:bg-emerald-50' : 'border border-emerald-200 text-emerald-300 cursor-not-allowed'}`}>Pick date &amp; time…</button>
            </div>
          </div>
          <div className="text-sm text-slate-600">Logged in as <span className="font-medium">{user?.name || 'Sales Person'}</span></div>
        </div>
      </section>

      {/* Selected Deal Details */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Selected Deal Details</h3>
          <button
            type="button"
            aria-label="Close details"
            onClick={() => { setSelectedDealId(''); setScheduleDealId(''); }}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            title="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-3 rounded-lg border bg-slate-50/50 p-4 text-sm">
          {(() => {
            const d = myDeals.find(x => x.id === Number(selectedDealId))
            if (!d) return (<div className="text-slate-500">Select a deal from the dropdown or click a deal card to view details.</div>)
            const camp = findCampaignForDeal(d)
            if (!camp) return (<div className="text-slate-500">No campaign details found for this deal.</div>)
            return (
              <div className="space-y-3">
                <div className="rounded-lg border bg-white p-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><div className="text-slate-500">Name</div><div className="text-slate-900 font-medium">{camp.name}</div></div>
                    <div><div className="text-slate-500">Channel</div><div className="text-slate-900">{camp.channel || '—'}</div></div>
                    <div><div className="text-slate-500">Campaign stage</div><div className="text-slate-900">{camp.status || '—'}</div></div>
                    <div><div className="text-slate-500">Priority</div><div className="text-slate-900">{camp.priority || '—'}</div></div>
                    <div><div className="text-slate-500">Entity name</div><div className="text-slate-900">{camp.accountCompany || '—'}</div></div>
                    <div><div className="text-slate-500">Company domain</div><div className="text-slate-900">{camp.accountDomain || '—'}</div></div>
                    <div><div className="text-slate-500">Mobile</div><div className="text-slate-900">{camp.mobile || '—'}</div></div>
                    <div><div className="text-slate-500">Email</div><div className="text-slate-900">{camp.email || '—'}</div></div>
                    <div><div className="text-slate-500">Preferred call date</div><div className="text-slate-900">{formatCallDate(camp.callDate)}</div></div>
                    <div><div className="text-slate-500">Preferred call time</div><div className="text-slate-900">{formatCallTime(camp.callTime)}</div></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-white p-3"><div className="text-[11px] text-slate-500 uppercase">Objective</div><div className="text-sm text-slate-800">{camp.objective || '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3"><div className="text-[11px] text-slate-500 uppercase">Audience Segment</div><div className="text-sm text-slate-800">{camp.audienceSegment || '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3"><div className="text-[11px] text-slate-500 uppercase">Product Line</div><div className="text-sm text-slate-800">{camp.productLine || '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3"><div className="text-[11px] text-slate-500 uppercase">Expected Spend</div><div className="text-sm text-slate-800">{camp.expectedSpend != null ? `₹${Number(camp.expectedSpend).toLocaleString()}` : '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3"><div className="text-[11px] text-slate-500 uppercase">Planned Leads</div><div className="text-sm text-slate-800">{camp.plannedLeads != null ? Number(camp.plannedLeads).toLocaleString() : '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3"><div className="text-[11px] text-slate-500 uppercase">Campaign Code</div><div className="text-sm text-slate-800">{camp.code || '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3"><div className="text-[11px] text-slate-500 uppercase">External Campaign ID</div><div className="text-sm text-slate-800">{camp.externalCampaignId || '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3"><div className="text-[11px] text-slate-500 uppercase">UTM Source</div><div className="text-sm text-slate-800">{camp.utmSource || '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3"><div className="text-[11px] text-slate-500 uppercase">UTM Medium</div><div className="text-sm text-slate-800">{camp.utmMedium || '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3 md:col-span-3"><div className="text-[11px] text-slate-500 uppercase">UTM Campaign</div><div className="text-sm text-slate-800">{camp.utmCampaign || '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3 md:col-span-3"><div className="text-[11px] text-slate-500 uppercase">Description</div><div className="text-sm text-slate-800 whitespace-pre-wrap">{camp.description || '—'}</div></div>
                  <div className="rounded-lg border bg-white p-3 md:col-span-3"><div className="text-[11px] text-slate-500 uppercase">Compliance Checklist</div><div className="text-sm text-slate-800 whitespace-pre-wrap">{camp.complianceChecklist || '—'}</div></div>
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">My Pipeline</h3>
          <p className="text-xs text-slate-500">Drag deals across stages as you progress them</p>
        </div>
        <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
          <div className="min-w-[800px] grid grid-cols-6 text-sm">
            <div className="col-span-1 border-r px-4 py-3 font-medium text-slate-700">Stage</div>
            {stageTotals.map(item => (
              <div key={item.stage} className="flex items-center justify-between border-r px-4 py-3 text-slate-700 last:border-r-0">
                <span>{item.stage}</span>
                <span className="text-xs text-slate-500">{item.count} • ₹{Number(item.amount || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
          <div className="min-w-[800px] grid grid-cols-6">
            <div className="col-span-1 border-r px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  {initials(user?.name)}
                </span>
                <div className="truncate text-sm font-medium text-slate-900">{user?.name || 'You'}</div>
              </div>
            </div>
            {stageColumns.map(col => (
              <div
                key={col.stage}
                className="border-r px-3 py-3 last:border-r-0 bg-slate-50/30"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.stage)}
              >
                <div className="min-h-[96px] space-y-2">
                  {col.items.map(deal => (
                    <div
                      key={deal.id}
                      className="cursor-move rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:shadow-md transition"
                      draggable
                      onDragStart={(e) => onDragStart(e, deal)}
                      onClick={() => {
                        const dealId = String(deal.id)
                        setSelectedDealId(dealId)
                        setScheduleDealId(dealId)
                      }}
                      title={deal.title}
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate font-medium text-slate-900">{friendlyTitle(deal)}</div>
                        <div className="text-xs text-slate-600">₹{Number(deal.value || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                  {col.items.length === 0 && (
                    <div className="py-6 text-center text-xs italic text-slate-400">Drop here</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Your Notes</div>
            {hasStageNotes && (
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                {showNotes ? (
                  <>
                    <span>Hide</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Show All</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
          {hasStageNotes && showNotes ? (
            <div className="px-4 py-4 space-y-3 max-h-96 overflow-y-auto">
              <ul className="space-y-2 text-xs text-slate-600">
                {flatNotes.map(({ stage, deal }) => (
                  <li key={`${stage}-${deal.id}`} className="rounded-md border border-slate-200 bg-slate-50/80 p-2">
                    <div className="font-medium text-slate-700 truncate">{friendlyTitle(deal)}</div>
                    <p className="mt-1 text-slate-600 whitespace-pre-wrap">{deal.notes}</p>
                    {deal.updatedAt && (
                      <span className="mt-1 block text-[10px] text-slate-400">Updated {new Date(deal.updatedAt).toLocaleString()}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : !hasStageNotes ? (
            <div className="px-4 py-6 text-xs text-slate-400">Add a note above to have it appear here for quick reference.</div>
          ) : null}
        </div>
        {!myDeals.length && (
          <div className="text-xs text-slate-500">You have no assigned deals yet. Capture or convert leads to populate your pipeline.</div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Deal Notes</h3>
            <p className="text-xs text-slate-500">Share progress updates visible to admins.</p>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              className="min-w-[240px] rounded-md border px-3 py-2 text-sm"
              value={noteDealId}
              onChange={(e) => setNoteDealId(e.target.value)}
            >
              <option value="">Select deal to update…</option>
              {myDeals.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500">Notes show in admin dashboard under your name.</span>
          </div>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={4}
            placeholder="Type your latest update…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            disabled={!noteDealId || noteSaving}
          />
          <div className="flex justify-end">
            <button
              onClick={saveNotes}
              disabled={!noteDealId || noteSaving}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${(!noteDealId || noteSaving) ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {noteSaving ? 'Saving…' : 'Save Update'}
            </button>
          </div>

          {/* Notes History Display */}
          {noteDealId && (() => {
            const selectedDeal = myDeals.find(d => d.id === Number(noteDealId));
            const history = selectedDeal?.notes || '';
            if (!history) return null;
            return (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Notes History</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{history}</div>
              </div>
            );
          })()}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Assigned Leads */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Assigned Leads</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-left px-3 py-2">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {myDeals.length === 0 ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={2}>No deals assigned to you yet. Please add leads to get started.</td></tr>
                ) : myDeals.map(d => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 text-slate-900">{d.title}</td>
                    <td className="px-3 py-2 text-slate-700">{d.pipelineStage || d.stage || 'New'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact Schedule */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Contact Schedule</h3>
          <div className="mt-3 max-h-80 overflow-y-auto rounded border">
            {upcoming.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-600">No upcoming contacts</div>
            ) : (
              <ul className="divide-y">
                {upcoming.map(t => (
                  <li key={t.id} className="px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{dealTitle(t.relatedDealId)}</div>
                        <div className="text-xs text-slate-600">{new Date(t.dueDate).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setStatus(t, 'Closed')} className="rounded-md border px-2 py-1 text-xs text-slate-700 border-slate-200 hover:bg-slate-50">Close</button>
                        <button onClick={() => setStatus(t, 'Completed')} className="rounded-md border px-2 py-1 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">Completed</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold text-slate-900">Completed Contacts Summary</h4>
            {completedSummary.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No completed contact schedules yet.</p>
            ) : (
              <div className="mt-2 max-h-56 overflow-y-auto rounded border">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Deal</th>
                      <th className="px-3 py-2 text-left">Completed Calls</th>
                      <th className="px-3 py-2 text-left">Last Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {completedSummary.map(item => (
                      <tr key={item.dealId}>
                        <td className="px-3 py-2 text-slate-900">{dealTitle(item.dealId)}</td>
                        <td className="px-3 py-2 text-slate-700">{item.count}</td>
                        <td className="px-3 py-2 text-slate-600">{item.lastCompleted ? new Date(item.lastCompleted).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </section>

      <Modal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        title="Schedule follow-up"
        actions={(
          <div className="flex items-center gap-2">
            <button onClick={() => setCalendarOpen(false)} className="rounded-md border px-3 py-2">Cancel</button>
            <button onClick={onCalendarSubmit} className="rounded-md bg-emerald-600 px-4 py-2 text-white">Save</button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2"
              value={calendarDate}
              onChange={(e) => setCalendarDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                placeholder="hh:mm"
                className="w-full rounded-md border px-3 py-2"
                value={calendarTime}
                onChange={(e) => setCalendarTime(e.target.value)}
              />
              <select
                className="rounded-md border px-2 py-2 text-sm"
                value={calendarAmPm}
                onChange={(e) => setCalendarAmPm(e.target.value)}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500">Your follow-up will be visible in both dashboards.</p>
        </div>
      </Modal>
    </div>
  )
}
