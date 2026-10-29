import React from 'react';
import { formatCurrency, numberToWords, getFullFileUrl, format, calculateTaxBreakdown } from '@/invoice/lib/invoiceUtils';

export default function InvoicePDFContent({ invoice, business }) {
  const items = invoice.items || [];
  const taxType = invoice.tax_type || 'gst';
  const currency = invoice.currency || 'INR';
  const taxBreakdown = calculateTaxBreakdown(items, taxType);

  const documentTitle = taxType === 'none' ? 'INVOICE' : 'TAX INVOICE';

  return (
    <div className="bg-white text-slate-900 rounded-2xl border border-slate-200/80 shadow-sm p-8 space-y-6 print:shadow-none print:border-0 print:rounded-none print:p-0 print:m-0 font-sans">
      {/* Header Row */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
            {documentTitle}
          </span>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5">
            {invoice.invoice_number || 'INV-DRAFT'}
          </h1>
          <div className="text-xs text-slate-500 space-y-1 mt-2">
            <p>
              <span className="inline-block w-24 text-slate-400">Invoice Date:</span>
              <strong className="text-slate-800 font-semibold">{invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : '-'}</strong>
            </p>
            {invoice.due_date && (
              <p>
                <span className="inline-block w-24 text-slate-400">Due Date:</span>
                <strong className="text-slate-800 font-semibold">{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</strong>
              </p>
            )}
            {invoice.tax_type && (
              <p>
                <span className="inline-block w-24 text-slate-400">Tax Type:</span>
                <span className="uppercase text-slate-700 font-medium">
                  {invoice.tax_type === 'gst' ? 'GST (CGST + SGST)' : invoice.tax_type === 'igst' ? 'IGST (Inter-State)' : 'No Tax / Exempt'}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          {business?.logo_url ? (
            <img src={getFullFileUrl(business.logo_url)} alt="Business Logo" className="max-h-16 max-w-[200px] object-contain mb-2" />
          ) : (
            <h2 className="text-xl font-bold text-slate-900">{business?.company_name || 'Your Company'}</h2>
          )}
          {business?.company_name && business.logo_url && (
            <p className="text-xs font-semibold text-slate-700">{business.company_name}</p>
          )}
        </div>
      </div>

      {/* Billed By & Billed To Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-1.5 text-xs text-slate-600">
          <h3 className="text-[11px] uppercase font-bold text-emerald-700 tracking-wider mb-1">
            Billed By (Supplier)
          </h3>
          <p className="font-bold text-sm text-slate-900 leading-tight">
            {business?.company_name || 'Your Business Name'}
          </p>
          {business?.address_line1 && (
            <p className="text-slate-600 leading-relaxed">
              {business.address_line1}{business.city ? `, ${business.city}` : ''}{business.state ? `, ${business.state}` : ''}{business.pincode ? ` - ${business.pincode}` : ''}
            </p>
          )}
          {business?.email && <p>Email: <span className="text-slate-800">{business.email}</span></p>}
          {business?.phone && <p>Phone: <span className="text-slate-800">{business.phone}</span></p>}
          <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1">
            {business?.gst_number && (
              <p className="font-mono">GSTIN: <strong className="text-slate-900">{business.gst_number}</strong></p>
            )}
            {business?.pan_number && (
              <p className="font-mono">PAN: <strong className="text-slate-900">{business.pan_number}</strong></p>
            )}
            {business?.cin_number && (
              <p className="font-mono">CIN: <strong className="text-slate-900">{business.cin_number}</strong></p>
            )}
          </div>
        </div>

        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-1.5 text-xs text-slate-600">
          <h3 className="text-[11px] uppercase font-bold text-emerald-700 tracking-wider mb-1">
            Billed To (Customer)
          </h3>
          <p className="font-bold text-sm text-slate-900 leading-tight">
            {invoice.customer_name || '-'}
          </p>
          {invoice.customer_address && (
            <p className="text-slate-600 leading-relaxed">{invoice.customer_address}</p>
          )}
          {invoice.customer_email && <p>Email: <span className="text-slate-800">{invoice.customer_email}</span></p>}
          {invoice.customer_gst && (
            <p className="font-mono pt-1">
              GSTIN: <strong className="text-slate-900">{invoice.customer_gst}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto print:overflow-visible">
        <table className="w-full text-xs border-collapse table-auto break-words">
          <thead>
            <tr className="bg-emerald-600 text-white text-[11px] uppercase font-semibold whitespace-nowrap">
              <th className="text-left px-3 py-3 w-8">#</th>
              <th className="text-left px-3 py-3">Item Description</th>
              <th className="text-left px-2 py-3 w-20">HSN/SAC</th>
              <th className="text-center px-2 py-3 w-14">Qty</th>
              <th className="text-right px-3 py-3 w-20">Rate</th>
              <th className="text-right px-2 py-3 w-16">Disc</th>
              <th className="text-right px-3 py-3 w-20">Taxable</th>
              {taxType !== 'none' && (
                taxType === 'gst' ? (
                  <>
                    <th className="text-right px-2 py-3 w-16">CGST</th>
                    <th className="text-right px-2 py-3 w-16">SGST</th>
                  </>
                ) : (
                  <th className="text-right px-2 py-3 w-20">IGST</th>
                )
              )}
              <th className="text-right px-3 py-3 w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {items.map((item, i) => {
              const qty = Number(item.quantity) || 0;
              const rate = Number(item.rate) || 0;
              const baseAmount = qty * rate;
              const disc = baseAmount * ((Number(item.discount_percent) || 0) / 100);
              const taxable = Math.max(0, baseAmount - disc);
              const taxRate = Number(item.tax_percent) || 0;
              const taxAmt = taxType === 'none' ? 0 : taxable * (taxRate / 100);
              const itemTotal = taxable + taxAmt;
              const unitLabel = item.unit ? ` ${item.unit}` : '';

              return (
                <tr key={i} className="align-top hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-3 text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-3 py-3">
                    <strong className="text-slate-900 font-semibold block text-xs">{item.name || '-'}</strong>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-slate-500 font-mono text-[11px]">
                    {item.hsn_code || '-'}
                  </td>
                  <td className="px-2 py-3 text-center whitespace-nowrap text-slate-800 font-medium">
                    {qty}{unitLabel}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap font-mono">
                    {formatCurrency(rate, currency)}
                  </td>
                  <td className="px-2 py-3 text-right whitespace-nowrap text-emerald-600 font-mono">
                    {disc > 0 ? (
                      <div>
                        <span>{item.discount_percent}%</span>
                        <div className="text-[10px] text-emerald-700/80">-{formatCurrency(disc, currency)}</div>
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap font-mono font-medium text-slate-800">
                    {formatCurrency(taxable, currency)}
                  </td>
                  {taxType !== 'none' && (
                    taxType === 'gst' ? (
                      <>
                        <td className="px-2 py-3 text-right whitespace-nowrap font-mono text-slate-600">
                          <div>{formatCurrency(taxAmt / 2, currency)}</div>
                          <div className="text-[10px] text-slate-400">({taxRate / 2}%)</div>
                        </td>
                        <td className="px-2 py-3 text-right whitespace-nowrap font-mono text-slate-600">
                          <div>{formatCurrency(taxAmt / 2, currency)}</div>
                          <div className="text-[10px] text-slate-400">({taxRate / 2}%)</div>
                        </td>
                      </>
                    ) : (
                      <td className="px-2 py-3 text-right whitespace-nowrap font-mono text-slate-600">
                        <div>{formatCurrency(taxAmt, currency)}</div>
                        <div className="text-[10px] text-slate-400">({taxRate}%)</div>
                      </td>
                    )
                  )}
                  <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap font-mono">
                    {formatCurrency(itemTotal, currency)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
              <td colSpan={3} className="px-3 py-3 uppercase text-[11px] tracking-wider text-slate-700">Total</td>
              <td className="px-2 py-3 text-center whitespace-nowrap">
                {items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
              </td>
              <td className="px-3 py-3" />
              <td className="px-2 py-3 text-right text-emerald-600 whitespace-nowrap font-mono">
                {(invoice.total_discount || 0) > 0 ? `-${formatCurrency(invoice.total_discount, currency)}` : '-'}
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap font-mono">
                {formatCurrency(invoice.subtotal - (invoice.total_discount || 0), currency)}
              </td>
              {taxType === 'gst' ? (
                <>
                  <td className="px-2 py-3 text-right font-mono text-slate-700">{formatCurrency(invoice.cgst_amount, currency)}</td>
                  <td className="px-2 py-3 text-right font-mono text-slate-700">{formatCurrency(invoice.sgst_amount, currency)}</td>
                </>
              ) : (
                taxType === 'igst' && (
                  <td className="px-2 py-3 text-right font-mono text-slate-700">{formatCurrency(invoice.igst_amount, currency)}</td>
                )
              )}
              <td className="px-3 py-3 text-right text-slate-950 whitespace-nowrap font-mono text-sm">
                {formatCurrency(invoice.grand_total, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in words Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Invoice Amount in Words:</span>
        <strong className="text-slate-900 font-semibold text-right">
          {numberToWords(invoice.grand_total, currency)}
        </strong>
      </div>

      {/* Bottom Section: Bank Details + Summary Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Bank & Payment Details */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 self-start space-y-2 text-xs">
          <h3 className="text-[11px] uppercase font-bold text-emerald-700 tracking-wider">
            Payment & Bank Details
          </h3>
          <table className="w-full border-none">
            <tbody className="divide-y divide-slate-100">
              <tr className="align-top">
                <td className="w-28 text-slate-400 py-1">Account Name</td>
                <td className="text-slate-800 font-medium py-1">
                  {invoice.bank_details?.beneficiary_name || business?.beneficiary_name || business?.company_name || '-'}
                </td>
              </tr>
              <tr className="align-top">
                <td className="w-28 text-slate-400 py-1">Account Number</td>
                <td className="text-slate-900 font-mono font-bold py-1">
                  {invoice.bank_details?.account_number || business?.account_number || '-'}
                </td>
              </tr>
              <tr className="align-top">
                <td className="w-28 text-slate-400 py-1">Bank Name</td>
                <td className="text-slate-800 font-medium py-1">
                  {invoice.bank_details?.bank_name || business?.bank_name || '-'}
                  {(invoice.bank_details?.branch_name || business?.branch_name) ? `, ${invoice.bank_details?.branch_name || business?.branch_name}` : ''}
                </td>
              </tr>
              {(invoice.bank_details?.ifsc_code || business?.ifsc_code) && (
                <tr className="align-top">
                  <td className="w-28 text-slate-400 py-1">IFSC Code</td>
                  <td className="text-slate-800 font-mono font-bold py-1">
                    {invoice.bank_details?.ifsc_code || business?.ifsc_code}
                  </td>
                </tr>
              )}
              {(invoice.bank_details?.swift_code || business?.swift_code) && (
                <tr className="align-top">
                  <td className="w-28 text-slate-400 py-1">SWIFT Code</td>
                  <td className="text-slate-800 font-mono py-1">
                    {invoice.bank_details?.swift_code || business?.swift_code}
                  </td>
                </tr>
              )}
              {(invoice.bank_details?.upi_id || business?.upi_id) && (
                <tr className="align-top">
                  <td className="w-28 text-slate-400 py-1">UPI ID</td>
                  <td className="text-emerald-700 font-mono font-medium py-1">
                    {invoice.bank_details?.upi_id || business?.upi_id}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Signatory */}
        <div className="flex flex-col items-end space-y-4">
          <div className="w-full max-w-[340px] text-xs space-y-2 text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <strong className="text-slate-900 font-mono">{formatCurrency(invoice.subtotal, currency)}</strong>
            </div>
            {(invoice.total_discount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount</span>
                <strong className="font-mono">-{formatCurrency(invoice.total_discount, currency)}</strong>
              </div>
            )}
            {taxType === 'gst' && (
              <>
                <div className="flex justify-between">
                  <span>CGST</span>
                  <strong className="text-slate-900 font-mono">{formatCurrency(invoice.cgst_amount, currency)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>SGST</span>
                  <strong className="text-slate-900 font-mono">{formatCurrency(invoice.sgst_amount, currency)}</strong>
                </div>
              </>
            )}
            {taxType === 'igst' && (
              <div className="flex justify-between">
                <span>IGST</span>
                <strong className="text-slate-900 font-mono">{formatCurrency(invoice.igst_amount, currency)}</strong>
              </div>
            )}
            {(invoice.additional_charges_amount || 0) > 0 && (
              <div className="flex justify-between">
                <span>{invoice.additional_charges_label || 'Additional Charges'}</span>
                <strong className="text-slate-900 font-mono">{formatCurrency(invoice.additional_charges_amount, currency)}</strong>
              </div>
            )}
            <div className="border-y-2 border-slate-900 py-2.5 my-2 flex justify-between font-bold text-slate-900 text-sm">
              <span>Total ({currency})</span>
              <span className="font-mono text-base">{formatCurrency(invoice.grand_total, currency)}</span>
            </div>
            {(invoice.amount_paid || 0) > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-emerald-600 text-xs">
                  <span>Amount Paid</span>
                  <strong className="font-mono">-{formatCurrency(invoice.amount_paid, currency)}</strong>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 text-xs pt-1 border-t border-slate-200">
                  <span>Balance Due</span>
                  <strong className="font-mono text-sm">{formatCurrency(invoice.balance_due, currency)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Authorized Signatory */}
          <div className="text-center pt-2 w-48">
            {business?.signature_url ? (
              <img src={getFullFileUrl(business.signature_url)} alt="Signature" className="h-12 object-contain mx-auto mb-1" />
            ) : (
              <div className="h-12"></div>
            )}
            <div className="border-t border-slate-300 pt-1">
              <p className="text-[11px] font-semibold text-slate-800">For {business?.company_name || 'SecuredApp'}</p>
              <p className="text-[10px] text-slate-400">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Remarks */}
      {invoice.notes && (
        <div className="text-xs text-slate-600 bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-1">
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-emerald-700">
            Notes & Remarks
          </h4>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{invoice.notes}</p>
        </div>
      )}

      {/* Terms & Conditions */}
      {(invoice.terms_and_conditions || business?.terms_and_conditions) && (
        <div className="text-xs text-slate-500 pt-3 border-t border-slate-100">
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-emerald-700 mb-1.5">
            Terms & Conditions
          </h4>
          <ol className="list-decimal list-outside ml-4 space-y-1 text-slate-600">
            {(invoice.terms_and_conditions || business?.terms_and_conditions)
              .split('\n')
              .filter(line => line.trim())
              .map((line, idx) => (
                <li key={idx} className="pl-1 leading-relaxed">
                  {line.replace(/^\s*(?:\d+[\.\)\-]|[-*•])\s*/, '')}
                </li>
              ))}
          </ol>
        </div>
      )}

      {/* Footer Note */}
      <div className="border-t border-slate-100 pt-3 text-center text-xs text-slate-400">
        For any questions or clarification regarding this invoice, please contact <strong className="text-slate-600">{business?.email || 'support@securedapp.in'}</strong>{business?.phone ? ` or call ${business.phone}` : ''}.
      </div>
    </div>
  );
}
