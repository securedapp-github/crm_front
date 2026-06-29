import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import { createCampaign } from '../api/campaign'
import { api } from '../api/auth'
import { resolveAccount } from '../api/account'
import { 
  Sparkles, 
  ArrowRight, 
  BarChart3, 
  Users, 
  Zap, 
  Layers, 
  TrendingUp, 
  CheckCircle,
  Clock,
  Briefcase,
  Target,
  Plus
} from 'lucide-react'

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
    Completed: 'bg-emerald-500',
  }
  
  const selectStageBg = {
    Planned: 'border-slate-300 text-slate-800 focus:border-slate-400 focus:ring-slate-200',
    Active: 'border-emerald-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200',
    'On Hold': 'border-amber-300 text-amber-700 focus:border-amber-500 focus:ring-amber-200',
    Completed: 'border-emerald-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200',
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
      <main className="relative min-h-[calc(100vh-68px)] bg-[#fafbfe] bg-grid-pattern overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] rounded-full bg-gradient-to-tr from-emerald-200/30 to-teal-200/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45rem] h-[45rem] rounded-full bg-gradient-to-br from-emerald-200/20 to-sky-200/30 blur-[100px] pointer-events-none" />
        
        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-8 text-left">
              {/* Premium Badge */}
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100/50 px-4 py-1.5 text-xs font-semibold text-emerald-600 shadow-[0_2px_8px_rgba(16, 185, 129, 0.05)]">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                <span>Next-Gen CRM Workspace</span>
              </span>
              
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-tight">
                Engage, nurture, and <br/>
                <span className="text-gradient font-black">convert your best leads</span>
              </h1>
              
              <p className="text-base sm:text-lg leading-relaxed text-slate-600 max-w-xl">
                Centralize marketing campaigns, align your sales pipelines, track performance metrics, 
                and collaborate with your team seamlessly. Launch campaigns and monitor leads in one clean suite.
              </p>
              
              {/* Call to Actions */}
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:bg-emerald-700 transition duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Access Platform</span>
                  <ArrowRight className="h-4 w-4 text-white" />
                </button>
              </div>
              
              {/* Trust Indicators */}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-6 text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Interactive Pipeline</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Real-Time Reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Domain Verification</span>
                </div>
              </div>
            </div>
            
            {/* Right Interactive Mockup Widget */}
            <div className="lg:col-span-5 relative w-full">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-10 blur-lg" />
              
              {/* Premium Glass Mockup */}
              <div className="relative rounded-2xl border border-slate-200/60 bg-white/90 shadow-2xl p-5 sm:p-6 backdrop-blur-md">
                
                {/* Mockup Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">Workspace Preview</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-200" />
                    <span className="h-2 w-2 rounded-full bg-slate-200" />
                    <span className="h-2 w-2 rounded-full bg-slate-200" />
                  </div>
                </div>
                
                {/* Mockup Content Grid */}
                <div className="space-y-4 pt-4">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#fafbfe] rounded-xl p-3.5 border border-slate-100 text-left">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deals Closed</div>
                      <div className="text-xl font-extrabold text-slate-800 mt-1">$482.5K</div>
                      <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5 mt-0.5">
                        <TrendingUp className="h-2.5 w-2.5" /> +14.2%
                      </span>
                    </div>
                    <div className="bg-[#fafbfe] rounded-xl p-3.5 border border-slate-100 text-left">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conversion</div>
                      <div className="text-xl font-extrabold text-slate-800 mt-1">24.8%</div>
                      <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5 mt-0.5">
                        <CheckCircle className="h-2.5 w-2.5" /> High Quality
                      </span>
                    </div>
                  </div>
                  
                  {/* Mock Chart Area */}
                  <div className="bg-[#fafbfe] rounded-xl p-4 border border-slate-100 text-left space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Lead Acquisition Trend</span>
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Live</span>
                    </div>
                    {/* SVG Bar Chart */}
                    <div className="h-20 flex items-end gap-3.5 pt-2">
                      <div className="flex-1 bg-emerald-100 hover:bg-emerald-300 rounded-t h-[40%] transition-all duration-300" title="Week 1" />
                      <div className="flex-1 bg-emerald-200 hover:bg-emerald-300 rounded-t h-[65%] transition-all duration-300" title="Week 2" />
                      <div className="flex-1 bg-emerald-400 hover:bg-emerald-500 rounded-t h-[50%] transition-all duration-300" title="Week 3" />
                      <div className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-t h-[85%] transition-all duration-300" title="Week 4" />
                      <div className="flex-1 bg-emerald-300 hover:bg-emerald-400 rounded-t h-[60%] transition-all duration-300" title="Week 5" />
                    </div>
                  </div>
                  
                  {/* Recent Activity List */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Recent Pipeline Success</div>
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-emerald-50 text-emerald-600 rounded">
                          <Briefcase className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-left leading-tight">
                          <span className="font-semibold text-slate-700 block">Acme Corp signed</span>
                          <span className="text-[9px] text-slate-400">by Nikil • Pro Tier</span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-800">$45,000</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-emerald-50 text-emerald-600 rounded">
                          <Target className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-left leading-tight">
                          <span className="font-semibold text-slate-700 block">Tech Solutions campaign</span>
                          <span className="text-[9px] text-slate-400">Stage: Active</span>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">82 Leads</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Capabilities Section */}
        <section className="relative bg-white border-t border-slate-200/50 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center space-y-4 max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full">
                Features Guide
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
                Everything you need to drive performance
              </h2>
              <p className="text-slate-500">
                A structured set of hubs to let marketing and sales synchronize efforts in real-time.
              </p>
            </div>
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Feature 1 */}
              <div className="group rounded-2xl border border-slate-200/60 p-6 bg-white hover:border-emerald-200 hover:shadow-lg transition duration-300 text-left">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit group-hover:scale-110 transition duration-300">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-800 mt-5 text-base">Sales Pipelines</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Visually monitor deal stages. Complete status tracking, automatic values calculation, and client offboarding.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group rounded-2xl border border-slate-200/60 p-6 bg-white hover:border-emerald-200 hover:shadow-lg transition duration-300 text-left">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit group-hover:scale-110 transition duration-300">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-800 mt-5 text-base">Marketing Campaigns</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Track UTM details, target lines, budgets, objectives, and auto-verify organization domains.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group rounded-2xl border border-slate-200/60 p-6 bg-white hover:border-emerald-200 hover:shadow-lg transition duration-300 text-left">
                <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit group-hover:scale-110 transition duration-300">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-800 mt-5 text-base">Team Tracking</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Monitor active sessions, calculate salesperson online duration, and trace live logs.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="group rounded-2xl border border-slate-200/60 p-6 bg-white hover:border-emerald-200 hover:shadow-lg transition duration-300 text-left">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit group-hover:scale-110 transition duration-300">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-800 mt-5 text-base">Payslip & HR</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Generate salary statements and export formatted reports instantly. Keep HR records clean.
                </p>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Campaign Creation Modal */}
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
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className={`rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
                domainError ? 'bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
              }`}
              disabled={saving || !!domainError}
            >
              {saving ? 'Saving...' : 'Save & View'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 p-1">
          {/* Main Info */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Campaign name <span className="text-red-500">*</span></label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g. Product Launch Q4"
              disabled={saving}
            />
          </div>
          
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Campaign code</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.code}
              onChange={handleChange('code')}
              placeholder="LAUNCH-Q4"
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Channel</label>
            <select
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.channel}
              onChange={handleChange('channel')}
              disabled={saving}
            >
              {channelOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Product line</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.productLine}
              onChange={handleChange('productLine')}
              placeholder="SecureCRM Pro"
              disabled={saving}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Objective</label>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              rows={2}
              value={form.objective}
              onChange={handleChange('objective')}
              placeholder="Promote new product features to mid-market..."
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Audience segment</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.audienceSegment}
              onChange={handleChange('audienceSegment')}
              placeholder="Mid-market SaaS"
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred call date</label>
            <input
              type="date"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.callDate}
              onChange={handleChange('callDate')}
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred call time</label>
            {(() => {
              const { hour, mer } = parseTime(form.callTime); return (
                <div className="mt-1.5 flex items-center gap-2">
                  <select
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
                    value={hour}
                    onChange={(e) => { const h = e.target.value; setForm(prev => ({ ...prev, callTime: composeTime(h, parseTime(prev.callTime).mer) })) }}
                    disabled={saving}
                  >
                    {['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(h => <option key={h} value={h}>{h || '—'}</option>)}
                  </select>
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Start date</label>
            <input
              type="date"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.startDate}
              onChange={handleChange('startDate')}
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">End date</label>
            <input
              type="date"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.endDate}
              onChange={handleChange('endDate')}
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Budget (₹)</label>
            <input
              type="number"
              min="0"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.budget}
              onChange={handleChange('budget')}
              placeholder="50000"
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Expected spend (₹)</label>
            <input
              type="number"
              min="0"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.expectedSpend}
              onChange={handleChange('expectedSpend')}
              placeholder="45000"
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Currency</label>
            <select
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
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
            <label className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Campaign stage
              <span className={`h-2 w-2 rounded-full ${stageDots[form.status] || 'bg-slate-400'}`} aria-hidden="true" />
            </label>
            <select
              className={`mt-1.5 w-full rounded-xl border bg-white px-3.5 py-2 text-sm focus:outline-none focus:ring focus:ring-emerald-100 transition ${selectStageBg[form.status] || 'border-slate-300 text-slate-900 focus:border-slate-400'}`}
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
            <select
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">External campaign ID</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.externalCampaignId}
              onChange={handleChange('externalCampaignId')}
              placeholder="FB-ADS-2025"
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">UTM source</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.utmSource}
              onChange={handleChange('utmSource')}
              placeholder="newsletter"
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">UTM medium</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.utmMedium}
              onChange={handleChange('utmMedium')}
              placeholder="email"
              disabled={saving}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">UTM campaign</label>
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              value={form.utmCampaign}
              onChange={handleChange('utmCampaign')}
              placeholder="launch_q4"
              disabled={saving}
            />
          </div>
          
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              rows={3}
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Key messaging and goals for this campaign..."
              disabled={saving}
            />
          </div>
          
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Compliance checklist</label>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
              rows={2}
              value={form.complianceChecklist}
              onChange={handleChange('complianceChecklist')}
              placeholder="Legal review, consent copy, opt-out link..."
              disabled={saving}
            />
          </div>
          
          {/* Company Details Section */}
          <div className="sm:col-span-2 lg:col-span-3 mt-4 border-t border-slate-100 pt-4 text-left">
            <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">Associated Account Info</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Entity name</label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
                  value={form.accountCompany}
                  onChange={handleChange('accountCompany')}
                  placeholder="Acme Inc"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Company domain</label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
                  value={form.accountDomain}
                  onChange={handleChange('accountDomain')}
                  placeholder="example.com"
                  disabled={saving}
                />
                {form.accountDomain ? (
                  <div className="mt-1.5 text-[11px] font-semibold">
                    {domainError && <div className="text-rose-500">{domainError}</div>}
                    {verification.status === 'loading' && <span className="text-slate-400">Verifying domain...</span>}
                    {verification.status === 'done' && verification.exists === true && <span className="text-emerald-600">✓ Verified Organization Account</span>}
                    {verification.status === 'done' && verification.exists === false && <span className="text-amber-500">✦ Registers as new client</span>}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile number</label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
                  value={form.mobile}
                  onChange={handleChange('mobile')}
                  placeholder="9876543210"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="name@company.com"
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