import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../api/auth'
import Modal from '../components/Modal'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [fpOpen, setFpOpen] = useState(false)
  const [fpStep, setFpStep] = useState(1)
  const [fpEmail, setFpEmail] = useState('')
  const [fpOtp, setFpOtp] = useState('')
  const [fpNew, setFpNew] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpMsg, setFpMsg] = useState('')
  const [resendLoading, setResendLoading] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await loginUser(form)
      const data = res.data?.data || res.data
      const user = data?.user || { id: data?.id, name: data?.name, email: data?.email }
      if (!user?.id && !user?.email) throw new Error('User info not returned')
      localStorage.setItem('user', JSON.stringify(user))
      navigate('/dashboard')
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
      // In a real implementation, you would send a request to the backend
      // to initiate the password reset process and send an OTP
      setFpStep(2)
      return
    }
    
    if (fpStep === 2) {
      if (!fpOtp) {
        setFpMsg('Please enter the OTP')
        return
      }
      // In a real implementation, you would verify the OTP with the backend
      setFpMsg('')
      setFpStep(3)
      return
    }
    
    if (fpStep === 3) {
      if (!fpNew || fpNew.length < 6) {
        setFpMsg('Password must be at least 6 characters')
        return
      }
      // In a real implementation, you would send the new password to the backend
      setFpLoading(true)
      try {
        // Simulate API call
        setTimeout(() => {
          setFpLoading(false)
          setFpStep(4)
        }, 500)
      } catch (e) {
        setFpMsg('Something went wrong')
        setFpLoading(false)
      }
    }
  }

  const onResendOTP = () => {
    setResendLoading(true)
    setFpMsg('OTP resent successfully!')
    // In a real implementation, you would call an API to resend the OTP
    setTimeout(() => {
      setResendLoading(false)
    }, 1000)
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

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={onChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={onChange}
                  required
                />
                <div className="mt-2 text-right">
                  <button type="button" className="text-sm text-indigo-600 hover:underline" onClick={() => { setFpOpen(true); setFpStep(1); setFpEmail(form.email || ''); setFpOtp(''); setFpNew(''); setFpMsg(''); }}>
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