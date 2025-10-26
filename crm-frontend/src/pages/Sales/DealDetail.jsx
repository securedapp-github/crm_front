import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getDeal, updateDeal } from '../../api/deal'
import { getQuotes, createQuote, updateQuote, deleteQuote } from '../../api/quote'
import { useToast } from '../../components/ToastProvider'

const STAGES = ['New', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost']

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
      const [dRes, qRes] = await Promise.all([getDeal(id), getQuotes({ dealId: id })])
      setDeal(dRes.data?.data || null)
      setQuotes(Array.isArray(qRes.data?.data) ? qRes.data.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [id])

  const changeStage = async (stage) => {
    try {
      await updateDeal(id, { stage })
      show('Stage updated', 'success')
      fetchAll()
    } catch { show('Failed to update stage', 'error') }
  }

  const addQuote = async () => {
    try {
      await createQuote({
        dealId: Number(id),
        amount: Number(qForm.amount || 0),
        url: qForm.url || null,
        notes: qForm.notes || null
      })
      setQForm({ amount: 0, url: '', notes: '' })
      show('Quote created', 'success')
      fetchAll()
    } catch { show('Failed to create quote', 'error') }
  }

  const updateQuoteRow = async (qid, patch) => {
    try { await updateQuote(qid, patch); show('Quote updated', 'success'); fetchAll() } 
    catch { show('Failed to update quote', 'error') }
  }

  const deleteQuoteRow = async (qid) => {
    try { await deleteQuote(qid); show('Quote deleted', 'success'); fetchAll() } 
    catch { show('Failed to delete quote', 'error') }
  }

  if (loading) return <div className="p-6 text-center text-slate-500">Loading...</div>
  if (!deal) return <div className="p-6 text-center text-slate-500">Deal not found</div>

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Deal Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border rounded-xl shadow-sm p-5">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{deal.title}</h2>
          <div className="text-slate-600 mt-1">Value: ₹{Number(deal.value).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700 font-medium">Stage</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            value={deal.stage}
            onChange={(e) => changeStage(e.target.value)}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quotes Section */}
      <div className="bg-white border rounded-xl shadow-sm p-5">
        <div className="text-lg font-semibold text-slate-900 mb-3">Quotes</div>

        {/* Quote Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
          <input
            type="number"
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="Amount"
            value={qForm.amount}
            onChange={(e) => setQForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="URL (optional)"
            value={qForm.url}
            onChange={(e) => setQForm((f) => ({ ...f, url: e.target.value }))}
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="Notes"
            value={qForm.notes}
            onChange={(e) => setQForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <button
            onClick={addQuote}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
          >
            Add Quote
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">ID</th>
                <th className="text-left px-4 py-2 font-medium">Amount</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">URL</th>
                <th className="text-left px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-500">
                    No quotes found
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="border-b hover:bg-slate-50 transition">
                    <td className="px-4 py-2">{q.id}</td>
                    <td className="px-4 py-2">₹{Number(q.amount).toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <select
                        className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500"
                        value={q.status}
                        onChange={(e) => updateQuoteRow(q.id, { status: e.target.value })}
                      >
                        {['Draft', 'Sent', 'Accepted', 'Rejected'].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <a
                        href={q.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 underline hover:text-indigo-800"
                      >
                        {q.url || '-'}
                      </a>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs px-3 py-1 rounded-lg border hover:bg-slate-100 transition"
                          onClick={() => updateQuoteRow(q.id, { amount: q.amount, url: q.url, notes: q.notes })}
                        >
                          Save
                        </button>
                        <button
                          className="text-xs px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition"
                          onClick={() => deleteQuoteRow(q.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
