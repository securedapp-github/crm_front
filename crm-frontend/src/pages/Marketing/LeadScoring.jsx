import { useEffect, useMemo, useState } from 'react'
import { getLeads, updateLead, getLeadActivities, addLeadActivity } from '../../api/lead'
import { useToast } from '../../components/ToastProvider'
import Modal from '../../components/Modal'

export default function LeadScoring() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const { show } = useToast()
  const [actOpen, setActOpen] = useState(false)
  const [actLoading, setActLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [activities, setActivities] = useState([])
  const [newAct, setNewAct] = useState({ type: 'email_open', notes: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getLeads()
      setLeads(res.data?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ fetchData() }, [])

  const filtered = useMemo(() => {
    return leads.filter(l => [l.name, l.email, l.phone, l.status].filter(Boolean).some(v => String(v).toLowerCase().includes(query.toLowerCase())))
  }, [leads, query])

  const saveScore = async (l, newScore) => {
    try {
      await updateLead(l.id, { score: newScore, isHot: Number(newScore) > 70 })
      show('Score updated', 'success')
      fetchData()
    } catch { show('Failed to update score', 'error') }
  }

  const toggleHot = async (l) => {
    try {
      await updateLead(l.id, { isHot: !l.isHot })
      show('Hot flag updated', 'success')
      fetchData()
    } catch { show('Failed to update hot flag', 'error') }
  }

  const openActivities = async (lead) => {
    setSelected(lead)
    setActivities([])
    setActOpen(true)
    setActLoading(true)
    try {
      const res = await getLeadActivities(lead.id)
      setActivities(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch { show('Failed to load activities', 'error') }
    finally { setActLoading(false) }
  }

  const submitActivity = async () => {
    if (!selected) return
    try {
      const payload = { type: newAct.type, meta: newAct.notes ? { notes: newAct.notes } : undefined }
      await addLeadActivity(selected.id, payload)
      show('Activity added', 'success')
      // refresh activities and leads (score/grade may change)
      const res = await getLeadActivities(selected.id)
      setActivities(Array.isArray(res.data?.data) ? res.data.data : [])
      fetchData()
      setNewAct({ type: 'email_open', notes: '' })
    } catch { show('Failed to add activity', 'error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Lead Scoring & Qualification</h2>
        <input className="px-3 py-2 border rounded-md text-sm" placeholder="Search" value={query} onChange={e=>setQuery(e.target.value)} />
      </div>
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Lead</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Score</th>
              <th className="text-left px-4 py-2">Grade</th>
              <th className="text-left px-4 py-2">Hot</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td className="px-4 py-3" colSpan={6}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-3 text-slate-500" colSpan={6}>No leads</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="text-slate-900 font-medium">{l.name}</div>
                  <div className="text-xs text-slate-500">{l.email || l.phone || '-'}</div>
                </td>
                <td className="px-4 py-3">{l.status}</td>
                <td className="px-4 py-3">
                  <input className="w-24 border rounded px-2 py-1" type="number" min={0} max={100} defaultValue={l.score ?? 0} onBlur={(e)=> saveScore(l, Number(e.target.value || 0))} />
                </td>
                <td className="px-4 py-3">{l.grade || '-'}</td>
                <td className="px-4 py-3">
                  <button className={`text-xs px-2 py-1 rounded border ${l.isHot ? 'bg-amber-100 text-amber-700 border-amber-200' : ''}`} onClick={()=>toggleHot(l)}>
                    {l.isHot ? 'Hot' : 'Mark Hot'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="text-xs px-2 py-1 rounded border" onClick={()=>openActivities(l)}>Activities</button>
                    <span className="text-xs text-slate-500">Scores {'>'} 70 are Hot</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={actOpen} onClose={()=>setActOpen(false)} title={selected ? `Activities • ${selected.name}` : 'Activities'} actions={
        <div className="flex items-center gap-2">
          <button onClick={()=>setActOpen(false)} className="px-3 py-2 rounded-md border">Close</button>
          <button onClick={submitActivity} className="px-3 py-2 rounded-md bg-indigo-600 text-white">Add Activity</button>
        </div>
      }>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-slate-700">Type</label>
              <select className="w-full px-3 py-2 border rounded-md" value={newAct.type} onChange={e=>setNewAct(a=>({...a, type:e.target.value}))}>
                <option value="email_open">Email Open (+5)</option>
                <option value="link_click">Link Click (+10)</option>
                <option value="webinar_attend">Webinar Attend (+15)</option>
                <option value="inactive">Inactive (-10)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-700">Notes (optional)</label>
              <input className="w-full px-3 py-2 border rounded-md" placeholder="e.g., Campaign Spring23 Email #2" value={newAct.notes} onChange={e=>setNewAct(a=>({...a, notes:e.target.value}))} />
            </div>
          </div>

          <div className="rounded border overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-2">When</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Points</th>
                  <th className="text-left px-4 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {actLoading ? (
                  <tr><td className="px-4 py-3" colSpan={4}>Loading...</td></tr>
                ) : activities.length === 0 ? (
                  <tr><td className="px-4 py-3 text-slate-500" colSpan={4}>No activities</td></tr>
                ) : activities.map(a => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">{new Date(a.occurredAt || a.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{a.type}</td>
                    <td className="px-4 py-3">{a.points}</td>
                    <td className="px-4 py-3">{a.meta?.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  )
}
