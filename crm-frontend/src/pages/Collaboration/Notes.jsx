import { useEffect, useState } from 'react'
import { getNotes, createNote, deleteNote } from '../../api/note'

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [form, setForm] = useState({ content: '', entityType: 'deal', entityId: '' })
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getNotes()
      setNotes(res.data?.data || [])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ fetchData() }, [])

  const onCreate = async () => {
    if (!form.content || !form.entityType || !form.entityId) return
    await createNote({ ...form, entityId: Number(form.entityId) })
    setForm({ content: '', entityType: 'deal', entityId: '' })
    fetchData()
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Collaboration</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-lg border bg-white p-4">
          <div className="font-semibold text-slate-900 mb-3">Notes</div>
          {loading ? 'Loading…' : (
            <ul className="space-y-3 text-sm">
              {notes.map(n => (
                <li key={n.id} className="flex items-start justify-between gap-3 p-3 border rounded-md">
                  <div>
                    <div className="text-slate-900">{n.content}</div>
                    <div className="text-xs text-slate-500 mt-1">{n.entityType} #{n.entityId}</div>
                  </div>
                  <button className="text-xs px-2 py-1 rounded border border-red-300 text-red-700" onClick={async()=>{ await deleteNote(n.id); fetchData() }}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="font-semibold text-slate-900 mb-3">Add Note</div>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-sm text-slate-700">Content</label>
              <textarea className="w-full px-3 py-2 border rounded-md" rows={4} value={form.content} onChange={e=>setForm(f=>({...f, content:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm text-slate-700">Entity Type</label>
              <select className="w-full px-3 py-2 border rounded-md" value={form.entityType} onChange={e=>setForm(f=>({...f, entityType:e.target.value}))}>
                {['lead','contact','deal'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700">Entity ID</label>
              <input type="number" className="w-full px-3 py-2 border rounded-md" value={form.entityId} onChange={e=>setForm(f=>({...f, entityId:e.target.value}))} />
            </div>
            <button className="px-3 py-2 rounded-md bg-indigo-600 text-white" onClick={onCreate}>Add</button>
          </div>
        </div>
      </div>
    </div>
  )
}
