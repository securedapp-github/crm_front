import { Fragment, useEffect, useMemo, useState, useRef } from 'react'
import { getCampaigns, createCampaign, deleteCampaign, getCampaignScoring, updateCampaign } from '../../api/campaign'
import { getDeals } from '../../api/deal'
import Modal from '../../components/Modal'
import { useToast } from '../../components/ToastProvider'
import { api } from '../../api/auth'
import { resolveAccount } from '../../api/account'
import LeadScoring from './LeadScoring'
import * as XLSX from 'xlsx'

const DetailBlock = ({ label, value, full }) => (
  <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${full ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-sm text-slate-800">{value ?? '—'}</p>
  </div>
)

export default function CampaignList({ autoOpenKey = 0 }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState([])
  const [open, setOpen] = useState(false)
  const defaultForm = () => ({
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
    utmCampaign: ''
    , accountCompany: '',
    accountDomain: '',
    mobile: '',
    email: '',
    serviceOffering: '',
    callDate: '',
    callTime: ''
  })

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
    // Extract max sequence
    let max = 0
    matched.forEach(d => {
      const m = String(d.title || '').match(/-W(\d{3})$/i)
      if (m) { const n = parseInt(m[1], 10); if (!isNaN(n)) max = Math.max(max, n) }
    })
    const seq = max || 1
    return `${base}-W${String(seq).padStart(3, '0')}`
  }

  const getDealFor = (c) => {
    const id = workIdFor(c.email || c.accountCompany || c.name)
    if (!id) return null
    return deals.find(d => d.title === id)
  }

  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState(() => defaultForm())
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [verification, setVerification] = useState({ status: 'idle', exists: null })
  const [domainError, setDomainError] = useState('')
  const [showScoring, setShowScoring] = useState(false)
  const [scoringQuery, setScoringQuery] = useState('')
  const [scoringById, setScoringById] = useState({})
  const [scoringLoading, setScoringLoading] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletePending, setDeletePending] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(() => defaultForm())
  const [editSaving, setEditSaving] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigningCampaign, setAssigningCampaign] = useState(null)
  const [assignTarget, setAssignTarget] = useState('')
  const [assignSaving, setAssignSaving] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const dropdownRef = useRef(null)
  const { show } = useToast()
  const stagePills = {
    Planned: 'bg-slate-100 text-slate-700 border border-slate-200',
    Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'On Hold': 'bg-amber-100 text-amber-700 border-amber-200',
    Completed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    setDeletePending(true)
    try {
      await deleteCampaign(confirmDeleteId)
      show('Campaign deleted successfully', 'error')
      if (expanded === confirmDeleteId) setExpanded(null)
      await fetchData()
    } catch (e) {
      show(e.response?.data?.message || 'Failed to delete campaign', 'error')
    } finally {
      setDeletePending(false)
      setConfirmDeleteId(null)
    }
  }
  const selectStageBg = {
    Planned: 'border-slate-300 text-slate-800 focus:border-slate-400 focus:ring-slate-200',
    Active: 'border-emerald-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200',
    'On Hold': 'border-amber-300 text-amber-700 focus:border-amber-500 focus:ring-amber-200',
    Completed: 'border-indigo-300 text-indigo-700 focus:border-indigo-500 focus:ring-indigo-200',
  }
  const stageDots = {
    Planned: 'bg-slate-400',
    Active: 'bg-emerald-500',
    'On Hold': 'bg-amber-500',
    Completed: 'bg-indigo-500',
  }

  const channelOptions = useMemo(() => (
    ['Email', 'Social Media', 'Web', 'Event', 'Other']
  ), [])

  const currencyOptions = useMemo(() => (
    ['USD', 'INR', 'EUR', 'GBP', 'AUD']
  ), [])

  const priorityOptions = useMemo(() => (
    ['Low', 'Medium', 'High']
  ), [])

  const serviceOptions = useMemo(() => (
    [
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
  ), [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [cres, dres] = await Promise.all([getCampaigns(), getDeals()])
      setCampaigns(cres.data?.data || [])
      setDeals(Array.isArray(dres.data?.data) ? dres.data.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // If navigated from Landing after creation, expand that campaign via ?expandId=<id>
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const idRaw = params.get('expandId')
      const id = idRaw ? Number(idRaw) : 0
      if (id && !Number.isNaN(id)) {
        setExpanded(id)
        if (!scoringById[id]) fetchScoring(id)
      }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/users')
        setUsers(Array.isArray(res.data?.data) ? res.data.data : [])
      } catch { }
    })()
  }, [])

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

  useEffect(() => {
    if (autoOpenKey > 0) {
      setOpen(true)
    }
  }, [autoOpenKey])

  // Company verification by domain with TLD restriction (.com, .io, .in)
  useEffect(() => {
    const raw = form.accountDomain || ''
    if (!raw) { setVerification({ status: 'idle', exists: null }); setDomainError(''); return }
    const normalized = String(raw).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
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

  const fetchScoring = async (id) => {
    try {
      setScoringLoading(id)
      const res = await getCampaignScoring(id)
      const scoring = res.data?.scoring
      if (scoring) setScoringById(prev => ({ ...prev, [id]: scoring }))
    } catch { }
    finally { setScoringLoading(null) }
  }

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

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = prev === id ? null : id
      if (next && !scoringById[next]) {
        fetchScoring(next)
      }
      return next
    })
  }

  const onCreate = async () => {
    try {
      if (!form.name.trim()) { show('Name is required', 'error'); return }
      const payload = {
        ...form,
        budget: form.budget ? Number(form.budget) : null,
        expectedSpend: form.expectedSpend ? Number(form.expectedSpend) : null,
        currency: form.currency ? form.currency.toUpperCase() : null,
      }
      Object.entries(payload).forEach(([key, value]) => {
        if (value === '' || value === null) delete payload[key]
      })
      payload.status = form.status
      payload.priority = form.priority
      payload.channel = form.channel
      // Include optional account linkage fields for backend automation
      if (form.accountCompany) payload.accountCompany = form.accountCompany
      if (form.accountDomain) payload.accountDomain = form.accountDomain
      if (form.mobile) payload.mobile = String(form.mobile).trim()
      if (form.email) payload.email = String(form.email).trim()
      if (form.serviceOffering) payload.serviceOffering = form.serviceOffering
      if (form.callDate) payload.callDate = form.callDate
      if (form.callTime) payload.callTime = form.callTime
      const res = await createCampaign(payload)
      const newCampaign = res.data?.data
      setOpen(false)
      setForm(defaultForm())
      show('Campaign created successfully', 'success')
      await fetchData()
      if (newCampaign?.id) {
        setExpanded(newCampaign.id)
        const scoring = res.data?.scoring
        if (scoring) setScoringById(prev => ({ ...prev, [newCampaign.id]: scoring }))
      } else {
        setShowScoring(true)
        setScoringQuery(form.name || form.accountDomain || '')
      }
    } catch (e) {
      show(e.response?.data?.message || 'Failed to create campaign', 'error')
    }
  }

  // Download Excel template
  const downloadTemplate = () => {
    const template = [
      { 'Entity Name': '', Name: '', 'Mobile number': '', Service: '', Email: '', Description: '' }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'campaign_upload_template.xlsx')
    show('Template downloaded successfully', 'success')
  }

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!uploadedFile) {
      show('Please select a file', 'error')
      return
    }

    setBulkUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(firstSheet)

          if (!rows || rows.length === 0) {
            show('Excel file is empty', 'error')
            setBulkUploading(false)
            return
          }

          // Map Excel columns to API payload
          const campaigns = rows.map(row => ({
            accountCompany: row['Entity Name'] || row.entityName || row['Entity name'] || '',
            name: row.Name || row.name || '',
            mobile: row['Mobile number'] || row.mobile || row.Mobile || '',
            serviceOffering: row.Service || row.service || row.serviceOffering || '',
            email: row.Email || row.email || '',
            description: row.Description || row.description || '',
            channel: 'Web',
            status: 'Planned',
            priority: 'Medium'
          })).filter(c => c.name || c.accountCompany) // Filter out rows without name or entity name

          if (campaigns.length === 0) {
            show('No valid campaigns found in file', 'error')
            setBulkUploading(false)
            return
          }

          // Send to backend
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
          await fetchData()
        } catch (parseError) {
          show('Failed to parse Excel file', 'error')
          console.error(parseError)
        } finally {
          setBulkUploading(false)
        }
      }
      reader.readAsArrayBuffer(uploadedFile)
    } catch (err) {
      show('Failed to process bulk upload', 'error')
      setBulkUploading(false)
    }
  }

  const filtered = campaigns.filter((c) => {
    const haystack = [
      c.name,
      c.code,
      c.channel,
      c.objective,
      c.audienceSegment,
      c.productLine,
      c.owner?.name,
      c.accountCompany,
      c.accountDomain,
      c.mobile,
      c.email
    ].filter(Boolean).map(v => String(v).toLowerCase())
    return haystack.some(value => value.includes(query.toLowerCase()))
  })

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Campaigns</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input className="px-3 py-2 border rounded-md text-sm flex-1 sm:flex-none sm:w-64" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />

          {/* Dropdown Menu for + New button */}
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
            >
              <span>+ New</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  <button
                    onClick={() => { setShowDropdown(false); setOpen(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    📝 Manual Entry
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); setBulkUploadOpen(true); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    📊 Bulk Upload (Excel)
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); downloadTemplate(); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    ⬇️ Download Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2 w-12"></th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Channel</th>
                  <th className="text-left px-4 py-2">Dates</th>
                  <th className="text-left px-4 py-2">Budget</th>
                  <th className="text-left px-4 py-2">Campaign stage</th>
                  <th className="text-left px-4 py-2">Leads</th>
                  <th className="text-left px-4 py-2">Owner</th>
                  <th className="text-left px-4 py-2">Priority</th>
                  <th className="text-left px-4 py-2">Entity name</th>
                  <th className="text-left px-4 py-2">Company domain</th>
                  <th className="text-left px-4 py-2">Service</th>
                  <th className="text-left px-4 py-2">Mobile</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Assigned</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">{
                loading ? (
                  <tr><td className="px-4 py-3" colSpan={14}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="px-4 py-3 text-slate-500" colSpan={14}>No campaigns</td></tr>
                ) : filtered.map(c => (
                  <Fragment key={c.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 align-top">
                        <button
                          onClick={() => toggleExpand(c.id)}
                          className="h-6 w-6 rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          {expanded === c.id ? '−' : '+'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-slate-700">{c.channel || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{[c.startDate, c.endDate].filter(Boolean).join(' → ') || '-'}</td>
                      <td className="px-4 py-3 text-slate-900">{c.budget != null ? `${c.currency || 'USD'} ${Number(c.budget).toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${stagePills[c.status] || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                          {c.status || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{c.leadsGenerated ?? 0}</td>
                      <td className="px-4 py-3 text-slate-700">{c.owner?.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{c.priority || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{c.accountCompany || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{c.accountDomain || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{c.serviceOffering || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{c.mobile || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span>{c.email || '-'}</span>
                          {(() => { const id = workIdFor(c.email || c.accountCompany || c.name); return id ? (<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 border border-slate-200" title={id}>{id}</span>) : null })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {c.owner ? (
                            <div
                              onClick={() => show(`Working on it: ${c.owner.name}`, 'success')}
                              className="h-3 w-3 rounded-full bg-emerald-500 cursor-pointer shadow-sm hover:ring-4 hover:ring-emerald-100 transition-all"
                              title={`Assigned to ${c.owner.name}`}
                            />
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                          {(() => {
                            const deal = getDealFor(c)
                            if (deal && deal.stage && deal.stage !== 'New') {
                              return (
                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                                  {deal.stage}
                                </span>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setAssigningCampaign(c); setAssignTarget(String(c.campaignOwnerId || '')); setAssignOpen(true) }}
                            className="text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            Assign
                          </button>
                          <button onClick={() => {
                            setEditingId(c.id); setEditForm({
                              name: c.name || '', code: c.code || '', objective: c.objective || '', channel: c.channel || 'Email', audienceSegment: c.audienceSegment || '', productLine: c.productLine || '', startDate: c.startDate || '', endDate: c.endDate || '', budget: c.budget ?? '', expectedSpend: c.expectedSpend ?? '', currency: c.currency || 'USD', status: c.status || 'Planned', priority: c.priority || 'Medium', description: c.description || '', complianceChecklist: c.complianceChecklist || '', externalCampaignId: c.externalCampaignId || '', utmSource: c.utmSource || '', utmMedium: c.utmMedium || '', utmCampaign: c.utmCampaign || '', accountCompany: c.accountCompany || '', accountDomain: c.accountDomain || '', mobile: c.mobile || '', email: c.email || '', serviceOffering: c.serviceOffering || '', callDate: c.callDate || '', callTime: c.callTime || ''
                            }); setEditOpen(true);
                          }} className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50">Edit</button>
                          <button onClick={() => setConfirmDeleteId(c.id)} className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50">Delete</button>
                        </div>
                      </td>
                    </tr>
                    {expanded === c.id && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={14} className="px-6 py-5">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <DetailBlock label="Objective" value={c.objective} />
                            <DetailBlock label="Audience segment" value={c.audienceSegment} />
                            <DetailBlock label="Product line" value={c.productLine} />
                            <DetailBlock label="Expected spend" value={c.expectedSpend != null ? `${c.currency || 'USD'} ${Number(c.expectedSpend).toLocaleString()}` : null} />
                            <DetailBlock label="Planned leads" value={c.plannedLeads != null ? Number(c.plannedLeads).toLocaleString() : null} />
                            <DetailBlock label="Campaign code" value={c.code} />
                            <DetailBlock label="External campaign ID" value={c.externalCampaignId} />
                            <DetailBlock label="UTM source" value={c.utmSource} />
                            <DetailBlock label="UTM medium" value={c.utmMedium} />
                            <DetailBlock label="UTM campaign" value={c.utmCampaign} />
                            <DetailBlock label="Service offering" value={c.serviceOffering} />
                            <DetailBlock label="Call schedule" value={[c.callDate, c.callTime].filter(Boolean).join(' ')} />
                          </div>
                          <div className="mt-4 grid grid-cols-1 gap-4">
                            <DetailBlock label="Description" value={c.description} full />
                            <DetailBlock label="Compliance checklist" value={c.complianceChecklist} full />
                          </div>
                          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-900">Scoring</h4>
                              {scoringLoading === c.id && <span className="text-xs text-slate-500">Calculating…</span>}
                            </div>
                            {(() => {
                              const s = scoringById[c.id]; return s ? (
                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                  <div className="rounded-md border px-3 py-2">
                                    <div className="text-xs text-slate-500">Score</div>
                                    <div className="text-lg font-semibold text-slate-900">{s.total_score}</div>
                                  </div>
                                  <div className="rounded-md border px-3 py-2">
                                    <div className="text-xs text-slate-500">Grade</div>
                                    <div className="text-lg font-semibold text-slate-900">{s.grade}</div>
                                  </div>
                                  <div className="rounded-md border px-3 py-2">
                                    <div className="text-xs text-slate-500">Status</div>
                                    <div className="text-sm font-medium text-slate-800">{s.status}</div>
                                  </div>
                                  <div className="rounded-md border px-3 py-2 flex items-center gap-2">
                                    <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.total_score > 70 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                      {s.total_score > 70 ? 'Hot Campaign' : 'Not Hot'}
                                    </div>
                                  </div>
                                  <div className="sm:col-span-2 lg:col-span-4 rounded-md border px-3 py-2">
                                    <div className="text-xs text-slate-500">Recommendation</div>
                                    <div className="text-sm text-slate-800">{s.recommendation}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 text-sm text-slate-600">No scoring available.</div>
                              );
                            })()}
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

      <Modal open={open} onClose={() => setOpen(false)} title="Add Campaign" actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={onCreate} disabled={!!domainError} className={`px-3 py-2 rounded-md text-white ${domainError ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600'}`}>Save & View</button>
        </div>
      }>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Name</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="md:col-span-2 xl:col-span-1">
            <label className="block text-sm text-slate-700">Campaign code</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Objective</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Channel</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
              {channelOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Audience segment</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.audienceSegment} onChange={e => setForm(f => ({ ...f, audienceSegment: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Product line</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.productLine} onChange={e => setForm(f => ({ ...f, productLine: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Budget</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Expected spend</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={form.expectedSpend} onChange={e => setForm(f => ({ ...f, expectedSpend: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Currency</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
              {currencyOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Start date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">End date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-700">Campaign stage
              <span className={`h-2.5 w-2.5 rounded-full ${stageDots[form.status] || 'bg-slate-400'}`} aria-hidden="true" />
            </label>
            <select className={`w-full rounded-md border bg-white px-3 py-2 transition focus:outline-none focus:ring ${selectStageBg[form.status] || 'border-slate-200 text-slate-900 focus:border-slate-300 focus:ring-slate-200'}`} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {['Planned', 'Active', 'Completed', 'On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Priority</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {priorityOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">External campaign ID</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.externalCampaignId} onChange={e => setForm(f => ({ ...f, externalCampaignId: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM source</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.utmSource} onChange={e => setForm(f => ({ ...f, utmSource: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM medium</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.utmMedium} onChange={e => setForm(f => ({ ...f, utmMedium: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM campaign</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.utmCampaign} onChange={e => setForm(f => ({ ...f, utmCampaign: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Preferred call date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={form.callDate || ''} onChange={e => setForm(f => ({ ...f, callDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Preferred call time</label>
            {(() => {
              const { hour, mer } = parseTime(form.callTime); return (
                <div className="flex items-center gap-2">
                  <select className="px-3 py-2 border rounded-md" value={hour} onChange={e => { const h = e.target.value; setForm(f => ({ ...f, callTime: composeTime(h, parseTime(f.callTime).mer) })) }}>
                    {['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(h => <option key={h} value={h}>{h || '—'}</option>)}
                  </select>
                  <select className="px-3 py-2 border rounded-md" value={mer} onChange={e => { const m = e.target.value; setForm(f => ({ ...f, callTime: composeTime(parseTime(f.callTime).hour, m) })) }}>
                    {['AM', 'PM'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )
            })()}
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Description</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Compliance checklist</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={2} value={form.complianceChecklist} onChange={e => setForm(f => ({ ...f, complianceChecklist: e.target.value }))} />
          </div>
          <div className="md:col-span-2 xl:col-span-3 mt-2 border-t pt-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="block text-sm text-slate-700">Entity name</label>
                <input className="w-full px-3 py-2 border rounded-md" value={form.accountCompany} onChange={e => setForm(f => ({ ...f, accountCompany: e.target.value }))} />
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
                <input className="w-full px-3 py-2 border rounded-md" placeholder="9876543210" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Email</label>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="name@gmail.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Choose a Service</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={form.serviceOffering}
                  onChange={e => setForm(f => ({ ...f, serviceOffering: e.target.value }))}
                >
                  {serviceOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={assignOpen} onClose={() => !assignSaving && setAssignOpen(false)} title="Assign Campaign" actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setAssignOpen(false)} disabled={assignSaving} className="px-3 py-2 rounded border">Cancel</button>
          <button
            onClick={async () => {
              if (!assigningCampaign || !assignTarget) return
              setAssignSaving(true)
              try {
                await updateCampaign(assigningCampaign.id, { campaignOwnerId: Number(assignTarget) })
                show('Campaign assigned successfully', 'success')
                setAssignOpen(false)
                setAssignTarget('')
                setAssigningCampaign(null)
                await fetchData()
              } catch (e) {
                show(e.response?.data?.message || 'Failed to assign campaign', 'error')
              } finally { setAssignSaving(false) }
            }}
            disabled={!assignTarget || assignSaving}
            className={`px-3 py-2 rounded text-white ${!assignTarget || assignSaving ? 'bg-indigo-400' : 'bg-indigo-600'}`}
          >{assignSaving ? 'Assigning…' : 'Assign'}</button>
        </div>
      }>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600">Select a team member to own this campaign. They'll appear as the campaign owner throughout the app.</p>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Assign to</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={assignTarget}
              onChange={(e) => setAssignTarget(e.target.value)}
            >
              <option value="">Select teammate…</option>
              {users
                .filter(u => u.role !== 'sales' ? true : true)
                .map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email || `User #${user.id}`}</option>
                ))}
            </select>
          </div>
        </div>
      </Modal>

      {showScoring && (
        <div className="mt-6 rounded-lg border bg-white p-4">
          <h3 className="mb-2 text-base font-semibold text-slate-900">Lead Scoring & Qualification</h3>
          <LeadScoring initialQuery={scoringQuery} />
        </div>
      )}

      <Modal
        open={confirmDeleteId != null}
        onClose={() => { if (!deletePending) setConfirmDeleteId(null) }}
        title="Delete Campaign"
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
        <p className="text-sm text-slate-600">This will remove the campaign permanently. Are you sure?</p>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Campaign" actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setEditOpen(false)} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={async () => {
            if (!editingId) return; setEditSaving(true);
            try {
              const payload = { ...editForm };
              Object.entries(payload).forEach(([k, v]) => { if (v === '' || v === null) delete payload[k] })
              if (payload.currency) payload.currency = String(payload.currency).toUpperCase();
              if (payload.mobile) payload.mobile = String(payload.mobile).trim();
              if (payload.email) payload.email = String(payload.email).trim();
              await updateCampaign(editingId, payload);
              show('Campaign updated', 'success');
              setEditOpen(false);
              // Refresh both campaigns and pipeline data
              await Promise.all([
                fetchData(),
                // Force refresh of pipeline data by fetching it directly
                api.get('/sales/pipeline').catch(() => null)
              ]);
            } catch (e) { show(e.response?.data?.message || 'Failed to update campaign', 'error') }
            finally { setEditSaving(false) }
          }} className={`px-3 py-2 rounded-md text-white ${editSaving ? 'bg-indigo-400' : 'bg-indigo-600'}`}>{editSaving ? 'Saving…' : 'Save changes'}</button>
        </div>
      }>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Name</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="md:col-span-2 xl:col-span-1">
            <label className="block text-sm text-slate-700">Campaign code</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Objective</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.objective} onChange={e => setEditForm(f => ({ ...f, objective: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Channel</label>
            <select className="w-full px-3 py-2 border rounded-md" value={editForm.channel} onChange={e => setEditForm(f => ({ ...f, channel: e.target.value }))}>
              {channelOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Audience segment</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.audienceSegment} onChange={e => setEditForm(f => ({ ...f, audienceSegment: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Product line</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.productLine} onChange={e => setEditForm(f => ({ ...f, productLine: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Budget</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={editForm.budget} onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Expected spend</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={editForm.expectedSpend} onChange={e => setEditForm(f => ({ ...f, expectedSpend: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Currency</label>
            <select className="w-full px-3 py-2 border rounded-md" value={editForm.currency} onChange={e => setEditForm(f => ({ ...f, currency: e.target.value }))}>
              {currencyOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Start date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">End date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-700">Campaign stage
              <span className={`h-2.5 w-2.5 rounded-full ${stageDots[editForm.status] || 'bg-slate-400'}`} aria-hidden="true" />
            </label>
            <select className={`w-full rounded-md border bg-white px-3 py-2 transition focus:outline-none focus:ring ${selectStageBg[editForm.status] || 'border-slate-200 text-slate-900 focus:border-slate-300 focus:ring-slate-200'}`} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
              {['Planned', 'Active', 'Completed', 'On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Priority</label>
            <select className="w-full px-3 py-2 border rounded-md" value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
              {priorityOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">External campaign ID</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.externalCampaignId} onChange={e => setEditForm(f => ({ ...f, externalCampaignId: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM source</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.utmSource} onChange={e => setEditForm(f => ({ ...f, utmSource: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM medium</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.utmMedium} onChange={e => setEditForm(f => ({ ...f, utmMedium: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM campaign</label>
            <input className="w-full px-3 py-2 border rounded-md" value={editForm.utmCampaign} onChange={e => setEditForm(f => ({ ...f, utmCampaign: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Preferred call date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={editForm.callDate || ''} onChange={e => setEditForm(f => ({ ...f, callDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Preferred call time</label>
            {(() => {
              const { hour, mer } = parseTime(editForm.callTime); return (
                <div className="flex items-center gap-2">
                  <select className="px-3 py-2 border rounded-md" value={hour} onChange={e => { const h = e.target.value; setEditForm(f => ({ ...f, callTime: composeTime(h, parseTime(f.callTime).mer) })) }}>
                    {['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(h => <option key={h} value={h}>{h || '—'}</option>)}
                  </select>
                  <select className="px-3 py-2 border rounded-md" value={mer} onChange={e => { const m = e.target.value; setEditForm(f => ({ ...f, callTime: composeTime(parseTime(f.callTime).hour, m) })) }}>
                    {['AM', 'PM'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )
            })()}
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Description</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Compliance checklist</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={2} value={editForm.complianceChecklist} onChange={e => setEditForm(f => ({ ...f, complianceChecklist: e.target.value }))} />
          </div>
          <div className="md:col-span-2 xl:col-span-3 mt-2 border-t pt-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="block text-sm text-slate-700">Entity name</label>
                <input className="w-full px-3 py-2 border rounded-md" value={editForm.accountCompany} onChange={e => setEditForm(f => ({ ...f, accountCompany: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Company domain</label>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="example.com" value={editForm.accountDomain} onChange={e => setEditForm(f => ({ ...f, accountDomain: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Mobile number</label>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="9876543210" value={editForm.mobile} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Email</label>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="name@gmail.com" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Choose a Service</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={editForm.serviceOffering}
                  onChange={e => setEditForm(f => ({ ...f, serviceOffering: e.target.value }))}
                >
                  {serviceOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
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
        title="Bulk Upload Campaigns"
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
