import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/invoice/api/base44Client';
import { Button } from '@/invoice/components/ui/button';
import { Input } from '@/invoice/components/ui/input';
import { Label } from '@/invoice/components/ui/label';
import { Textarea } from '@/invoice/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/invoice/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/invoice/components/ui/tabs';
import { ArrowLeft, Plus, Save, Send, Eye, Edit3, Palette, Search, Settings } from 'lucide-react';
import InvoiceItemRow from '@/invoice/components/invoice/InvoiceItemRow';
import TaxSummary from '@/invoice/components/invoice/TaxSummary';
import CustomerSelector from '@/invoice/components/invoice/CustomerSelector';
import ProductSearch from '@/invoice/components/invoice/ProductSearch';
import InvoicePDFContent from '@/invoice/components/invoice/InvoicePDFContent';
import { calculateInvoiceTotals, generateInvoiceNumber, numberToWords } from '@/invoice/lib/invoiceUtils';
import { invoiceThemes } from '@/invoice/lib/invoiceThemes';
import { toast } from 'sonner';

const emptyItem = { name: '', description: '', hsn_code: '', quantity: 1, rate: 0, discount_percent: 0, tax_percent: 18 };

export default function InvoiceForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mobileTab, setMobileTab] = useState('edit');
  const [theme, setTheme] = useState('modern-purple');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: businessList } = useQuery({
    queryKey: ['business'],
    queryFn: () => base44.entities.Business.list()
  });
  const business = businessList?.[0] || null;

  const { data: existingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => base44.entities.Invoice.filter({ id }),
    enabled: isEdit
  });

  const [form, setForm] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer_id: '', customer_name: '', customer_email: '', customer_address: '', customer_gst: '',
    business_id: '',
    tax_type: 'gst',
    currency: 'INR',
    items: [{ ...emptyItem }],
    notes: '',
    terms_and_conditions: '',
    additional_charges_label: '',
    additional_charges_amount: 0,
    status: 'draft'
  });

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
    if (existingInvoice?.[0] && isEdit) {
      setForm(existingInvoice[0]);
    }
  }, [existingInvoice, isEdit]);

  const totals = useMemo(() =>
    calculateInvoiceTotals(form.items, form.tax_type, form.additional_charges_amount),
    [form.items, form.tax_type, form.additional_charges_amount]
  );

  const previewData = { ...form, ...totals, balance_due: totals.grand_total - (form.amount_paid || 0) };

  const saveMutation = useMutation({
    mutationFn: async (status) => {
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
      const data = { ...previewData, bank_details: bankDetails, status: status || form.status };
      if (isEdit) {
        await base44.entities.Invoice.update(id, data);
      } else {
        await base44.entities.Invoice.create(data);
        if (business) {
          await base44.entities.Business.update(business.id, {
            next_invoice_number: (business.next_invoice_number || 1) + 1
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      setSaved(true);
      toast.success('Done! Invoice saved successfully.');
      setTimeout(() => {
        navigate('/dashboard/finance/invoice-generator/list');
      }, 1500);
    }
  });

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  const updateItem = (index, item) => setForm((prev) => ({
    ...prev,
    items: prev.items.map((it, i) => i === index ? item : it)
  }));
  const removeItem = (index) => setForm((prev) => ({
    ...prev,
    items: prev.items.filter((_, i) => i !== index)
  }));
  const handleCustomerChange = (customerData) => setForm((prev) => ({ ...prev, ...customerData }));

  const addProductItem = (product) => {
    setForm((prev) => ({ ...prev, items: [...prev.items, product] }));
  };

  const formContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Invoice Number</Label>
          <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Invoice Date</Label>
          <Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Due Date</Label>
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Billed By</h3>
            {business && (
              <button type="button" onClick={() => navigate('/dashboard/invoice-settings')} className="text-muted-foreground hover:text-foreground transition-colors" title="Edit Settings">
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
          {business && business.company_name ? (
            <div className="p-4 bg-muted/50 rounded-xl text-sm space-y-1">
              <p className="font-medium">{business.company_name}</p>
              {business.address_line1 && <p className="text-muted-foreground">{business.address_line1}, {business.city}, {business.state}</p>}
              {business.gst_number && <p className="text-muted-foreground">GSTIN: {business.gst_number}</p>}
              {business.email && <p className="text-muted-foreground">{business.email}</p>}
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-xl text-sm text-center space-y-3">
              <p className="text-muted-foreground">No business profile configured.</p>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/dashboard/invoice-settings')}>
                <Settings className="h-3.5 w-3.5" /> Configure Business
              </Button>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">Billed To</h3>
          <CustomerSelector value={form} onChange={handleCustomerChange} />
          {form.customer_address && <p className="text-xs text-muted-foreground mt-2">{form.customer_address}</p>}
          {form.customer_gst && <p className="text-xs text-muted-foreground">GSTIN: {form.customer_gst}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Tax Type</Label>
          <Select value={form.tax_type} onValueChange={(v) => setForm({ ...form, tax_type: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gst">GST (CGST + SGST)</SelectItem>
              <SelectItem value="igst">IGST</SelectItem>
              <SelectItem value="none">No Tax</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Currency</Label>
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
          <Label className="text-xs text-muted-foreground">Invoice Status</Label>
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
          <h3 className="text-sm font-semibold">Invoice Items</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowProductSearch(!showProductSearch)}>
                <Search className="h-3 w-3" /> Add from Catalog
              </Button>
              {showProductSearch && (
                <div className="absolute top-full right-0 mt-1 z-50">
                  <ProductSearch onSelect={addProductItem} show={showProductSearch} setShow={setShowProductSearch} />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground">
                <th className="p-2 text-center w-10">#</th>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">HSN/SAC</th>
                <th className="p-2 text-left w-20">Qty</th>
                <th className="p-2 text-left w-24">Rate</th>
                <th className="p-2 text-left w-16">Disc %</th>
                <th className="p-2 text-left w-16">Tax %</th>
                <th className="p-2 text-right w-[90px]">Amount</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, i) => (
                <InvoiceItemRow key={i} item={item} index={i} onChange={updateItem} onRemove={removeItem} />
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={addItem}>
          <Plus className="h-3.5 w-3.5" /> Add Item
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="w-full max-w-[360px] space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Additional Charges Label</Label>
              <Input value={form.additional_charges_label || ''} onChange={(e) => setForm({ ...form, additional_charges_label: e.target.value })} placeholder="e.g. Shipping" className="mt-1 h-9" />
            </div>
            <div className="w-28">
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <Input type="number" value={form.additional_charges_amount || ''} onChange={(e) => setForm({ ...form, additional_charges_amount: Number(e.target.value) })} className="mt-1 h-9" />
            </div>
          </div>
          <TaxSummary totals={totals} taxType={form.tax_type} currency={form.currency} additionalChargesLabel={form.additional_charges_label} additionalChargesAmount={form.additional_charges_amount} />
          <p className="text-xs text-muted-foreground italic">{numberToWords(totals.grand_total)}</p>
        </div>
      </div>

      {business?.bank_name && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Payment / Bank Details</h3>
          <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1.5">
            {business.beneficiary_name && <p><span className="text-muted-foreground">Beneficiary:</span> {business.beneficiary_name}</p>}
            <p><span className="text-muted-foreground">Bank:</span> {business.bank_name}{business.branch_name ? `, ${business.branch_name}` : ''}</p>
            <p><span className="text-muted-foreground">A/C:</span> {business.account_number}</p>
            {business.ifsc_code && <p><span className="text-muted-foreground">IFSC:</span> {business.ifsc_code}</p>}
            {business.swift_code && <p><span className="text-muted-foreground">SWIFT:</span> {business.swift_code}</p>}
            {business.upi_id && <p><span className="text-muted-foreground">UPI:</span> {business.upi_id}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 h-24" placeholder="Additional notes..." />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Terms & Conditions</Label>
          <Textarea value={form.terms_and_conditions || ''} onChange={(e) => setForm({ ...form, terms_and_conditions: e.target.value })} className="mt-1 h-24" placeholder="Payment terms..." />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold font-display tracking-tight">
              {isEdit ? 'Edit Invoice' : 'New Invoice'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(invoiceThemes).map(([key, t]) => (
                <SelectItem key={key} value={key}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${mobileTab === 'edit' ? 'block' : 'hidden'} lg:block`}>
          <div className="bg-card rounded-2xl border border-border p-6 lg:p-8">
            {formContent}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => navigate('/dashboard/finance/invoice-generator/list')}>Cancel</Button>
            <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || saved}>
              {saveMutation.isPending ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Saving...</>
              ) : saved ? (
                <><span className="h-4 w-4 text-green-500">✓</span> Done!</>
              ) : (
                <><Save className="h-4 w-4" /> Save Invoice</>
              )}
            </Button>
          </div>
        </div>

        <div className={`${mobileTab === 'preview' ? 'block' : 'hidden'} lg:block`}>
          <div className="sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Live Preview
              </h3>
            </div>
            <div className="overflow-auto max-h-[calc(100vh-180px)] rounded-2xl">
              <div className="scale-[0.8] origin-top-left w-[125%]">
                <InvoicePDFContent invoice={previewData} business={business} themeName={theme} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
