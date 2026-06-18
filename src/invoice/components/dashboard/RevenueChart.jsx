import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/invoice/lib/invoiceUtils';

export default function RevenueChart({ invoices }) {
  const monthlyData = React.useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[key] = { month: key, revenue: 0, count: 0 };
    }
    (invoices || []).forEach((inv) => {
      if (!inv.invoice_date) return;
      const d = new Date(inv.invoice_date);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (months[key]) {
        months[key].revenue += inv.grand_total || 0;
        months[key].count += 1;
      }
    });
    return Object.values(months);
  }, [invoices]);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="text-base font-semibold mb-4">Revenue (Last 6 Months)</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) => [formatCurrency(value), 'Revenue']}
              contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
