import React from 'react';
import { formatCurrency, numberToWords, getFullFileUrl, format } from '@/invoice/lib/invoiceUtils';
import { normalizeInvoice } from '@/invoice/lib/normalizeInvoice';

export default function InvoicePDFContent({ invoice: rawInvoice, business: rawBusiness, className = '' }) {
  const { invoice, business } = normalizeInvoice(rawInvoice, rawBusiness);
  if (!invoice) return null;

  const items = invoice.items || [];
  const taxType = invoice.tax_type || 'gst';
  const currency = invoice.currency || 'INR';
  const hasTax = taxType !== 'none';
  const documentTitle = !hasTax ? 'INVOICE' : 'TAX INVOICE';

  // Bank details: per-invoice override -> business fallback
  const bank = {
    beneficiaryName: invoice.bank_details?.beneficiary_name || business?.beneficiary_name || business?.company_name || '',
    accountNumber: invoice.bank_details?.account_number || business?.account_number || '',
    bankName: invoice.bank_details?.bank_name || business?.bank_name || '',
    branchName: invoice.bank_details?.branch_name || business?.branch_name || '',
    ifscCode: invoice.bank_details?.ifsc_code || business?.ifsc_code || '',
    swiftCode: invoice.bank_details?.swift_code || business?.swift_code || '',
    upiId: invoice.bank_details?.upi_id || business?.upi_id || '',
  };
  const hasBank = Boolean(bank.accountNumber || bank.bankName || bank.upiId);

  // Totals calculations
  const totalTaxable = Math.max(0, (invoice.subtotal || 0) - (invoice.total_discount || 0));
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  return (
    <div className={`bg-white text-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 shadow-md p-5 sm:p-7 space-y-5 max-w-[210mm] w-full mx-auto print:shadow-none print:border-0 print:rounded-none print:p-0 print:m-0 print:max-w-none font-sans ${className}`}>
      {/* ═══ Header Row ═══ */}
      <div className="flex justify-between items-start border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mb-1">
            {documentTitle}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5 mb-1.5">
            {invoice.invoice_number || 'INV-DRAFT'}
          </h1>
          <div className="text-xs text-slate-500 space-y-0.5">
            <p>
              <span className="inline-block w-20 text-slate-400">Invoice Date:</span>
              <strong className="text-slate-800 font-semibold">{invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd MMM yyyy') : '-'}</strong>
            </p>
            {invoice.due_date && (
              <p>
                <span className="inline-block w-20 text-slate-400">Due Date:</span>
                <strong className="text-slate-800 font-semibold">{format(new Date(invoice.due_date), 'dd MMM yyyy')}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          {business?.logo_url ? (
            <img src={getFullFileUrl(business.logo_url)} alt="Business Logo" className="max-h-16 max-w-[200px] object-contain mb-1.5" />
          ) : (
            <h2 className="text-xl font-bold text-slate-900">{business?.company_name || 'Your Company'}</h2>
          )}
          {business?.company_name && business.logo_url && (
            <p className="text-xs font-bold text-slate-800">{business.company_name}</p>
          )}
          {business?.email && <p className="text-xs text-slate-500">{business.email}</p>}
          {business?.phone && <p className="text-xs text-slate-500">{business.phone}</p>}
        </div>
      </div>

      {/* ═══ Billed By & Billed To Blocks ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Billed By */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs text-slate-600">
          <h3 className="text-[11px] uppercase font-bold text-emerald-700 tracking-wider mb-1">
            Billed By (Supplier)
          </h3>
          <p className="font-bold text-sm text-slate-900 leading-tight">
            {business?.company_name || 'Your Business Name'}
          </p>
          {business?.address && (
            <p className="text-slate-600 leading-relaxed">{business.address}</p>
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

        {/* Billed To */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs text-slate-600">
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
          <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1">
            {invoice.customer_gst && (
              <p className="font-mono">
                GSTIN: <strong className="text-slate-900">{invoice.customer_gst}</strong>
              </p>
            )}
            {invoice.customer_pan && (
              <p className="font-mono">
                PAN: <strong className="text-slate-900">{invoice.customer_pan}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Items Table (10-Column Classic Emerald Green Layout) ═══ */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto print:overflow-visible">
        <table className="min-w-[680px] w-full text-xs border-collapse table-auto print:min-w-0">
          <thead>
            <tr className="bg-emerald-600 text-white text-[11px] uppercase font-semibold whitespace-nowrap">
              <th className="text-left px-3 py-3 w-8">#</th>
              <th className="text-left px-3 py-3">Item Description</th>
              <th className="text-left px-2 py-3 w-20">HSN/SAC</th>
              <th className="text-center px-2 py-3 w-14">Qty</th>
              <th className="text-right px-3 py-3 w-20">Rate</th>
              <th className="text-right px-2 py-3 w-16">Disc</th>
              <th className="text-right px-3 py-3 w-20">Taxable</th>
              {taxType === 'gst' && (
                <>
                  <th className="text-right px-2 py-3 w-16">CGST</th>
                  <th className="text-right px-2 py-3 w-16">SGST</th>
                </>
              )}
              {taxType === 'igst' && (
                <th className="text-right px-2 py-3 w-20">IGST</th>
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
                  {taxType === 'gst' && (
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
                  )}
                  {taxType === 'igst' && (
                    <td className="px-2 py-3 text-right whitespace-nowrap font-mono text-slate-600">
                      <div>{formatCurrency(taxAmt, currency)}</div>
                      <div className="text-[10px] text-slate-400">({taxRate}%)</div>
                    </td>
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
                {(invoice.total_discount || 0) > 0 ? '-' + formatCurrency(invoice.total_discount, currency) : '-'}
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap font-mono">
                {formatCurrency(invoice.subtotal - (invoice.total_discount || 0), currency)}
              </td>
              {taxType === 'gst' && (
                <>
                  <td className="px-2 py-3 text-right font-mono text-slate-700">{formatCurrency(invoice.cgst_amount, currency)}</td>
                  <td className="px-2 py-3 text-right font-mono text-slate-700">{formatCurrency(invoice.sgst_amount, currency)}</td>
                </>
              )}
              {taxType === 'igst' && (
                <td className="px-2 py-3 text-right font-mono text-slate-700">{formatCurrency(invoice.igst_amount, currency)}</td>
              )}
              <td className="px-3 py-3 text-right text-slate-950 whitespace-nowrap font-mono text-sm">
                {formatCurrency(invoice.grand_total, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══ Amount in Words (Mint Emerald Card) ═══ */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          Total Amount in Words
        </span>
        <strong className="text-emerald-950 font-bold text-sm text-right">
          {numberToWords(invoice.grand_total, currency)}
        </strong>
      </div>

      {/* ═══ Bottom Section: Bank Details + Financial Summary Card ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
        {/* Bank & Payment Details (Left) */}
        <div>
          {hasBank && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <h3 className="text-[11px] uppercase font-bold text-slate-900 tracking-wider mb-2">
                Payment & Bank Information
              </h3>
              <table className="w-full border-none">
                <tbody className="divide-y divide-slate-100">
                  {bank.beneficiaryName && (
                    <tr className="align-top">
                      <td className="w-28 text-slate-500 py-1">Account Name:</td>
                      <td className="text-slate-800 font-medium py-1">{bank.beneficiaryName}</td>
                    </tr>
                  )}
                  {bank.accountNumber && (
                    <tr className="align-top">
                      <td className="w-28 text-slate-500 py-1">Account No:</td>
                      <td className="text-slate-900 font-mono font-bold py-1">{bank.accountNumber}</td>
                    </tr>
                  )}
                  {bank.bankName && (
                    <tr className="align-top">
                      <td className="w-28 text-slate-500 py-1">Bank Name:</td>
                      <td className="text-slate-800 font-medium py-1">
                        {bank.bankName}{bank.branchName ? ', ' + bank.branchName : ''}
                      </td>
                    </tr>
                  )}
                  {bank.ifscCode && (
                    <tr className="align-top">
                      <td className="w-28 text-slate-500 py-1">IFSC Code:</td>
                      <td className="text-slate-900 font-mono font-bold py-1">{bank.ifscCode}</td>
                    </tr>
                  )}
                  {bank.swiftCode && (
                    <tr className="align-top">
                      <td className="w-28 text-slate-500 py-1">SWIFT Code:</td>
                      <td className="text-slate-800 font-mono py-1">{bank.swiftCode}</td>
                    </tr>
                  )}
                  {bank.upiId && (
                    <tr className="align-top">
                      <td className="w-28 text-slate-500 py-1">UPI ID:</td>
                      <td className="text-emerald-700 font-mono font-bold py-1">{bank.upiId}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Financial Summary & Signatory (Right) */}
        <div className="flex flex-col items-end space-y-4">
          <div className="w-full max-w-[340px] text-xs space-y-2 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between">
              <span>Taxable Subtotal:</span>
              <strong className="text-slate-900 font-mono">{formatCurrency(totalTaxable, currency)}</strong>
            </div>
            {(invoice.total_discount || 0) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Total Discount:</span>
                <strong className="font-mono">-{formatCurrency(invoice.total_discount, currency)}</strong>
              </div>
            )}
            {taxType === 'gst' && (invoice.cgst_amount > 0 || invoice.total_tax > 0) && (
              <>
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <strong className="text-slate-900 font-mono">{formatCurrency(invoice.cgst_amount, currency)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <strong className="text-slate-900 font-mono">{formatCurrency(invoice.sgst_amount, currency)}</strong>
                </div>
              </>
            )}
            {taxType === 'igst' && (invoice.igst_amount > 0 || invoice.total_tax > 0) && (
              <div className="flex justify-between">
                <span>IGST:</span>
                <strong className="text-slate-900 font-mono">{formatCurrency(invoice.igst_amount, currency)}</strong>
              </div>
            )}
            {(invoice.additional_charges_amount || 0) > 0 && (
              <div className="flex justify-between">
                <span>{invoice.additional_charges_label || 'Additional Charges'}:</span>
                <strong className="text-slate-900 font-mono">{formatCurrency(invoice.additional_charges_amount, currency)}</strong>
              </div>
            )}
            <div className="border-t-2 border-slate-300 pt-2.5 mt-2 flex justify-between items-center font-bold text-slate-900">
              <span className="text-sm">Grand Total:</span>
              <span className="font-mono text-lg text-emerald-600">{formatCurrency(invoice.grand_total, currency)}</span>
            </div>
            {(invoice.amount_paid || 0) > 0 && (
              <div className="space-y-1 pt-1.5 border-t border-slate-200">
                <div className="flex justify-between text-emerald-700 text-xs">
                  <span>Amount Paid:</span>
                  <strong className="font-mono">-{formatCurrency(invoice.amount_paid, currency)}</strong>
                </div>
                <div className="flex justify-between font-bold text-red-700 text-xs pt-1">
                  <span>Balance Due:</span>
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
              <div className="h-10"></div>
            )}
            <div className="border-t border-slate-400 pt-1">
              <p className="text-[11px] font-bold text-slate-900">For {business?.company_name || 'SecuredApp'}</p>
              <p className="text-[10px] text-slate-500">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Notes & Remarks ═══ */}
      {invoice.notes && (
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-900">
            Notes & Remarks
          </h4>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{invoice.notes}</p>
        </div>
      )}

      {/* ═══ Terms & Conditions ═══ */}
      {(invoice.terms_and_conditions || business?.terms_and_conditions) && (
        <div className="text-xs text-slate-500 pt-3 border-t border-slate-200">
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-900 mb-1.5">
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

      {/* ═══ Footer Note ═══ */}
      <div className="border-t border-slate-100 pt-3 text-center text-xs text-slate-400">
        For any questions or clarification regarding this invoice, please contact <strong className="text-slate-600">{business?.email || 'support@securedapp.in'}</strong>{business?.phone ? ' or call ' + business.phone : ''}.
      </div>
    </div>
  );
}
