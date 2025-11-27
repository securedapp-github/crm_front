import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeads, updateLead, deleteLead, assignLead, convertLead, createLead, addLeadActivity, getLeadActivities } from '../../api/lead'
import { getDeals } from '../../api/deal'
import { getMe } from '../../api/auth'
import { createTask } from '../../api/task'
import { useToast } from '../../components/ToastProvider'
import Modal from '../../components/Modal'
import { resolveAccount } from '../../api/account'

const STATUS_COLORS = {
  New: 'bg-slate-100 text-slate-700',
  Contacted: 'bg-blue-100 text-blue-700',
  Qualified: 'bg-green-100 text-green-700',
  Converted: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-red-100 text-red-700',
}

const STAGES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost']

export default function LeadList() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const defaultForm = () => ({ name: '', company: '', accountDomain: '', phone: '', email: '', description: '' })
  const [form, setForm] = useState(() => defaultForm())
  const { show } = useToast()
  const normEmail = (s) => (s && String(s).trim().toLowerCase()) || ''
  const normPhone = (s) => (s ? String(s).replace(/\D/g, '') : '')

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
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const applyPreset = (preset) => {
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
      default:
        break
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lres, dres] = await Promise.all([getLeads(), getDeals()])
      setLeads(Array.isArray(lres.data?.data) ? lres.data.data : [])
      setDeals(Array.isArray(dres.data?.data) ? dres.data.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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

  const filtered = useMemo(() => {
    const q = String(query || '').toLowerCase()
    return leads.filter(l => {
      const haystack = [
        l?.name,
        l?.email,
        l?.phone,
        l?.company,
        l?.source,
        l?.status,
        // optional fallbacks
        l?.firstName,
        l?.lastName
      ].filter(Boolean).join(' ').toLowerCase()

      // Date filtering
      let dateMatch = true
      if (fromDate || toDate) {
        const created = new Date(l.createdAt || l.updatedAt) // Fallback to updatedAt if createdAt missing
        const start = fromDate ? new Date(fromDate) : new Date(0)
        const end = toDate ? new Date(toDate) : new Date()
        end.setHours(23, 59, 59, 999)
        dateMatch = created >= start && created <= end
      }

      return haystack.includes(q) && dateMatch
    })
  }, [leads, query, fromDate, toDate])

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

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Leads</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input className="px-3 py-2 border rounded-md text-sm flex-1 sm:flex-none sm:w-64" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />
          <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm flex-shrink-0">Add Lead</button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <button onClick={() => applyPreset('today')} className="rounded-lg border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">Today</button>
          <button onClick={() => applyPreset('yesterday')} className="rounded-lg border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">Yesterday</button>
          <button onClick={() => applyPreset('7d')} className="rounded-lg border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">Last 7 Days</button>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate('') }} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100">Clear</button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2 w-12"></th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Entity name</th>
                  <th className="text-left px-4 py-2">Company domain</th>
                  <th className="text-left px-4 py-2">Mobile number</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td className="px-4 py-3" colSpan={8}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="px-4 py-3 text-slate-500" colSpan={8}>No leads</td></tr>
                ) : filtered.map(l => (
                  <Fragment key={l.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 align-top">
                        <button
                          onClick={() => toggleExpand(l.id)}
                          className="h-6 w-6 rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          {expanded === l.id ? '−' : '+'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{l.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[l.status] || 'bg-slate-100 text-slate-700'}`}>{l.status || 'New'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{l.company || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{l.accountDomain || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{l.phone || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span>{l.email || '-'}</span>
                          {(() => { const id = workIdFor(l.email || l.company || l.name); return id ? (<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 border border-slate-200" title={id}>{id}</span>) : null })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-xs px-2 py-1 rounded border" onClick={() => { setEditingId(l.id); setEditForm({ name: l.name || '', company: l.company || '', accountDomain: l.accountDomain || '', phone: l.phone || '', email: l.email || '', description: '' }); setEditOpen(true) }}>Edit</button>
                          <button className="text-xs px-2 py-1 rounded border border-rose-200 text-rose-600" onClick={() => setConfirmDeleteId(l.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                    {expanded === l.id && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={8} className="px-6 py-5">
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
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</p>
                              <p className="mt-1 text-sm text-slate-800">{l.owner?.name || '—'}</p>
                            </div>
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
                // Pre-auth check: ensure session is valid before proceeding
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
                    autoAssign: true
                  }
                  Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k] })
                  const res = await createLead(payload)
                  const created = res?.data?.data
                  // Log initial context as activity if provided
                  if (created && (form.description?.trim() || form.accountDomain?.trim())) {
                    try {
                      await addLeadActivity(created.id, { type: 'Submission', note: form.description?.trim() || null, meta: { domain: form.accountDomain?.trim() || null } })
                    } catch { }
                  }
                  // Ensure salesperson assignment if backend didn't auto-assign
                  try {
                    if (created && !created.assignedTo) {
                      await assignLead({ leadId: created.id })
                    }
                  } catch (e) {
                    const status = e?.response?.status
                    const msg = e?.response?.data?.message || (status === 404 ? 'No salespeople available for assignment' : 'Failed to assign salesperson')
                    show(msg, 'error')
                  }
                  show('Lead created', 'success')
                  setForm(defaultForm())
                  setOpen(false)
                  await fetchData()
                  if (created?.id) setExpanded(created.id)
                  navigate('/dashboard/sales')
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
            <label className="block text-sm text-slate-700">Entity name</label>
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
            <label className="block text-sm text-slate-700">Entity name</label>
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

    </div>
  )
}

