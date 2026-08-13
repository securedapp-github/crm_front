import React, { useState, useEffect } from 'react'
import ActivityNav from '../../components/activity/ActivityNav'
import {
  fetchPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy
} from '../../api/activity'
import { getStaffUsers } from '../../api/user'
import CategoryBadge from '../../components/activity/CategoryBadge'
import DomainIcon from '../../components/activity/DomainIcon'
import { ShieldCheck, Plus, CheckCircle2, XCircle, Trash2, Edit3, Search, X, User, Globe, Filter } from 'lucide-react'

export default function ActivityAllowedDomains() {
  const [allowlistRules, setAllowlistRules] = useState([])
  const [staffUsers, setStaffUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [selectedUserFilter, setSelectedUserFilter] = useState('all')

  // Form State (single add)
  const [formData, setFormData] = useState({
    name: '',
    type: 'allowlist',
    domainPattern: '',
    category: 'productive',
    isActive: true,
    userId: ''
  })

  // Bulk Add State
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [bulkShared, setBulkShared] = useState({ userId: '', category: 'productive', isActive: true })
  const [bulkRows, setBulkRows] = useState([
    { name: '', domainPattern: '' },
    { name: '', domainPattern: '' },
  ])
  const [bulkSaving, setBulkSaving] = useState(false)

  // Live pattern tester
  const [testUrl, setTestUrl] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testError, setTestError] = useState('')

  const loadStaffAndPolicies = async () => {
    setLoading(true)
    try {
      const [policiesRes, staffRes] = await Promise.allSettled([
        fetchPolicies(),
        getStaffUsers()
      ])

      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value?.data?.data)) {
        setStaffUsers(staffRes.value.data.data)
      } else if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value?.data)) {
        setStaffUsers(staffRes.value.data)
      }

      const allPolicies = (policiesRes.status === 'fulfilled' && Array.isArray(policiesRes.value?.data))
        ? policiesRes.value.data
        : []
      const allowlistOnly = allPolicies.filter(p => p.type === 'allowlist')
      setAllowlistRules(allowlistOnly)
    } catch (err) {
      console.error('Failed to load allowed domain rules:', err)
      setAllowlistRules([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaffAndPolicies()

    const params = new URLSearchParams(window.location.search)
    const presetUserId = params.get('userId')
    const presetDomain = params.get('domain')
    if (presetUserId || presetDomain) {
      handleOpenModal(null, presetUserId, presetDomain)
    }
  }, [])

  const handleOpenModal = (rule = null, presetUserId = null, presetDomain = null) => {
    setIsBulkMode(false)
    if (rule) {
      setEditingRule(rule)
      setFormData({
        name: rule.name,
        type: 'allowlist',
        domainPattern: rule.domainPattern,
        category: rule.category || 'productive',
        isActive: rule.isActive,
        userId: rule.userId ? String(rule.userId) : ''
      })
    } else {
      setEditingRule(null)
      setFormData({
        name: presetDomain ? `Rule for ${presetDomain}` : '',
        type: 'allowlist',
        domainPattern: presetDomain || '',
        category: 'productive',
        isActive: true,
        userId: presetUserId ? String(presetUserId) : ''
      })
      setBulkShared({ userId: presetUserId ? String(presetUserId) : '', category: 'productive', isActive: true })
      setBulkRows([{ name: '', domainPattern: '' }, { name: '', domainPattern: '' }])
    }
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        userId: formData.userId ? parseInt(formData.userId, 10) : null
      }
      if (editingRule) {
        await updatePolicy(editingRule.id, payload)
      } else {
        await createPolicy(payload)
      }
      setModalOpen(false)
      loadStaffAndPolicies()
    } catch (err) {
      alert('Failed to save allowed domain rule')
    }
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    const validRows = bulkRows.filter(r => r.name.trim() && r.domainPattern.trim())
    if (validRows.length === 0) {
      alert('Please fill in at least one domain row (Name + Pattern).')
      return
    }
    setBulkSaving(true)
    try {
      await Promise.all(validRows.map(row =>
        createPolicy({
          name: row.name.trim(),
          type: 'allowlist',
          domainPattern: row.domainPattern.trim(),
          category: bulkShared.category,
          isActive: bulkShared.isActive,
          userId: bulkShared.userId ? parseInt(bulkShared.userId, 10) : null
        })
      ))
      setModalOpen(false)
      loadStaffAndPolicies()
    } catch (err) {
      alert('Failed to save one or more domain rules. Please try again.')
    } finally {
      setBulkSaving(false)
    }
  }

  const handleToggleActive = async (rule) => {
    try {
      await updatePolicy(rule.id, { isActive: !rule.isActive })
      loadStaffAndPolicies()
    } catch (err) {
      alert('Failed to toggle rule status')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this domain rule?')) return
    try {
      await deletePolicy(id)
      loadStaffAndPolicies()
    } catch (err) {
      console.error('Delete policy error:', err)
    }
  }

  const handleTestDomain = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const trimmed = testUrl.trim()
    if (!trimmed) {
      setTestError('Please enter a URL or domain to verify.')
      setTestResult(null)
      return
    }

    setTestError('')
    const cleanInput = trimmed.toLowerCase()

    let hostname = cleanInput
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0]

    let matchedRule = null

    for (const rule of allowlistRules) {
      if (!rule.isActive) continue
      const pattern = rule.domainPattern.toLowerCase().trim()
      let isMatch = false
      const cleanPattern = pattern.replace(/^(https?:\/\/)?(www\.)?/, '')

      if (cleanPattern.startsWith('*.')) {
        const base = cleanPattern.replace('*.', '')
        isMatch = (
          hostname === base ||
          hostname.endsWith('.' + base) ||
          cleanInput.includes(base)
        )
      } else if (cleanPattern.includes('*')) {
        const regexStr = '^' + cleanPattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
        const regex = new RegExp(regexStr, 'i')
        isMatch = regex.test(hostname) || regex.test(cleanInput)
      } else {
        isMatch = (
          hostname === cleanPattern ||
          hostname.endsWith('.' + cleanPattern) ||
          cleanInput.includes(cleanPattern)
        )
      }

      if (isMatch) {
        matchedRule = rule
        break
      }
    }

    setTestResult({
      isMatch: matchedRule !== null,
      rule: matchedRule,
      domain: trimmed
    })
  }

  return (
    <div className="space-y-6">
      <ActivityNav />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Chosen Domains Only (Allowlist Mode)</h1>
          <p className="text-xs text-slate-400 mt-0.5">Specify approved work domains. Only listed domains will be recorded in strict mode.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Add Allowed Domain
        </button>
      </div>

      {/* Real-time Domain Pattern Tester */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Allowlist Match Verifier</h2>
        <form onSubmit={handleTestDomain} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter any URL or domain (e.g. github.com/repo or facebook.com)..."
              value={testUrl}
              onChange={(e) => {
                setTestUrl(e.target.value)
                setTestResult(null)
                setTestError('')
              }}
              className="w-full rounded-lg border border-slate-200 pl-9 pr-8 py-1.5 text-xs text-slate-800 focus:border-slate-400 focus:outline-none font-mono"
            />
            {testUrl && (
              <button
                type="button"
                onClick={() => {
                  setTestUrl('')
                  setTestResult(null)
                  setTestError('')
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 text-slate-500" />
            Verify Domain
          </button>
        </form>

        {testError && (
          <p className="text-xs text-rose-600 font-medium">{testError}</p>
        )}

        {testResult && (
          <div className={`rounded-lg p-3 text-xs border transition-all ${
            testResult.isMatch ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900' : 'border-rose-200 bg-rose-50/70 text-rose-800'
          }`}>
            {testResult.isMatch ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span><strong>RECORDED:</strong> Domain <strong>"{testResult.domain}"</strong> matches allowlist rule <strong>"{testResult.rule.name}"</strong> (<code className="font-mono">{testResult.rule.domainPattern}</code>).</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span><strong>SILENTLY DROPPED:</strong> Domain <strong>"{testResult.domain}"</strong> is NOT on the allowlist. No activity will be recorded.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Allowed Domain Rules Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {(() => {
          let displayRules = allowlistRules.filter(rule => !rule.type || rule.type === 'allowlist')
          if (selectedUserFilter === 'global') {
            displayRules = displayRules.filter(r => !r.userId)
          } else if (selectedUserFilter !== 'all') {
            displayRules = displayRules.filter(r => String(r.userId) === String(selectedUserFilter))
          }

          return (
            <>
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Configured Chosen Domains ({displayRules.length})</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Active allowlist domain patterns for activity tracking</p>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                  <Filter className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <select
                    value={selectedUserFilter}
                    onChange={(e) => setSelectedUserFilter(e.target.value)}
                    className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Scopes (Global & Employee)</option>
                    <option value="global">🌐 Global Policies Only</option>
                    {staffUsers.map(u => (
                      <option key={u.id} value={u.id}>👤 {u.name} ({u.department || 'Staff'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Domain Name</th>
                      <th className="py-2.5 px-4">Pattern</th>
                      <th className="py-2.5 px-4">Applies To</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-400 text-[11px]">Loading allowed domains...</td>
                      </tr>
                    ) : displayRules.length > 0 ? (
                      displayRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 text-slate-800">
                            <div className="flex items-center gap-2">
                              <DomainIcon domain={rule.domainPattern} size={16} />
                              <span className="font-medium">{rule.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-600 font-semibold text-[11px]">{rule.domainPattern}</td>
                          <td className="py-3 px-4">
                            {rule.targetUser ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <User className="h-3 w-3" />
                                {rule.targetUser.name}
                              </span>
                            ) : rule.userId ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <User className="h-3 w-3" />
                                User #{rule.userId}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <Globe className="h-3 w-3" />
                                Global (All Staff)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <CategoryBadge category={rule.category || 'productive'} size="small" />
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleActive(rule)}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors cursor-pointer ${
                                rule.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${rule.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {rule.isActive ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right space-x-3">
                            <button
                              onClick={() => handleOpenModal(rule)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3 text-slate-400" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3 text-rose-400" /> Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <ShieldCheck className="h-8 w-8 text-slate-300" />
                            <p className="text-xs font-semibold text-slate-600">No allowlist rules in the database yet</p>
                            <p className="text-[11px] text-slate-400 max-w-xs">
                              {selectedUserFilter === 'all'
                                ? 'Add your first domain rule using the button above.'
                                : 'No rules match this scope filter.'}
                            </p>
                            <button
                              onClick={() => handleOpenModal()}
                              className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add First Domain Rule
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )
        })()}
      </div>

      {/* Modal for Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-4">
          <div className={`w-full ${isBulkMode ? 'max-w-xl' : 'max-w-md'} rounded-2xl bg-white p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingRule ? 'Edit Allowed Domain Rule' : (isBulkMode ? 'Bulk Add Allowed Domains' : 'Add Allowed Domain')}
                </h3>
                {!editingRule && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isBulkMode ? 'Add multiple domains with shared scope & category.' : 'Add a single domain rule to allowlist.'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editingRule && (
                  <button
                    type="button"
                    onClick={() => setIsBulkMode(v => !v)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
                      isBulkMode
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isBulkMode ? 'Single Mode' : 'Bulk Mode'}
                  </button>
                )}
                <button onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* SINGLE ADD FORM */}
            {!isBulkMode && (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Rule Name / App Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GitHub Repositories"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-slate-800 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target Employee / Scope</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-slate-800 focus:border-slate-400 focus:outline-none font-medium"
                  >
                    <option value="">🌐 Global Rule (Applies to All Staff)</option>
                    {staffUsers.map(u => (
                      <option key={u.id} value={u.id}>👤 {u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Allowed Domain Pattern</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. *.github.com or salesforce.com"
                    value={formData.domainPattern}
                    onChange={(e) => setFormData({ ...formData, domainPattern: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-slate-800 focus:border-slate-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Use <code className="font-mono">*.domain.com</code> to include all subdomains.</p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-slate-800 focus:outline-none"
                  >
                    <option value="productive">Productive</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveRule"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-slate-900 focus:ring-slate-400"
                  />
                  <label htmlFor="isActiveRule" className="font-medium text-slate-700">Activate rule immediately</label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" className="rounded-lg border border-slate-900 bg-slate-900 px-3.5 py-1.5 font-semibold text-white hover:bg-slate-800 shadow-xs cursor-pointer">Save Rule</button>
                </div>
              </form>
            )}

            {/* BULK ADD FORM */}
            {isBulkMode && (
              <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Shared Settings</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Target Scope</label>
                      <select
                        value={bulkShared.userId}
                        onChange={(e) => setBulkShared(s => ({ ...s, userId: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-800 focus:outline-none bg-white"
                      >
                        <option value="">🌐 Global (All Staff)</option>
                        {staffUsers.map(u => (
                          <option key={u.id} value={u.id}>👤 {u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Category</label>
                      <select
                        value={bulkShared.category}
                        onChange={(e) => setBulkShared(s => ({ ...s, category: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-800 focus:outline-none bg-white"
                      >
                        <option value="productive">Productive</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="bulkIsActive"
                      checked={bulkShared.isActive}
                      onChange={(e) => setBulkShared(s => ({ ...s, isActive: e.target.checked }))}
                      className="rounded text-slate-900 focus:ring-slate-400"
                    />
                    <label htmlFor="bulkIsActive" className="font-medium text-slate-700">Activate all rules immediately</label>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                    <span>App Name</span>
                    <span>Domain Pattern</span>
                    <span></span>
                  </div>
                  {bulkRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        placeholder="e.g. Slack"
                        value={row.name}
                        onChange={(e) => {
                          const next = [...bulkRows]
                          next[idx] = { ...next[idx], name: e.target.value }
                          setBulkRows(next)
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-800 focus:border-slate-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="e.g. slack.com"
                        value={row.domainPattern}
                        onChange={(e) => {
                          const next = [...bulkRows]
                          next[idx] = { ...next[idx], domainPattern: e.target.value }
                          setBulkRows(next)
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-slate-800 focus:border-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setBulkRows(rows => rows.filter((_, i) => i !== idx))}
                        disabled={bulkRows.length <= 1}
                        className="rounded-md p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBulkRows(rows => [...rows, { name: '', domainPattern: '' }])}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add row
                  </button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {bulkRows.filter(r => r.name.trim() && r.domainPattern.trim()).length} of {bulkRows.length} rows ready
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
                    <button
                      type="submit"
                      disabled={bulkSaving}
                      className="rounded-lg border border-slate-900 bg-slate-900 px-3.5 py-1.5 font-semibold text-white hover:bg-slate-800 shadow-xs disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                    >
                      {bulkSaving ? <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      {bulkSaving ? 'Saving...' : 'Save All Domains'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
