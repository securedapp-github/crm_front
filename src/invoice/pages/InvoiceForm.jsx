import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceApi } from '@/invoice/api/invoiceClient';
import { Button } from '@/invoice/components/ui/button';
import { Input } from '@/invoice/components/ui/input';
import { Label } from '@/invoice/components/ui/label';
import { Textarea } from '@/invoice/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/invoice/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/invoice/components/ui/tabs';
import { ArrowLeft, Plus, Save, Send, Eye, Edit3, Search, Settings, Download, RefreshCw, Check, Mail, MapPin } from 'lucide-react';
import InvoiceItemRow from '@/invoice/components/invoice/InvoiceItemRow';
import TaxSummary from '@/invoice/components/invoice/TaxSummary';
import CustomerSelector from '@/invoice/components/invoice/CustomerSelector';
import ProductSearch from '@/invoice/components/invoice/ProductSearch';
import InvoicePDFContent from '@/invoice/components/invoice/InvoicePDFContent';
import {
  calculateInvoiceTotals,
  generateInvoiceNumber,
  numberToWords,
  detectTaxType,
  calculateTaxBreakdown
} from '@/invoice/lib/invoiceUtils';
import { printInvoicePDF, downloadInvoicePDF } from '@/utils/pdfManager';
import { toast } from 'sonner';

const emptyItem = {
  name: '',
  description: '',
  hsn_code: '',
  unit: 'nos',
  quantity: 1,
  rate: 0,
  discount_percent: 0,
  tax_percent: 18
};

