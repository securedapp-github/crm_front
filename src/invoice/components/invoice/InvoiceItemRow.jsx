import React from 'react';
import { Input } from '@/invoice/components/ui/input';
import { Button } from '@/invoice/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/invoice/components/ui/select';
import { Trash2 } from 'lucide-react';
import { calculateItemAmount, formatCurrency, ITEM_UNITS } from '@/invoice/lib/invoiceUtils';

export default function InvoiceItemRow({ item, index, onChange, onRemove, showHsn = true, currency = 'INR' }) {
  const amount = calculateItemAmount(item);

  const handleChange = (field, value) => {
    const updated = { ...item, [field]: value };
    updated.amount = calculateItemAmount(updated);
    onChange(index, updated);
  };

  return (
    <tr className="border-b border-border last:border-0 group hover:bg-muted/20 transition-colors">
      <td className="p-2.5 text-center text-xs text-muted-foreground font-mono">{index + 1}</td>
      <td className="p-2.5 min-w-[220px]">
        <div className="space-y-1">
          <Input
            value={item.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Item / Service Name *"
            className="text-xs h-8 w-full font-medium"
          />
          <Input
            value={item.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Description (optional)"
            className="text-[11px] h-7 w-full text-muted-foreground placeholder:text-muted-foreground/50 border-dashed"
          />
        </div>
      </td>
      {showHsn && (
        <td className="p-2.5">
          <Input
            value={item.hsn_code || ''}
            onChange={(e) => handleChange('hsn_code', e.target.value)}
            placeholder="HSN/SAC"
            className="text-xs h-8 w-20 font-mono"
          />
        </td>
      )}
      <td className="p-2.5">
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={item.quantity === '' ? '' : item.quantity ?? 1}
            onChange={(e) => handleChange('quantity', e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="1"
            className="text-xs h-8 w-14 font-mono text-center"
            min="0"
            step="any"
          />
          <Select
            value={item.unit || 'nos'}
            onValueChange={(val) => handleChange('unit', val)}
          >
            <SelectTrigger className="text-xs h-8 w-20 px-2 py-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEM_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value} className="text-xs">
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="p-2.5">
        <Input
          type="number"
          value={item.rate === '' ? '' : item.rate ?? 0}
          onChange={(e) => handleChange('rate', e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0.00"
          className="text-xs h-8 w-24 font-mono"
          min="0"
          step="any"
        />
      </td>
      <td className="p-2.5">
        <Input
          type="number"
          value={item.discount_percent === '' ? '' : item.discount_percent ?? 0}
          onChange={(e) => handleChange('discount_percent', e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          className="text-xs h-8 w-16 font-mono text-center"
          min="0"
          max="100"
        />
      </td>
      <td className="p-2.5">
        <Input
          type="number"
          value={item.tax_percent ?? 18}
          onChange={(e) => handleChange('tax_percent', e.target.value === '' ? '' : Number(e.target.value))}
          className="text-xs h-8 w-16 font-mono text-center"
          min="0"
        />
      </td>
      <td className="p-2.5 text-right text-xs font-mono font-bold min-w-[90px] text-foreground">
        {formatCurrency(amount, currency)}
      </td>
      <td className="p-2.5 text-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-40 group-hover:opacity-100 hover:text-destructive transition-all"
          onClick={() => onRemove(index)}
          title="Remove line item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}
