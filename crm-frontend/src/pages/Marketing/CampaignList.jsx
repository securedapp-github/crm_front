import { useEffect, useState } from 'react'
import { getCampaigns, createCampaign } from '../../api/campaign'
import Modal from '../../components/Modal'
import { useToast } from '../../components/ToastProvider'

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', budget: '', status: 'Planned' })
  const [query, setQuery] = useState('')
  const { show } = useToast()

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

  const onCreate = async () => {
    try {
      if (!form.name) { show('Name is required', 'error'); return }
      await createCampaign({ ...form, budget: form.budget ? Number(form.budget) : null })
      setOpen(false)
      setForm({ name: '', startDate: '', endDate: '', budget: '', status: 'Planned' })
      show('Campaign created', 'success')
      fetchData()
    } catch (e) {
      show(e.response?.data?.message || 'Failed to create campaign', 'error')
    }
  }

  const filtered = campaigns.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))

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
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Dates</th>
              <th className="text-left px-4 py-2">Budget</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Leads</th>
            </tr>
          </thead>
          <tbody className="divide-y">{
            loading ? (
              <tr><td className="px-4 py-3" colSpan={5}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-3 text-slate-500" colSpan={5}>No campaigns</td></tr>
            ) : filtered.map(c=> (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-700">{[c.startDate, c.endDate].filter(Boolean).join(' → ') || '-'}</td>
                <td className="px-4 py-3 text-slate-900">{c.budget != null ? `₹${Number(c.budget).toLocaleString()}` : '-'}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-700">{c.status}</span></td>
                <td className="px-4 py-3">{c.leadsGenerated ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="Add Campaign" actions={
        <div className="flex items-center gap-2">
          <button onClick={()=>setOpen(false)} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={onCreate} className="px-3 py-2 rounded-md bg-indigo-600 text-white">Save</button>
        </div>
      }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-700">Name</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Budget</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={form.budget} onChange={e=>setForm(f=>({...f, budget:e.target.value}))} />
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
            <label className="block text-sm text-slate-700">Status</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}>
              {['Planned','Active','Paused','Completed'].map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
