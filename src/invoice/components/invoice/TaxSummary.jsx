import React from 'react';
import { formatCurrency } from '@/invoice/lib/invoiceUtils';

export default function TaxSummary({
  totals,
  taxType,
  currency = 'INR',
  additionalChargesLabel,
  additionalChargesAmount,
  taxBreakdown = []
}) {
  return (
    <div className="space-y-2.5 text-xs bg-muted/30 p-4 rounded-xl border border-border/80">
      <div className="flex justify-between items-center text-muted-foreground">
        <span>Subtotal</span>
        <span className="font-mono font-medium text-foreground">{formatCurrency(totals.subtotal, currency)}</span>
      </div>

      {totals.total_discount > 0 && (
        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
          <span>Discount</span>
          <span className="font-mono font-medium">-{formatCurrency(totals.total_discount, currency)}</span>
        </div>
      )}

      {taxType === 'gst' && (
        <>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>CGST</span>
            <span className="font-mono font-medium text-foreground">{formatCurrency(totals.cgst_amount, currency)}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>SGST</span>
            <span className="font-mono font-medium text-foreground">{formatCurrency(totals.sgst_amount, currency)}</span>
          </div>
        </>
      )}

      {taxType === 'igst' && (
        <div className="flex justify-between items-center text-muted-foreground">
          <span>IGST</span>
          <span className="font-mono font-medium text-foreground">{formatCurrency(totals.igst_amount, currency)}</span>
        </div>
      )}

      {taxType === 'none' && (
        <div className="flex justify-between items-center text-muted-foreground italic text-[11px]">
          <span>Tax</span>
          <span>Zero-rated / Exempt</span>
        </div>
      )}

      {Number(additionalChargesAmount) > 0 && (
        <div className="flex justify-between items-center text-muted-foreground">
          <span>{additionalChargesLabel || 'Additional Charges'}</span>
          <span className="font-mono font-medium text-foreground">{formatCurrency(additionalChargesAmount, currency)}</span>
        </div>
      )}

      {taxBreakdown.length > 1 && (
        <div className="pt-1.5 pb-1 border-t border-border/50 text-[10px] text-muted-foreground space-y-1">
          <p className="font-semibold uppercase tracking-wider text-[9px] text-muted-foreground/80">Tax Breakdown by Rate</p>
          {taxBreakdown.map((b) => (
            <div key={b.rate} className="flex justify-between font-mono">
              <span>{b.rate}% Taxable ({formatCurrency(b.taxableAmount, currency)})</span>
              <span>{formatCurrency(b.taxAmount, currency)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t-2 border-border pt-2.5 flex justify-between items-baseline">
        <span className="font-bold text-sm text-foreground">Total ({currency})</span>
        <span className="font-mono font-bold text-base text-foreground">{formatCurrency(totals.grand_total, currency)}</span>
      </div>
    </div>
  );
}
