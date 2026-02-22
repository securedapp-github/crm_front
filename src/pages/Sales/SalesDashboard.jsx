import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPeople, getPipeline, markDealDone, moveDealStage } from '../../api/sales'
import { getLeads } from '../../api/lead'
import { getTasks, createTask, updateTask } from '../../api/task'
import { updateDealNotes, createDeal } from '../../api/deal'
import { getCampaigns, createCampaign } from '../../api/campaign'
import { useToast } from '../../components/ToastProvider'
import { api } from '../../api/auth'
import Modal from '../../components/Modal'
import SequenceSelector from '../../components/SequenceSelector'
import * as XLSX from 'xlsx'

const STAGES = ['New', 'In Progress', 'Proposal', 'Deal Completed', 'Lost Opportunity']

const channelOptions = ['Email', 'Social Media', 'Web', 'Event', 'Other']
const currencyOptions = ['USD', 'INR', 'EUR', 'GBP', 'AUD']
const priorityOptions = ['Low', 'Medium', 'High']
const serviceOptions = [
  'Dapp Development',
  'Smart Contract Audit',
  'Dapp Security Audit',
  'Token Audit',
  'Web3 KYC',
  'Web3 Security',
  'Blockchain Forensic',
  'RWA Audit',
  'Crypto Compliance & AMI',
  'Decentralized Identity (DID)',
  'NFTs Development',
  'DeFi Development',
  'LevelUp Academy'
]

