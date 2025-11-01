import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser, verifyOTP, resendOTP, signupSalesStart, verifySalesOtp, resendSalesOtp } from '../api/auth'
import Modal from '../components/Modal'

export default function Signup() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agree, setAgree] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' })
  const [mode, setMode] = useState('admin') // 'admin' | 'sales'
  const [otpOpen, setOtpOpen] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpMsg, setOtpMsg] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [salesIdModal, setSalesIdModal] = useState({ open: false, id: '' })

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
        const { name, email, password, phone } = form
        const res = await registerUser({ name, email, password, phone })
        if (res.data.otpSent) {
          setOtpOpen(true)
        } else {
          navigate('/login')
        }
      } else {
        if (!form.email) {
          setError('Email is required for Sales Person signup')
          return
        }
        const { name, email, password } = form
        const res = await signupSalesStart({ name, email, password })
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
        await verifyOTP({ email: form.email, otp: otpCode })
        setOtpLoading(false)
        setOtpOpen(false)
        navigate('/login')
      } else {
        const res = await verifySalesOtp({ email: form.email, otp: otpCode })
        const sid = res.data?.salesId
        setOtpLoading(false)
        setOtpOpen(false)
        setSalesIdModal({ open: true, id: sid || '' })
      }
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
        await resendOTP({ email: form.email })
        setOtpMsg('OTP resent successfully!')
      } else {
        await resendSalesOtp({ email: form.email })
        setOtpMsg('OTP resent successfully!')
      }
    } catch (err) {
      setOtpMsg(err.response?.data?.error || 'Failed to resend OTP. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <>
    <main className="min-h-screen bg-gradient-to-tr from-indigo-50 via-white to-pink-50 flex items-center justify-center px-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-10 items-stretch">
        {/* Left panel */}
        <aside className="hidden md:flex bg-gradient-to-b from-indigo-700 to-indigo-900 rounded-2xl p-10 flex-col justify-between text-white shadow-lg">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-white/20 grid place-items-center text-xl">⚙️</div>
              <h2 className="text-2xl font-bold">CRM</h2>
            </div>
            <blockquote className="text-lg leading-relaxed">
              “The ease and simplicity of the program and the way the team continued to develop
              solutions integrated with our CRM is fabulous.”
            </blockquote>
          </div>
          <div className="mt-10 text-sm opacity-80">
            <div className="font-medium">Need assistance?</div>
            <div>support@example.com</div>
          </div>
        </aside>

        {/* Right panel - signup form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Start your free trial</h1>
            <p className="text-gray-500 mt-2 text-sm">Create your account to access your CRM dashboard</p>
          </div>
          <div className="mb-4 flex items-center justify-center gap-2 text-sm">
            <button type="button" onClick={()=>setMode('admin')} className={`px-3 py-1.5 rounded-md border ${mode==='admin'?'bg-indigo-600 text-white':'bg-white text-slate-700'}`}>Admin Signup</button>
            <button type="button" onClick={()=>setMode('sales')} className={`px-3 py-1.5 rounded-md border ${mode==='sales'?'bg-emerald-600 text-white':'bg-white text-slate-700'}`}>Sales Person Signup</button>
          </div>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"
                name="name" placeholder="Full Name" value={form.name} onChange={onChange} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"
                name="email" placeholder="name@company.com" value={form.email} onChange={onChange} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"
                name="password" placeholder="••••••••" value={form.password} onChange={onChange} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"
                name="confirmPassword" placeholder="••••••••" value={form.confirmPassword} onChange={onChange} required
              />
            </div>
            {mode==='admin' && (<div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-gray-600">+91</span>
                <input
                  className="w-full rounded-r-lg border border-gray-300 px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition"
                  name="phone" placeholder="98765 43210" value={form.phone} onChange={onChange}
                />
              </div>
            </div>)}
            {mode==='admin' && (<div className="text-xs text-gray-500">It looks like you’re in INDIA based on your IP.</div>)}
            <div className="flex items-start gap-2">
              <input id="tos" type="checkbox" className="mt-1 h-4 w-4" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
              <label htmlFor="tos" className="text-sm text-gray-700">
                I agree to the <a className="text-indigo-600 underline" href="#" onClick={(e)=>e.preventDefault()}>Terms of Service</a> and <a className="text-indigo-600 underline" href="#" onClick={(e)=>e.preventDefault()}>Privacy Policy</a>.
              </label>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button type="submit" className={`w-full rounded-lg py-3 font-semibold shadow-md transition disabled:opacity-70 ${mode==='admin'?'bg-indigo-600 hover:bg-indigo-700 text-white':'bg-emerald-600 hover:bg-emerald-700 text-white'}`} disabled={loading}>
              {loading ? 'Creating...' : (mode==='admin' ? 'GET STARTED' : 'CREATE SALES PERSON')}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account? <Link className="text-indigo-600 font-medium hover:underline" to="/login">Login</Link>
          </p>
        </div>
      </div>
    </main>
    <Modal
      open={otpOpen}
      onClose={() => setOtpOpen(false)}
      title="Verify your email"
      actions={
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={onResendOTP} 
              className="px-3 py-2 rounded-md border border-slate-300 text-sm"
              disabled={resendLoading}
            >
              {resendLoading ? 'Resending...' : 'Resend OTP'}
            </button>
            <button
              onClick={() => setOtpOpen(false)}
              className="px-3 py-2 rounded-md border border-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={onVerifyOTP}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-60"
              disabled={otpLoading}
            >
              {otpLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="text-sm text-slate-700">Enter the 6-digit OTP sent to {form.email || 'your email'}.</div>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 tracking-widest text-center"
          type="text"
          maxLength={6}
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter OTP"
        />
        {otpMsg && <div className="text-sm text-red-600 mt-1">{otpMsg}</div>}
      </div>
    </Modal>
    <Modal
      open={salesIdModal.open}
      onClose={() => setSalesIdModal({ open: false, id: '' })}
      title="Sales Person ID"
      actions={<button onClick={()=>{ setSalesIdModal({ open: false, id: '' }); navigate('/login') }} className="px-4 py-2 rounded-md bg-emerald-600 text-white">Go to Login</button>}
    >
      <div className="text-sm text-slate-700">
        Your Sales Person ID is:
        <div className="mt-2 rounded border bg-slate-50 px-3 py-2 font-mono text-emerald-700">{salesIdModal.id || '—'}</div>
        Please save it. You will use this ID + password to log in.
      </div>
    </Modal>
    </>
  )
}