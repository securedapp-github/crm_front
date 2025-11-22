import { useEffect, useState } from 'react'
import { getTickets, createTicket, updateTicket, deleteTicket } from '../../api/ticket'
import Modal from '../../components/Modal'
import { useToast } from '../../components/ToastProvider'

const STATUS = ['Open','In Progress','Resolved']

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', status: 'Open', assignedTo: '', contactId: '' })
  const { show } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getTickets()
      setTickets(res.data?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ fetchData() }, [])

  const onCreate = async () => {
    try {
      if (!form.title) { show('Title is required', 'error'); return }
      await createTicket({ ...form, assignedTo: form.assignedTo? Number(form.assignedTo): null, contactId: form.contactId? Number(form.contactId): null })
      setOpen(false)
      setForm({ title: '', description: '', status: 'Open', assignedTo: '', contactId: '' })
      show('Ticket created', 'success')
      fetchData()
    } catch (e) {
      show(e.response?.data?.message || 'Failed to create ticket', 'error')
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Customer Service</h1>
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-slate-600">Ticket Management System</div>
        <button className="px-3 py-2 rounded-md bg-indigo-600 text-white flex-shrink-0" onClick={()=>setOpen(true)}>New Ticket</button>
      </div>

      <div className="mt-4 rounded-lg border bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2">Title</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Assigned To</th>
              <th className="text-left px-4 py-2">Contact</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td className="px-4 py-3" colSpan={5}>Loading...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td className="px-4 py-3 text-slate-500" colSpan={5}>No tickets</td></tr>
            ) : tickets.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">{t.title}</td>
                <td className="px-4 py-3">
                  <select className="border rounded px-2 py-1 text-xs" defaultValue={t.status} onChange={async (e)=>{ try { await updateTicket(t.id, { status: e.target.value }); show('Status updated','success') } catch { show('Update failed','error') } finally { fetchData() } }}>
                    {STATUS.map(s=> <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">{t.assignedTo || '-'}</td>
                <td className="px-4 py-3">{t.contactId || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="text-xs px-2 py-1 rounded border border-red-300 text-red-700" onClick={async ()=>{ try { await deleteTicket(t.id); show('Ticket deleted','success') } catch { show('Delete failed','error') } finally { fetchData() } }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="New Ticket" actions={
        <div className="flex items-center gap-2">
          <button onClick={()=>setOpen(false)} className="px-3 py-2 rounded-md border">Cancel</button>
          <button onClick={onCreate} className="px-3 py-2 rounded-md bg-indigo-600 text-white">Create</button>
        </div>
      }>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-700">Title</label>
            <input className="w-full px-3 py-2 border rounded-md" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Status</label>
            <select className="w-full px-3 py-2 border rounded-md" value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}>
              {STATUS.map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-700">Description</label>
            <textarea className="w-full px-3 py-2 border rounded-md" rows={3} value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Assigned To (User ID)</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={form.assignedTo} onChange={e=>setForm(f=>({...f, assignedTo:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-slate-700">Contact ID</label>
            <input className="w-full px-3 py-2 border rounded-md" type="number" value={form.contactId} onChange={e=>setForm(f=>({...f, contactId:e.target.value}))} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
