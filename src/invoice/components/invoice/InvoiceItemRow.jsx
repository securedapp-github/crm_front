import React from 'react';
import { Input } from '@/invoice/components/ui/input';
import { Button } from '@/invoice/components/ui/button';
import { Trash2 } from 'lucide-react';
import { calculateItemAmount } from '@/invoice/lib/invoiceUtils';

export default function InvoiceItemRow({ item, index, onChange, onRemove, showHsn = true }) {
  const amount = calculateItemAmount(item);

  const handleChange = (field, value) => {
    onChange(index, { ...item, [field]: value, amount: calculateItemAmount({ ...item, [field]: value }) });
  };

  return (
    <tr className="border-b border-border last:border-0 group">
      <td className="p-2 text-center text-xs text-muted-foreground">{index + 1}</td>
      <td className="p-2 min-w-[200px]">
        <Input value={item.name || ''} onChange={(e) => handleChange('name', e.target.value)} placeholder="Item name" className="text-sm h-9 w-full min-w-[180px]" />
      </td>
      {showHsn && (
        <td className="p-2">
          <Input value={item.hsn_code || ''} onChange={(e) => handleChange('hsn_code', e.target.value)} placeholder="HSN/SAC" className="text-sm h-9 w-24" />
        </td>
      )}
      <td className="p-2">
        <Input type="number" value={item.quantity || ''} onChange={(e) => handleChange('quantity', Number(e.target.value))} placeholder="1" className="text-sm h-9 w-20" min="0" />
      </td>
      <td className="p-2">
        <Input type="number" value={item.rate || ''} onChange={(e) => handleChange('rate', Number(e.target.value))} placeholder="0.00" className="text-sm h-9 w-24" min="0" />
      </td>
      <td className="p-2">
        <Input type="number" value={item.discount_percent || ''} onChange={(e) => handleChange('discount_percent', Number(e.target.value))} placeholder="0" className="text-sm h-9 w-16" min="0" max="100" />
      </td>
      <td className="p-2">
        <Input type="number" value={item.tax_percent ?? 18} onChange={(e) => handleChange('tax_percent', Number(e.target.value))} className="text-sm h-9 w-16" min="0" />
      </td>
      <td className="p-2 text-right text-sm font-medium min-w-[90px]">₹{amount.toFixed(2)}</td>
      <td className="p-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemove(index)}>
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </Button>
      </td>
    </tr>
  );
}
