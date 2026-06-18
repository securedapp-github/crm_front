import React from 'react';
import { formatCurrency } from '@/invoice/lib/invoiceUtils';

export default function TaxSummary({ totals, taxType, currency = 'INR', additionalChargesLabel, additionalChargesAmount }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatCurrency(totals.subtotal, currency)}</span>
      </div>
      {totals.total_discount > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>Discount</span>
          <span>-{formatCurrency(totals.total_discount, currency)}</span>
        </div>
      )}
      {taxType === 'gst' && (
        <>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CGST</span>
            <span>{formatCurrency(totals.cgst_amount, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">SGST</span>
            <span>{formatCurrency(totals.sgst_amount, currency)}</span>
          </div>
        </>
      )}
      {taxType === 'igst' && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">IGST</span>
          <span>{formatCurrency(totals.igst_amount, currency)}</span>
        </div>
      )}
      {Number(additionalChargesAmount) > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{additionalChargesLabel || 'Additional Charges'}</span>
          <span>{formatCurrency(additionalChargesAmount, currency)}</span>
        </div>
      )}
      <div className="border-t border-border pt-2 flex justify-between">
        <span className="font-semibold text-base">Total ({currency})</span>
        <span className="font-bold text-lg">{formatCurrency(totals.grand_total, currency)}</span>
      </div>
    </div>
  );
}
