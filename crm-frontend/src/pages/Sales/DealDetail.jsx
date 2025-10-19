import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getDeal, updateDeal } from '../../api/deal'
import { getQuotes, createQuote, updateQuote, deleteQuote } from '../../api/quote'
import { useToast } from '../../components/ToastProvider'

const STAGES = ['New','Proposal Sent','Negotiation','Closed Won','Closed Lost']

export default function DealDetail() {
  const { id } = useParams()
  const [deal, setDeal] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [qForm, setQForm] = useState({ amount: 0, url: '', notes: '' })
  const { show } = useToast()

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [dRes, qRes] = await Promise.all([
        getDeal(id),
        getQuotes({ dealId: id })
      ])
      setDeal(dRes.data?.data || null)
      setQuotes(Array.isArray(qRes.data?.data) ? qRes.data.data : [])
    } finally { setLoading(false) }
  }

  useEffect(()=>{ fetchAll() }, [id])

  const changeStage = async (stage) => {
    try {
      await updateDeal(id, { stage })
      show('Stage updated', 'success')
      fetchAll()
    } catch { show('Failed to update stage', 'error') }
  }

  const addQuote = async () => {
    try {
      await createQuote({ dealId: Number(id), amount: Number(qForm.amount || 0), url: qForm.url || null, notes: qForm.notes || null })
      setQForm({ amount: 0, url: '', notes: '' })
      show('Quote created', 'success')
      fetchAll()
    } catch { show('Failed to create quote', 'error') }
  }

  const updateQuoteRow = async (qid, patch) => {
    try { await updateQuote(qid, patch); show('Quote updated', 'success'); fetchAll() } catch { show('Failed to update quote', 'error') }
  }
  const deleteQuoteRow = async (qid) => {
    try { await deleteQuote(qid); show('Quote deleted', 'success'); fetchAll() } catch { show('Failed to delete quote', 'error') }
  }

  if (loading) return <div className="p-4">Loading...</div>
  if (!deal) return <div className="p-4">Deal not found</div>

  return (
    <div className="space-y-4 p-2 md:p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{deal.title}</h2>
          <div className="text-slate-600">Value: ₹{Number(deal.value).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700">Stage</label>
          <select className="border rounded px-2 py-1" value={deal.stage} onChange={(e)=>changeStage(e.target.value)}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-3">
        <div className="font-semibold text-slate-900 mb-2">Quotes</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border rounded px-2 py-1" type="number" placeholder="Amount" value={qForm.amount} onChange={e=>setQForm(f=>({...f, amount:e.target.value}))} />
          <input className="border rounded px-2 py-1" placeholder="URL (optional)" value={qForm.url} onChange={e=>setQForm(f=>({...f, url:e.target.value}))} />
          <input className="border rounded px-2 py-1" placeholder="Notes" value={qForm.notes} onChange={e=>setQForm(f=>({...f, notes:e.target.value}))} />
          <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={addQuote}>Add Quote</button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">URL</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotes.length === 0 ? (
                <tr><td className="px-3 py-2 text-slate-500" colSpan={5}>No quotes</td></tr>
              ) : quotes.map(q => (
                <tr key={q.id}>
                  <td className="px-3 py-2">{q.id}</td>
                  <td className="px-3 py-2">₹{Number(q.amount).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <select className="border rounded px-2 py-1" value={q.status} onChange={(e)=>updateQuoteRow(q.id, { status: e.target.value })}>
                      {['Draft','Sent','Accepted','Rejected'].map(s=>(<option key={s} value={s}>{s}</option>))}
                    </select>
                  </td>
                  <td className="px-3 py-2"><a className="text-indigo-600 underline" href={q.url || '#'} target="_blank" rel="noreferrer">{q.url || '-'}</a></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button className="text-xs px-2 py-1 rounded border" onClick={()=>updateQuoteRow(q.id, { amount: q.amount, url: q.url, notes: q.notes })}>Save</button>
                      <button className="text-xs px-2 py-1 rounded border border-red-300 text-red-700" onClick={()=>deleteQuoteRow(q.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
