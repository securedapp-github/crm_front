import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { permanentLogout } from '../api/auth'
import { useToast } from '../components/ToastProvider'
import Modal from '../components/Modal'

export default function Settings() {
    const navigate = useNavigate()
    const { show } = useToast()
    const [showFirstConfirm, setShowFirstConfirm] = useState(false)
    const [showSecondConfirm, setShowSecondConfirm] = useState(false)
    const [loading, setLoading] = useState(false)

    // Redirect if user is sales
    React.useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        if (user.role === 'sales') {
            navigate('/dashboard/sales-dashboard')
        }
    }, [navigate])

    const handlePermanentLogout = async () => {
        setLoading(true)
        try {
            await permanentLogout()
            show('Account permanently deleted', 'success')
            // Clear local storage and redirect
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

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Danger Zone</h2>
                <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-lg">
                    <div>
                        <h3 className="font-medium text-rose-900">Permanent Logout</h3>
                        <p className="text-sm text-rose-700 mt-1">
                            This will permanently delete your account and remove all your data from the database.
                            This action cannot be undone.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowFirstConfirm(true)}
                        className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors"
                    >
                        Delete Account
                    </button>
                </div>
            </div>

            {/* First Confirmation Modal */}
            {/* First Confirmation Modal */}
            <Modal
                open={showFirstConfirm}
                onClose={() => setShowFirstConfirm(false)}
                title="Are you sure?"
                actions={
                    <>
                        <button
                            onClick={() => setShowFirstConfirm(false)}
                            className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-50 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setShowFirstConfirm(false)
                                setShowSecondConfirm(true)
                            }}
                            className="px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700"
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
                            className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-50 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePermanentLogout}
                            disabled={loading}
                            className="px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
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
