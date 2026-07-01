import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/invoice/components/ui/badge';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/invoice/lib/invoiceUtils';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';

export default function RecentInvoicesList({ invoices }) {
  const recent = (invoices || []).slice(0, 8);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-4">
        <h3 className="text-base font-semibold">Recent Invoices</h3>
        <Link to="/dashboard/invoices" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="divide-y divide-border">
        {recent.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No invoices yet. Create your first invoice to get started.
          </div>
        )}
        {recent.map((inv) => (
          <Link key={inv.id} to={`/dashboard/invoices/${inv.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium">{inv.customer_name}</p>
                <p className="text-xs text-muted-foreground">{inv.invoice_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={getStatusColor(inv.status) + " border-0 text-[11px] font-medium"}>
                {getStatusLabel(inv.status)}
              </Badge>
              <span className="text-sm font-semibold min-w-[80px] text-right">
                {formatCurrency(inv.grand_total, inv.currency)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