export default function SalesDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({}) // Pipeline data (grouped by stage)
  const [salespeople, setSalespeople] = useState([])
  const [tasks, setTasks] = useState([])
  const [leads, setLeads] = useState([])
  const [campaigns, setCampaigns] = useState([])

  // Selection states
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

  // Enrollment state
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollLeadObj, setEnrollLeadObj] = useState(null)

  // Manual entry form state
  const [openForm, setOpenForm] = useState(false)
  const defaultDealForm = () => ({
    name: '',
    code: '',
    objective: '',
    channel: 'Email',
    audienceSegment: '',
    productLine: '',
    startDate: '',
    endDate: '',
    budget: '',
    expectedSpend: '',
    currency: 'USD',
    status: 'Planned',
    priority: 'Medium',
    description: '',
    complianceChecklist: '',
    externalCampaignId: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    accountCompany: '',
    accountDomain: '',
    mobile: '',
    email: '',
    serviceOffering: '',
    callDate: '',
    callTime: '',
    isMarketingCampaign: true
  })
  const [dealForm, setDealForm] = useState(defaultDealForm())
  const [formSaving, setFormSaving] = useState(false)

  // Bulk upload state
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)
  const { show } = useToast()

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  }, [])

  const parseTime = (t) => {
    if (!t) return { hour: '', mer: 'AM' }
    const m = String(t).match(/^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i)
    if (!m) return { hour: '', mer: 'AM' }
    return { hour: String(Number(m[1]) || ''), mer: m[2].toUpperCase() }
  }

  const composeTime = (hour, mer) => {
    if (!hour || !mer) return ''
    return `${hour}:00 ${mer}`
  }
  const myUserId = Number(user?.id || 0)
  const myEmail = useMemo(() => String(user?.email || '').trim().toLowerCase(), [user])
  const mySalespersonId = useMemo(() => {
    // people endpoint returns items with userId (app user) and base Salesperson id
    const me = (salespeople || []).find(p => (Number(p.userId || 0) === myUserId) || (String(p.email || '').toLowerCase() === myEmail))
    return Number(me?.id || 0)
  }, [salespeople, myUserId, myEmail])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const results = await Promise.all([
        getPeople(),
        getPipeline(),
        getTasks(),
        getLeads(),
        getCampaigns()
      ])
      const [peopleRes, pipeRes, tasksRes, leadsRes, campRes] = results

      setSalespeople(Array.isArray(peopleRes.data?.data) ? peopleRes.data.data : [])
      setData(pipeRes.data?.data || {})
      setTasks(tasksRes.data?.data || [])
      setLeads(leadsRes.data?.data || [])
      setCampaigns(Array.isArray(campRes.data?.data) ? campRes.data.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const allDeals = useMemo(() => (Object.values(data || {}).flat() || []), [data])
  const myDeals = useMemo(() => {
    if (!mySalespersonId) return []
    // Filter deals where assignedTo matches Salesperson ID
    return allDeals.filter(d => Number(d.assignedTo) === mySalespersonId)
  }, [allDeals, mySalespersonId])

  const myLeads = useMemo(() => {
    if (!user?.id) return []
    return leads.filter(l => l.assignedTo === user.id && l.status !== 'Converted' && l.status !== 'Lost')
  }, [leads, user])

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

      // Try to match by email if title looks like an email
      // e.g. sumit@example.com-W001 -> sumit@example.com
      const emailMatch = dealTitle.match(/^([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/)
      if (emailMatch && emailMatch[1]) {
        // Check if we have a campaign with this email
        const campaignByEmail = campaigns.find(c => normalise(c.email) === normalise(emailMatch[1]))
        if (campaignByEmail) return campaignByEmail
      }
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
    } catch (err) {
      console.error('Failed to move deal', err)
    }
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
    await createFollowUpTask(idNum, due, `Scheduled from Quick picker(+${days}d)`) // eslint-disable-line no-use-before-define
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

  // Manual entry handler
  const onCreateDeal = async () => {
    try {
      if (!dealForm.name.trim()) {
        show('Campaign name is required', 'error')
        return
      }
      setFormSaving(true)
      const payload = {
        name: dealForm.name.trim(),
        code: dealForm.code || undefined,
        objective: dealForm.objective || undefined,
        channel: dealForm.channel || 'Email',
        audienceSegment: dealForm.audienceSegment || undefined,
        productLine: dealForm.productLine || undefined,
        startDate: dealForm.startDate || undefined,
        endDate: dealForm.endDate || undefined,
        budget: dealForm.budget ? Number(dealForm.budget) : undefined,
        expectedSpend: dealForm.expectedSpend ? Number(dealForm.expectedSpend) : undefined,
        currency: dealForm.currency || 'USD',
        status: dealForm.status || 'Planned',
        priority: dealForm.priority || 'Medium',
        description: dealForm.description || undefined,
        complianceChecklist: dealForm.complianceChecklist || undefined,
        externalCampaignId: dealForm.externalCampaignId || undefined,
        utmSource: dealForm.utmSource || undefined,
        utmMedium: dealForm.utmMedium || undefined,
        utmCampaign: dealForm.utmCampaign || undefined,
        accountCompany: dealForm.accountCompany || undefined,
        accountDomain: dealForm.accountDomain || undefined,
        email: dealForm.email || undefined,
        mobile: dealForm.mobile || undefined,
        serviceOffering: dealForm.serviceOffering || undefined,
        callTime: dealForm.callTime || undefined,
        callDate: dealForm.callDate || undefined,
        isMarketingCampaign: true,
        campaignOwnerId: myUserId || null
      }

      // Remove undefined values
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === '') delete payload[key]
      })

      // Assuming we need to import createCampaign.
      // Since replace_file_content cannot edit imports easily if they are far away, 
      // I will assume I can edit the imports separately.
      // But wait... I can edit imports with another replace_file_content call or multi_replace.
      // I will target imports separately.

      // CALL CREATE CAMPAIGN
      // Wait, replace_file_content limits me to contiguous block.
      // I should update imports first? Or AFTER?
      // I'll update onCreateDeal first, but it will fail if createCampaign is not imported.
      // I'll use multi_replace to do both?
      // No, createCampaign is imported from ../../api/campaign which is line 7. onCreateDeal is line 459.
      // Multi-replace is better for non-contiguous.

      await createCampaign(payload)
      setOpenForm(false)
      setDealForm(defaultDealForm())
      show('Campaign created successfully', 'success')
      await fetchAll()
    } catch (e) {
      show(e.response?.data?.message || 'Failed to create campaign', 'error')
    } finally {
      setFormSaving(false)
    }
  }

  // Download template
  const downloadTemplate = () => {
    const template = [
      { 'Name': '', 'Mobile number': '', 'Service': '', 'Email': '', 'Description': '' }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'deal_upload_template.xlsx')
    show('Template downloaded successfully', 'success')
  }

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!uploadedFile) {
      show('Please select a file', 'error')
      return
    }

    setBulkUploading(true)
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        let workbook
        try {
          workbook = XLSX.read(data, { type: 'array' })
        } catch (parseErr) {
          console.error('Excel parse error:', parseErr)
          show('Failed to parse Excel file. Please ensure it is a valid .xlsx file.', 'error')
          setBulkUploading(false)
          return
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(firstSheet)

        if (!rows || rows.length === 0) {
          show('Excel file is empty', 'error')
          setBulkUploading(false)
          return
        }

        // Map Excel columns to Campaign API payload
        const campaigns = rows.map(row => ({
          name: row['Name'] || row.name || '',
          mobile: row['Mobile number'] || row.mobile || '',
          email: row['Email'] || row.email || '',
          serviceOffering: row['Service'] || row.service || '',
          description: row['Description'] || row.description || '',
          status: 'Planned', // Default status for bulk uploaded campaigns
          source: 'Bulk Upload'
        })).filter(c => c.name) // Filter out rows without name

        if (campaigns.length === 0) {
          show('No valid campaigns found in file (Name is required)', 'error')
          setBulkUploading(false)
          return
        }

        // Send to backend
        try {
          const response = await api.post('/campaigns/bulk', { campaigns })
          const result = response.data?.data

          if (result.success > 0) {
            show(`Successfully created ${result.success} campaign(s)`, 'success')
          }
          if (result.failed > 0) {
            show(`${result.failed} campaign(s) failed. Check console for details.`, 'warning')
            console.error('Failed campaigns:', result.errors)
          }

          setBulkUploadOpen(false)
          setUploadedFile(null)
          await fetchAll()
        } catch (apiErr) {
          console.error('API Error:', apiErr)
          show(apiErr.response?.data?.message || 'Failed to upload campaigns to server', 'error')
        }
      } catch (err) {
        console.error('Unexpected error during bulk upload:', err)
        show('An unexpected error occurred during processing', 'error')
      } finally {
        setBulkUploading(false)
      }
    }

    reader.onerror = () => {
      show('Failed to read file', 'error')
      setBulkUploading(false)
    }

    reader.readAsArrayBuffer(uploadedFile)
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900">Sales Dashboard</h2>
        <div className="flex items-center gap-2">
          {/* Dropdown Menu for + New button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium flex items-center gap-1"
            >
              + New
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  <button
                    onClick={() => { setShowDropdown(false); setOpenForm(true) }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    📝 Manual Entry
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); setBulkUploadOpen(true) }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    📊 Bulk Upload (Excel)
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); downloadTemplate() }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    ⬇️ Download Template
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={fetchAll} disabled={loading} className={`px-4 py-2 rounded-lg text-sm ${loading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{loading ? 'Refreshing...' : 'Refresh Data'}</button>
        </div>
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
              <button disabled={!scheduleDealId} onClick={openCalendar} className={`rounded-md px-3 py-2 text-sm font-medium ${scheduleDealId ? 'border border-emerald-500 text-emerald-700 hover:bg-emerald-50' : 'border border-emerald-200 text-emerald-300 cursor-not-allowed'}`}>Pick date & time…</button>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-600 mb-2">Logged in as <span className="font-medium">{user?.name || 'Sales Person'}</span></div>

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
      </section >

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
        {/* My Leads (Pre-Deal) */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">My Leads</h3>
          <p className="text-xs text-slate-500 mb-3">Leads assigned to you that are not yet converted.</p>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y relative">
                {myLeads.length === 0 ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={3}>No active leads assigned.</td></tr>
                ) : myLeads.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-900">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-[10px] text-slate-500">{l.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${l.status === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => { setEnrollLeadObj(l); setEnrollOpen(true) }}
                        className="text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        Enroll
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Assigned Deals */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">My Active Deals</h3>
          <div className="mt-3 overflow-x-auto max-h-80 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-left px-3 py-2">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {myDeals.length === 0 ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={2}>No deals assigned to you yet.</td></tr>
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

      {/* Sequence Selector Modal */}
      {enrollOpen && enrollLeadObj && (
        <SequenceSelector
          open={enrollOpen}
          onClose={() => { setEnrollOpen(false); setEnrollLeadObj(null) }}
          leadId={enrollLeadObj.id}
          leadName={enrollLeadObj.name}
          onSuccess={() => { }}
        />
      )}

      <Modal
        open={openForm}
        onClose={() => !formSaving && setOpenForm(false)}
        title="Create New Campaign / Deal"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpenForm(false)}
              disabled={formSaving}
              className="px-3 py-2 rounded-md border"
            >
              Cancel
            </button>
            <button
              onClick={onCreateDeal}
              disabled={formSaving}
              className={`px-3 py-2 rounded-md text-white ${formSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {formSaving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 max-h-[70vh] overflow-y-auto pr-2">
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Name *</label>
            <input className="w-full px-3 py-2 border rounded-md" value={dealForm.name} onChange={e => setDealForm(f => ({ ...f, name: e.target.value }))} disabled={formSaving} />
          </div>
          <div className="md:col-span-2 xl:col-span-1">
            <label className="block text-sm text-slate-700">Code</label>
            <input className="w-full px-3 py-2 border rounded-md" value={dealForm.code} onChange={e => setDealForm(f => ({ ...f, code: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Objective</label>
            <input className="w-full px-3 py-2 border rounded-md" value={dealForm.objective} onChange={e => setDealForm(f => ({ ...f, objective: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Channel</label>
            <select className="w-full px-3 py-2 border rounded-md" value={dealForm.channel} onChange={e => setDealForm(f => ({ ...f, channel: e.target.value }))} disabled={formSaving}>
              {channelOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Audience Segment</label>
            <input className="w-full px-3 py-2 border rounded-md" value={dealForm.audienceSegment} onChange={e => setDealForm(f => ({ ...f, audienceSegment: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Product Line</label>
            <input className="w-full px-3 py-2 border rounded-md" value={dealForm.productLine} onChange={e => setDealForm(f => ({ ...f, productLine: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Budget</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={dealForm.budget} onChange={e => setDealForm(f => ({ ...f, budget: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Expected Spend</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={dealForm.expectedSpend} onChange={e => setDealForm(f => ({ ...f, expectedSpend: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Currency</label>
            <select className="w-full px-3 py-2 border rounded-md" value={dealForm.currency} onChange={e => setDealForm(f => ({ ...f, currency: e.target.value }))} disabled={formSaving}>
              {currencyOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Start Date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={dealForm.startDate} onChange={e => setDealForm(f => ({ ...f, startDate: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">End Date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={dealForm.endDate} onChange={e => setDealForm(f => ({ ...f, endDate: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Status</label>
            <select className="w-full px-3 py-2 border rounded-md" value={dealForm.status} onChange={e => setDealForm(f => ({ ...f, status: e.target.value }))} disabled={formSaving}>
              {['New', 'In Progress', 'Proposal', 'Deal Completed', 'Lost Opportunity', 'Planned'].map(stage => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Priority</label>
            <select className="w-full px-3 py-2 border rounded-md" value={dealForm.priority} onChange={e => setDealForm(f => ({ ...f, priority: e.target.value }))} disabled={formSaving}>
              {priorityOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">External Campaign ID</label>
            <input className="w-full px-3 py-2 border rounded-md" value={dealForm.externalCampaignId} onChange={e => setDealForm(f => ({ ...f, externalCampaignId: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM Source</label>
            <input className="w-full px-3 py-2 border rounded-md" value={dealForm.utmSource} onChange={e => setDealForm(f => ({ ...f, utmSource: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM Medium</label>
            <input className="w-full px-3 py-2 border rounded-md" value={dealForm.utmMedium} onChange={e => setDealForm(f => ({ ...f, utmMedium: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM Campaign</label>
            <input className="w-full px-3 py-2 border rounded-md" value={dealForm.utmCampaign} onChange={e => setDealForm(f => ({ ...f, utmCampaign: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Preferred Call Date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={dealForm.callDate || ''} onChange={e => setDealForm(f => ({ ...f, callDate: e.target.value }))} disabled={formSaving} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Preferred Call Time</label>
            {(() => {
              const { hour, mer } = parseTime(dealForm.callTime)
              return (
                <div className="flex items-center gap-2">
                  <select className="px-3 py-2 border rounded-md" value={hour} onChange={e => { const h = e.target.value; setDealForm(f => ({ ...f, callTime: composeTime(h, parseTime(f.callTime).mer) })) }} disabled={formSaving}>
                    {['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(h => <option key={h} value={h}>{h || '—'}</option>)}
                  </select>
                  <select className="px-3 py-2 border rounded-md" value={mer} onChange={e => { const m = e.target.value; setDealForm(f => ({ ...f, callTime: composeTime(parseTime(f.callTime).hour, m) })) }} disabled={formSaving}>
                    {['AM', 'PM'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )
            })()}
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Description</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={dealForm.description} onChange={e => setDealForm(f => ({ ...f, description: e.target.value }))} disabled={formSaving} />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Compliance Checklist</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={2} value={dealForm.complianceChecklist} onChange={e => setDealForm(f => ({ ...f, complianceChecklist: e.target.value }))} disabled={formSaving} />
          </div>
          <div className="md:col-span-2 xl:col-span-3 mt-2 border-t pt-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="block text-sm text-slate-700">Company Name</label>
                <input className="w-full px-3 py-2 border rounded-md" value={dealForm.accountCompany} onChange={e => setDealForm(f => ({ ...f, accountCompany: e.target.value }))} disabled={formSaving} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Company Domain</label>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="example.com" value={dealForm.accountDomain} onChange={e => setDealForm(f => ({ ...f, accountDomain: e.target.value }))} disabled={formSaving} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Mobile</label>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="9876543210" value={dealForm.mobile} onChange={e => setDealForm(f => ({ ...f, mobile: e.target.value }))} disabled={formSaving} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Email</label>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="name@gmail.com" value={dealForm.email} onChange={e => setDealForm(f => ({ ...f, email: e.target.value }))} disabled={formSaving} />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm text-slate-700">Service Offering</label>
                <select className="w-full px-3 py-2 border rounded-md" value={dealForm.serviceOffering} onChange={e => setDealForm(f => ({ ...f, serviceOffering: e.target.value }))} disabled={formSaving}>
                  <option value="">Select Service…</option>
                  {serviceOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        open={bulkUploadOpen}
        onClose={() => !bulkUploading && setBulkUploadOpen(false)}
        title="Bulk Upload Deals"
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
              {bulkUploading ? 'Uploading...' : 'Upload & Create'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-3">
              Upload an Excel file (.xlsx) with the following columns: <strong>Name</strong>, <strong>Mobile number</strong>, <strong>Service</strong>, <strong>Email</strong>, <strong>Description</strong>
            </p>
            <p className="text-xs text-slate-500 mb-4">
              💡 Tip: Click "Download Template" from the menu to get a pre-formatted Excel file.
            </p>
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
    </div>
  )
}
