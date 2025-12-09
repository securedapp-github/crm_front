import { useEffect, useMemo, useState } from 'react'
import { getLeads, convertLead } from '../../api/lead'
import { useToast } from '../../components/ToastProvider'

export default function LeadConversion() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
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
    return (leads || []).filter(l => ['Qualified', 'Contacted', 'New'].includes(l.status))
      .filter(l => [l.name, l.email, l.phone].filter(Boolean).some(v => String(v).toLowerCase().includes(query.toLowerCase())))
  }, [leads, query])

  const onConvert = async (id) => {
    try { await convertLead(id); show('Lead converted to Contact + Deal', 'success'); fetchData() }
    catch { show('Conversion failed', 'error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Lead Conversion</h2>
        <input className="px-3 py-2 border rounded-md text-sm" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
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
              <tr><td className="px-4 py-3 text-slate-500" colSpan={5}>No convertible leads</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
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
                <td className="px-4 py-3">
                  <button className="text-xs px-3 py-1 rounded bg-emerald-600 text-white" onClick={() => onConvert(l.id)}>Convert</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
