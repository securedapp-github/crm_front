import { useEffect, useMemo, useState } from 'react'
import { getLeads, updateLead, deleteLead, assignLead, convertLead } from '../../api/lead'
import { createTask } from '../../api/task'
import { useToast } from '../../components/ToastProvider'

const STATUS_COLORS = {
  New: 'bg-slate-100 text-slate-700',
  Contacted: 'bg-blue-100 text-blue-700',
  Qualified: 'bg-green-100 text-green-700',
  Converted: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-red-100 text-red-700',
}

const STAGES = ['New','Contacted','Qualified','Converted','Lost']

export default function LeadList() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
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
  }, [])

  const filtered = useMemo(() => {
    return leads.filter(l => [
      l.name,
      l.firstName,
      l.lastName,
      l.email,
      l.phone,
      l.source,
      l.status,
      l.company,
      l.industry,
      l.region,
      l.campaign?.name,
      l.owner?.name
    ].filter(Boolean).some(v => String(v).toLowerCase().includes(query.toLowerCase())))
  }, [leads, query])

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
        <input className="px-3 py-2 border rounded-md text-sm" placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)} />
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Company</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Phone</th>
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-left px-4 py-2">Lead stage</th>
              <th className="text-left px-4 py-2">Score</th>
              <th className="text-left px-4 py-2">Campaign</th>
              <th className="text-left px-4 py-2">Owner</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td className="px-4 py-3" colSpan={10}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-3 text-slate-500" colSpan={10}>No leads</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">
                  {l.name}
                  {l.isHot && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Hot</span>}
                </td>
                <td className="px-4 py-3 text-slate-700">{l.company || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{l.email || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{l.phone || '-'}</td>
                <td className="px-4 py-3">{l.source || '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs ${STATUS_COLORS[l.status] || 'bg-slate-100 text-slate-700'}`}>{l.status}</span></td>
                <td className="px-4 py-3">{l.score ?? 0}</td>
                <td className="px-4 py-3 text-slate-700">{l.campaign?.name || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{l.owner?.name || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <select className="border rounded px-2 py-1 text-xs" value={l.status} onChange={(e)=>handleStatusChange(l.id, e.target.value)}>
                      {STAGES.map(s=> <option key={s} value={s}>{s}</option>)}
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

      
    </div>
  )
}
