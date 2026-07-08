import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { permanentLogout, changePassword } from '../api/auth'
import { useToast } from '../components/ToastProvider'
import Modal from '../components/Modal'
import { Eye, EyeOff, Shield, User as UserIcon, AlertTriangle, Key } from 'lucide-react'

export default function Settings() {
    const navigate = useNavigate()
    const location = useLocation()
    const { show } = useToast()
    
    // Parse query params to set initial tab
    const queryParams = new URLSearchParams(location.search)
    const initialTab = queryParams.get('tab') || 'account'
    
    const [activeTab, setActiveTab] = useState(initialTab)
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
        // If sales, they can still access Settings if we remove the redirect. 
        // Plan says change password is for ALL users (admin + sales), so we remove the sales redirect.
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
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your account settings and preferences.</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200">
                    <button onClick={() => setActiveTab('account')} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'account' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                        <UserIcon className="w-4 h-4" /> Account
                    </button>
                    <button onClick={() => setActiveTab('security')} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'security' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                        <Shield className="w-4 h-4" /> Security
                    </button>
                    <button onClick={() => setActiveTab('danger')} className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'danger' ? 'border-b-2 border-rose-600 text-rose-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                        <AlertTriangle className="w-4 h-4" /> Danger Zone
                    </button>
                </div>
                
                <div className="p-6 sm:p-8">
                    {/* Account Tab */}
                    {activeTab === 'account' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                        <input type="text" readOnly value={user?.name || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                        <input type="email" readOnly value={user?.email || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none" />
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Account Role</label>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${user?.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {user?.role === 'admin' ? 'Administrator' : 'Sales Representative'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="max-w-md animate-fade-in">
                            <h2 className="text-lg font-semibold text-slate-900 mb-1">Change Password</h2>
                            <p className="text-sm text-slate-500 mb-6">Ensure your account is using a long, random password to stay secure.</p>
                            
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showCurrent ? 'text' : 'password'} 
                                            value={cpForm.current_password} 
                                            onChange={(e) => setCpForm({...cpForm, current_password: e.target.value})} 
                                            required 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                                        />
                                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showNew ? 'text' : 'password'} 
                                            value={cpForm.new_password} 
                                            onChange={(e) => setCpForm({...cpForm, new_password: e.target.value})} 
                                            required 
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        value={cpForm.confirm_password} 
                                        onChange={(e) => setCpForm({...cpForm, confirm_password: e.target.value})} 
                                        required 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" 
                                    />
                                </div>
                                
                                <button type="submit" disabled={cpLoading || !cpForm.current_password || !cpForm.new_password} className="flex items-center justify-center gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Key className="w-4 h-4" /> {cpLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    )}
                    
                    {/* Danger Zone Tab */}
                    {activeTab === 'danger' && (
                        <div className="animate-fade-in">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Danger Zone</h2>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-rose-50/50 border border-rose-100 rounded-2xl gap-4">
                                <div>
                                    <h3 className="font-medium text-rose-900">Permanent Logout</h3>
                                    <p className="text-sm text-rose-700/80 mt-1 max-w-lg">
                                        This will permanently delete your account and remove all your data from the database.
                                        This action cannot be undone.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowFirstConfirm(true)}
                                    className="shrink-0 px-5 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-500/20 transition-all"
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
                            className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setShowFirstConfirm(false)
                                setShowSecondConfirm(true)
                            }}
                            className="px-4 py-2 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-colors"
                        >
                            Continue
                        </button>
                    </>
                }
            >
                <div>
                    <p className="text-slate-600 mb-6">
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
                            className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePermanentLogout}
                            disabled={loading}
                            className="px-4 py-2 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            {loading ? 'Deleting...' : 'Yes, Delete My Account'}
                        </button>
                    </>
                }
            >
                <div>
                    <div className="flex items-center gap-3 text-rose-600 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <span className="font-bold">Last Warning</span>
                    </div>
                    <p className="text-slate-600 mb-6">
                        Please confirm one last time. This will <strong>immediately delete your account</strong> and you will be logged out.
                    </p>
                </div>
            </Modal>
        </div>
    )
}
