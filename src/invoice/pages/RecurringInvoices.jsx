import React, { useState, useMemo, useEffect } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { invoiceApi } from "@/invoice/api/invoiceClient"
import { formatCurrency, formatDate } from "@/invoice/lib/invoiceUtils"
import { downloadInvoicePDF } from "@/utils/pdfManager"
import { toast } from "sonner"
import { 
  Repeat, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Archive,
  RefreshCw,
  Eye,
  Pencil,
  Layers,
  ShieldCheck,
  X
} from "lucide-react"

function getOrdinalSuffix(day) {
  const d = Number(day) || 1
  const j = d % 10, k = d % 100
  if (j === 1 && k !== 11) return `${d}st`
  if (j === 2 && k !== 12) return `${d}nd`
  if (j === 3 && k !== 13) return `${d}rd`
  return `${d}th`
}

export default function RecurringInvoices() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const fromInvoiceId = searchParams.get('fromInvoice')

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)

  // Fetch Recurring Profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['recurringInvoices'],
    queryFn: () => invoiceApi.entities.RecurringInvoice.list('-created_date', 100),
  })

  // Fetch Invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceApi.entities.Invoice.list('-created_date', 500),
  })

  // Fetch Business details for PDF branding
  const { data: businessList } = useQuery({
    queryKey: ['business'],
    queryFn: () => invoiceApi.entities.Business.list(),
  })
  const business = businessList?.[0] || null

  // Auto-open modal when navigated with fromInvoice query param
  useEffect(() => {
    if (fromInvoiceId && invoices.length > 0) {
      setEditingProfile(null)
      setShowModal(true)
    }
  }, [fromInvoiceId, invoices.length])

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProfile(null)
    if (fromInvoiceId) {
      searchParams.delete('fromInvoice')
      setSearchParams(searchParams, { replace: true })
    }
  }

  // Map each recurring profile id to its latest generated invoice (sorted chronologically)
  const latestInvoiceByProfile = useMemo(() => {
    const map = {}
    const recurringInvoices = invoices.filter(i => Boolean(i.recurring_invoice_id || i.generated_from_recurring))

    // Sort newest first
    const sorted = [...recurringInvoices].sort((a, b) => {
      const dateA = a.invoice_date || a.created_date || ''
      const dateB = b.invoice_date || b.created_date || ''
      return dateB.localeCompare(dateA)
    })

    for (const inv of sorted) {
      if (inv.recurring_invoice_id && !map[inv.recurring_invoice_id]) {
        map[inv.recurring_invoice_id] = inv
      }
    }
    return map
  }, [invoices])

  // Strictly filter generated recurring invoices for the selected month
  const monthlyInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isRecurring = Boolean(inv.generated_from_recurring || inv.recurring_invoice_id)
      if (!isRecurring) return false

      if (inv.recurring_billing_period === selectedMonth) return true
      const invDate = inv.invoice_date || (inv.created_date ? String(inv.created_date).split('T')[0] : '')
      return invDate.startsWith(selectedMonth)
    })
  }, [invoices, selectedMonth])

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }) =>
      invoiceApi.entities.RecurringInvoice.update(id, { status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] }),
  })

  const triggerRunMutation = useMutation({
    mutationFn: (id) => invoiceApi.triggerRecurringRun(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(`Success! Generated ${data.generated || 0} draft invoice(s).`)
    },
    onError: (err) => toast.error(`Run failed: ${err.message}`),
  })

  const triggerSweepMutation = useMutation({
    mutationFn: () => invoiceApi.sweepRecurringInvoices(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      const count = Array.isArray(data?.results) 
        ? data.results.reduce((acc, r) => acc + (r.generated || 0), 0)
        : 0
      toast.success(`Sweep finished: ${count} draft invoice(s) created.`)
    },
    onError: (err) => toast.error(`Sweep failed: ${err.message}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => invoiceApi.entities.RecurringInvoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] })
      toast.success('Profile deleted.')
    },
  })

  const handleDownloadSinglePDF = (inv) => {
    try {
      toast.info(`Preparing ${inv.invoice_number || 'invoice'} PDF...`)
      downloadInvoicePDF(inv, business)
      toast.success(`Downloaded ${inv.invoice_number || 'invoice'} successfully!`)
    } catch (err) {
      console.error('PDF download error:', err)
      toast.error('Failed to download PDF: ' + err.message)
    }
  }

  const handleDownloadZip = async () => {
    setExportLoading(true)
    setExportError(null)
    try {
      await invoiceApi.downloadMonthlyZip(selectedMonth)
      toast.success(`Exported ${selectedMonth} invoices archive`)
    } catch (err) {
      setExportError(err.message || 'Export failed')
      toast.error(err.message || 'Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div className="space-y-6 text-slate-900">
      {/* Clean Light Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display tracking-tight text-slate-900">
            Recurring Profiles
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated monthly billing retainers and scheduled draft invoices
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => triggerSweepMutation.mutate()}
            disabled={triggerSweepMutation.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-medium text-xs rounded-xl shadow-sm transition disabled:opacity-50"
            title="Check and trigger drafts for due recurring profiles"
          >
            {triggerSweepMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-600" />
            )}
            Run Due Sweep
          </button>
          <button
            onClick={() => {
              setEditingProfile(null)
              setShowModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Recurring Profile
          </button>
        </div>
      </div>



      {exportError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Profiles Roster Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Recurring Billing Profiles
          </h2>
          <span className="text-xs text-slate-500">
            {profiles.length} configured profile{profiles.length === 1 ? '' : 's'}
          </span>
        </div>

        {profilesLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            Loading recurring profiles...
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Repeat className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-800 text-sm">No recurring profiles configured</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Create a profile from an existing master invoice to begin automatic monthly draft generation.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Customer & Template</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Grand Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">History</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.map((p) => {
                    const tData = p.template_data || {}
                    const customerName = p.customer_name || tData.customer_name || 'Customer'
                    const total = tData.grand_total || 0
                    const isPaused = p.status === 'paused'
                    const latestInv = latestInvoiceByProfile[p.id]

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition">
                            {customerName}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                            {p.source_invoice_number ? (
                              <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold text-[11px]">
                                Source: {p.source_invoice_number}
                              </span>
                            ) : (
                              <span>{tData.customer_email || 'No email specified'}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          <span>{getOrdinalSuffix(p.billing_day || 1)} of every month</span>
                          <span className="block text-xs text-slate-400 mt-0.5">Due: +{p.due_days || 15} days</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(total, tData.currency || 'INR')}
                          </div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {tData.tax_type || 'GST'} Breakdown Included
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : isPaused 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {p.status === 'active' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {isPaused && <Pause className="w-3 h-3 text-amber-600" />}
                            <span className="capitalize">{p.status || 'active'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          <div className="font-semibold text-slate-700">
                            {p.occurrence_count || 0} run(s)
                          </div>
                          {p.last_generated_at && (
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {formatDate(p.last_generated_at)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {latestInv && (
                              <button
                                aria-label="Download latest PDF"
                                title={`Download latest generated (${latestInv.invoice_number})`}
                                onClick={() => handleDownloadSinglePDF(latestInv)}
                                className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              aria-label="Generate Draft Now"
                              title="Generate Draft Now"
                              onClick={() => triggerRunMutation.mutate(p.id)}
                              disabled={triggerRunMutation.isPending}
                              className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              aria-label="Edit Recurring Profile"
                              title="Edit Recurring Profile"
                              onClick={() => {
                                setEditingProfile(p)
                                setShowModal(true)
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              aria-label={isPaused ? "Resume Generation" : "Pause Generation"}
                              title={isPaused ? "Resume Generation" : "Pause Generation"}
                              onClick={() => toggleStatusMutation.mutate({ id: p.id, newStatus: isPaused ? 'active' : 'paused' })}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                            <button
                              aria-label="Delete Recurring Profile"
                              title="Delete Profile"
                              onClick={() => {
                                if (window.confirm('Delete this recurring invoice profile?')) {
                                  deleteMutation.mutate(p.id)
                                }
                              }}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Generated Invoices for Current Billing Cycle */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Generated Invoices
            </h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {monthlyInvoices.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
            />
            {monthlyInvoices.length > 0 && (
              <button
                onClick={handleDownloadZip}
                disabled={exportLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition"
                title="Download all monthly invoices in ZIP"
              >
                {exportLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Archive className="w-3.5 h-3.5 text-emerald-600" />
                )}
                Export ZIP
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {invoicesLoading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading monthly invoices...</div>
          ) : monthlyInvoices.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-800 text-sm">No recurring invoices generated for {selectedMonth}</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Invoices generate automatically on profile billing days, or click &quot;Run Due Sweep&quot; above to create drafts immediately.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Client Name</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Grand Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {inv.invoice_number || inv.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.customer_name || 'Customer'}</div>
                        <div className="text-xs text-slate-400">{inv.customer_email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-mono text-xs">
                        {inv.recurring_billing_period || inv.invoice_date || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs font-medium">
                        {inv.due_date || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(inv.grand_total || inv.total || 0, inv.currency || 'INR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {inv.status || 'draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadSinglePDF(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg shadow-sm transition active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            PDF
                          </button>
                          <Link
                            to={`/dashboard/finance/invoice-generator/list/${inv.id}`}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition"
                            title="View Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Profile Creation / Edit Modal */}
      {showModal && (
        <RecurringProfileModal
          invoices={invoices}
          profile={editingProfile}
          initialInvoiceId={fromInvoiceId}
          onClose={handleCloseModal}
          onSuccess={() => {
            handleCloseModal()
            queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] })
          }}
        />
      )}
    </div>
  )
}

function RecurringProfileModal({ invoices, profile, initialInvoiceId, onClose, onSuccess }) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(() => {
    return profile?.source_invoice_id || initialInvoiceId || (invoices[0]?.id || '')
  })
  const [billingDay, setBillingDay] = useState(() => profile?.billing_day || 1)
  const [dueDays, setDueDays] = useState(() => profile?.due_days || 15)
  const [saving, setSaving] = useState(false)

  // Find the selected source invoice
  const selectedInv = useMemo(() => {
    return invoices.find((inv) => String(inv.id) === String(selectedInvoiceId))
  }, [invoices, selectedInvoiceId])

  // Fallback to profile template data if editing without source invoice
  const displayData = selectedInv || profile?.template_data || {}
  const customerName = displayData.customer_name || 'Customer'
  const totalAmount = displayData.grand_total || displayData.total || 0
  const currency = displayData.currency || 'INR'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedInv && !profile) {
      toast.error('Please select an existing invoice first')
      return
    }
    setSaving(true)

    const baseSource = selectedInv || profile?.template_data || {}
    const items = selectedInv?.items || profile?.template_data?.items || []

    const payload = {
      customer_id: baseSource.customer_id,
      customer_name: baseSource.customer_name || 'Customer',
      billing_day: Math.min(28, Math.max(1, Number(billingDay) || 1)),
      due_days: Math.max(0, Number(dueDays) || 15),
      frequency: 'monthly',
      status: profile?.status || 'active',
      source_invoice_id: selectedInv?.id || profile?.source_invoice_id || null,
      source_invoice_number: selectedInv?.invoice_number || profile?.source_invoice_number || null,
      start_date: profile?.start_date || new Date().toISOString(),
      template_data: {
        customer_id: baseSource.customer_id,
        customer_name: baseSource.customer_name || '',
        customer_email: baseSource.customer_email || '',
        customer_address: baseSource.customer_address || '',
        customer_gst: baseSource.customer_gst || '',
        currency: baseSource.currency || 'INR',
        tax_type: baseSource.tax_type || 'gst',
        items: items,
        subtotal: Number(baseSource.subtotal) || 0,
        tax_amount: Number(baseSource.tax_amount) || 0,
        cgst_amount: baseSource.cgst_amount,
        sgst_amount: baseSource.sgst_amount,
        igst_amount: baseSource.igst_amount,
        total_discount: baseSource.total_discount,
        additional_charges_amount: baseSource.additional_charges_amount,
        additional_charges_label: baseSource.additional_charges_label,
        grand_total: Number(baseSource.grand_total) || 0,
        notes: baseSource.notes || 'Monthly recurring retainer invoice automatically generated as draft.',
        terms_and_conditions: baseSource.terms_and_conditions,
        bank_details: baseSource.bank_details
      }
    }

    try {
      if (profile?.id) {
        await invoiceApi.entities.RecurringInvoice.update(profile.id, payload)
        toast.success('Updated recurring profile')
      } else {
        await invoiceApi.entities.RecurringInvoice.create(payload)
        toast.success(`Created monthly recurring profile for ${customerName}`)
      }
      onSuccess()
    } catch (err) {
      toast.error(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              {profile ? 'Edit Recurring Profile' : 'New Recurring Profile'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Select Master Invoice
            </label>
            <select
              required
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">-- Choose master invoice template --</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number || 'Draft'} — {inv.customer_name || 'Customer'} ({formatCurrency(inv.grand_total || inv.total || 0, inv.currency || 'INR')})
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Copies item pricing, customer data, GST calculations, and bank details.
            </span>
          </div>

          {/* Selected Invoice Preview */}
          {displayData && (displayData.customer_name || displayData.grand_total) && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-900 font-bold">
                <span className="text-sm">{customerName}</span>
                <span className="text-emerald-700 font-mono text-base font-bold">
                  {formatCurrency(totalAmount, currency)}
                </span>
              </div>
              {displayData.customer_email && (
                <div className="text-slate-500 font-medium">{displayData.customer_email}</div>
              )}
              <div className="text-slate-500 pt-2 border-t border-slate-200 flex justify-between font-mono">
                <span>Items: {displayData.items?.length || 0} line item(s)</span>
                <span className="uppercase text-slate-600 font-semibold">{displayData.tax_type || 'GST'}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Billing Day
              </label>
              <input
                type="number"
                min="1"
                max="28"
                required
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Day 1 to 28 of each month</span>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Due Date Offset
              </label>
              <input
                type="number"
                min="0"
                required
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">+15 days after issue date</span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong>Draft Safeguard Active:</strong> Recurring sweeps produce safe draft invoices with sequential IDs (`INV-YYYY-XXXX`). No customer notification is triggered automatically.
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : (profile ? 'Update Profile' : 'Save Profile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
