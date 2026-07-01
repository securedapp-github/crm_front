import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi } from '@/invoice/api/invoiceClient';
import { Button } from '@/invoice/components/ui/button';
import { Input } from '@/invoice/components/ui/input';
import { Label } from '@/invoice/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/invoice/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/invoice/components/ui/popover';
import { Search, Plus, User } from 'lucide-react';

export default function CustomerSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', gst_number: '', address_line1: '', city: '', state: '', pincode: '' });

  const { data: customers = [], refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: () => invoiceApi.entities.Customer.list()
  });

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
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
  };

  const handleCreateNew = async () => {
    const created = await invoiceApi.entities.Customer.create(newCustomer);
    refetch();
    handleSelect(created);
    setShowNew(false);
    setNewCustomer({ name: '', email: '', phone: '', gst_number: '', address_line1: '', city: '', state: '', pincode: '' });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start h-auto min-h-[42px] text-left font-normal">
            {value?.customer_name ? (
              <div>
                <p className="font-medium text-sm">{value.customer_name}</p>
                {value.customer_email && <p className="text-xs text-muted-foreground">{value.customer_email}</p>}
              </div>
            ) : (
              <span className="text-muted-foreground">Select a Client</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => handleSelect(c)} className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email || c.phone || ''}</p>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No clients found</p>}
          </div>
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-primary" onClick={() => { setShowNew(true); setOpen(false); }}>
              <Plus className="h-4 w-4" /> Add New Client
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
            </div>
            <div>
              <Label>GST Number</Label>
              <Input value={newCustomer.gst_number} onChange={(e) => setNewCustomer({ ...newCustomer, gst_number: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={newCustomer.address_line1} onChange={(e) => setNewCustomer({ ...newCustomer, address_line1: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={newCustomer.state} onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreateNew} disabled={!newCustomer.name}>Add Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
