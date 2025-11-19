import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginAdmin, loginSales, requestForgotPasswordOtp, resetPasswordWithOtp, resendForgotOtp } from '../api/auth'
import Modal from '../components/Modal'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [adminForm, setAdminForm] = useState({ adminId: '', password: '' })
  const [salesForm, setSalesForm] = useState({ salesId: '', password: '' })
  const [mode, setMode] = useState('admin') // 'admin' | 'sales'
  const [error, setError] = useState('')
  const [fpOpen, setFpOpen] = useState(false)
  const [fpStep, setFpStep] = useState(1)
  const [fpEmail, setFpEmail] = useState('')
  const [fpOtp, setFpOtp] = useState('')
  const [fpNew, setFpNew] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpMsg, setFpMsg] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showSalesPassword, setShowSalesPassword] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await loginAdmin(adminForm)
      const user = res.data?.user
      if (!user?.id || user?.role !== 'admin') throw new Error('Invalid admin login response')
      localStorage.setItem('user', JSON.stringify(user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Login failed')
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
      if (!user?.id || user?.role !== 'sales') throw new Error('Invalid sales login response')
      localStorage.setItem('user', JSON.stringify(user))
      navigate('/dashboard/sales-dashboard')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Login failed')
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-5xl bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Section */}
          <div className="p-10 flex flex-col justify-center">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Secure<span className="text-indigo-600">CRM</span>
            </h1>
            <p className="text-gray-600 mb-8">Welcome back! Please log in to your account.</p>

            <div className="mb-4 flex items-center justify-center gap-2 text-sm">
              <button type="button" onClick={()=>setMode('admin')} className={`px-3 py-1.5 rounded-md border ${mode==='admin'?'bg-indigo-600 text-white':'bg-white text-slate-700'}`}>Admin Login</button>
              <button type="button" onClick={()=>setMode('sales')} className={`px-3 py-1.5 rounded-md border ${mode==='sales'?'bg-emerald-600 text-white':'bg-white text-slate-700'}`}>Sales Person Login</button>
            </div>
            {mode === 'admin' ? (
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin ID</label>
                <input
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"
                  name="adminId"
                  placeholder="AD-25ABC123"
                  value={adminForm.adminId}
                  onChange={(e)=>setAdminForm(s=>({ ...s, adminId: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"
                    name="password"
                    type={showAdminPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={adminForm.password}
                    onChange={(e)=>setAdminForm(s=>({ ...s, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowAdminPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
                  >
                    {showAdminPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.742 6.742A7.5 7.5 0 0119.5 12a7.5 7.5 0 01-1.41 4.243m-2.122 2.122A7.5 7.5 0 0112 19.5a7.5 7.5 0 01-5.303-2.16m0 0A7.5 7.5 0 014.5 12c0-1.808.63-3.468 1.697-4.777m2.5-2.5A7.5 7.5 0 0112 4.5c1.808 0 3.468.63 4.777 1.697" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <button type="button" className="text-sm text-indigo-600 hover:underline" onClick={() => { setFpOpen(true); setFpStep(1); setFpEmail(''); setFpOtp(''); setFpNew(''); setFpMsg(''); }}>
                    Forgot password?
                  </button>
                </div>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <button
                type="submit"
                className="w-full rounded-md bg-indigo-600 text-white py-3 font-semibold shadow hover:bg-indigo-700 transition disabled:opacity-70"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            ) : (
            <form onSubmit={onSubmitSales} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person ID</label>
                <input
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition"
                  name="salesId"
                  placeholder="SP-25ABC123"
                  value={salesForm.salesId}
                  onChange={(e)=>setSalesForm(s=>({ ...s, salesId: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition"
                    name="password"
                    type={showSalesPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={salesForm.password}
                    onChange={(e)=>setSalesForm(s=>({ ...s, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showSalesPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSalesPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
                  >
                    {showSalesPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.742 6.742A7.5 7.5 0 0119.5 12a7.5 7.5 0 01-1.41 4.243m-2.122 2.122A7.5 7.5 0 0112 19.5a7.5 7.5 0 01-5.303-2.16m0 0A7.5 7.5 0 014.5 12c0-1.808.63-3.468 1.697-4.777m2.5-2.5A7.5 7.5 0 0112 4.5c1.808 0 3.468.63 4.777 1.697" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <button
                type="submit"
                className="w-full rounded-md bg-emerald-600 text-white py-3 font-semibold shadow hover:bg-emerald-700 transition disabled:opacity-70"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In as Sales Person'}
              </button>
              <div className="text-xs text-slate-600 text-center">Don’t have a Sales Person ID? <Link to="/signup" className="text-emerald-700 underline">Sign up</Link></div>
            </form>
            )}

            <p className="mt-6 text-sm text-gray-600 text-center">
              Don’t have an account?{' '}
              <Link className="text-indigo-600 font-medium hover:underline" to="/signup">
                Sign up
              </Link>
            </p>
          </div>

          {/* Right Section */}
          <div className="bg-indigo-50 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-56 h-40 bg-indigo-100 rounded-xl mb-6 flex items-center justify-center shadow-inner">
              <div className="w-20 h-20 bg-indigo-300 rounded-lg" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Data, Securely Managed</h3>
            <p className="text-gray-600 text-sm max-w-xs">
              With SecureCRM, you can easily manage leads, customers, and growth—all in one protected dashboard.
            </p>
          </div>
        </div>
      </div>
      <Modal
        open={fpOpen}
        onClose={() => setFpOpen(false)}
        title={fpStep === 1 ? 'Reset password' : fpStep === 2 ? 'Enter OTP' : fpStep === 3 ? 'Set new password' : 'Success'}
        actions={
          fpStep === 4 ? (
            <button onClick={() => setFpOpen(false)} className="px-4 py-2 rounded-md bg-indigo-600 text-white">Close</button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {fpStep > 1 && fpStep < 4 && (
                  <button onClick={() => setFpStep(fpStep - 1)} className="px-3 py-2 rounded-md border border-slate-300">Back</button>
                )}
                {fpStep === 2 && (
                  <button 
                    onClick={onResendOTP} 
                    className="px-3 py-2 rounded-md border border-slate-300 text-sm"
                    disabled={resendLoading}
                  >
                    {resendLoading ? 'Resending...' : 'Resend OTP'}
                  </button>
                )}
                <button
                  onClick={onForgotPassword}
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-60"
                  disabled={fpLoading}
                >
                  {fpStep === 3 ? (fpLoading ? 'Saving...' : 'Save') : 'Next'}
                </button>
              </div>
            </div>
          )
        }
      >
        {fpStep === 1 && (
          <div className="space-y-2">
            <label className="block text-sm text-slate-700">Email</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              type="email"
              value={fpEmail}
              onChange={(e) => setFpEmail(e.target.value)}
              placeholder="you@example.com"
            />
            {fpMsg && <div className="text-sm text-red-600 mt-1">{fpMsg}</div>}
          </div>
        )}
        {fpStep === 2 && (
          <div className="space-y-2">
            <div className="text-sm text-slate-700">Enter the 6-digit OTP sent to {fpEmail || 'your email'}.</div>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 tracking-widest text-center"
              type="text"
              maxLength={6}
              value={fpOtp}
              onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter OTP"
            />
            {fpMsg && <div className="text-sm text-red-600 mt-1">{fpMsg}</div>}
          </div>
        )}
        {fpStep === 3 && (
          <div className="space-y-2">
            <label className="block text-sm text-slate-700">New password</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              type="password"
              value={fpNew}
              onChange={(e) => setFpNew(e.target.value)}
              placeholder="••••••••"
            />
            {fpMsg && <div className="text-sm text-red-600 mt-1">{fpMsg}</div>}
          </div>
        )}
        {fpStep === 4 && (
          <div className="text-sm text-slate-700">Password reset successful. You can now sign in with your new password.</div>
        )}
      </Modal>
    </main>
  )
}