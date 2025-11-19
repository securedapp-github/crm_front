import { useEffect, useMemo, useState } from 'react'
import { getPeople, getPipeline, sendSalesEmail } from '../../api/sales'
import { useToast } from '../../components/ToastProvider'

const defaultForm = {
  toEmail: '',
  ccEmail: '',
  subject: '',
  message: '',
  projectName: '',
  projectContext: '',
  dealId: ''
}

export default function SalesMail() {
  const toast = useToast()
  const [form, setForm] = useState(defaultForm)
  const [sending, setSending] = useState(false)
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [pipeline, setPipeline] = useState({})
  const [people, setPeople] = useState([])

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

  useEffect(() => { fetchData() }, [])

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
        projectContext: form.projectContext.trim() || undefined
      }
      await sendSalesEmail(payload)
      toast.show('Email sent successfully', 'success')
      setForm(defaultForm)
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
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
                loadingDeals
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
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
                    sending ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
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
                      className={`rounded-xl border px-3 py-2 ${
                        String(deal.id) === form.dealId ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-100 bg-slate-50'
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
      </div>
    </main>
  )
}
