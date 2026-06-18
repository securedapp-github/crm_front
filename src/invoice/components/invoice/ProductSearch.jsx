import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/invoice/api/base44Client';
import { Input } from '@/invoice/components/ui/input';
import { Search, Plus, Package } from 'lucide-react';

export default function ProductSearch({ onSelect, show = false, setShow }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-updated_date', 100),
    enabled: show
  });

  useEffect(() => {
    if (show && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show]);

  if (!show) return null;

  const filtered = products.filter((p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-card border rounded-xl shadow-lg p-3 space-y-2 min-w-[320px]">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input ref={inputRef} placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
      </div>
      <div className="max-h-[240px] overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No products found</p>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors flex items-center justify-between group"
              onClick={() => {
                onSelect({
                  name: p.name,
                  description: p.description || '',
                  hsn_code: p.hsn_code || '',
                  quantity: 1,
                  rate: p.unit_price || 0,
                  discount_percent: 0,
                  tax_percent: p.tax_percent || 18
                });
                setShow(false);
                setSearch('');
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">GST {p.tax_percent}%{p.hsn_code ? ` · HSN ${p.hsn_code}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold">₹{p.unit_price?.toLocaleString('en-IN')}</span>
                <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
