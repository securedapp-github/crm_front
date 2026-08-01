import React, { useState, useEffect } from 'react'
import ActivityNav from '../../components/activity/ActivityNav'
import {
  fetchPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy
} from '../../api/activity'
import CategoryBadge from '../../components/activity/CategoryBadge'
import DomainIcon from '../../components/activity/DomainIcon'
import { ShieldCheck, Plus, CheckCircle2, XCircle, Trash2, Edit3, Search, X, Check } from 'lucide-react'

export default function ActivityAllowedDomains() {
  const [allowlistRules, setAllowlistRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'allowlist',
    domainPattern: '',
    category: 'productive',
    isActive: true
  })

  // Live pattern tester
  const [testUrl, setTestUrl] = useState('')
  const [testResult, setTestResult] = useState(null)

  const loadAllowlist = async () => {
    setLoading(true)
    try {
      const res = await fetchPolicies()
      const allPolicies = res.data || []
      const allowlistOnly = allPolicies.filter(p => p.type === 'allowlist')
      setAllowlistRules(allowlistOnly)
    } catch (err) {
      console.error('Failed to load allowed domain rules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllowlist()
  }, [])

  const handleOpenModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        name: rule.name,
        type: 'allowlist',
        domainPattern: rule.domainPattern,
        category: rule.category || 'productive',
        isActive: rule.isActive
      })
    } else {
      setEditingRule(null)
      setFormData({
        name: '',
        type: 'allowlist',
        domainPattern: '',
        category: 'productive',
        isActive: true
      })
    }
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingRule) {
        await updatePolicy(editingRule.id, formData)
      } else {
        await createPolicy(formData)
      }
      setModalOpen(false)
      loadAllowlist()
    } catch (err) {
      alert('Failed to save allowed domain rule')
    }
  }

  const handleToggleActive = async (rule) => {
    try {
      await updatePolicy(rule.id, { isActive: !rule.isActive })
      loadAllowlist()
    } catch (err) {
      alert('Failed to toggle rule status')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this domain from the chosen allowlist?')) return
    try {
      await deletePolicy(id)
      loadAllowlist()
    } catch (err) {
      console.error('Delete policy error:', err)
    }
  }

  const handleTestDomain = () => {
    if (!testUrl) return
    const clean = testUrl.toLowerCase().trim()
    let matched = null

    for (const rule of allowlistRules) {
      if (!rule.isActive) continue
      const pattern = rule.domainPattern.toLowerCase().trim()
      let isMatch = false
      if (pattern.startsWith('*.')) {
        const base = pattern.replace('*.', '')
        isMatch = clean.endsWith(base) || clean.includes(base)
      } else if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i')
        isMatch = regex.test(clean)
      } else {
        isMatch = clean.includes(pattern)
      }

      if (isMatch) {
        matched = rule
        break
      }
    }

    setTestResult(matched)
  }

  return (
    <div className="space-y-8">
      <ActivityNav />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chosen Domains Only (Allowlist Mode)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Specify explicitly allowed work domains. When enabled, <strong>only approved sites will be recorded</strong>; all unlisted browsing is silently ignored.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" /> Add Allowed Domain
        </button>
      </div>

      {/* Real-time Domain Pattern Tester */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Allowlist Match Verifier</h3>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter any URL or domain (e.g. github.com/repo or facebook.com)..."
              value={testUrl}
              onChange={(e) => {
                setTestUrl(e.target.value)
                setTestResult(null)
              }}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-mono"
            />
          </div>
          <button
            onClick={handleTestDomain}
            className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
          >
            Verify Domain
          </button>
        </div>

        {testResult !== null && (
          <div className={`rounded-xl p-3.5 text-xs border transition-all ${
            testResult ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900' : 'border-rose-200 bg-rose-50/70 text-rose-800'
          }`}>
            {testResult ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span><strong>RECORDED:</strong> Domain matches allowlist rule <strong>"{testResult.name}"</strong> (<code className="font-mono">{testResult.domainPattern}</code>). Activity will be logged.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span><strong>SILENTLY DROPPED:</strong> Domain is NOT on the chosen allowlist. No URL, title, or time will be recorded.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Allowed Domain Rules Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">Configured Chosen Domains ({allowlistRules.length})</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Domain Name</th>
                <th className="py-3 px-4">Pattern</th>
                <th className="py-3 px-4">Assigned Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">Loading allowed domains...</td>
                </tr>
              ) : allowlistRules.length > 0 ? (
                allowlistRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <DomainIcon domain={rule.domainPattern} size={18} />
                        <span>{rule.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-600 font-bold">{rule.domainPattern}</td>
                    <td className="py-3.5 px-4">
                      <CategoryBadge category={rule.category || 'productive'} size="small" />
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border transition-colors ${
                          rule.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${rule.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {rule.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-3">
                      <button
                        onClick={() => handleOpenModal(rule)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-bold transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    No chosen domains configured yet. Click <strong>Add Allowed Domain</strong> above to create your first rule.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingRule ? 'Edit Allowed Domain Rule' : 'Add Chosen Allowed Domain'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rule Name / App Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GitHub Repositories"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Allowed Domain Pattern</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. *.github.com or salesforce.com"
                  value={formData.domainPattern}
                  onChange={(e) => setFormData({ ...formData, domainPattern: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Use <code className="font-mono">*.domain.com</code> to include all subdomains.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Productivity Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none"
                >
                  <option value="productive">Productive</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveRule"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="isActiveRule" className="font-semibold text-slate-700">Activate rule immediately</label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 shadow-2xs"
                >
                  Save Allowed Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
