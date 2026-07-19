import React from 'react';
import { formatCurrency, numberToWords, getFullFileUrl } from '@/invoice/lib/invoiceUtils';
import { format } from 'date-fns';

export default function InvoicePDFContent({ invoice, business }) {
  const items = invoice.items || [];
  const taxType = invoice.tax_type || 'gst';
  const hasLongDesc = items.some(item => (item.description || '').length > 100);
  const isLarge = items.length >= 3 || (invoice.grand_total || 0) >= 100000 || hasLongDesc;
  const colWidths = {
    gst: {
      index: 'w-[4%]',
      item: 'w-[24%]',
      gstRate: 'w-[8%]',
      qty: 'w-[8%]',
      rate: 'w-[11%]',
      amount: 'w-[11%]',
      cgst: 'w-[11%]',
      sgst: 'w-[11%]',
      total: 'w-[12%]'
    },
    igst: {
      index: 'w-[4%]',
      item: 'w-[28%]',
      gstRate: 'w-[8%]',
      qty: 'w-[8%]',
      rate: 'w-[13%]',
      amount: 'w-[13%]',
      igst: 'w-[14%]',
      total: 'w-[12%]'
    },
    none: {
      index: 'w-[5%]',
      item: 'w-[45%]',
      qty: 'w-[10%]',
      rate: 'w-[13%]',
      amount: 'w-[13%]',
      total: 'w-[14%]'
    }
  }[taxType] || {};

  return (
    <div className="bg-white text-gray-900 rounded-2xl border shadow-sm p-8 space-y-6 print:shadow-none print:border-0 print:rounded-none print:p-0">
      {/* Header Row */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-cyan-500 tracking-tight mb-2">Invoice</h1>
          <div className="text-sm text-gray-500 space-y-1">
            <p><span className="inline-block w-24">Invoice No #</span> <strong className="text-gray-900">{invoice.invoice_number}</strong></p>
            <p><span className="inline-block w-24">Invoice Date</span> <strong className="text-gray-900">{invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : '-'}</strong></p>
            {invoice.due_date && (
              <p><span className="inline-block w-24">Due Date</span> <strong className="text-gray-900">{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</strong></p>
            )}
          </div>
        </div>
        <div>
          {business?.logo_url ? (
            <img src={getFullFileUrl(business.logo_url)} alt="Logo" className="max-h-16 max-w-[200px] object-contain" />
          ) : (
            <h2 className="text-xl font-bold text-gray-700">{business?.company_name || 'Your Business'}</h2>
          )}
        </div>
      </div>

      {/* Billed By & Billed To Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-cyan-50/55 border border-cyan-100 rounded-xl p-4 space-y-1">
          <h3 className="text-xs uppercase font-semibold text-cyan-600 tracking-wider mb-2">Billed By</h3>
          <p className="font-bold text-sm text-gray-900">{business?.company_name || 'Your Business'}</p>
          {business?.address_line1 && (
            <p className="text-sm text-gray-600">
              {business.address_line1}{business.city ? `, ${business.city}` : ''}{business.state ? `, ${business.state}` : ''} {business.pincode}
            </p>
          )}
          {business?.email && <p className="text-sm text-gray-600">Email: {business.email}</p>}
          {business?.phone && <p className="text-sm text-gray-600">Phone: {business.phone}</p>}
          {business?.gst_number && <p className="text-sm text-gray-600">GSTIN: {business.gst_number}</p>}
        </div>

        <div className="bg-cyan-50/55 border border-cyan-100 rounded-xl p-4 space-y-1">
          <h3 className="text-xs uppercase font-semibold text-cyan-600 tracking-wider mb-2">Billed To</h3>
          <p className="font-bold text-sm text-gray-900">{invoice.customer_name || '-'}</p>
          {invoice.customer_address && <p className="text-sm text-gray-600">{invoice.customer_address}</p>}
          {invoice.customer_email && <p className="text-sm text-gray-600">Email: {invoice.customer_email}</p>}
          {invoice.customer_gst && <p className="text-sm text-gray-600">GSTIN: {invoice.customer_gst}</p>}
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-gray-200 rounded-xl overflow-x-auto print:overflow-visible">
        <table className="w-full text-sm border-collapse table-auto break-words">
          <thead>
            <tr className="bg-cyan-500 text-white text-xs uppercase font-semibold whitespace-nowrap">
              <th className={`text-left px-2 py-3 ${colWidths.index}`}>#</th>
              <th className={`text-left px-2 py-3 ${colWidths.item}`}>Item</th>
              {taxType !== 'none' && <th className={`text-center px-2 py-3 ${colWidths.gstRate}`}>GST Rate</th>}
              <th className={`text-center px-2 py-3 ${colWidths.qty}`}>Quantity</th>
              <th className={`text-right px-2 py-3 ${colWidths.rate}`}>Rate</th>
              <th className={`text-right px-2 py-3 ${colWidths.amount}`}>Amount</th>
              {taxType !== 'none' && (
                taxType === 'gst' ? (
                  <>
                    <th className={`text-right px-2 py-3 ${colWidths.cgst}`}>CGST</th>
                    <th className={`text-right px-2 py-3 ${colWidths.sgst}`}>SGST</th>
                  </>
                ) : (
                  <th className={`text-right px-2 py-3 ${colWidths.igst}`}>IGST</th>
                )
              )}
              <th className={`text-right px-2 py-3 ${colWidths.total}`}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {items.map((item, i) => {
              const qty = item.quantity || 0;
              const rate = item.rate || 0;
              const baseAmount = qty * rate;
              const disc = baseAmount * ((item.discount_percent || 0) / 100);
              const taxable = baseAmount - disc;
              const taxAmt = taxable * ((item.tax_percent || 0) / 100);
              const itemTotal = taxable + taxAmt;
              return (
                <tr key={i} className="align-top break-inside-avoid">
                  <td className="px-2 py-3 text-gray-400">{i + 1}.</td>
                  <td className="px-2 py-3">
                    <strong className="text-gray-900 font-medium block">{item.name || '-'}</strong>
                    {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
                  </td>
                  {taxType !== 'none' && <td className="px-2 py-3 text-center">{item.tax_percent || 0}%</td>}
                  <td className="px-2 py-3 text-center whitespace-nowrap">{qty}</td>
                  <td className="px-2 py-3 text-right whitespace-nowrap">{formatCurrency(rate, invoice.currency)}</td>
                  <td className="px-2 py-3 text-right whitespace-nowrap">{formatCurrency(baseAmount, invoice.currency)}</td>
                  {taxType !== 'none' && (
                    taxType === 'gst' ? (
                      <>
                        <td className="px-2 py-3 text-right whitespace-nowrap">{formatCurrency(taxAmt / 2, invoice.currency)}</td>
                        <td className="px-2 py-3 text-right whitespace-nowrap">{formatCurrency(taxAmt / 2, invoice.currency)}</td>
                      </>
                    ) : (
                      <td className="px-2 py-3 text-right whitespace-nowrap">{formatCurrency(taxAmt, invoice.currency)}</td>
                    )
                  )}
                  <td className="px-2 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(itemTotal, invoice.currency)}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-50/75 border-t-2 border-gray-200 font-bold text-gray-900 break-inside-avoid">
              <td colSpan={2} className="px-2 py-3">Total</td>
              {taxType !== 'none' && <td className="px-2 py-3" />}
              <td className="px-2 py-3 text-center whitespace-nowrap">{items.reduce((sum, item) => sum + (item.quantity || 0), 0)}</td>
              <td className="px-2 py-3" />
              <td className="px-2 py-3 text-right whitespace-nowrap">{formatCurrency(items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0), invoice.currency)}</td>
              {taxType === 'gst' ? (
                <>
                  <td className="px-2 py-3" />
                  <td className="px-2 py-3" />
                </>
              ) : (
                taxType === 'igst' && <td className="px-2 py-3" />
              )}
              <td className="px-2 py-3 text-right text-gray-950 whitespace-nowrap">{formatCurrency(invoice.grand_total, invoice.currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Section */}
      <div className={`break-inside-avoid space-y-4 ${isLarge ? 'border-t-4 border-dashed border-cyan-300 pt-6 mt-8' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Bank Details */}
        <div className="bg-cyan-50/55 border border-cyan-100 rounded-xl p-4 self-start space-y-3">
          <h3 className="text-xs uppercase font-semibold text-cyan-600 tracking-wider">Bank Details</h3>
          <table className="w-full text-sm border-none">
            <tbody className="space-y-1">
              <tr className="align-top">
                <td className="w-32 text-gray-500 py-0.5"><strong>Account Name</strong></td>
                <td className="text-gray-800 py-0.5">{invoice.bank_details?.beneficiary_name || business?.beneficiary_name || '-'}</td>
              </tr>
              <tr className="align-top">
                <td className="w-32 text-gray-500 py-0.5"><strong>Account Number</strong></td>
                <td className="text-gray-800 py-0.5">{invoice.bank_details?.account_number || business?.account_number || '-'}</td>
              </tr>
              <tr className="align-top">
                <td className="w-32 text-gray-500 py-0.5"><strong>IFSC</strong></td>
                <td className="text-gray-800 py-0.5">{invoice.bank_details?.ifsc_code || business?.ifsc_code || '-'}</td>
              </tr>
              {(invoice.bank_details?.swift_code || business?.swift_code) && (
                <tr className="align-top">
                  <td className="w-32 text-gray-500 py-0.5"><strong>SWIFT Code</strong></td>
                  <td className="text-gray-800 py-0.5">{invoice.bank_details?.swift_code || business?.swift_code}</td>
                </tr>
              )}
              <tr className="align-top">
                <td className="w-32 text-gray-500 py-0.5"><strong>Bank</strong></td>
                <td className="text-gray-800 py-0.5">{invoice.bank_details?.bank_name || business?.bank_name || '-'}</td>
              </tr>
              {(invoice.bank_details?.upi_id || business?.upi_id) && (
                <tr className="align-top">
                  <td className="w-32 text-gray-500 py-0.5"><strong>UPI</strong></td>
                  <td className="text-gray-800 py-0.5">{invoice.bank_details?.upi_id || business?.upi_id}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary and Signature */}
        <div className="flex flex-col items-end space-y-4">
          <div className="w-full max-w-[320px] text-sm space-y-2 text-gray-600">
            <div className="flex justify-between">
              <span>Amount</span>
              <strong className="text-gray-900">{formatCurrency(invoice.subtotal, invoice.currency)}</strong>
            </div>
            {(invoice.total_discount || 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <strong>-{formatCurrency(invoice.total_discount, invoice.currency)}</strong>
              </div>
            )}
            {taxType === 'gst' && (
              <>
                <div className="flex justify-between">
                  <span>CGST</span>
                  <strong className="text-gray-900">{formatCurrency(invoice.cgst_amount, invoice.currency)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>SGST</span>
                  <strong className="text-gray-900">{formatCurrency(invoice.sgst_amount, invoice.currency)}</strong>
                </div>
              </>
            )}
            {taxType === 'igst' && (
              <div className="flex justify-between">
                <span>IGST</span>
                <strong className="text-gray-900">{formatCurrency(invoice.igst_amount, invoice.currency)}</strong>
              </div>
            )}
            {(invoice.additional_charges_amount || 0) > 0 && (
              <div className="flex justify-between">
                <span>{invoice.additional_charges_label || 'Additional Charges'}</span>
                <strong className="text-gray-900">{formatCurrency(invoice.additional_charges_amount, invoice.currency)}</strong>
              </div>
            )}
            <div className="border-y-2 border-gray-900 py-2.5 my-2 flex justify-between font-bold text-gray-900 text-base">
              <span>Total (INR)</span>
              <span>{formatCurrency(invoice.grand_total, invoice.currency)}</span>
            </div>
            {(invoice.amount_paid || 0) > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-green-600 text-xs">
                  <span>Amount Paid</span>
                  <strong>-{formatCurrency(invoice.amount_paid, invoice.currency)}</strong>
                </div>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>Balance Due</span>
                  <strong>{formatCurrency(invoice.balance_due, invoice.currency)}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="text-center pt-2 w-48">
            {business?.signature_url ? (
              <img src={business.signature_url} alt="Signature" className="h-12 object-contain mx-auto mb-1" />
            ) : (
              <div className="h-12"></div>
            )}
            <div className="border-t border-gray-200 pt-1">
              <p className="text-[10px] text-gray-400">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      {invoice.terms_and_conditions && (
        <div className="text-xs text-gray-500 pt-2">
          <h4 className="font-semibold text-cyan-600 mb-1">Terms and Conditions</h4>
          <ol className="list-decimal list-inside space-y-0.5">
            {invoice.terms_and_conditions.split('\n').filter(line => line.trim()).map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Contact enquiry footer */}
      <div className="border-t border-gray-100 pt-4 text-center text-xs text-gray-600">
        For any enquiry, reach out via email at <strong className="text-gray-800">{business?.email || '-'}</strong>, call on <strong className="text-gray-800">{business?.phone || '-'}</strong>
      </div>
      
      </div>

    </div>
  );
}
