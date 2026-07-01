import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi } from '@/invoice/api/invoiceClient';
import { Input } from '@/invoice/components/ui/input';
import { Badge } from '@/invoice/components/ui/badge';
import { Search, CreditCard, Download } from 'lucide-react';
import { formatCurrency } from '@/invoice/lib/invoiceUtils';
import { exportPaymentsToCSV } from '@/invoice/lib/exportUtils';
import { format } from 'date-fns';
import { Button } from '@/invoice/components/ui/button';

const methodLabels = {
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cash: 'Cash',
  cheque: 'Cheque',
  card: 'Card',
  other: 'Other'
};

export default function Payments() {
  const [search, setSearch] = useState('');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => invoiceApi.entities.Payment.list('-created_date', 200)
  });

  const filtered = payments.filter((p) =>
    !search || p.invoice_number?.toLowerCase().includes(search.toLowerCase()) || p.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Total received: {formatCurrency(totalReceived)}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportPaymentsToCSV(filtered)}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No payments recorded</h3>
          <p className="text-sm text-muted-foreground">Record payments from invoice details.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Invoice</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Method</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Reference</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm">{p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{p.invoice_number || '-'}</td>
                    <td className="px-6 py-4 text-sm">{p.customer_name || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="text-[11px]">{methodLabels[p.payment_method] || p.payment_method}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{p.reference_number || '-'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-right text-emerald-600">+{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
