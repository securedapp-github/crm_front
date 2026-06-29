import React from 'react';
import { formatCurrency, numberToWords } from '@/invoice/lib/invoiceUtils';
import { getTheme } from '@/invoice/lib/invoiceThemes';
import { format } from 'date-fns';

export default function InvoicePDFContent({ invoice, business, themeName = 'securedapp-green' }) {
  const items = invoice.items || [];
  const taxType = invoice.tax_type || 'gst';
  const theme = getTheme(themeName);
  const isDark = themeName === 'dark-minimal';
  const bgClass = isDark ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900';

  return (
    <div className={`${bgClass} rounded-2xl border shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none`}>
      <div className={`${theme.headerBg} ${theme.headerText} px-8 py-6`}>
        <div className="flex items-start justify-between">
          <div>
            {business?.logo_url ? (
              <img src={business.logo_url} alt="Logo" className="h-12 mb-2 object-contain" />
            ) : (
              <h2 className="text-2xl font-bold font-display">{business?.company_name || 'Your Business'}</h2>
            )}
            {business?.address_line1 && (
              <p className={`${theme.headerSubtext} text-sm mt-1`}>
                {business.address_line1}{business.city ? `, ${business.city}` : ''}{business.state ? `, ${business.state}` : ''} {business.pincode}
              </p>
            )}
            {business?.email && <p className={`${theme.headerSubtext} text-sm`}>{business.email}</p>}
            {business?.phone && <p className={`${theme.headerSubtext} text-sm`}>{business.phone}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold font-display tracking-tight">INVOICE</h1>
            <p className={`${theme.headerSubtext} text-sm mt-1`}>{invoice.invoice_number}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wider font-medium mb-2 opacity-50">Billed To</p>
            <p className="font-semibold text-base">{invoice.customer_name}</p>
            {invoice.customer_address && <p className="text-sm opacity-70 mt-0.5">{invoice.customer_address}</p>}
            {invoice.customer_email && <p className="text-sm opacity-70">{invoice.customer_email}</p>}
            {invoice.customer_gst && <p className="text-sm opacity-70">GSTIN: {invoice.customer_gst}</p>}
          </div>
          <div className="text-right space-y-1">
            <div className="flex justify-end gap-8 text-sm">
              <span className="opacity-50">Invoice Date</span>
              <span className="font-medium">{invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd MMM yyyy') : '-'}</span>
            </div>
            <div className="flex justify-end gap-8 text-sm">
              <span className="opacity-50">Due Date</span>
              <span className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : '-'}</span>
            </div>
            {business?.gst_number && (
              <div className="flex justify-end gap-8 text-sm">
                <span className="opacity-50">GSTIN</span>
                <span className="font-medium">{business.gst_number}</span>
              </div>
            )}
          </div>
        </div>

        <div className={`${theme.borderColor} border rounded-xl overflow-hidden`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`${theme.tableHeader} text-xs uppercase tracking-wider`}>
                <th className="text-left px-4 py-3" style={{ width: '30px' }}>#</th>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3" style={{ width: '70px' }}>HSN</th>
                <th className="text-center px-4 py-3" style={{ width: '50px' }}>Qty</th>
                <th className="text-right px-4 py-3" style={{ width: '100px' }}>Rate</th>
                <th className="text-right px-4 py-3" style={{ width: '55px' }}>Disc</th>
                {taxType !== 'none' && (
                  <>
                    {taxType === 'gst' ? (
                      <>
                        <th className="text-right px-4 py-3" style={{ width: '80px' }}>CGST</th>
                        <th className="text-right px-4 py-3" style={{ width: '80px' }}>SGST</th>
                      </>
                    ) : (
                      <th className="text-right px-4 py-3" style={{ width: '80px' }}>IGST</th>
                    )}
                  </>
                )}
                <th className="text-right px-4 py-3" style={{ width: '100px' }}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, i) => {
                const base = (item.quantity || 0) * (item.rate || 0);
                const disc = base * ((item.discount_percent || 0) / 100);
                const taxable = base - disc;
                const taxAmt = taxable * ((item.tax_percent || 0) / 100);
                return (
                  <tr key={i}>
                    <td className="px-4 py-3 opacity-40">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.name}</p>
                      {item.description && <p className="opacity-50 text-xs mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3 opacity-50">{item.hsn_code || '-'}</td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right" style={{ wordBreak: 'break-all' }}>{formatCurrency(item.rate, invoice.currency)}</td>
                    <td className="px-4 py-3 text-right opacity-50">{item.discount_percent || 0}%</td>
                    {taxType !== 'none' && (
                      <>
                        {taxType === 'gst' ? (
                          <>
                            <td className="px-4 py-3 text-right">{formatCurrency(taxAmt / 2, invoice.currency)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(taxAmt / 2, invoice.currency)}</td>
                          </>
                        ) : (
                          <td className="px-4 py-3 text-right">{formatCurrency(taxAmt, invoice.currency)}</td>
                        )}
                      </>
                    )}
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(taxable, invoice.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-[320px] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="opacity-50">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {(invoice.total_discount || 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(invoice.total_discount, invoice.currency)}</span>
              </div>
            )}
            {taxType === 'gst' && (
              <>
                <div className="flex justify-between">
                  <span className="opacity-50">CGST</span>
                  <span>{formatCurrency(invoice.cgst_amount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">SGST</span>
                  <span>{formatCurrency(invoice.sgst_amount, invoice.currency)}</span>
                </div>
              </>
            )}
            {taxType === 'igst' && (
              <div className="flex justify-between">
                <span className="opacity-50">IGST</span>
                <span>{formatCurrency(invoice.igst_amount, invoice.currency)}</span>
              </div>
            )}
            {(invoice.additional_charges_amount || 0) > 0 && (
              <div className="flex justify-between">
                <span className="opacity-50">{invoice.additional_charges_label || 'Additional Charges'}</span>
                <span>{formatCurrency(invoice.additional_charges_amount, invoice.currency)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between">
              <span className="font-bold text-base">Total</span>
              <span className="font-bold text-lg">{formatCurrency(invoice.grand_total, invoice.currency)}</span>
            </div>
            {(invoice.amount_paid || 0) > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Amount Paid</span>
                  <span>-{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Balance Due</span>
                  <span>{formatCurrency(invoice.balance_due, invoice.currency)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={`${theme.totalBg} rounded-xl px-4 py-3`}>
          <p className="text-xs opacity-50 uppercase tracking-wider mb-1">Total in Words</p>
          <p className="text-sm font-medium">{numberToWords(invoice.grand_total || 0)}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm">
          {invoice.notes && (
            <div>
              <p className="text-xs opacity-50 uppercase tracking-wider mb-1">Notes</p>
              <p className="opacity-70">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms_and_conditions && (
            <div>
              <p className="text-xs opacity-50 uppercase tracking-wider mb-1">Terms & Conditions</p>
              <p className="opacity-70">{invoice.terms_and_conditions}</p>
            </div>
          )}
        </div>

        {business?.signature_url && (
          <div className="flex justify-end pt-4">
            <div className="text-center">
              <img src={business.signature_url} alt="Signature" className="h-16 object-contain" />
              <div className="border-t border-gray-300 dark:border-gray-700 mt-2 pt-1">
                <p className="text-xs opacity-50">Authorized Signatory</p>
              </div>
            </div>
          </div>
        )}

        {(business?.bank_name || invoice?.bank_details?.bank_name) && (
          <div className="border-t pt-4 text-sm">
            <p className="text-xs opacity-50 uppercase tracking-wider mb-2">Bank Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 opacity-70">
              {(invoice.bank_details?.beneficiary_name || business?.beneficiary_name) && <p className="col-span-2">Beneficiary: {invoice.bank_details?.beneficiary_name || business?.beneficiary_name}</p>}
              <p>Bank: {invoice.bank_details?.bank_name || business?.bank_name}{invoice.bank_details?.branch_name || business?.branch_name ? `, ${invoice.bank_details?.branch_name || business?.branch_name}` : ''}</p>
              <p>A/C: {invoice.bank_details?.account_number || business?.account_number}</p>
              {invoice.bank_details?.account_type || business?.account_type ? <p>Type: {invoice.bank_details?.account_type || business?.account_type}</p> : null}
              <p>IFSC: {invoice.bank_details?.ifsc_code || business?.ifsc_code}</p>
              {(invoice.bank_details?.swift_code || business?.swift_code) && <p>SWIFT: {invoice.bank_details?.swift_code || business?.swift_code}</p>}
              {(invoice.bank_details?.upi_id || business?.upi_id) && <p>UPI: {invoice.bank_details?.upi_id || business?.upi_id}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
