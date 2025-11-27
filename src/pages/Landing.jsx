import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import { createCampaign } from '../api/campaign'
import { api } from '../api/auth'
import { resolveAccount } from '../api/account'

export default function Landing() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const channelOptions = ['Email', 'Social Media', 'Web', 'Event', 'Other']
  const currencyOptions = ['USD', 'INR', 'EUR', 'GBP', 'AUD']
  const priorityOptions = ['Low', 'Medium', 'High']
  const initialForm = () => ({
    name: '',
    code: '',
    objective: '',
    channel: channelOptions[0],
    audienceSegment: '',
    productLine: '',
    startDate: '',
    endDate: '',
    budget: '',
    expectedSpend: '',
    currency: 'USD',
    status: 'Planned',
    priority: 'Medium',
    description: '',
    complianceChecklist: '',
    externalCampaignId: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    accountCompany: '',
    accountDomain: '',
    mobile: '',
    email: '',
    callDate: '',
    callTime: ''
  })
  const [form, setForm] = useState(() => initialForm())
  const [users, setUsers] = useState([])
  const [verification, setVerification] = useState({ status: 'idle', exists: null })
  const [domainError, setDomainError] = useState('')
  const stageDots = {
    Planned: 'bg-slate-400',
    Active: 'bg-emerald-500',
    'On Hold': 'bg-amber-500',
    Completed: 'bg-indigo-500',
  }
  const selectStageBg = {
    Planned: 'border-slate-300 text-slate-800 focus:border-slate-400 focus:ring-slate-200',
    Active: 'border-emerald-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200',
    'On Hold': 'border-amber-300 text-amber-700 focus:border-amber-500 focus:ring-amber-200',
    Completed: 'border-indigo-300 text-indigo-700 focus:border-indigo-500 focus:ring-indigo-200',
  }

  const parseTime = (t) => {
    if (!t) return { hour: '', mer: 'AM' }
    const m = String(t).match(/^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i)
    if (!m) return { hour: '', mer: 'AM' }
    return { hour: String(Number(m[1]) || ''), mer: m[2].toUpperCase() }
  }
  const composeTime = (hour, mer) => {
    if (!hour || !mer) return ''
    return `${hour}:00 ${mer}`
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const resetForm = () => {
    setForm(initialForm())
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/users')
        setUsers(Array.isArray(res.data?.data) ? res.data.data : [])
      } catch { }
    })()
  }, [])

  // Auto-verify company by domain with TLD restriction (.com, .io, .in)
  useEffect(() => {
    const raw = form.accountDomain || ''
    if (!raw) { setVerification({ status: 'idle', exists: null }); setDomainError(''); return }
    const normalized = String(raw).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    const allowed = /\.(com|io|in)$/i.test(normalized)
    if (!allowed) {
      setDomainError('Only .com, .io, and .in domains are allowed')
      setVerification({ status: 'idle', exists: null })
      return
    }
    setDomainError('')
    setVerification({ status: 'loading', exists: null })
    const t = setTimeout(async () => {
      try {
        const res = await resolveAccount({ domain: normalized })
        const exists = !!res.data?.data?.exists
        setVerification({ status: 'done', exists })
      } catch {
        setVerification({ status: 'done', exists: false })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [form.accountDomain])

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      show('Campaign name is required', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        objective: form.objective?.trim() || undefined,
        channel: form.channel,
        code: form.code?.trim() || undefined,
        audienceSegment: form.audienceSegment?.trim() || undefined,
        productLine: form.productLine?.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        status: form.status,
        priority: form.priority,
        budget: form.budget ? Number(form.budget) : null,
        expectedSpend: form.expectedSpend ? Number(form.expectedSpend) : null,
        currency: form.currency ? form.currency.toUpperCase() : undefined,
        description: form.description?.trim() || undefined,
        complianceChecklist: form.complianceChecklist?.trim() || undefined,
        externalCampaignId: form.externalCampaignId?.trim() || undefined,
        utmSource: form.utmSource?.trim() || undefined,
        utmMedium: form.utmMedium?.trim() || undefined,
        utmCampaign: form.utmCampaign?.trim() || undefined,
        ...(form.accountCompany ? { accountCompany: form.accountCompany } : {}),
        ...(form.accountDomain ? { accountDomain: form.accountDomain } : {}),
        ...(form.mobile ? { mobile: String(form.mobile).trim() } : {}),
        ...(form.email ? { email: String(form.email).trim() } : {}),
        ...(form.callDate ? { callDate: form.callDate } : {}),
        ...(form.callTime ? { callTime: form.callTime } : {}),
      }
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === '') delete payload[key]
      })
      const res = await createCampaign(payload)
      const created = res.data?.data
      show('Campaign created successfully', 'success')
      resetForm()
      setOpen(false)
      if (created?.id) {
        navigate(`/dashboard/marketing?expandId=${created.id}`)
      } else {
        navigate('/dashboard/marketing')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create campaign'
      show(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <main className="min-h-[calc(100vh-56px)] bg-gradient-to-tr from-indigo-50 via-white to-slate-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-8 md:py-14 md:flex-row md:items-center md:justify-between">
          <section className="max-w-2xl space-y-6">
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-700">
              Modern CRM for growing teams
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Engage, nurture, and convert your best leads
            </h1>
            <p className="text-lg leading-relaxed text-slate-600">
              Centralize marketing campaigns, collect leads in one place, track follow-ups,
              and collaborate with sales seamlessly. Launch your next campaign in seconds.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-500">
              <div className="flex items-center gap-2"><span>✅</span><span>Campaign performance tracking</span></div>
              <div className="flex items-center gap-2"><span>✅</span><span>Lead scoring & assignments</span></div>
              <div className="flex items-center gap-2"><span>✅</span><span>Real-time collaboration</span></div>
            </div>
          </section>


        </div>
      </main>

      <Modal
        open={open}
        onClose={() => {
          if (!saving) {
            setOpen(false)
          }
        }}
        title="Create marketing campaign"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!saving) {
                  setOpen(false)
                  resetForm()
                }
              }}
              className="rounded-md border px-3 py-2 text-sm"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-70 ${domainError ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              disabled={saving || !!domainError}
            >
              {saving ? 'Saving...' : 'Save & View'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="sm:col-span-2 xl:col-span-3">
            <label className="block text-sm font-medium text-slate-700">Campaign name</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Product Launch Q4"
              disabled={saving}
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-1">
            <label className="block text-sm font-medium text-slate-700">Campaign code</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.code}
              onChange={handleChange('code')}
              placeholder="LAUNCH-Q4"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Channel</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.channel}
              onChange={handleChange('channel')}
              disabled={saving}
            >
              {channelOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">Objective</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              rows={2}
              value={form.objective}
              onChange={handleChange('objective')}
              placeholder="Promote new product features"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Audience segment</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.audienceSegment}
              onChange={handleChange('audienceSegment')}
              placeholder="Mid-market SaaS"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Product line</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.productLine}
              onChange={handleChange('productLine')}
              placeholder="SecureCRM Pro"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Preferred call date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.callDate}
              onChange={handleChange('callDate')}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Preferred call time</label>
            {(() => {
              const { hour, mer } = parseTime(form.callTime); return (
                <div className="mt-1 flex items-center gap-2">
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={hour}
                    onChange={(e) => { const h = e.target.value; setForm(prev => ({ ...prev, callTime: composeTime(h, parseTime(prev.callTime).mer) })) }}
                    disabled={saving}
                  >
                    {['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(h => <option key={h} value={h}>{h || '—'}</option>)}
                  </select>
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={mer}
                    onChange={(e) => { const m = e.target.value; setForm(prev => ({ ...prev, callTime: composeTime(parseTime(prev.callTime).hour, m) })) }}
                    disabled={saving}
                  >
                    {['AM', 'PM'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )
            })()}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Start date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.startDate}
              onChange={handleChange('startDate')}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">End date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.endDate}
              onChange={handleChange('endDate')}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Budget (₹)</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.budget}
              onChange={handleChange('budget')}
              placeholder="50000"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Expected spend (₹)</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.expectedSpend}
              onChange={handleChange('expectedSpend')}
              placeholder="45000"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Currency</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.currency}
              onChange={handleChange('currency')}
              disabled={saving}
            >
              {currencyOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              Campaign stage
              <span className={`h-2.5 w-2.5 rounded-full ${stageDots[form.status] || 'bg-slate-400'}`} aria-hidden="true" />
            </label>
            <select
              className={`mt-1 w-full rounded-md border bg-white px-3 py-2 focus:outline-none focus:ring ${selectStageBg[form.status] || 'border-slate-300 text-slate-900 focus:border-slate-400 focus:ring-slate-200'}`}
              value={form.status}
              onChange={handleChange('status')}
              disabled={saving}
            >
              {['Planned', 'Active', 'Completed', 'On Hold'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Priority</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.priority}
              onChange={handleChange('priority')}
              disabled={saving}
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">External campaign ID</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.externalCampaignId}
              onChange={handleChange('externalCampaignId')}
              placeholder="FB-ADS-2025"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">UTM source</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.utmSource}
              onChange={handleChange('utmSource')}
              placeholder="newsletter"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">UTM medium</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.utmMedium}
              onChange={handleChange('utmMedium')}
              placeholder="email"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">UTM campaign</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.utmCampaign}
              onChange={handleChange('utmCampaign')}
              placeholder="launch_q4"
              disabled={saving}
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-3">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              rows={3}
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Key messaging and goals for this campaign"
              disabled={saving}
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-3">
            <label className="block text-sm font-medium text-slate-700">Compliance checklist</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              rows={2}
              value={form.complianceChecklist}
              onChange={handleChange('complianceChecklist')}
              placeholder="Legal review, consent copy, opt-out link"
              disabled={saving}
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-3 mt-2 border-t pt-3">

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Entity name</label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={form.accountCompany}
                  onChange={handleChange('accountCompany')}
                  placeholder="Acme Inc"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Company domain</label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={form.accountDomain}
                  onChange={handleChange('accountDomain')}
                  placeholder="example.com"
                  disabled={saving}
                />
                {form.accountDomain ? (
                  <div className="mt-1 text-xs">
                    {domainError && <div className="text-rose-600">{domainError}</div>}
                    {verification.status === 'loading' && <span className="text-slate-500">Checking...</span>}
                    {verification.status === 'done' && verification.exists === true && <span className="text-emerald-600">✅ Verified organization.</span>}
                    {verification.status === 'done' && verification.exists === false && <span className="text-amber-600"> New company</span>}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Mobile number</label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={form.mobile}
                  onChange={handleChange('mobile')}
                  placeholder="9876543210"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="name@gmail.com"
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
