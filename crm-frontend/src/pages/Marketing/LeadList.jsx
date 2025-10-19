import { useEffect, useMemo, useState } from 'react'
import { getLeads, updateLead, deleteLead, assignLead, convertLead, createLead, importLeads } from '../../api/lead'
import { getCampaigns } from '../../api/campaign'
import { createTask } from '../../api/task'
import Modal from '../../components/Modal'
import { useToast } from '../../components/ToastProvider'

const STATUS_COLORS = {
  New: 'bg-slate-100 text-slate-700',
  Contacted: 'bg-blue-100 text-blue-700',
  Qualified: 'bg-green-100 text-green-700',
  Converted: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-red-100 text-red-700',
}

const SOURCES = ['Website','Social Media','Email','Referral','Event']

export default function LeadList() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'Website', campaignId: '', status: 'New', company: '', jobTitle: '', industry: '', region: '', autoAssign: false })
  const [campaigns, setCampaigns] = useState([])
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const { show } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getLeads()
      setLeads(Array.isArray(res.data?.data) ? res.data.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    ;(async () => {
      try { const res = await getCampaigns(); setCampaigns(Array.isArray(res.data?.data) ? res.data.data : []) } catch {}
    })()
  }, [])

  const filtered = useMemo(() => {
    return leads.filter(l => [l.name, l.email, l.phone, l.source, l.status].filter(Boolean).some(v => String(v).toLowerCase().includes(query.toLowerCase())))
  }, [leads, query])

  const onSave = async () => {
    try {
      if (!form.name) return show('Lead name is required', 'error')
      await createLead({
        ...form,
        email: form.email && String(form.email).trim() !== '' ? form.email : null,
        phone: form.phone && String(form.phone).trim() !== '' ? form.phone : null,
        campaignId: form.campaignId ? Number(form.campaignId) : null,
      })
      setOpen(false)
      setForm({ name: '', email: '', phone: '', source: 'Website', campaignId: '', status: 'New', company: '', jobTitle: '', industry: '', region: '', autoAssign: false })
      show('Lead created', 'success')
      fetchData()
    } catch (e) {
      show(e.response?.data?.message || 'Failed to create lead', 'error')
    }
  }

  const parseCsv = (text) => {
    // Simple CSV parser: first line headers, comma-separated, no quote escaping
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
    if (lines.length === 0) return []
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const cols = line.split(',')
      const obj = {}
      headers.forEach((h, i) => { obj[h] = (cols[i] ?? '').trim() })
      return obj
    })
  }

  const onImport = async () => {
    if (!importFile) return show('Choose a CSV file', 'error')
    try {
      setImporting(true)
      const text = await importFile.text()
      const rows = parseCsv(text)
      if (!rows.length) { show('CSV is empty', 'error'); return }
      // Map headers to fields we support
      // Supported headers: name,email,phone,source,campaignId,status,company,jobTitle,industry,region
      const leadsPayload = rows.map(r => ({
        name: r.name || r.Name,
        email: r.email || r.Email || null,
        phone: r.phone || r.Phone || null,
        source: r.source || r.Source || undefined,
        campaignId: r.campaignId || r.CampaignId || r.Campaign || undefined,
        status: r.status || r.Status || undefined,
        company: r.company || r.Company || undefined,
        jobTitle: r.jobTitle || r.JobTitle || undefined,
        industry: r.industry || r.Industry || undefined,
        region: r.region || r.Region || undefined,
      }))
      const filtered = leadsPayload.filter(l => !!l.name)
      const res = await importLeads({ leads: filtered, autoAssign: true })
      const stats = res.data?.data
      show(`Imported: ${stats?.created || 0}, Duplicates skipped: ${stats?.skippedDuplicates || 0}, Errors: ${stats?.errors || 0}`, 'success')
      setImportFile(null)
      fetchData()
    } catch (e) {
      show(e.response?.data?.message || 'Import failed', 'error')
    } finally {
      setImporting(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    await updateLead(id, { status })
    fetchData()
  }

  const createFollowUp = async (l) => {
    const title = `Call ${l.name} in 3 days`
    const description = `Auto follow-up for lead #${l.id} (${l.email || l.phone || 'no contact provided'})`
    await createTask({ title, description, status: 'Open', assignedTo: l.assignedTo || null, relatedDealId: null })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Leads</h2>
        <div className="flex items-center gap-2">
          <input className="px-3 py-2 border rounded-md text-sm" placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)} />
          <button onClick={()=>setOpen(true)} className="px-3 py-2 rounded-md bg-indigo-600 text-white">Add Lead</button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded border">
        <input type="file" accept=".csv" onChange={e=>setImportFile(e.target.files?.[0] || null)} />
        <button disabled={importing} onClick={onImport} className="px-3 py-2 rounded-md border bg-white">
          {importing ? 'Importing...' : 'Import CSV'}
        </button>
        <div className="text-xs text-slate-500">CSV headers: name,email,phone,source,campaignId,status,company,jobTitle,industry,region</div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Phone</th>
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Score</th>
              <th className="text-left px-4 py-2">Assigned To</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td className="px-4 py-3" colSpan={8}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-3 text-slate-500" colSpan={8}>No leads</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">
                  {l.name}
                  {l.isHot && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Hot</span>}
                </td>
                <td className="px-4 py-3 text-slate-700">{l.email || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{l.phone || '-'}</td>
                <td className="px-4 py-3">{l.source || '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs ${STATUS_COLORS[l.status] || 'bg-slate-100 text-slate-700'}`}>{l.status}</span></td>
                <td className="px-4 py-3">{l.score ?? 0}</td>
                <td className="px-4 py-3">{l.assignedTo || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select className="border rounded px-2 py-1 text-xs" value={l.status} onChange={(e)=>handleStatusChange(l.id, e.target.value)}>
                      {['New','Contacted','Qualified','Converted','Lost'].map(s=> <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="text-xs px-2 py-1 rounded border" onClick={async ()=>{ try { await assignLead({ leadId: l.id }); show('Lead assigned', 'success'); } catch(e){ show('Assign failed', 'error'); } finally { fetchData() } }}>Assign</button>
                    <button className="text-xs px-2 py-1 rounded border" onClick={async ()=>{ try { await createFollowUp(l); show('Follow-up task created', 'success') } catch(e){ show('Failed to create task', 'error') } }}>Follow-up (3d)</button>
                    {l.status !== 'Converted' && (
                      <button className="text-xs px-2 py-1 rounded bg-emerald-600 text-white" onClick={async ()=>{ try { await convertLead(l.id); show('Lead converted', 'success') } catch(e){ show('Conversion failed', 'error') } finally { fetchData() } }}>Convert</button>
                    )}
                    <button className="text-xs px-2 py-1 rounded border border-red-300 text-red-700" onClick={async ()=>{ try { await deleteLead(l.id); show('Lead deleted', 'success') } catch(e){ show('Delete failed', 'error') } finally { fetchData() } }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="Add Lead" actions={
        <div className="flex items-center gap-2">
          <button onClick={()=>setOpen(false)} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={onSave} className="px-3 py-2 rounded-md bg-indigo-600 text-white">Save</button>
        </div>
      }>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-slate-700">Name</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Email</label>
            <input className="w-full px-3 py-2 border rounded-md" type="email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Phone</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Company</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.company} onChange={e=>setForm(f=>({...f, company:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Job Title</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.jobTitle} onChange={e=>setForm(f=>({...f, jobTitle:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Source</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.source} onChange={e=>setForm(f=>({...f, source:e.target.value}))}>
              {SOURCES.map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Industry</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.industry} onChange={e=>setForm(f=>({...f, industry:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Region</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.region} onChange={e=>setForm(f=>({...f, region:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Campaign (optional)</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.campaignId} onChange={e=>setForm(f=>({...f, campaignId:e.target.value}))}>
              <option value="">— Select Campaign —</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700">Status</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}>
              {['New','Contacted','Qualified','Lost'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input id="autoAssign" type="checkbox" checked={form.autoAssign} onChange={e=>setForm(f=>({...f, autoAssign:e.target.checked}))} />
            <label htmlFor="autoAssign" className="text-sm text-slate-700">Auto-assign to a sales rep</label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
