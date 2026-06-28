import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signupAdminStart, verifyAdminOtp, resendAdminOtp, signupSalesStart, verifySalesOtp, resendSalesOtp } from '../api/auth'
import Modal from '../components/Modal'
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react'

export default function Signup() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agree, setAgree] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' })
  const [mode, setMode] = useState('sales') // 'admin' | 'sales'
  const [otpOpen, setOtpOpen] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpMsg, setOtpMsg] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [pendingRole, setPendingRole] = useState('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!agree) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (mode === 'admin') {
        const { name, email, password } = form
        await signupAdminStart({ name, email, password })
        setOtpOpen(true)
      } else {
        if (!form.email) {
          setError('Email is required for Sales Person signup')
          return
        }
        const { name, email, password } = form
        await signupSalesStart({ name, email, password })
        setOtpOpen(true)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const onVerifyOTP = async () => {
    if (!otpCode) {
      setOtpMsg('Please enter the OTP')
      return
    }

    setOtpLoading(true)
    setOtpMsg('')

    try {
      if (mode === 'admin') {
        await verifyAdminOtp({ email: form.email, otp: otpCode })
        setPendingRole('admin')
      } else {
        await verifySalesOtp({ email: form.email, otp: otpCode })
        setPendingRole('sales')
      }
      setOtpLoading(false)
      setOtpOpen(false)
      setApprovalModalOpen(true)
    } catch (err) {
      setOtpLoading(false)
      setOtpMsg(err.response?.data?.error || 'Invalid OTP. Please try again.')
    }
  }

  const onResendOTP = async () => {
    setResendLoading(true)
    setOtpMsg('')

    try {
      if (mode === 'admin') {
        await resendAdminOtp({ email: form.email })
      } else {
        await resendSalesOtp({ email: form.email })
      }
      setOtpMsg('OTP resent successfully!')
    } catch (err) {
      setOtpMsg(err.response?.data?.error || 'Failed to resend OTP. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <>
      <main className="relative min-h-[calc(100vh-68px)] flex items-center justify-center bg-[#fafbfe] bg-grid-pattern px-4 py-8 sm:py-12 overflow-hidden">
        {/* Glow backgrounds */}
        <div className="absolute top-[10%] left-[10%] w-[35rem] h-[35rem] rounded-full bg-indigo-200/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-emerald-200/10 blur-[100px] pointer-events-none" />

        <div className="relative w-full max-w-5xl bg-white/80 border border-slate-200/60 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            
            {/* Left Brand Panel (Testimonials & Features) */}
            <aside className="hidden lg:flex lg:col-span-6 bg-slate-950 p-8 sm:p-12 flex-col justify-between text-white relative lg:border-r lg:border-slate-800">
              <div className="absolute top-[20%] right-[-10%] w-[25rem] h-[25rem] rounded-full bg-indigo-600/20 blur-[80px] pointer-events-none animate-pulse-glow" />
              
              {/* Logo / Badge */}
              <div className="relative z-10 flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Enterprise Secured</span>
              </div>

              {/* Testimonial Quote */}
              <div className="relative z-10 my-10 space-y-6">
                <blockquote className="text-base sm:text-lg font-medium leading-relaxed text-slate-100 italic">
                  “The simplicity of the workflows and how easily marketing campaign tracking connects 
                  with our sales pipelines has saved us hours of manual data sync.”
                </blockquote>
                
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs shadow-md">
                    N
                  </span>
                  <div className="leading-tight text-left">
                    <span className="text-xs font-bold text-white block">Nikil J.</span>
                    <span className="text-[10px] text-slate-400">Owner, SecuredApp Workspace</span>
                  </div>
                </div>

                {/* Micro indicators */}
                <div className="space-y-3 pt-6 border-t border-slate-800/80 text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs">Secure OTP Verification on email</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs">Pending stage administrator reviews</span>
                  </div>
                </div>
              </div>

              {/* Footer Citation */}
              <div className="relative z-10 text-[10px] text-slate-500 flex items-center justify-between">
                <span>SecureCRM v1.2</span>
                <a href="https://securedapp.io" target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition">securedapp.io</a>
              </div>
            </aside>

            {/* Right Signup Form Panel */}
            <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                <span>Join</span>
                <span className="text-indigo-600">SecureCRM</span>
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-2">Get started with your dedicated team workspace.</p>

              {/* Mode Toggle Tab */}
              <div className="mt-6 mb-5 bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1">
                <button 
                  type="button" 
                  onClick={() => setMode('sales')} 
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    mode === 'sales' 
                      ? 'bg-white text-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.12)] border border-emerald-100/50' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sales Agent Signup
                </button>
                <button 
                  type="button" 
                  onClick={() => setMode('admin')} 
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    mode === 'admin' 
                      ? 'bg-white text-indigo-600 shadow-[0_2px_8px_rgba(99,102,241,0.12)] border border-indigo-100/50' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Workspace Admin
                </button>
              </div>

              {/* Signup Form */}
              <form className="space-y-3.5" onSubmit={onSubmit}>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition"
                      name="name" 
                      placeholder="e.g. John Doe" 
                      value={form.name} 
                      onChange={onChange} 
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Work Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition"
                      name="email" 
                      placeholder="name@company.com" 
                      value={form.email} 
                      onChange={onChange} 
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Create Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition"
                      name="password" 
                      placeholder="••••••••" 
                      value={form.password} 
                      onChange={onChange} 
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition"
                      name="confirmPassword" 
                      placeholder="••••••••" 
                      value={form.confirmPassword} 
                      onChange={onChange} 
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'admin' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">+91</span>
                      <input
                        className="w-full rounded-r-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition"
                        name="phone" 
                        placeholder="98765 43210" 
                        value={form.phone} 
                        onChange={onChange}
                        disabled={loading}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Country code auto-locked to local region (+91).</p>
                  </div>
                )}

                {/* TOS Checkbox */}
                <div className="flex items-start gap-2.5 pt-1 text-left">
                  <input 
                    id="tos" 
                    type="checkbox" 
                    className="mt-1 h-3.5 w-3.5 rounded border-slate-200 text-indigo-600 focus:ring-indigo-100 transition" 
                    checked={agree} 
                    onChange={(e) => setAgree(e.target.checked)} 
                  />
                  <label htmlFor="tos" className="text-xs text-slate-500 leading-tight">
                    I agree to the <a className="text-indigo-600 font-semibold hover:underline" href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a> and <a className="text-indigo-600 font-semibold hover:underline" href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
                  </label>
                </div>

                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200/50 p-2.5 text-xs text-rose-600 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className={`w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition duration-300 disabled:opacity-75 disabled:cursor-not-allowed ${
                    mode === 'admin' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 hover:shadow-xl' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 hover:shadow-xl'
                  }`} 
                  disabled={loading}
                >
                  {loading ? 'Creating Workspace...' : (mode === 'admin' ? 'Launch Admin Account' : 'Register Sales Account')}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs font-semibold text-slate-500">
                  Already have an account? <Link className="text-indigo-600 font-bold hover:underline" to="/login">Login</Link>
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* OTP Verification Modal */}
        <Modal
          open={otpOpen}
          onClose={() => setOtpOpen(false)}
          title="Verify your email"
          actions={
            <div className="flex items-center justify-end gap-2 w-full pt-2">
              <button
                onClick={onResendOTP}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                disabled={resendLoading}
              >
                {resendLoading ? 'Resending...' : 'Resend OTP'}
              </button>
              <button
                onClick={() => setOtpOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={onVerifyOTP}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow transition disabled:opacity-60"
                disabled={otpLoading}
              >
                {otpLoading ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 p-1 text-left">
            <p className="text-xs text-slate-500 leading-relaxed">Enter the 6-digit OTP code sent to your registered email <strong className="text-slate-850">{form.email}</strong>.</p>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 tracking-widest text-center text-lg font-bold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
            />
            {otpMsg && <div className="text-xs text-rose-500 mt-1 font-semibold">{otpMsg}</div>}
          </div>
        </Modal>

        {/* Approval Pending Modal */}
        <Modal
          open={approvalModalOpen}
          onClose={() => setApprovalModalOpen(false)}
          title="Approval Pending"
          actions={
            <button 
              onClick={() => { setApprovalModalOpen(false); navigate('/login') }} 
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow transition hover:opacity-90 ${
                pendingRole === 'admin' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              Understand & Continue
            </button>
          }
        >
          <div className="p-1 text-left text-sm text-slate-600 leading-relaxed flex flex-col gap-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-bold">Email verified successfully.</span>
            </div>
            <p className="text-xs">
              {pendingRole === 'admin'
                ? 'Your registration has been placed in the Admin queue. An email confirmation will be sent as soon as your workspace is approved for deployment.'
                : 'Your profile has been logged in the Sales queue. Please notify your workspace owner to toggle your agent credentials to Active in the team settings.'}
            </p>
          </div>
        </Modal>
      </main>
    </>
  )
}