import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { permanentLogout, changePassword } from '../api/auth'
import { useToast } from '../components/ToastProvider'
import Modal from '../components/Modal'
import { 
  Eye, 
  EyeOff, 
  Shield, 
  User as UserIcon, 
  AlertTriangle, 
  Key
} from 'lucide-react'

export default function Settings() {
    const navigate = useNavigate()
    const location = useLocation()
    const { show } = useToast()
    
    // Parse query params to set initial tab
    const queryParams = new URLSearchParams(location.search)
    const initialTab = queryParams.get('tab') || 'account'
    
    const [activeTab, setActiveTab] = useState(initialTab === 'api' ? 'account' : initialTab)
    const [showFirstConfirm, setShowFirstConfirm] = useState(false)
    const [showSecondConfirm, setShowSecondConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    
    const [user, setUser] = useState(null)
    
    // Change Password State
    const [cpForm, setCpForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [cpLoading, setCpLoading] = useState(false)
    
    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}')
        setUser(userData)
    }, [])
    
    const handlePermanentLogout = async () => {
        setLoading(true)
        try {
            await permanentLogout()
            show('Account permanently deleted', 'success')
            localStorage.removeItem('user')
            window.dispatchEvent(new Event('auth:changed'))
            navigate('/')
        } catch (error) {
            console.error(error)
            show(error.response?.data?.message || 'Failed to delete account', 'error')
        } finally {
            setLoading(false)
        }
    }
    
    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (cpForm.new_password !== cpForm.confirm_password) {
            return show('New passwords do not match', 'error')
        }
        if (cpForm.new_password.length < 6) {
            return show('Password must be at least 6 characters', 'error')
        }
        
        setCpLoading(true)
        try {
            await changePassword({ current_password: cpForm.current_password, new_password: cpForm.new_password })
            show('Password changed successfully', 'success')
            setCpForm({ current_password: '', new_password: '', confirm_password: '' })
        } catch (error) {
            console.error(error)
            show(error.response?.data?.error || 'Failed to change password', 'error')
        } finally {
            setCpLoading(false)
        }
    }
    
    const getPasswordStrength = (pass) => {
        if (!pass) return 0
        let score = 0
        if (pass.length >= 8) score += 25
        if (pass.match(/[A-Z]/)) score += 25
        if (pass.match(/[0-9]/)) score += 25
        if (pass.match(/[^A-Za-z0-9]/)) score += 25
        return score
    }
    const strength = getPasswordStrength(cpForm.new_password)
    
    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Manage your account profile, password, and security preferences.</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200 overflow-x-auto">
                    <button 
                      onClick={() => setActiveTab('account')} 
                      className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'account' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/40' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        <UserIcon className="w-4 h-4" /> Account Profile
                    </button>
                    <button 
                      onClick={() => setActiveTab('security')} 
                      className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'security' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/40' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        <Shield className="w-4 h-4" /> Security
                    </button>
                    <button 
                      onClick={() => setActiveTab('danger')} 
                      className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-colors whitespace-nowrap ${activeTab === 'danger' ? 'border-b-2 border-rose-600 text-rose-700 bg-rose-50/40' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        <AlertTriangle className="w-4 h-4" /> Danger Zone
                    </button>
                </div>
                
                <div className="p-5 sm:p-8">
                    {/* Account Tab */}
                    {activeTab === 'account' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 mb-4">Profile Information</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
                                        <input type="text" readOnly value={user?.name || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                                        <input type="email" readOnly value={user?.email || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 focus:outline-none" />
                                    </div>
                                </div>
                                <div className="mt-5">
                                    <label className="block text-xs font-bold text-slate-600 mb-2">Account Role &amp; Permissions</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(user?.role || 'user').split(',').map(r => {
                                            const roleName = r.trim().toLowerCase();
                                            const label = {
                                                admin: 'Administrator',
                                                sales: 'Sales Representative',
                                                marketing: 'Marketing Manager',
                                                growth: 'Growth Teammate',
                                                hr: 'HR Manager',
                                                finance: 'Finance Officer',
                                                operations: 'Operations Teammate',
                                                tech: 'Tech Teammate',
                                                user: 'Employee'
                                            }[roleName] || roleName;
                                            const style = roleName === 'admin' 
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                                : 'bg-emerald-50 border-emerald-200 text-emerald-700';
                                            return (
                                                <span key={roleName} className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold tracking-wide uppercase ${style}`}>
                                                    {label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="max-w-md animate-fade-in">
                            <h2 className="text-base font-bold text-slate-900 mb-1">Change Account Password</h2>
                            <p className="text-xs text-slate-500 mb-5">Ensure your account is protected with a strong, randomized password.</p>
                            
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Current Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showCurrent ? 'text' : 'password'} 
                                            value={cpForm.current_password} 
                                            onChange={(e) => setCpForm({...cpForm, current_password: e.target.value})} 
                                            required 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                                        />
                                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">New Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showNew ? 'text' : 'password'} 
                                            value={cpForm.new_password} 
                                            onChange={(e) => setCpForm({...cpForm, new_password: e.target.value})} 
                                            required 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                                        />
                                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {cpForm.new_password && (
                                        <div className="mt-2 flex gap-1">
                                            <div className={`h-1.5 flex-1 rounded-full ${strength >= 25 ? 'bg-rose-500' : 'bg-slate-100'}`}></div>
                                            <div className={`h-1.5 flex-1 rounded-full ${strength >= 50 ? 'bg-amber-500' : 'bg-slate-100'}`}></div>
                                            <div className={`h-1.5 flex-1 rounded-full ${strength >= 75 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
                                            <div className={`h-1.5 flex-1 rounded-full ${strength >= 100 ? 'bg-emerald-600' : 'bg-slate-100'}`}></div>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        value={cpForm.confirm_password} 
                                        onChange={(e) => setCpForm({...cpForm, confirm_password: e.target.value})} 
                                        required 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                                    />
                                </div>
                                
                                <button type="submit" disabled={cpLoading || !cpForm.current_password || !cpForm.new_password} className="flex items-center justify-center gap-2 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Key className="w-4 h-4" /> {cpLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    )}
                    
                    {/* Danger Zone Tab */}
                    {activeTab === 'danger' && (
                        <div className="animate-fade-in">
                            <h2 className="text-base font-bold text-slate-900 mb-4">Danger Zone</h2>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-rose-50/50 border border-rose-100 rounded-2xl gap-4">
                                <div>
                                    <h3 className="font-bold text-xs text-rose-900">Permanent Logout &amp; Account Deletion</h3>
                                    <p className="text-xs text-rose-700/80 mt-1 max-w-lg">
                                        This will permanently delete your account and remove all your data from the database.
                                        This action cannot be undone.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowFirstConfirm(true)}
                                    className="shrink-0 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-all cursor-pointer"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* First Confirmation Modal */}
            <Modal
                open={showFirstConfirm}
                onClose={() => setShowFirstConfirm(false)}
                title="Are you sure?"
                actions={
                    <>
                        <button
                            onClick={() => setShowFirstConfirm(false)}
                            className="px-4 py-2 text-slate-700 font-bold text-xs hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setShowFirstConfirm(false)
                                setShowSecondConfirm(true)
                            }}
                            className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors cursor-pointer"
                        >
                            Continue
                        </button>
                    </>
                }
            >
                <div>
                    <p className="text-xs text-slate-600 mb-6">
                        You are about to permanently delete your account. This action is irreversible.
                    </p>
                </div>
            </Modal>

            {/* Second Confirmation Modal */}
            <Modal
                open={showSecondConfirm}
                onClose={() => setShowSecondConfirm(false)}
                title="Final Confirmation"
                actions={
                    <>
                        <button
                            onClick={() => setShowSecondConfirm(false)}
                            className="px-4 py-2 text-slate-700 font-bold text-xs hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePermanentLogout}
                            disabled={loading}
                            className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                            {loading ? 'Deleting...' : 'Yes, Delete My Account'}
                        </button>
                    </>
                }
            >
                <div>
                    <div className="flex items-center gap-3 text-rose-600 mb-4">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-bold text-xs">Last Warning</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-6">
                        Please confirm one last time. This will <strong>immediately delete your account</strong> and you will be logged out.
                    </p>
                </div>
            </Modal>
        </div>
    )
}