export default function InvoiceForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mobileTab, setMobileTab] = useState('edit');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [userEditedTerms, setUserEditedTerms] = useState(false);
  const [originalTerms, setOriginalTerms] = useState('');

  const { data: businessList } = useQuery({
    queryKey: ['business'],
    queryFn: () => invoiceApi.entities.Business.list(),
    placeholderData: (prev) => prev,
  });
  const business = businessList?.[0] || null;

  const { data: rawInvoice, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const item = await invoiceApi.entities.Invoice.get(id);
        if (item && (item.id || item.invoice_number)) return item;
      } catch (err) {
        console.warn('Direct get invoice failed, attempting filter fallback:', err);
      }
      const list = await invoiceApi.entities.Invoice.filter({ id });
      return Array.isArray(list) ? (list[0] || null) : list;
    },
    enabled: isEdit,
  });

  const existingInvoiceData = useMemo(() => {
    if (!rawInvoice) return null;
    if (Array.isArray(rawInvoice)) return rawInvoice[0] || null;
    return rawInvoice;
  }, [rawInvoice]);

  const [form, setForm] = useState({
    invoice_number: '',
    invoice_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_address: '',
    customer_gst: '',
    customer_state: '',
    customer_city: '',
    business_id: '',
    tax_type: 'gst',
    currency: 'INR',
    items: [{ ...emptyItem }],
    notes: '',
    terms_and_conditions: '',
    additional_charges_label: '',
    additional_charges_amount: 0,
    status: 'draft',
    amount_paid: 0,
    balance_due: 0
  });

  useEffect(() => {
    setUserEditedTerms(false);
    setOriginalTerms('');
  }, [id]);

  useEffect(() => {
    if (business && !isEdit) {
      setForm((prev) => ({
        ...prev,
        invoice_number: generateInvoiceNumber(business.invoice_prefix || 'INV', business.next_invoice_number || 1),
        tax_type: business.default_tax_type || 'gst',
        currency: business.default_currency || 'INR',
        business_id: business.id,
        terms_and_conditions: business.terms_and_conditions || '',
        notes: business.notes || ''
      }));
    }
  }, [business, isEdit]);

  useEffect(() => {
    if (existingInvoiceData && isEdit) {
      const inv = existingInvoiceData;

      let rawItems = inv.items;
      if (typeof rawItems === 'string') {
        try {
          rawItems = JSON.parse(rawItems);
        } catch (_) {
          rawItems = [];
        }
      }

      const formattedItems = (Array.isArray(rawItems) && rawItems.length > 0)
        ? rawItems.map(item => ({
            name: item.name || item.item_name || item.description || '',
            description: (item.name && item.description && item.description !== item.name)
              ? item.description
              : (item.secondary_description || ''),
            hsn_code: item.hsn_code || item.hsn_sac || '',
            unit: item.unit || 'nos',
            quantity: item.quantity !== undefined && item.quantity !== null && item.quantity !== ''
              ? Number(item.quantity)
              : 1,
            rate: item.rate !== undefined && item.rate !== null && item.rate !== ''
              ? Number(item.rate)
              : (Number(item.unit_price) || 0),
            discount_percent: item.discount_percent !== undefined && item.discount_percent !== null
              ? Number(item.discount_percent)
              : 0,
            tax_percent: item.tax_percent !== undefined && item.tax_percent !== null
              ? Number(item.tax_percent)
              : 18,
            amount: item.amount || 0
          }))
        : [{ ...emptyItem }];

      const savedTerms = inv.terms_and_conditions !== undefined && inv.terms_and_conditions !== null
        ? inv.terms_and_conditions
        : (business?.terms_and_conditions || '');

      setOriginalTerms(savedTerms);

      setForm({
        id: inv.id,
        invoice_number: inv.invoice_number || '',
        invoice_name: inv.invoice_name || '',
        invoice_date: inv.invoice_date || new Date().toISOString().split('T')[0],
        due_date: inv.due_date || '',
        customer_id: inv.customer_id || '',
        customer_name: inv.customer_name || '',
        customer_email: inv.customer_email || '',
        customer_address: inv.customer_address || '',
        customer_gst: inv.customer_gst || '',
        customer_state: inv.customer_state || '',
        customer_city: inv.customer_city || '',
        business_id: inv.business_id || business?.id || '',
        tax_type: inv.tax_type || 'gst',
        currency: inv.currency || 'INR',
        items: formattedItems,
        notes: inv.notes || '',
        terms_and_conditions: savedTerms,
        additional_charges_label: inv.additional_charges_label || '',
        additional_charges_amount: Number(inv.additional_charges_amount) || 0,
        status: inv.status || 'draft',
        amount_paid: Number(inv.amount_paid) || 0,
        balance_due: Number(inv.balance_due) || 0,
        subtotal: Number(inv.subtotal) || 0,
        cgst_amount: Number(inv.cgst_amount) || 0,
        sgst_amount: Number(inv.sgst_amount) || 0,
        igst_amount: Number(inv.igst_amount) || 0,
        grand_total: Number(inv.grand_total) || 0
      });

      if (inv.invoice_name) {
        setTitleInput(inv.invoice_name);
      } else if (inv.invoice_number) {
        setTitleInput(`${inv.invoice_number} - ${inv.customer_name || 'Invoice'}`);
      }
    }
  }, [existingInvoiceData, isEdit]);

  const totals = useMemo(() =>
    calculateInvoiceTotals(form.items, form.tax_type, form.additional_charges_amount),
    [form.items, form.tax_type, form.additional_charges_amount]
  );

  const taxBreakdown = useMemo(() =>
    calculateTaxBreakdown(form.items, form.tax_type),
    [form.items, form.tax_type]
  );

  const previewData = { ...form, ...totals, balance_due: totals.grand_total - (form.amount_paid || 0) };

  const validateForm = () => {
    if (!form.invoice_number?.trim()) {
      toast.error('Invoice Number is required');
      return false;
    }
    if (!form.customer_name?.trim()) {
      toast.error('Please select or specify a client in "Billed To"');
      return false;
    }
    const validItems = (form.items || []).filter(it => it.name && it.name.trim());
    if (validItems.length === 0) {
      toast.error('Invoice must include at least one named line item');
      return false;
    }
    return true;
  };

  const saveMutation = useMutation({
    mutationFn: async (targetStatus) => {
      const bankDetails = business ? {
        beneficiary_name: business.beneficiary_name || '',
        bank_name: business.bank_name || '',
        account_number: business.account_number || '',
        account_type: business.account_type || '',
        branch_name: business.branch_name || '',
        ifsc_code: business.ifsc_code || '',
        swift_code: business.swift_code || '',
        bank_address: business.bank_address || '',
        upi_id: business.upi_id || '',
        bank_currency: business.bank_currency || '',
      } : {};

      const finalStatus = targetStatus || form.status || 'draft';
      const data = {
        ...previewData,
        invoice_name: titleInput || form.invoice_name || `${form.invoice_number} - ${form.customer_name || 'Invoice'}`,
        bank_details: bankDetails,
        status: finalStatus
      };

      if (isEdit) {
        await invoiceApi.entities.Invoice.update(id, data);
      } else {
        await invoiceApi.entities.Invoice.create(data);
        if (business) {
          await invoiceApi.entities.Business.update(business.id, {
            next_invoice_number: (Number(business.next_invoice_number) || 1) + 1
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      }
      setSaved(true);
      toast.success('Done! Invoice saved successfully.');
      setTimeout(() => {
        navigate('/dashboard/finance/invoice-generator/list');
      }, 1200);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save invoice');
    }
  });

  const handleSave = (status) => {
    if (!validateForm()) return;
    saveMutation.mutate(status);
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  const updateItem = (index, item) => setForm((prev) => ({
    ...prev,
    items: prev.items.map((it, i) => i === index ? item : it)
  }));
  const removeItem = (index) => {
    if (form.items.length <= 1) {
      setForm((prev) => ({ ...prev, items: [{ ...emptyItem }] }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleCustomerChange = (customerData) => {
    let suggestedTax = form.tax_type;
    if (business) {
      suggestedTax = detectTaxType({
        supplierGstin: business.gst_number,
        customerGstin: customerData.customer_gst,
        supplierState: business.state,
        customerState: customerData.customer_state
      });
    }

    setForm((prev) => ({
      ...prev,
      ...customerData,
      tax_type: suggestedTax
    }));
  };

  const addProductItem = (product) => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items.filter(it => it.name?.trim()),
        {
          name: product.name,
          description: product.description || '',
          hsn_code: product.hsn_code || '',
          unit: 'nos',
          quantity: 1,
          rate: Number(product.unit_price) || 0,
          discount_percent: 0,
          tax_percent: product.tax_percent ?? 18
        }
      ]
    }));
  };

  const formContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Invoice Number *</Label>
          <Input
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
            className="mt-1 font-mono font-medium"
            placeholder="INV-2026-0001"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Invoice Date</Label>
          <Input
            type="date"
            value={form.invoice_date}
            onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Due Date</Label>
          <Input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Billed By (Supplier)</h3>
            {business && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/finance/invoice-generator/settings')}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                title="Edit Business Profile"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Settings</span>
              </Button>
            )}
          </div>
          {business && business.company_name ? (
            <div className="p-4 bg-muted/40 border border-border/80 rounded-xl text-sm space-y-1.5 min-h-[160px] flex flex-col justify-between shadow-sm">
              <div className="space-y-1.5">
                <p className="font-semibold text-foreground text-sm leading-tight break-words">
                  {business.company_name}
                </p>
                {business.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 break-all">
                    <Mail className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <span>{business.email}</span>
                  </p>
                )}
                {business.address_line1 && (
                  <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5 break-words">
                    <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0 mt-0.5" />
                    <span className="flex-1">
                      {business.address_line1}{business.city ? `, ${business.city}` : ''}{business.state ? `, ${business.state}` : ''}{business.pincode ? ` - ${business.pincode}` : ''}
                    </span>
                  </p>
                )}
              </div>

              {(business.gst_number || business.cin_number) && (
                <div className="pt-2 mt-auto border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                  {business.gst_number && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">GSTIN</span>
                      <span className="text-xs font-mono font-medium text-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">
                        {business.gst_number}
                      </span>
                    </div>
                  )}
                  {business.cin_number && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">CIN</span>
                      <span className="text-xs font-mono font-medium text-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">
                        {business.cin_number}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-muted/30 border border-dashed border-border/80 rounded-xl text-sm text-center min-h-[160px] flex flex-col items-center justify-center space-y-2.5">
              <p className="text-xs text-muted-foreground">No business profile configured.</p>
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => navigate('/dashboard/finance/invoice-generator/settings')}>
                <Settings className="h-3.5 w-3.5" /> Configure Business
              </Button>
            </div>
          )}
        </div>

        <CustomerSelector value={form} onChange={handleCustomerChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Tax Type</Label>
          <Select value={form.tax_type} onValueChange={(v) => setForm({ ...form, tax_type: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gst">GST (CGST + SGST - Intra-State)</SelectItem>
              <SelectItem value="igst">IGST (Inter-State Supply)</SelectItem>
              <SelectItem value="none">No Tax / Export / Exempt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Currency</Label>
          <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
              <SelectItem value="USD">US Dollar ($)</SelectItem>
              <SelectItem value="EUR">Euro (€)</SelectItem>
              <SelectItem value="GBP">British Pound (£)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Invoice Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Finalized / Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Line Items & Services</h3>
          <div className="relative">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowProductSearch(!showProductSearch)}>
              <Search className="h-3.5 w-3.5" /> Add from Catalog
            </Button>
            {showProductSearch && (
              <div className="absolute top-full right-0 mt-1 z-50">
                <ProductSearch onSelect={addProductItem} show={showProductSearch} setShow={setShowProductSearch} />
              </div>
            )}
          </div>
        </div>
        <div className="border border-border rounded-xl overflow-x-auto shadow-sm bg-card">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="bg-muted/60 text-xs text-muted-foreground border-b border-border">
                <th className="p-2.5 text-center w-10">#</th>
                <th className="p-2.5 text-left">Item Description</th>
                <th className="p-2.5 text-left w-24">HSN/SAC</th>
                <th className="p-2.5 text-left w-36">Qty & Unit</th>
                <th className="p-2.5 text-left w-28">Rate</th>
                <th className="p-2.5 text-left w-20">Disc %</th>
                <th className="p-2.5 text-left w-20">Tax %</th>
                <th className="p-2.5 text-right w-[100px]">Amount</th>
                <th className="p-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, i) => (
                <InvoiceItemRow
                  key={i}
                  item={item}
                  index={i}
                  onChange={updateItem}
                  onRemove={removeItem}
                  currency={form.currency}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs h-8" onClick={addItem}>
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
      </div>

      <div className="flex justify-end pt-2">
        <div className="w-full max-w-[380px] space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground font-medium">Additional Charges Label</Label>
              <Input
                value={form.additional_charges_label || ''}
                onChange={(e) => setForm({ ...form, additional_charges_label: e.target.value })}
                placeholder="e.g. Shipping / Setup"
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div className="w-28">
              <Label className="text-xs text-muted-foreground font-medium">Amount</Label>
              <Input
                type="number"
                value={form.additional_charges_amount || ''}
                onChange={(e) => setForm({ ...form, additional_charges_amount: Number(e.target.value) })}
                className="mt-1 h-9 text-xs font-mono"
                min="0"
              />
            </div>
          </div>
          <TaxSummary
            totals={totals}
            taxType={form.tax_type}
            currency={form.currency}
            additionalChargesLabel={form.additional_charges_label}
            additionalChargesAmount={form.additional_charges_amount}
            taxBreakdown={taxBreakdown}
          />
          <p className="text-xs text-muted-foreground italic font-medium leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/40">
            {numberToWords(totals.grand_total, form.currency)}
          </p>
        </div>
      </div>

      {business?.bank_name && (
        <div className="pt-2">
          <h3 className="text-sm font-semibold mb-2">Payment / Bank Details</h3>
          <div className="rounded-xl border bg-muted/30 p-4 text-xs space-y-1.5">
            {business.beneficiary_name && <p><span className="text-muted-foreground">Beneficiary:</span> <strong>{business.beneficiary_name}</strong></p>}
            <p><span className="text-muted-foreground">Bank:</span> {business.bank_name}{business.branch_name ? `, ${business.branch_name}` : ''}</p>
            <p><span className="text-muted-foreground">A/C:</span> <span className="font-mono font-bold text-foreground">{business.account_number}</span></p>
            {business.ifsc_code && <p><span className="text-muted-foreground">IFSC:</span> <span className="font-mono font-medium">{business.ifsc_code}</span></p>}
            {business.swift_code && <p><span className="text-muted-foreground">SWIFT:</span> <span className="font-mono font-medium">{business.swift_code}</span></p>}
            {business.upi_id && <p><span className="text-muted-foreground">UPI:</span> <span className="font-mono font-medium text-emerald-600">{business.upi_id}</span></p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div>
          <Label className="text-xs text-muted-foreground font-medium">Notes & Remarks</Label>
          <Textarea
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 h-24 text-xs"
            placeholder="Thank you for your business!"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Terms & Conditions</Label>
              {business?.terms_and_conditions && form.terms_and_conditions === business.terms_and_conditions && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                  <Check className="h-3 w-3" /> Default terms applied
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {originalTerms && originalTerms !== form.terms_and_conditions && (
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, terms_and_conditions: originalTerms }));
                    setUserEditedTerms(true);
                    toast.info('Restored original invoice terms');
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Restore original
                </button>
              )}
              {business?.terms_and_conditions && form.terms_and_conditions !== business.terms_and_conditions && (
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, terms_and_conditions: business.terms_and_conditions }));
                    setUserEditedTerms(false);
                    toast.success('Loaded latest Terms from settings');
                  }}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" /> Fetch latest
                </button>
              )}
            </div>
          </div>
          <Textarea
            value={form.terms_and_conditions || ''}
            onChange={(e) => {
              setUserEditedTerms(true);
              setForm({ ...form, terms_and_conditions: e.target.value });
            }}
            className="h-24 text-xs"
            placeholder="Payment due within 15 days..."
          />
        </div>
      </div>
    </div>
  );

  if (isEdit && isLoadingInvoice && !existingInvoiceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading invoice details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:h-[calc(100vh-140px)] lg:flex lg:flex-col lg:overflow-hidden">
      {/* Top Bar with Title and Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/finance/invoice-generator/list')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  setForm(prev => ({ ...prev, invoice_name: titleInput }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingTitle(false);
                    setForm(prev => ({ ...prev, invoice_name: titleInput }));
                  }
                }}
                placeholder="Invoice Title..."
                className="text-xl lg:text-2xl font-bold font-display tracking-tight border-b-2 border-emerald-500 focus:outline-none bg-transparent"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => {
                  setTitleInput(form.invoice_name || (isEdit ? `Edit Invoice (${form.invoice_number})` : 'New Invoice'));
                  setIsEditingTitle(true);
                }}
                className="text-xl lg:text-2xl font-bold font-display tracking-tight cursor-pointer hover:text-emerald-600 transition-colors flex items-center gap-2 group"
                title="Click to customize title"
              >
                <span>{form.invoice_name || (isEdit ? `Edit Invoice (${form.invoice_number})` : 'New Invoice')}</span>
                <Edit3 className="h-4 w-4 opacity-0 group-hover:opacity-100 text-muted-foreground" />
              </h1>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? 'Update existing invoice details' : 'Draft a clean, compliant invoice'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="lg:hidden">
            <Tabs value={mobileTab} onValueChange={setMobileTab}>
              <TabsList className="h-9">
                <TabsTrigger value="edit" className="text-xs gap-1 px-3"><Edit3 className="h-3 w-3" /> Edit</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs gap-1 px-3"><Eye className="h-3 w-3" /> Preview</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Editor Column */}
        <div className={`${mobileTab === 'edit' ? 'flex' : 'hidden'} lg:flex flex-col lg:min-h-0 lg:overflow-hidden`}>
          <div className="bg-card rounded-2xl border border-border p-6 lg:p-8 shadow-sm lg:overflow-y-auto lg:flex-1">
            {formContent}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-end mt-4 shrink-0">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/finance/invoice-generator/list')}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              className="gap-2 text-xs"
              onClick={() => handleSave('draft')}
              disabled={saveMutation.isPending || saved}
            >
              <Save className="h-3.5 w-3.5" /> Save as Draft
            </Button>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              onClick={() => handleSave(form.status === 'draft' ? 'sent' : form.status)}
              disabled={saveMutation.isPending || saved}
            >
              {saveMutation.isPending ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> Saving...</>
              ) : saved ? (
                <><span className="h-3.5 w-3.5 text-white">✓</span> Done!</>
              ) : (
                <><Send className="h-3.5 w-3.5" /> Finalize & Save</>
              )}
            </Button>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} lg:flex flex-col lg:min-h-0 lg:overflow-hidden`}>
          <div className="space-y-3 flex flex-col h-full lg:min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-emerald-600" /> Real-time Live Preview
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printInvoicePDF(previewData, business)}
                  className="gap-1.5 text-xs h-8"
                >
                  <Eye className="h-3.5 w-3.5" /> Print
                </Button>
                <Button
                  size="sm"
                  onClick={() => downloadInvoicePDF(previewData, business)}
                  className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto overflow-x-hidden flex-1 rounded-2xl border border-border/80 shadow-md bg-white p-3">
              <div className="scale-[0.85] origin-top-left w-[117.6%]">
                <InvoicePDFContent invoice={previewData} business={business} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
