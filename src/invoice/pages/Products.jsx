import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceApi } from '@/invoice/api/invoiceClient';
import { Button } from '@/invoice/components/ui/button';
import { Input } from '@/invoice/components/ui/input';
import { Label } from '@/invoice/components/ui/label';
import { Badge } from '@/invoice/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/invoice/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/invoice/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/invoice/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';

const emptyProduct = { name: '', description: '', hsn_code: '', category: 'service', unit_price: 0, tax_percent: 18 };
const categoryLabels = { product: 'Product', service: 'Service', other: 'Other' };

export default function Products() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ ...emptyProduct });
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => invoiceApi.entities.Product.list('-updated_date', 200)
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing?.id) return invoiceApi.entities.Product.update(editing.id, form);
      return invoiceApi.entities.Product.create(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ ...emptyProduct });
      toast.success(editing?.id ? 'Product updated' : 'Product created');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => invoiceApi.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteId(null);
      toast.success('Product deleted');
    }
  });

  const openEdit = (product) => {
    setEditing(product);
    setForm({ ...product });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyProduct });
    setDialogOpen(true);
  };

  const filtered = products.filter((p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-2xl lg:text-3xl font-bold font-display tracking-tight">Product Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">{products.length} items</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No products yet</h3>
          <p className="text-sm text-muted-foreground">Add reusable products & services to your catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-card rounded-2xl border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>}
                </div>
                <Badge variant="secondary" className="text-[10px]">{categoryLabels[p.category] || p.category}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>₹{p.unit_price?.toLocaleString('en-IN')}</span>
                <span>{p.tax_percent}% tax</span>
                {p.hsn_code && <span>HSN: {p.hsn_code}</span>}
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t">
                <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>HSN/SAC Code</Label>
                <Input value={form.hsn_code || ''} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit Price (₹)</Label>
                <Input type="number" value={form.unit_price || ''} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Tax %</Label>
                <Input type="number" value={form.tax_percent || ''} onChange={(e) => setForm({ ...form, tax_percent: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {editing?.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this product?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
