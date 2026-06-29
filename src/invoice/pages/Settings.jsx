import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/invoice/api/base44Client';
import { Button } from '@/invoice/components/ui/button';
import { Input } from '@/invoice/components/ui/input';
import { Label } from '@/invoice/components/ui/label';
import { Textarea } from '@/invoice/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/invoice/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/invoice/components/ui/tabs';
import { Save, Building2, CreditCard, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: businessList, isLoading } = useQuery({
    queryKey: ['business'],
    queryFn: () => base44.entities.Business.list()
  });

  const business = businessList?.[0];

  const [form, setForm] = useState({
    company_name: '', logo_url: '', gst_number: '', pan_number: '',
    address_line1: '', address_line2: '', city: '', state: '', pincode: '', country: 'India',
    email: '', phone: '', website: '',
    bank_name: '', account_number: '', ifsc_code: '', upi_id: '',
    beneficiary_name: '', account_type: 'Current', branch_name: '', swift_code: '', bank_address: '', bank_currency: 'USD', is_default_bank: false,
    invoice_prefix: 'INV', next_invoice_number: 1, default_currency: 'INR', default_tax_type: 'gst',
    signature_url: '', terms_and_conditions: '', notes: ''
  });

  useEffect(() => {
    if (business) {
      setForm((prev) => ({ ...prev, ...business }));
    }
  }, [business]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (business?.id) return base44.entities.Business.update(business.id, form);
      return base44.entities.Business.create(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success('Settings saved successfully');
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, logo_url: file_url }));
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, signature_url: file_url }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[800px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display tracking-tight">Invoice Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your business information</p>
        </div>
        <Button className="gap-2" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Business</TabsTrigger>
          <TabsTrigger value="bank" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Bank</TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Invoice</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="bg-card rounded-2xl border p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="h-20 w-20 rounded-xl object-contain border" />
              ) : (
                <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center border border-dashed">
                  Upload
                </div>
              )}
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} />
            </div>
            <div>
              <p className="text-sm font-medium">Company Logo</p>
              <p className="text-xs text-muted-foreground">Click to upload (PNG, JPG)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Company Name *</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div>
              <Label>GST Number</Label>
              <Input value={form.gst_number || ''} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            </div>
            <div>
              <Label>PAN Number</Label>
              <Input value={form.pan_number || ''} onChange={(e) => setForm({ ...form, pan_number: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address_line1 || ''} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <Label>Pincode</Label>
              <Input value={form.pincode || ''} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country || 'India'} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Website</Label>
              <Input value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bank" className="bg-card rounded-2xl border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Beneficiary / Account Holder Name</Label>
              <Input value={form.beneficiary_name || ''} onChange={(e) => setForm({ ...form, beneficiary_name: e.target.value })} />
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input value={form.bank_name || ''} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input value={form.account_number || ''} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
            </div>
            <div>
              <Label>Account Type</Label>
              <Select value={form.account_type || 'Current'} onValueChange={(v) => setForm({ ...form, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="NRI">NRI</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input value={form.ifsc_code || ''} onChange={(e) => setForm({ ...form, ifsc_code: e.target.value })} />
            </div>
            <div>
              <Label>Branch Name</Label>
              <Input value={form.branch_name || ''} onChange={(e) => setForm({ ...form, branch_name: e.target.value })} />
            </div>
            <div>
              <Label>SWIFT / BIC Code</Label>
              <Input value={form.swift_code || ''} onChange={(e) => setForm({ ...form, swift_code: e.target.value })} />
            </div>
            <div>
              <Label>Bank Address</Label>
              <Input value={form.bank_address || ''} onChange={(e) => setForm({ ...form, bank_address: e.target.value })} />
            </div>
            <div>
              <Label>UPI ID</Label>
              <Input value={form.upi_id || ''} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.bank_currency || 'USD'} onValueChange={(v) => setForm({ ...form, bank_currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="SGD">SGD (S$)</SelectItem>
                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_default_bank}
              onClick={() => setForm({ ...form, is_default_bank: !form.is_default_bank })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${form.is_default_bank ? 'bg-primary' : 'bg-input'}`}
            >
              <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${form.is_default_bank ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <Label className="cursor-pointer" onClick={() => setForm({ ...form, is_default_bank: !form.is_default_bank })}>
              Set as Default Bank Account for Invoices
            </Label>
          </div>
        </TabsContent>

        <TabsContent value="invoice" className="bg-card rounded-2xl border p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Invoice Prefix</Label>
              <Input value={form.invoice_prefix || 'INV'} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} />
            </div>
            <div>
              <Label>Next Invoice Number</Label>
              <Input type="number" value={form.next_invoice_number || 1} onChange={(e) => setForm({ ...form, next_invoice_number: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Default Currency</Label>
              <Select value={form.default_currency || 'INR'} onValueChange={(v) => setForm({ ...form, default_currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Tax Type</Label>
              <Select value={form.default_tax_type || 'gst'} onValueChange={(v) => setForm({ ...form, default_tax_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gst">GST (CGST + SGST)</SelectItem>
                  <SelectItem value="igst">IGST</SelectItem>
                  <SelectItem value="none">No Tax</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Signature</Label>
            <div className="mt-2 flex items-center gap-4">
              {form.signature_url ? (
                <img src={form.signature_url} alt="Signature" className="h-16 border rounded-lg p-1" />
              ) : (
                <div className="h-16 w-40 rounded-lg border border-dashed flex items-center justify-center relative">
                  <p className="text-xs text-muted-foreground">Upload signature</p>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleSignatureUpload} />
                </div>
              )}
              {form.signature_url && (
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, signature_url: '' })}>Remove</Button>
              )}
            </div>
          </div>

          <div>
            <Label>Default Terms & Conditions</Label>
            <Textarea value={form.terms_and_conditions || ''} onChange={(e) => setForm({ ...form, terms_and_conditions: e.target.value })} className="mt-1 h-24" placeholder="Enter default terms & conditions for invoices..." />
          </div>
          <div>
            <Label>Default Notes</Label>
            <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 h-24" placeholder="Enter default notes for invoices..." />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
