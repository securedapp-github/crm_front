import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/invoice/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/invoice/components/ui/button';
import { Input } from '@/invoice/components/ui/input';
import { Badge } from '@/invoice/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/invoice/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/invoice/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/invoice/components/ui/alert-dialog';
import { Plus, Search, MoreHorizontal, Eye, Pencil, Copy, Trash2, FileText, Download } from 'lucide-react';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/invoice/lib/invoiceUtils';
import { exportInvoicesToCSV } from '@/invoice/lib/exportUtils';
import { format } from 'date-fns';

export default function Invoices() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 200)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeleteId(null);
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (invoice) => {
      const { id, created_date, updated_date, created_by_id, ...data } = invoice;
      data.invoice_number = data.invoice_number + '-COPY';
      data.status = 'draft';
      return base44.entities.Invoice.create(data);
    },
    onSuccess: (newInv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate(`/dashboard/invoices/${newInv.id}/edit`);
    }
  });

  const filtered = invoices.filter((inv) => {
    const matchSearch = !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchDateFrom = !dateFrom || inv.invoice_date >= dateFrom;
    const matchDateTo = !dateTo || inv.invoice_date <= dateTo;
    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">{invoices.length} total invoices</p>
        </div>
        <Link to="/dashboard/invoices/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice # or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px] h-9 text-xs" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px] h-9 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => exportInvoicesToCSV(filtered)} title="Export CSV">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No invoices found</h3>
          <p className="text-sm text-muted-foreground">Create your first invoice to get started.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Invoice #</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Amount</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Balance</th>
                  <th className="px-6 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}>
                    <td className="px-6 py-4 text-sm font-medium">{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm">{inv.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(inv.status) + " border-0 text-[11px]"}>
                        {getStatusLabel(inv.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-right">
                      {formatCurrency(inv.grand_total, inv.currency)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-muted-foreground">
                      {formatCurrency(inv.balance_due || 0, inv.currency)}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/invoices/${inv.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/invoices/${inv.id}/edit`)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(inv)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(inv.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
