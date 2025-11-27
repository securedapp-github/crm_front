import { useEffect, useMemo, useState } from 'react'
import { getPeople, getPipeline, sendSalesEmail, getSalesEmailHistory } from '../../api/sales'
import { useToast } from '../../components/ToastProvider'

const defaultForm = {
  toEmail: '',
  ccEmail: '',
  subject: '',
  message: '',
  projectName: '',
  projectContext: '',
  dealId: '',
  emailMode: 'communication'
}

export default function SalesMail() {
  const toast = useToast()
  const [form, setForm] = useState(defaultForm)
  const [sending, setSending] = useState(false)
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [pipeline, setPipeline] = useState({})
  const [people, setPeople] = useState([])
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  }, [])
  const myUserId = Number(user?.id || 0)
  const myEmail = useMemo(() => String(user?.email || '').trim().toLowerCase(), [user])

  const fetchData = async () => {
    setLoadingDeals(true)
    try {
      const [pipeRes, peopleRes] = await Promise.all([getPipeline(), getPeople()])
      setPipeline(pipeRes.data?.data || {})
      setPeople(Array.isArray(peopleRes.data?.data) ? peopleRes.data.data : [])
    } catch (err) {
      console.error('Failed to load deals for mail desk', err)
      toast.show('Could not load your deals. Please refresh.', 'error')
    } finally {
      setLoadingDeals(false)
    }
  }

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await getSalesEmailHistory()
      setHistory(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch (err) {
      console.error('Failed to load email history', err)
      toast.show('Could not load email history', 'error')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchHistory()
  }, [])

  const mySalespersonId = useMemo(() => {
    const me = (people || []).find(
      (p) => Number(p.userId || 0) === myUserId || String(p.email || '').trim().toLowerCase() === myEmail
    )
    return Number(me?.id || 0)
  }, [people, myUserId, myEmail])

  const allDeals = useMemo(() => Object.values(pipeline || {}).flat(), [pipeline])
  const myDeals = useMemo(() => {
    if (!mySalespersonId) return []
    return allDeals.filter((deal) => Number(deal.assignedTo) === mySalespersonId)
  }, [allDeals, mySalespersonId])

  const selectedDeal = useMemo(() => myDeals.find((deal) => String(deal.id) === String(form.dealId)), [myDeals, form.dealId])

  const handleDealChange = (nextId) => {
    setForm((prev) => {
      const next = { ...prev, dealId: nextId }
      if (nextId) {
        const deal = myDeals.find((d) => String(d.id) === nextId)
        if (deal?.contact?.email && !prev.toEmail) {
          next.toEmail = deal.contact.email
        }
        if (!prev.subject && deal?.title) {
          next.subject = `Regarding ${deal.title}`
        }
      }
      return next
    })
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (sending) return

    try {
      setSending(true)
      const payload = {
        toEmail: form.toEmail.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        ccEmail: form.ccEmail.trim() || undefined,
        dealId: form.dealId ? Number(form.dealId) : undefined,
        contactId: selectedDeal?.contactId || undefined,
        projectName: form.projectName.trim() || undefined,
        projectContext: form.projectContext.trim() || undefined,
        emailMode: form.emailMode
      }
      await sendSalesEmail(payload)
      toast.show('Email sent successfully', 'success')
      setForm(defaultForm)
      fetchHistory()
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to send email'
      toast.show(msg, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-112px)] bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sales mail desk</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Reach out to your clients</h1>
              <p className="text-sm text-slate-600">
                Draft personalised messages tied to your pipeline deals. We will log the context automatically.
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loadingDeals}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${loadingDeals
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                }`}
            >
              {loadingDeals ? 'Refreshing…' : 'Refresh deals'}
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Compose email</h2>
              <p className="text-sm text-slate-500">Every message is sent through the shared mailbox with your details in the reply-to.</p>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email intent</label>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {[
                    { value: 'communication', label: 'In communication', description: 'Send a regular follow-up or update email.' },
                    { value: 'completion', label: 'Complete deal', description: 'Send the polished “project completed” template.' }
                  ].map((mode) => {
                    const active = form.emailMode === mode.value
                    return (
                      <button
                        type="button"
                        key={mode.value}
                        onClick={() => handleChange('emailMode', mode.value)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${active
                            ? 'border-indigo-400 bg-indigo-50/80 text-indigo-900 shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                          }`}
                      >
                        <p className="font-semibold">{mode.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{mode.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">To (client email)</label>
                  <input
                    type="email"
                    value={form.toEmail}
                    onChange={(e) => handleChange('toEmail', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    placeholder="client@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">CC (optional)</label>
                  <input
                    type="email"
                    value={form.ccEmail}
                    onChange={(e) => handleChange('ccEmail', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    placeholder="manager@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Follow-up on proposal"
                  required
                />
              </div>

              {form.emailMode === 'completion' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Project / Service name</label>
                    <input
                      type="text"
                      value={form.projectName}
                      onChange={(e) => handleChange('projectName', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      placeholder="Interior Design for Mr. Rao"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Project context (optional)</label>
                    <textarea
                      rows={4}
                      value={form.projectContext}
                      onChange={(e) => handleChange('projectContext', e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      placeholder="Site visit completed on Nov 10. Waiting on revised BOQ approval."
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">Message</label>
                <textarea
                  rows={8}
                  value={form.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder={`Hi there,\n\nThanks for speaking with me earlier...`}
                  required
                />
                <p className="mt-1 text-xs text-slate-500">Plain text only. Line breaks are preserved.</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${sending ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                  {sending ? 'Sending…' : 'Send email'}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(defaultForm)}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
                >
                  Clear form
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Your open deals</h3>
                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs text-slate-600">{myDeals.length}</span>
              </div>
              {loadingDeals ? (
                <p className="mt-4 text-sm text-slate-500">Loading…</p>
              ) : myDeals.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No active deals assigned to you yet.</p>
              ) : (
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {myDeals.slice(0, 6).map((deal) => (
                    <li
                      key={deal.id}
                      className={`rounded-xl border px-3 py-2 ${String(deal.id) === form.dealId ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-100 bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                        <span>{deal.stage || 'New'}</span>
                        <span>#{deal.id}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900">{deal.title || 'Untitled deal'}</p>
                      <p className="text-xs text-slate-500">{deal.contact?.email || 'No contact email saved'}</p>
                      <button
                        type="button"
                        onClick={() => {
                          handleDealChange(String(deal.id))
                          if (deal.contact?.email) {
                            handleChange('toEmail', deal.contact.email)
                          }
                        }}
                        className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Use this deal
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {myDeals.length > 6 && (
                <p className="mt-3 text-xs text-slate-500">Showing the first 6 deals. Use the dropdown to access all.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">
              <h3 className="text-base font-semibold text-slate-900">Best practices</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Keep subject lines short and action-oriented.</li>
                <li>Mention specifics from your last interaction.</li>
                <li>Close with a clear CTA and your signature.</li>
              </ul>
            </div>
          </aside>
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sent mail history</h2>

            </div>
            <button
              type="button"
              onClick={fetchHistory}
              disabled={historyLoading}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${historyLoading
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              {historyLoading ? 'Refreshing…' : 'Refresh history'}
            </button>
          </div>

          {historyLoading ? (
            <p className="text-sm text-slate-500">Loading email history…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">No emails sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Sent on</th>
                      <th className="px-3 py-2">To</th>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Intent</th>
                      <th className="px-3 py-2">Deal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.slice(0, 20).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          }) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-900">{log.toEmail}</p>
                          {log.ccEmail && <p className="text-xs text-slate-500">CC: {log.ccEmail}</p>}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <p className="font-medium">{log.subject}</p>
                          <p className="text-xs text-slate-500 line-clamp-2">{log.messageBody}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${log.emailMode === 'completion'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                            }`}>
                            {log.emailMode === 'completion' ? 'Complete deal' : 'In communication'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {log.dealId ? `#${log.dealId}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {history.length > 20 && (
                <p className="mt-3 text-xs text-slate-500">Showing the most recent 20 out of {history.length} entries.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
