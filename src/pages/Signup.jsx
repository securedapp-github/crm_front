import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signupAdminStart, verifyAdminOtp, resendAdminOtp, signupSalesStart, verifySalesOtp, resendSalesOtp } from '../api/auth'
import Modal from '../components/Modal'
import logo from '../assets/securedapp-logo.png'
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
  EyeOff,
  Quote,
  Users
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
          setError('Email is required for Team signup')
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
        <div className={`absolute top-[10%] left-[10%] w-[35rem] h-[35rem] rounded-full ${mode === 'admin' ? 'bg-blue-200/20' : 'bg-emerald-200/20'} blur-[100px] pointer-events-none`} />
        <div className={`absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full ${mode === 'admin' ? 'bg-blue-200/10' : 'bg-emerald-200/10'} blur-[100px] pointer-events-none`} />

        <div className="relative w-full max-w-5xl bg-white/80 border border-white/10 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden backdrop-blur-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            
            {/* Left Brand Panel (Testimonials & Features) */}
            <aside className="hidden lg:flex lg:col-span-6 bg-slate-950 p-8 sm:p-12 flex-col justify-between text-white relative lg:border-r lg:border-slate-800">
              <div className={`absolute top-[20%] right-[-10%] w-[25rem] h-[25rem] rounded-full blur-[80px] pointer-events-none animate-pulse-glow ${mode === "admin" ? "bg-blue-500/15" : "bg-emerald-500/15"}`} />
              
              {/* Logo / Badge */}
              <div className="relative z-10 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 shadow-sm backdrop-blur-sm overflow-hidden flex items-center justify-start">
                  <img src={logo} alt="SecuredApp Logo" className="h-7 w-20 max-w-none object-cover object-left" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${mode === 'admin' ? 'text-blue-400' : 'text-emerald-400'}`}>Enterprise Secured</span>
              </div>

              {/* Testimonial Quote Card */}
              <div className="relative z-10 my-10 space-y-6 w-full text-left">
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
                  <Quote className="h-8 w-8 text-blue-500/80 opacity-70 mb-3" />
                  <blockquote className="text-sm sm:text-base font-medium leading-relaxed text-slate-100">
                    “The simplicity of the workflows and how easily marketing campaign tracking connects 
                    with our sales pipelines has <span className="text-sky-400 font-semibold">saved us hours of</span> <span className="text-emerald-400 font-semibold">manual data sync.</span>”
                  </blockquote>
                </div>

                {/* Micro indicators in premium rows */}
                <div className="space-y-3 text-slate-350">
                  <div className="flex items-center gap-4 bg-slate-900/30 border border-slate-800/40 rounded-xl p-3.5 hover:bg-slate-900/40 transition">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] shrink-0">
                      <Mail className="h-5 w-5 text-blue-400" />
                      <Lock className="absolute bottom-1 right-1 h-2.5 w-2.5 text-blue-300 bg-slate-950 rounded-full p-[1.5px]" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-300 font-medium">Secure OTP Verification on email</span>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-900/30 border border-slate-800/40 rounded-xl p-3.5 hover:bg-slate-900/40 transition">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] shrink-0">
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-300 font-medium">Pending stage administrator reviews</span>
                  </div>
                </div>
              </div>

              {/* Footer Citation */}
              <div className="relative z-10 text-[10px] text-slate-500 flex items-center justify-between">
                <span>SecureCRM v1.2</span>
                <a href="https://securedapp.io" target="_blank" rel="noreferrer" className={`hover:${mode === 'admin' ? 'text-blue-400' : 'text-emerald-400'} transition`}>securedapp.io</a>
              </div>
            </aside>

            {/* Right Signup Form Panel */}
            <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center text-left">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                <span>Join</span>
                <span className={mode === 'admin' ? 'text-blue-600' : 'text-emerald-600'}>SecureCRM</span>
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
                  Team Signup
                </button>
                <button 
                  type="button" 
                  onClick={() => setMode('admin')} 
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    mode === 'admin' 
                      ? 'bg-white text-blue-600 shadow-[0_2px_8px_rgba(37,99,235,0.12)] border border-blue-100/50' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Admin Signup
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
                      className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${mode === 'admin' ? 'focus:ring-blue-100 focus:border-blue-500' : 'focus:ring-emerald-100 focus:border-emerald-500'} focus:bg-white transition`}
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
                      className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${mode === 'admin' ? 'focus:ring-blue-100 focus:border-blue-500' : 'focus:ring-emerald-100 focus:border-emerald-500'} focus:bg-white transition`}
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
                      className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${mode === 'admin' ? 'focus:ring-blue-100 focus:border-blue-500' : 'focus:ring-emerald-100 focus:border-emerald-500'} focus:bg-white transition`}
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
                      className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${mode === 'admin' ? 'focus:ring-blue-100 focus:border-blue-500' : 'focus:ring-emerald-100 focus:border-emerald-500'} focus:bg-white transition`}
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

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Phone Number {mode === 'sales' && <span className="text-[10px] text-slate-400 lowercase font-normal">(optional)</span>}
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">+91</span>
                    <input
                      className={`w-full rounded-r-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${mode === 'admin' ? 'focus:ring-blue-100 focus:border-blue-500' : 'focus:ring-emerald-100 focus:border-emerald-500'} focus:bg-white transition`}
                      name="phone" 
                      placeholder="98765 43210" 
                      value={form.phone} 
                      onChange={onChange}
                      disabled={loading}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Country code auto-locked to local region (+91).</p>
                </div>

                {/* TOS Checkbox */}
                <div className="flex items-start gap-2.5 pt-1 text-left">
                  <input 
                    id="tos" 
                    type="checkbox" 
                    className={`mt-1 h-3.5 w-3.5 rounded border-slate-200 transition ${mode === 'admin' ? 'text-blue-600 focus:ring-blue-100' : 'text-emerald-600 focus:ring-emerald-100'}`} 
                    checked={agree} 
                    onChange={(e) => setAgree(e.target.checked)} 
                  />
                  <label htmlFor="tos" className="text-xs text-slate-500 leading-tight">
                    I agree to the <a className={`${mode === 'admin' ? 'text-blue-600' : 'text-emerald-600'} font-semibold hover:underline`} href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a> and <a className={`${mode === 'admin' ? 'text-blue-600' : 'text-emerald-600'} font-semibold hover:underline`} href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
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
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100 hover:shadow-xl' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 hover:shadow-xl'
                  }`} 
                  disabled={loading}
                >
                  {loading ? 'Creating Workspace...' : (mode === 'admin' ? 'Launch Admin Account' : 'Register Team Account')}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs font-semibold text-slate-500">
                  Already have an account? <Link className={`${mode === 'admin' ? 'text-blue-600' : 'text-emerald-600'} font-bold hover:underline`} to="/login">Login</Link>
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
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow transition disabled:opacity-60 ${
                  mode === 'admin' 
                    ? 'bg-blue-600 hover:bg-blue-750 shadow-blue-100' 
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                }`}
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
              className={`w-full rounded-xl border border-slate-200 px-4 py-3 tracking-widest text-center text-lg font-bold focus:outline-none focus:ring-2 transition ${
                mode === 'admin' 
                  ? 'focus:border-blue-500 focus:ring-blue-100' 
                  : 'focus:border-emerald-500 focus:ring-emerald-100'
              }`}
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
                pendingRole === 'admin' 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
              }`}
            >
              Understand & Continue
            </button>
          }
        >
          <div className="p-1 text-left text-sm text-slate-600 leading-relaxed flex flex-col gap-3">
            <div className={`flex items-center gap-2 ${pendingRole === 'admin' ? 'text-blue-600' : 'text-emerald-600'}`}>
              <ShieldCheck className="h-5 w-5" />
              <span className="font-bold">Email verified successfully.</span>
            </div>
            <p className="text-xs">
              {pendingRole === 'admin'
                ? 'Your registration has been placed in the Admin queue. An email confirmation will be sent as soon as your workspace is approved for deployment.'
                : 'Your profile has been logged in the Team queue. Please notify your workspace owner to toggle your credentials to Active in the team settings.'}
            </p>
          </div>
        </Modal>
      </main>
    </>
  )
}