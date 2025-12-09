import { useEffect, useMemo, useState } from 'react'
import { getLeads, assignLead, getLeadTimeline } from '../../api/lead'
import { createTask } from '../../api/task'
import { useToast } from '../../components/ToastProvider'
import Modal from '../../components/Modal'

export default function LeadNurture() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [drip, setDrip] = useState({ steps: 3, description: 'Drip email/call sequence', dayOffsets: '0,3,7' })
  const [tlOpen, setTlOpen] = useState(false)
  const [tlLoading, setTlLoading] = useState(false)
  const [timelineLead, setTimelineLead] = useState(null)
  const [timeline, setTimeline] = useState([])
  const { show } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getLeads()
      setLeads(res.data?.data || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => {
    return leads.filter(l => [l.name, l.email, l.phone, l.status].filter(Boolean).some(v => String(v).toLowerCase().includes(query.toLowerCase())))
  }, [leads, query])

  const toggle = (id) => setSelected((s) => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const createDripTasks = async () => {
    if (selected.length === 0) { show('Select at least one lead', 'error'); return }
    try {
      const offsets = String(drip.dayOffsets || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      const steps = offsets.length > 0 ? offsets.length : Number(drip.steps || 0)
      for (const leadId of selected) {
        const l = leads.find(x => x.id === leadId)
        for (let i = 0; i < steps; i++) {
          const dayOffset = offsets[i] ?? i
          const due = new Date(); due.setDate(due.getDate() + dayOffset)
          await createTask({ title: `Step ${i + 1}: Nurture ${l.name}`, description: `${drip.description} (Lead #${l.id})`, status: 'Open', assignedTo: l.assignedTo || null, relatedDealId: null, leadId: l.id, dueDate: due.toISOString() })
        }
      }
      show('Nurture tasks created', 'success')
      setSelected([])
    } catch { show('Failed to create nurture tasks', 'error') }
  }

  const autoAssign = async () => {
    if (selected.length === 0) { show('Select at least one lead', 'error'); return }
    try {
      for (const leadId of selected) { await assignLead({ leadId }) }
      show('Assigned selected leads', 'success')
      fetchData()
    } catch { show('Assignment failed', 'error') }
  }

  const openTimeline = async (lead) => {
    setTimelineLead(lead)
    setTlOpen(true)
    setTlLoading(true)
    try {
      const res = await getLeadTimeline(lead.id)
      setTimeline(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch { show('Failed to load timeline', 'error') }
    finally { setTlLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Lead Nurturing</h2>
        <input className="px-3 py-2 border rounded-md text-sm" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700">Steps</label>
          <input type="number" min={1} max={10} className="w-20 border rounded px-2 py-1" value={drip.steps} onChange={e => setDrip(d => ({ ...d, steps: e.target.value }))} />
        </div>
        <div className="flex-1">
          <input className="w-full border rounded px-3 py-2" value={drip.description} onChange={e => setDrip(d => ({ ...d, description: e.target.value }))} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700">Day Offsets</label>
          <input className="w-40 border rounded px-2 py-1" placeholder="e.g., 0,3,7" value={drip.dayOffsets} onChange={e => setDrip(d => ({ ...d, dayOffsets: e.target.value }))} />
        </div>
        <button className="px-3 py-2 rounded-md bg-indigo-600 text-white" onClick={createDripTasks}>Create Drip Tasks</button>
        <button className="px-3 py-2 rounded-md border" onClick={autoAssign}>Auto-Assign</button>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? filtered.map(l => l.id) : [])} checked={selected.length > 0 && selected.length === filtered.length} /></th>
              <th className="text-left px-4 py-2">Lead</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Assigned</th>
              <th className="text-left px-4 py-2">Created At</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td className="px-4 py-3" colSpan={5}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-3 text-slate-500" colSpan={5}>No leads</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} /></td>
                <td className="px-4 py-3">
                  <div className="text-slate-900 font-medium">{l.name}</div>
                  <div className="text-xs text-slate-500">{l.email || l.phone || '-'}</div>
                </td>
                <td className="px-4 py-3">{l.status}</td>
                <td className="px-4 py-3">{l.assignedTo || '-'}</td>
                <td className="px-4 py-3 text-slate-700">
                  {l.createdAt ? (
                    <div className="text-xs">
                      <div className="font-medium">{new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="text-slate-500">{new Date(l.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-4 py-3"><button className="text-xs px-2 py-1 rounded border" onClick={() => openTimeline(l)}>Timeline</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={tlOpen} onClose={() => setTlOpen(false)}>
        <div className="p-4">
          <h2 className="text-lg font-semibold text-slate-900">Timeline for {timelineLead?.name}</h2>
          <div className="mt-4">
            {tlLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-2">
                {timeline.length === 0 ? (
                  <div className="text-slate-500 text-sm">No timeline entries</div>
                ) : timeline.map((t, idx) => {
                  const when = new Date(t.when).toLocaleString()
                  if (t.type === 'activity') {
                    return (
                      <div key={idx} className="rounded border p-3">
                        <div className="text-xs text-slate-500">{when}</div>
                        <div className="text-sm"><span className="font-medium">Activity:</span> {t.data.type} ({t.data.points > 0 ? `+${t.data.points}` : t.data.points})</div>
                        {t.data.meta?.notes && <div className="text-xs text-slate-600">{t.data.meta.notes}</div>}
                      </div>
                    )
                  }
                  if (t.type === 'task') {
                    return (
                      <div key={idx} className="rounded border p-3">
                        <div className="text-xs text-slate-500">{when}</div>
                        <div className="text-sm"><span className="font-medium">Task:</span> {t.data.title} • <span className="uppercase text-xs">{t.data.status}</span></div>
                        {t.data.description && <div className="text-xs text-slate-600">{t.data.description}</div>}
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
