import { Fragment, useEffect, useMemo, useState } from 'react'
import { getCampaigns, createCampaign, deleteCampaign, getCampaignScoring } from '../../api/campaign'
import Modal from '../../components/Modal'
import { useToast } from '../../components/ToastProvider'
import { api } from '../../api/auth'
import { resolveAccount } from '../../api/account'
import LeadScoring from './LeadScoring'

const DetailBlock = ({ label, value, full }) => (
  <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${full ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-sm text-slate-800">{value ?? '—'}</p>
  </div>
)

export default function CampaignList({ autoOpenKey = 0 }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
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
  })

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
  const { show } = useToast()
  const stagePills = {
    Planned: 'bg-slate-100 text-slate-700 border border-slate-200',
    Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'On Hold': 'bg-amber-100 text-amber-700 border-amber-200',
    Completed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  }


  const onDelete = async (id) => {
    const confirmed = window.confirm('Delete this campaign?')
    if (!confirmed) return
    try {
      await deleteCampaign(id)
      show('Campaign deleted', 'success')
      if (expanded === id) setExpanded(null)
      fetchData()
    } catch (e) {
      show(e.response?.data?.message || 'Failed to delete campaign', 'error')
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

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getCampaigns()
      setCampaigns(res.data?.data || [])
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
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/users')
        setUsers(Array.isArray(res.data?.data) ? res.data.data : [])
      } catch {}
    })()
  }, [])

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

  const fetchScoring = async (id) => {
    try {
      setScoringLoading(id)
      const res = await getCampaignScoring(id)
      const scoring = res.data?.scoring
      if (scoring) setScoringById(prev => ({ ...prev, [id]: scoring }))
    } catch {}
    finally { setScoringLoading(null) }
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
      const res = await createCampaign(payload)
      const newCampaign = res.data?.data
      setOpen(false)
      setForm(defaultForm())
      show('Campaign created', 'success')
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

  const filtered = campaigns.filter((c) => {
    const haystack = [
      c.name,
      c.code,
      c.channel,
      c.objective,
      c.audienceSegment,
      c.productLine,
      c.owner?.name
    ].filter(Boolean).map(v => String(v).toLowerCase())
    return haystack.some(value => value.includes(query.toLowerCase()))
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Campaigns</h2>
        <div className="flex items-center gap-2">
          <input className="px-3 py-2 border rounded-md text-sm" placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)} />
          <button onClick={()=>setOpen(true)} className="px-3 py-2 rounded-md bg-indigo-600 text-white">Add Campaign</button>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
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
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">{
            loading ? (
              <tr><td className="px-4 py-3" colSpan={10}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-3 text-slate-500" colSpan={10}>No campaigns</td></tr>
            ) : filtered.map(c=> (
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
                  <td className="px-4 py-3">
                    <button onClick={()=>onDelete(c.id)} className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50">
                      Delete
                    </button>
                  </td>
                </tr>
                {expanded === c.id && (
                  <tr className="bg-slate-50/60">
                    <td colSpan={9} className="px-6 py-5">
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
                        {(() => { const s = scoringById[c.id]; return s ? (
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
                        ); })()}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="Add Campaign" actions={
        <div className="flex items-center gap-2">
          <button onClick={()=>setOpen(false)} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={onCreate} disabled={!!domainError} className={`px-3 py-2 rounded-md text-white ${domainError ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600'}`}>Save & View</button>
        </div>
      }>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Name</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
          </div>
          <div className="md:col-span-2 xl:col-span-1">
            <label className="block text-sm text-slate-700">Campaign code</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.code} onChange={e=>setForm(f=>({...f, code:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Objective</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.objective} onChange={e=>setForm(f=>({...f, objective:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Channel</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.channel} onChange={e=>setForm(f=>({...f, channel:e.target.value}))}>
              {channelOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Audience segment</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.audienceSegment} onChange={e=>setForm(f=>({...f, audienceSegment:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Product line</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.productLine} onChange={e=>setForm(f=>({...f, productLine:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Budget</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={form.budget} onChange={e=>setForm(f=>({...f, budget:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Expected spend</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={form.expectedSpend} onChange={e=>setForm(f=>({...f, expectedSpend:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Currency</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.currency} onChange={e=>setForm(f=>({...f, currency:e.target.value}))}>
              {currencyOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Start date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={form.startDate} onChange={e=>setForm(f=>({...f, startDate:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">End date</label>
            <input className="w-full px-3 py-2 border rounded-md" type="date" value={form.endDate} onChange={e=>setForm(f=>({...f, endDate:e.target.value}))} />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-700">Campaign stage
              <span className={`h-2.5 w-2.5 rounded-full ${stageDots[form.status] || 'bg-slate-400'}`} aria-hidden="true" />
            </label>
            <select className={`w-full rounded-md border bg-white px-3 py-2 transition focus:outline-none focus:ring ${selectStageBg[form.status] || 'border-slate-200 text-slate-900 focus:border-slate-300 focus:ring-slate-200'}`} value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}>
              {['Planned','Active','Completed','On Hold'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Priority</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.priority} onChange={e=>setForm(f=>({...f, priority:e.target.value}))}>
              {priorityOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">External campaign ID</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.externalCampaignId} onChange={e=>setForm(f=>({...f, externalCampaignId:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM source</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.utmSource} onChange={e=>setForm(f=>({...f, utmSource:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM medium</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.utmMedium} onChange={e=>setForm(f=>({...f, utmMedium:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">UTM campaign</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.utmCampaign} onChange={e=>setForm(f=>({...f, utmCampaign:e.target.value}))} />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Description</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-sm text-slate-700">Compliance checklist</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={2} value={form.complianceChecklist} onChange={e=>setForm(f=>({...f, complianceChecklist:e.target.value}))} />
          </div>
          <div className="md:col-span-2 xl:col-span-3 mt-2 border-t pt-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">Optional: Link an account for automatic scoring</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm text-slate-700">Company name</label>
                <input className="w-full px-3 py-2 border rounded-md" value={form.accountCompany} onChange={e=>setForm(f=>({...f, accountCompany:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm text-slate-700">Company domain</label>
                <input className="w-full px-3 py-2 border rounded-md" placeholder="example.com" value={form.accountDomain} onChange={e=>setForm(f=>({...f, accountDomain:e.target.value}))} />
                {form.accountDomain ? (
                  <div className="mt-1 text-xs">
                    {domainError && <div className="text-rose-600">{domainError}</div>}
                    {verification.status === 'loading' && <span className="text-slate-500">Checking...</span>}
                    {verification.status === 'done' && verification.exists === true && <span className="text-emerald-600">✅ Verified organization.</span>}
                    {verification.status === 'done' && verification.exists === false && <span className="text-amber-600">⚠️ New company, not yet verified.</span>}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {showScoring && (
        <div className="mt-6 rounded-lg border bg-white p-4">
          <h3 className="mb-2 text-base font-semibold text-slate-900">Lead Scoring & Qualification</h3>
          <LeadScoring initialQuery={scoringQuery} />
        </div>
      )}

    </div>
  )
}
