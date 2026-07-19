import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginAdmin, loginSales, requestForgotPasswordOtp, resetPasswordWithOtp, resendForgotOtp } from '../api/auth'
import Modal from '../components/Modal'
import logo from '../assets/securedapp-logo.png'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [adminForm, setAdminForm] = useState({ email: '', password: '' })
  const [salesForm, setSalesForm] = useState({ email: '', password: '' })
  const [mode, setMode] = useState('sales') // 'admin' | 'sales'
  const [error, setError] = useState('')
  const [fpOpen, setFpOpen] = useState(false)
  const [fpStep, setFpStep] = useState(1)
  const [fpEmail, setFpEmail] = useState('')
  const [fpOtp, setFpOtp] = useState('')
  const [fpNew, setFpNew] = useState('')
  const [fpConfirm, setFpConfirm] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpMsg, setFpMsg] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showSalesPassword, setShowSalesPassword] = useState(false)
  const [showFpNewPassword, setShowFpNewPassword] = useState(false)
  const [showFpConfirmPassword, setShowFpConfirmPassword] = useState(false)
  const [fpContext, setFpContext] = useState('admin')

  const openForgotPasswordModal = (context) => {
    setFpContext(context)
    setFpOpen(true)
    setFpStep(1)
    setFpEmail(context === 'admin' ? adminForm.email : salesForm.email)
    setFpOtp('')
    setFpNew('')
    setFpConfirm('')
    setShowFpNewPassword(false)
    setShowFpConfirmPassword(false)
    setFpMsg('')
  }

  const getLandingPath = (user) => {
    if (!user || !user.role) return '/login';
    const roles = user.role.split(',').map(r => r.trim().toLowerCase());
    
    if (roles.includes('admin')) return '/dashboard';
    if (roles.includes('hr')) return '/dashboard/hr-team';
    if (roles.includes('finance')) return '/dashboard/finance';
    if (roles.includes('sales')) return '/dashboard/sales-dashboard';
    if (roles.includes('marketing') || roles.includes('growth')) return '/dashboard';
    if (roles.includes('operations')) return '/dashboard/operations-team';
    if (roles.includes('tech')) return '/dashboard/tech-team';
    
    return '/dashboard/leave';
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await loginAdmin(adminForm)
      const user = res.data?.user
      if (!user?.id) throw new Error('Invalid login response')
      const roles = (user.role || '').split(',').map(r => r.trim().toLowerCase());
      if (!roles.includes('admin')) {
        throw new Error('Not authorized as admin. Please use Team Login.')
      }
      localStorage.setItem('user', JSON.stringify(user))
      window.dispatchEvent(new Event('auth:changed'))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const onSubmitSales = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await loginSales(salesForm)
      const user = res.data?.user
      if (!user?.id) throw new Error('Invalid login response')
      localStorage.setItem('user', JSON.stringify(user))
      window.dispatchEvent(new Event('auth:changed'))
      const landingPath = getLandingPath(user)
      navigate(landingPath)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }



  const onForgotPassword = async () => {
    if (fpStep === 1) {
      if (!fpEmail) {
        setFpMsg('Please enter your email address')
        return
      }
      setFpLoading(true)
      try {
        const res = await requestForgotPasswordOtp(fpEmail)
        setFpMsg(res.data?.message || 'OTP sent to your email')
        setFpStep(2)
      } catch (err) {
        setFpMsg(err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP')
      } finally {
        setFpLoading(false)
      }
      return
    }

    if (fpStep === 2) {
      if (!fpOtp) {
        setFpMsg('Please enter the OTP')
        return
      }
      setFpMsg('')
      setFpStep(3)
      return
    }

    if (fpStep === 3) {
      if (!fpNew || fpNew.length < 6) {
        setFpMsg('Password must be at least 6 characters')
        return
      }
      if (fpNew !== fpConfirm) {
        setFpMsg('Passwords do not match')
        return
      }
      setFpLoading(true)
      try {
        const res = await resetPasswordWithOtp({ email: fpEmail, otp: fpOtp, password: fpNew })
        setFpMsg(res.data?.message || 'Password reset successful')
        setFpStep(4)
      } catch (err) {
        setFpMsg(err.response?.data?.error || err.response?.data?.message || 'Failed to reset password')
      } finally {
        setFpLoading(false)
      }
    }
  }

  const onResendOTP = async () => {
    if (!fpEmail) {
      setFpMsg('Enter your email first')
      return
    }
    setResendLoading(true)
    try {
      const res = await resendForgotOtp(fpEmail)
      setFpMsg(res.data?.message || 'OTP resent successfully')
    } catch (err) {
      setFpMsg(err.response?.data?.error || err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setResendLoading(false)
    }
  }

  const handleModeChange = (newMode) => {
    setError('')
    if (newMode === 'admin' && mode === 'sales') {
      setAdminForm({ email: salesForm.email, password: salesForm.password })
    } else if (newMode === 'sales' && mode === 'admin') {
      setSalesForm({ email: adminForm.email, password: adminForm.password })
    }
    setMode(newMode)
  }

  return (
    <main className="relative min-h-[calc(100vh-68px)] flex items-center justify-center bg-[#fafbfe] bg-grid-pattern px-4 py-8 sm:py-12 overflow-hidden">
      {/* Glow backgrounds */}
      <div className={`absolute top-[10%] left-[10%] w-[35rem] h-[35rem] rounded-full ${mode === 'admin' ? 'bg-blue-200/20' : 'bg-emerald-200/20'} blur-[100px] pointer-events-none`} />
      <div className={`absolute bottom-[10%] right-[10%] w-[35rem] h-[35rem] rounded-full ${mode === 'admin' ? 'bg-blue-200/10' : 'bg-emerald-200/10'} blur-[100px] pointer-events-none`} />

      {/* Main Glass Card container */}
      <div className="relative w-full max-w-5xl bg-white/80 border border-white/10 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden backdrop-blur-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Form Column */}
          <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
              <span>Secure</span>
              <span className={mode === 'admin' ? 'text-blue-600' : 'text-emerald-600'}>CRM</span>
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-2">Welcome back. Access your workspace panel.</p>

            {/* Toggle Mode Tab */}
            <div className="mt-8 mb-6 bg-slate-100/80 p-1.5 rounded-2xl flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => handleModeChange('sales')} 
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  mode === 'sales' 
                    ? 'bg-white text-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.12)] border border-emerald-100/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Team Login
              </button>
              <button 
                type="button" 
                onClick={() => handleModeChange('admin')} 
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  mode === 'admin' 
                    ? 'bg-white text-blue-600 shadow-[0_2px_8px_rgba(37, 99, 235, 0.12)] border border-blue-100/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Admin Login
              </button>
            </div>

            {/* Admin Form */}
            {mode === 'admin' ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Admin Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition"
                      type="email"
                      name="email"
                      placeholder="admin@company.com"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm(s => ({ ...s, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-12 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition"
                      name="password"
                      type={showAdminPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm(s => ({ ...s, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowAdminPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  <div className="mt-2 text-right">
                    <button 
                      type="button" 
                      className="text-xs font-semibold text-blue-600 hover:underline" 
                      onClick={() => openForgotPasswordModal('admin')}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200/50 p-3 text-xs text-rose-600 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 text-xs font-bold uppercase tracking-wider text-white py-3.5 shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-xl transition-all duration-300 disabled:opacity-75 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            ) : (
              /* Sales Form */
              <form onSubmit={onSubmitSales} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sales Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:bg-white transition"
                      type="email"
                      name="email"
                      placeholder="sales@company.com"
                      value={salesForm.email}
                      onChange={(e) => setSalesForm(s => ({ ...s, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-12 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 focus:bg-white transition"
                      name="password"
                      type={showSalesPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={salesForm.password}
                      onChange={(e) => setSalesForm(s => ({ ...s, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showSalesPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowSalesPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showSalesPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  <div className="mt-2 text-right">
                    <button 
                      type="button" 
                      className="text-xs font-semibold text-emerald-600 hover:underline" 
                      onClick={() => openForgotPasswordModal('sales')}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200/50 p-3 text-xs text-rose-600 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 text-xs font-bold uppercase tracking-wider text-white py-3.5 shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-xl transition-all duration-300 disabled:opacity-75 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : 'Sign In to Sales Cloud'}
                </button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs font-semibold text-slate-500">
                Don’t have an account?{' '}
                <Link className={`${mode === 'admin' ? 'text-blue-600' : 'text-emerald-600'} font-bold hover:underline`} to="/signup">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Right Statistics Promotion Panel */}
          <div className="lg:col-span-6 bg-slate-950 relative p-8 sm:p-12 overflow-hidden flex flex-col justify-between text-left lg:border-l lg:border-slate-800">
            {/* Ambient slow rotating pulse in background */}
            <div className={`absolute top-[20%] right-[-10%] w-[25rem] h-[25rem] rounded-full blur-[80px] pointer-events-none animate-pulse-glow ${mode === "admin" ? "bg-blue-500/15" : "bg-emerald-500/15"}`} />
            
            {/* Logo/Badge */}
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 shadow-sm backdrop-blur-sm overflow-hidden flex items-center justify-start">
                <img src={logo} alt="SecuredApp Logo" className="h-7 w-20 max-w-none object-cover object-left" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${mode === 'admin' ? 'text-blue-400' : 'text-emerald-400'}`}>Enterprise Secured</span>
            </div>

            {/* Premium Interactive Stat Widget */}
            <div className="relative z-10 my-10 space-y-6">
              <div className="glass-premium-dark rounded-2xl p-6 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Growth Performance</span>
                  <span className={`text-[9px] font-bold ${mode === 'admin' ? 'text-blue-400 bg-blue-500/10' : 'text-emerald-400 bg-emerald-500/10'} px-2 py-0.5 rounded-full`}>Secure CRM</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-black text-white">$1.2M</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Average Pipeline Value</div>
                  </div>
                  <div className="h-10 w-24 flex items-end gap-1 pb-1">
                    <span className={`flex-1 ${mode === 'admin' ? 'bg-blue-500/30' : 'bg-emerald-500/30'} rounded-sm h-[30%]`} />
                    <span className={`flex-1 ${mode === 'admin' ? 'bg-blue-500/40' : 'bg-emerald-500/40'} rounded-sm h-[50%]`} />
                    <span className={`flex-1 ${mode === 'admin' ? 'bg-blue-500/60' : 'bg-emerald-500/60'} rounded-sm h-[40%]`} />
                    <span className={`flex-1 ${mode === 'admin' ? 'bg-blue-500' : 'bg-emerald-500'} rounded-sm h-[80%]`} />
                  </div>
                </div>
              </div>

              {/* Bullet list */}
              <div className="space-y-4 text-slate-300">
                <div className="flex items-start gap-3">
                  <div className={`p-1 ${mode === 'admin' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'} rounded-md mt-0.5`}>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Full Role Segregation</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Separate gateways for Sales agents and Board admins.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className={`p-1 ${mode === 'admin' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'} rounded-md mt-0.5`}>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Campaign Analytics</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Verify marketing domain accounts and auto-track leads.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Citation */}
            <div className="relative z-10 text-[10px] text-slate-500 flex items-center justify-between">
              <span>SecureCRM v1.2</span>
              <a href="https://securedapp.io" target="_blank" rel="noreferrer" className={`hover:${mode === 'admin' ? 'text-blue-400' : 'text-emerald-400'} transition`}>securedapp.io</a>
            </div>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        open={fpOpen}
        onClose={() => setFpOpen(false)}
        title={fpStep === 1 ? `Reset ${fpContext === 'admin' ? 'Admin' : 'Sales'} password` : fpStep === 2 ? 'Enter OTP' : fpStep === 3 ? 'Set new password' : 'Success'}
        actions={
          fpStep === 4 ? (
            <button 
              onClick={() => setFpOpen(false)} 
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow transition ${fpContext === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              Close
            </button>
          ) : (
            <div className="flex items-center justify-end gap-2 w-full pt-2">
              {fpStep > 1 && fpStep < 4 && (
                <button 
                  onClick={() => setFpStep(fpStep - 1)} 
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                >
                  Back
                </button>
              )}
              {fpStep === 2 && (
                <button
                  onClick={onResendOTP}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Resending...' : 'Resend OTP'}
                </button>
              )}
              <button
                onClick={onForgotPassword}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow transition disabled:opacity-60 ${fpContext === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                disabled={fpLoading}
              >
                {fpStep === 3 ? (fpLoading ? 'Saving...' : 'Save Password') : 'Next'}
              </button>
            </div>
          )
        }
      >
        <div className="p-1 text-left">
          {fpStep === 1 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Account Email</label>
              <input
                className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${fpContext === 'admin' ? 'focus:border-blue-500 focus:ring-blue-100' : 'focus:border-emerald-500 focus:ring-emerald-100'}`}
                type="email"
                value={fpEmail}
                onChange={(e) => setFpEmail(e.target.value)}
                placeholder="name@company.com"
              />
              {fpMsg && <div className="text-xs text-rose-500 mt-1 font-semibold">{fpMsg}</div>}
            </div>
          )}
          {fpStep === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">Enter the 6-digit OTP verification code sent to <strong className="text-slate-800">{fpEmail}</strong>.</p>
              <input
                className={`w-full rounded-xl border border-slate-200 px-4 py-3 tracking-widest text-center text-lg font-bold focus:outline-none focus:ring-2 transition ${fpContext === 'admin' ? 'focus:border-blue-500 focus:ring-blue-100' : 'focus:border-emerald-500 focus:ring-emerald-100'}`}
                type="text"
                maxLength={6}
                value={fpOtp}
                onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
              />
              {fpMsg && <div className="text-xs text-rose-500 mt-1 font-semibold">{fpMsg}</div>}
            </div>
          )}
          {fpStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${fpContext === 'admin' ? 'focus:border-blue-500 focus:ring-blue-100' : 'focus:border-emerald-500 focus:ring-emerald-100'}`}
                    type={showFpNewPassword ? 'text' : 'password'}
                    value={fpNew}
                    onChange={(e) => setFpNew(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showFpNewPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowFpNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showFpNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${fpContext === 'admin' ? 'focus:border-blue-500 focus:ring-blue-100' : 'focus:border-emerald-500 focus:ring-emerald-100'}`}
                    type={showFpConfirmPassword ? 'text' : 'password'}
                    value={fpConfirm}
                    onChange={(e) => setFpConfirm(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showFpConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowFpConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showFpConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {fpMsg && <div className="text-xs text-rose-500 font-semibold">{fpMsg}</div>}
            </div>
          )}
          {fpStep === 4 && (
            <div className="text-sm text-slate-600 flex items-center gap-2">
              <ShieldCheck className={`h-5 w-5 ${fpContext === 'admin' ? 'text-blue-500' : 'text-emerald-500'} shrink-0`} />
              <span>Password reset successful! You can now close this and sign in.</span>
            </div>
          )}
        </div>
      </Modal>
    </main>
  )
}