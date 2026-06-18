import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/invoice/api/base44Client';
import { Button } from '@/invoice/components/ui/button';
import { Badge } from '@/invoice/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/invoice/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/invoice/components/ui/dialog';
import { Input } from '@/invoice/components/ui/input';
import { Label } from '@/invoice/components/ui/label';
import { ArrowLeft, Pencil, CreditCard, Share2, Copy, Mail, MessageCircle, Check } from 'lucide-react';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/invoice/lib/invoiceUtils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import InvoicePDFContent from '@/invoice/components/invoice/InvoicePDFContent';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const printRef = useRef();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [payment, setPayment] = useState({ amount: 0, payment_date: new Date().toISOString().split('T')[0], payment_method: 'bank_transfer', reference_number: '', notes: '' });

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const list = await base44.entities.Invoice.filter({ id });
      return list[0] || null;
    }
  });

  const { data: businessList } = useQuery({
    queryKey: ['business'],
    queryFn: () => base44.entities.Business.list()
  });
  const business = businessList?.[0] || null;

  const statusMutation = useMutation({
    mutationFn: (status) => base44.entities.Invoice.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoice', id] })
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Payment.create({
        invoice_id: id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name,
        ...payment
      });
      const newPaid = (invoice.amount_paid || 0) + Number(payment.amount);
      const newBalance = (invoice.grand_total || 0) - newPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
      await base44.entities.Invoice.update(id, {
        amount_paid: newPaid,
        balance_due: Math.max(0, newBalance),
        status: newStatus
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setPaymentOpen(false);
    }
  });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${invoice.invoice_number}</title>
      <style>
        body { margin: 0; font-family: 'Inter', -apple-system, sans-serif; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head>
      <body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Invoice not found</p>
        <Link to="/dashboard/invoices"><Button variant="link">Back to Invoices</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-display">{invoice.invoice_number}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={getStatusColor(invoice.status) + " border-0 text-[11px]"}>
                {getStatusLabel(invoice.status)}
              </Badge>
              <span className="text-sm text-muted-foreground">{invoice.customer_name}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={invoice.status} onValueChange={(v) => statusMutation.mutate(v)}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setPayment({ ...payment, amount: invoice.balance_due || invoice.grand_total || 0 }); setPaymentOpen(true); }}>
            <CreditCard className="h-3.5 w-3.5" /> Record Payment
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/dashboard/invoices/${id}/edit`)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShareOpen(true)}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
            Print
          </Button>
        </div>
      </div>

      <div ref={printRef}>
        <InvoicePDFContent invoice={invoice} business={business} />
      </div>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={payment.payment_date} onChange={(e) => setPayment({ ...payment, payment_date: e.target.value })} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payment.payment_method} onValueChange={(v) => setPayment({ ...payment, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input value={payment.reference_number} onChange={(e) => setPayment({ ...payment, reference_number: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={() => paymentMutation.mutate()} disabled={paymentMutation.isPending}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Share Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Share Link</Label>
              <div className="flex gap-2">
                <Input readOnly value={`${window.location.origin}/invoice/${id}/public`} className="text-sm" />
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/invoice/${id}/public`);
                  setCopied(true);
                  toast.success('Link copied!');
                  setTimeout(() => setCopied(false), 2000);
                }}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a href={`mailto:${invoice.customer_email || ''}?subject=Invoice ${invoice.invoice_number}&body=Dear ${invoice.customer_name},%0D%0A%0D%0AHere is your invoice: ${window.location.origin}/invoice/${id}/public%0D%0A%0D%0AThank you for your business!`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-xl border hover:bg-muted/50 transition-colors text-sm">
                <Mail className="h-4 w-4" /> Email
              </a>
              <a href={`https://wa.me/?text=Invoice%20${encodeURIComponent(invoice.invoice_number)}%20-%20${encodeURIComponent(window.location.origin + '/invoice/' + id + '/public')}`}
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-xl border hover:bg-muted/50 transition-colors text-sm">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
