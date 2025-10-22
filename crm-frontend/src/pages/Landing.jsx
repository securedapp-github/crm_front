import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import { createCampaign } from '../api/campaign'
import { api } from '../api/auth'

export default function Landing() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const channelOptions = ['Email', 'Paid Ads', 'Events', 'Social Media', 'Webinars', 'Content', 'Referral']
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
    plannedLeads: '',
    currency: 'USD',
    status: 'Planned',
    priority: 'Medium',
    campaignOwnerId: '',
    description: '',
    complianceChecklist: '',
    externalCampaignId: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: ''
  })
  const [form, setForm] = useState(() => initialForm())
  const [users, setUsers] = useState([])
  const stageDots = {
    Planned: 'bg-slate-400',
    Active: 'bg-emerald-500',
    Paused: 'bg-amber-500',
    Completed: 'bg-indigo-500',
  }
  const selectStageBg = {
    Planned: 'border-slate-300 text-slate-800 focus:border-slate-400 focus:ring-slate-200',
    Active: 'border-emerald-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200',
    Paused: 'border-amber-300 text-amber-700 focus:border-amber-500 focus:ring-amber-200',
    Completed: 'border-indigo-300 text-indigo-700 focus:border-indigo-500 focus:ring-indigo-200',
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
      } catch {}
    })()
  }, [])

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
        plannedLeads: form.plannedLeads ? Number(form.plannedLeads) : null,
        currency: form.currency ? form.currency.toUpperCase() : undefined,
        campaignOwnerId: form.campaignOwnerId ? Number(form.campaignOwnerId) : undefined,
        description: form.description?.trim() || undefined,
        complianceChecklist: form.complianceChecklist?.trim() || undefined,
        externalCampaignId: form.externalCampaignId?.trim() || undefined,
        utmSource: form.utmSource?.trim() || undefined,
        utmMedium: form.utmMedium?.trim() || undefined,
        utmCampaign: form.utmCampaign?.trim() || undefined
      }
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === '') delete payload[key]
      })
      await createCampaign(payload)
      show('Campaign created successfully', 'success')
      resetForm()
      setOpen(false)
      navigate('/dashboard/marketing')
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 md:flex-row md:items-center md:justify-between">
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

          <aside className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Launch a campaign</h2>
                <p className="mt-1 text-sm text-slate-500">Capture leads instantly and route them to your team.</p>
              </div>
              <span className="text-3xl">🚀</span>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-indigo-500">•</span>
                <span>Create targeted marketing campaigns with budgets and timelines.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-indigo-500">•</span>
                <span>Automatically sync new leads to the marketing workspace.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-indigo-500">•</span>
                <span>Collaborate with sales using lead scoring and follow-up tasks.</span>
              </li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <span>➕</span>
                <span>Add Campaign</span>
              </button>
            </div>
          </aside>
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
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save & View' }
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
            <label className="block text-sm font-medium text-slate-700">Planned leads</label>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.plannedLeads}
              onChange={handleChange('plannedLeads')}
              placeholder="250"
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
              {['Planned', 'Active', 'Paused', 'Completed'].map((status) => (
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
            <label className="block text-sm font-medium text-slate-700">Campaign owner</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={form.campaignOwnerId}
              onChange={handleChange('campaignOwnerId')}
              disabled={saving}
            >
              <option value="">— Select owner —</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
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
        </div>
      </Modal>
    </>
  )
}
