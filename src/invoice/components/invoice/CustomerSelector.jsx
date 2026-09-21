import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi } from '@/invoice/api/invoiceClient';
import { Button } from '@/invoice/components/ui/button';
import { Input } from '@/invoice/components/ui/input';
import { Label } from '@/invoice/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/invoice/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/invoice/components/ui/popover';
import { Search, Plus, User, ArrowLeftRight, X, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({});

  const { data: customers = [], refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => invoiceApi.entities.Customer.list()
  });

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.gst_number?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (customer) => {
    onChange({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_gst: customer.gst_number,
      customer_address: [customer.address_line1, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')
    });
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ customer_id: '', customer_name: '', customer_email: '', customer_gst: '', customer_address: '' });
  };

  const handleCreateNew = async () => {
    try {
      const created = await invoiceApi.entities.Customer.create(newCustomer);
      toast.success('Client added successfully');
      refetch();
      handleSelect(created);
      setShowNew(false);
      setNewCustomer({ name: '', email: '', phone: '', gst_number: '', address_line1: '', city: '', state: '', pincode: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to add client');
    }
  };

  const hasCustomer = Boolean(value?.customer_name);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Billed To</h3>
        {hasCustomer && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(true)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Change</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              title="Remove Client"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {hasCustomer ? (
            <div
              role="button"
              tabIndex={0}
              className="p-4 bg-muted/50 hover:bg-muted/70 border border-border/60 hover:border-border rounded-xl text-sm space-y-1.5 min-h-[160px] flex flex-col justify-between transition-all cursor-pointer group shadow-sm text-left select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              title="Click to switch client"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground text-sm leading-tight break-words flex-1">
                    {value.customer_name}
                  </p>
                  <span className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground/60 border border-border/50 px-1.5 py-0.5 rounded bg-background/50 group-hover:border-primary/40 group-hover:text-primary transition-colors shrink-0">
                    Switch
                  </span>
                </div>

                {value.customer_email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 break-all">
                    <Mail className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                    <span>{value.customer_email}</span>
                  </p>
                )}

                {value.customer_address && (
                  <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5 break-words">
                    <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0 mt-0.5" />
                    <span className="flex-1">{value.customer_address}</span>
                  </p>
                )}
              </div>

              {value.customer_gst && (
                <div className="pt-1.5 mt-auto border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">GSTIN</span>
                  <span className="text-xs font-mono font-medium text-foreground bg-background/80 px-2 py-0.5 rounded border border-border/40">
                    {value.customer_gst}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              className="p-4 bg-muted/30 border border-dashed border-border/80 hover:border-primary/50 hover:bg-muted/50 rounded-xl text-sm min-h-[160px] flex flex-col items-center justify-center text-center cursor-pointer transition-all group space-y-2.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">Select a Client</p>
                <p className="text-xs text-muted-foreground mt-0.5">Click to choose or add a client</p>
              </div>
            </div>
          )}
        </PopoverTrigger>

        <PopoverContent className="w-[360px] p-0 shadow-lg" align="end">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, email, or GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[260px] overflow-y-auto divide-y divide-border/30">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-muted/60 transition-colors flex items-start gap-3 group"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {c.name}
                  </p>
                  {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                  {c.gst_number && (
                    <p className="text-[11px] text-muted-foreground/80 font-mono mt-0.5">
                      GSTIN: {c.gst_number}
                    </p>
                  )}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-6 text-center">No clients found</p>
            )}
          </div>
          <div className="border-t p-2 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-2 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 h-8"
              onClick={() => { setShowNew(true); setOpen(false); }}
            >
              <Plus className="h-3.5 w-3.5" /> Add New Client
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 text-xs">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Client / Company Name *</Label>
              <Input
                placeholder="e.g. Acme Corp or John Doe"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                placeholder="+91 98765 43210"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">GST Number</Label>
              <Input
                placeholder="27ABCDE1234F1Z5"
                value={newCustomer.gst_number}
                onChange={(e) => setNewCustomer({ ...newCustomer, gst_number: e.target.value.toUpperCase() })}
                className="h-9 font-mono uppercase"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                placeholder="Street address, building, suite"
                value={newCustomer.address_line1}
                onChange={(e) => setNewCustomer({ ...newCustomer, address_line1: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">City</Label>
              <Input
                placeholder="City"
                value={newCustomer.city}
                onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">State</Label>
              <Input
                placeholder="State"
                value={newCustomer.state}
                onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateNew} disabled={!newCustomer.name.trim()}>Save Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
