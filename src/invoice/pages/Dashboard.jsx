import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi } from '@/invoice/api/invoiceClient';
import { FileText, IndianRupee, Clock, Users, AlertTriangle, Send } from 'lucide-react';
import { formatCurrency } from '@/invoice/lib/invoiceUtils';
import StatCard from '@/invoice/components/dashboard/StatCard';
import RevenueChart from '@/invoice/components/dashboard/RevenueChart';
import RecentInvoicesList from '@/invoice/components/dashboard/RecentInvoicesList';

export default function InvoiceDashboard() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceApi.entities.Invoice.list('-created_date', 200)
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => invoiceApi.entities.Customer.list()
  });

  const stats = React.useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const isThisMonth = (inv) => {
      if (!inv.invoice_date) return false;
      const d = new Date(inv.invoice_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    };
    const isLastMonth = (inv) => {
      if (!inv.invoice_date) return false;
      const d = new Date(inv.invoice_date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    };

    const total = invoices.length;
    const revenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.grand_total || 0), 0);
    const thisMonthRev = invoices.filter((i) => i.status === 'paid' && isThisMonth(i)).reduce((s, i) => s + (i.grand_total || 0), 0);
    const lastMonthRev = invoices.filter((i) => i.status === 'paid' && isLastMonth(i)).reduce((s, i) => s + (i.grand_total || 0), 0);
    const pending = invoices.filter((i) => ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status)).reduce((s, i) => s + (i.balance_due || i.grand_total || 0), 0);
    const overdue = invoices.filter((i) => i.status === 'overdue').length;
    const sent = invoices.filter((i) => i.status === 'sent').length;

    const revTrend = lastMonthRev > 0 ? Math.round((thisMonthRev - lastMonthRev) / lastMonthRev * 100) : null;

    return { total, revenue, pending, overdue, sent, revTrend, thisMonthRev, lastMonthRev };
  }, [invoices]);

  const topCustomers = React.useMemo(() => {
    const map = {};
    invoices.forEach((inv) => {
      const name = inv.customer_name || 'Unknown';
      if (!map[name]) map[name] = { name, count: 0, total: 0 };
      map[name].count += 1;
      map[name].total += inv.grand_total || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [invoices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold font-display tracking-tight">Invoice Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your invoicing activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Invoices" value={stats.total} icon={FileText} />
        <StatCard title="Revenue (Paid)" value={formatCurrency(stats.revenue)} icon={IndianRupee} trend={stats.revTrend !== null ? `${Math.abs(stats.revTrend)}% vs last month` : null} trendUp={stats.revTrend !== null && stats.revTrend >= 0} />
        <StatCard title="Pending Amount" value={formatCurrency(stats.pending)} icon={Clock} />
        <StatCard title="Total Clients" value={customers.length} icon={Users} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Overdue Invoices" value={stats.overdue} icon={AlertTriangle} />
        <StatCard title="Sent Invoices" value={stats.sent} icon={Send} />
        <StatCard title="This Month Revenue" value={formatCurrency(stats.thisMonthRev)} icon={IndianRupee} />
        <StatCard title="Last Month Revenue" value={formatCurrency(stats.lastMonthRev)} icon={IndianRupee} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart invoices={invoices} />
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Top Clients</h3>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} invoice{c.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="font-semibold">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RecentInvoicesList invoices={invoices} />
    </div>
  );
}
