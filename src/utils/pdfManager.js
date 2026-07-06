import { format } from 'date-fns';
import { formatCurrency, numberToWords } from '@/invoice/lib/invoiceUtils';
import html2pdf from 'html2pdf.js';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Helpers ──────────────────────────────────────────────────────────

const isDev = typeof window !== 'undefined' && 
  (window.location?.hostname === 'localhost' || 
   window.location?.hostname === '127.0.0.1' || 
   window.location?.hostname === '::1');

function logDebug(...args) {
  if (isDev) {
    console.log(...args);
  }
}

function logError(...args) {
  console.error(...args);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const isIOS = typeof navigator !== 'undefined' && typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

async function toBase64DataUrl(url) {
  if (!url || url.startsWith('data:')) return url;
  let targetUrl = url;
  if (url.startsWith('/uploads')) {
    const viteApiUrl = import.meta.env.VITE_API_URL;
    if (viteApiUrl) {
      try {
        const parsed = new URL(viteApiUrl);
        targetUrl = `${parsed.origin}${url}`;
      } catch (e) {
        // ignore
      }
    }
  }
  try {
    const res = await fetch(targetUrl);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

// ── Invoice HTML ──────────────────────────────────────────────────────

export function generateInvoiceHTML(invoice, business) {
  const items = invoice.items || [];
  const taxType = invoice.tax_type || 'gst';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${escapeHtml(invoice.invoice_number || 'Draft')}</title>
    </head>
    <body>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b; margin: 0; padding: 40px;
          line-height: 1.5; font-size: 14px; background: #ffffff;
        }
        @media print {
          @page { size: A4; margin: 0; }
          body { padding: 1.5cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr, .bottom-section, .bank-details-box, .summary-and-signature,
          .meta-grid, .invoice-header-row, .terms-conditions, .enquiry-footer, .refrens-footer {
            page-break-inside: avoid; break-inside: avoid;
          }
        }
        .invoice-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }
        .invoice-title {
          font-size: 32px;
          font-weight: 700;
          color: #06b6d4; /* cyan-500 */
          margin: 0 0 10px 0;
        }
        .invoice-meta-info p {
          margin: 4px 0;
          font-size: 13px;
          color: #64748b;
        }
        .invoice-meta-info span {
          display: inline-block;
          width: 100px;
          color: #64748b;
        }
        .invoice-meta-info strong {
          color: #0f172a;
        }
        .logo-container {
          text-align: right;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .meta-block {
          background-color: #ecfeff; /* cyan-50 */
          border: 1px solid #cffafe; /* cyan-100 */
          border-radius: 8px;
          padding: 16px;
        }
        .meta-block h3 {
          margin: 0 0 8px 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #0891b2; /* cyan-600 */
          font-weight: 600;
        }
        .meta-block p {
          margin: 2px 0;
          font-size: 13px;
          color: #334155;
        }
        .meta-block .client-name {
          font-weight: 700;
          font-size: 14px;
          color: #0f172a;
          margin-bottom: 6px;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        table.items-table th {
          background-color: #06b6d4; /* cyan-500 */
          color: #ffffff;
          font-weight: 600;
          text-align: left;
          padding: 10px 14px;
          font-size: 12px;
          text-transform: uppercase;
        }
        table.items-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          color: #475569;
          vertical-align: top;
        }
        table.items-table tr.total-row td {
          background-color: #f8fafc;
          border-top: 2px solid #e2e8f0;
          border-bottom: none;
          color: #0f172a;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .item-desc { font-size: 11px; color: #64748b; margin-top: 3px; }
        
        .bottom-section {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 30px;
          margin-top: 30px;
        }
        .bank-details-box {
          background-color: #ecfeff; /* cyan-50 */
          border: 1px solid #cffafe; /* cyan-100 */
          border-radius: 8px;
          padding: 16px;
          align-self: start;
        }
        .bank-details-box h3 {
          margin: 0 0 12px 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #0891b2; /* cyan-600 */
          font-weight: 600;
        }
        .bank-details-box table {
          width: 100%;
          border: none;
          margin: 0;
          border-collapse: collapse;
        }
        .bank-details-box td {
          border: none;
          padding: 4px 0;
          font-size: 13px;
          color: #334155;
        }
        .bank-details-box td strong {
          color: #475569;
        }
        .summary-and-signature {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .invoice-summary-box {
          width: 100%;
          max-width: 320px;
          margin-bottom: 20px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
          color: #475569;
        }
        .summary-row strong {
          color: #0f172a;
        }
        .grand-total-row {
          border-top: 2px solid #0f172a;
          border-bottom: 2px solid #0f172a;
          padding: 10px 0;
          margin-top: 8px;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        .grand-total-row strong {
          font-size: 16px;
        }
        .signature-container {
          text-align: center;
          margin-top: 20px;
          width: 200px;
        }
        .signature-container img {
          max-height: 50px;
          object-fit: contain;
          margin-bottom: 6px;
        }
        .signature-line {
          border-top: 1px solid #cbd5e1;
          padding-top: 4px;
          font-size: 11px;
          color: #64748b;
        }
        .terms-conditions {
          margin-top: 30px;
          font-size: 12px;
          color: #64748b;
        }
        .terms-conditions h4 {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #0891b2; /* cyan-600 */
          font-weight: 600;
        }
        .terms-conditions ol {
          margin: 0;
          padding-left: 18px;
          line-height: 1.6;
        }
        .enquiry-footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          text-align: center;
          font-size: 12px;
          color: #475569;
        }
        .refrens-footer {
          margin-top: 50px;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
        }
      </style>

      <div class="invoice-header-row">
        <div class="invoice-title-section">
          <h1 class="invoice-title">Invoice</h1>
          <div class="invoice-meta-info">
            <p><span>Invoice No #</span> <strong>${escapeHtml(invoice.invoice_number)}</strong></p>
            <p><span>Invoice Date</span> <strong>${invoice.invoice_date ? escapeHtml(format(new Date(invoice.invoice_date), 'MMM dd, yyyy')) : '-'}</strong></p>
            ${invoice.due_date ? `<p><span>Due Date</span> <strong>${escapeHtml(format(new Date(invoice.due_date), 'MMM dd, yyyy'))}</strong></p>` : ''}
          </div>
        </div>
        <div class="logo-container">
          ${business?.logo_url ? `<img src="${escapeHtml(business.logo_url)}" style="max-height: 60px; max-width: 200px; object-fit: contain;" />` : ''}
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-block">
          <h3>Billed By</h3>
          <p class="client-name">${escapeHtml(business?.company_name || 'Your Business')}</p>
          ${business?.address_line1 ? `<p>${escapeHtml(business.address_line1)}${business.city ? `, ${escapeHtml(business.city)}` : ''}${business.state ? `, ${escapeHtml(business.state)}` : ''} ${escapeHtml(business.pincode || '')}</p>` : ''}
          ${business?.email ? `<p>Email: ${escapeHtml(business.email)}</p>` : ''}
          ${business?.phone ? `<p>Phone: ${escapeHtml(business.phone)}</p>` : ''}
          ${business?.gst_number ? `<p>GSTIN: ${escapeHtml(business.gst_number)}</p>` : ''}
        </div>
        <div class="meta-block">
          <h3>Billed To</h3>
          <p class="client-name">${escapeHtml(invoice.customer_name || '-')}</p>
          ${invoice.customer_address ? `<p>${escapeHtml(invoice.customer_address)}</p>` : ''}
          ${invoice.customer_email ? `<p>${escapeHtml(invoice.customer_email)}</p>` : ''}
          ${invoice.customer_gst ? `<p>GSTIN: ${escapeHtml(invoice.customer_gst)}</p>` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 30%;">Item</th>
            ${taxType !== 'none' ? '<th class="text-center" style="width: 10%;">GST Rate</th>' : ''}
            <th class="text-center" style="width: 10%;">Quantity</th>
            <th class="text-right" style="width: 12%;">Rate</th>
            <th class="text-right" style="width: 12%;">Amount</th>
            ${taxType !== 'none' ? (taxType === 'gst' ? '<th class="text-right" style="width: 10%;">CGST</th><th class="text-right" style="width: 10%;">SGST</th>' : '<th class="text-right" style="width: 15%;">IGST</th>') : ''}
            <th class="text-right" style="width: 12%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, i) => {
            const qty = item.quantity || 0;
            const rate = item.rate || 0;
            const baseAmount = qty * rate;
            const disc = baseAmount * ((item.discount_percent || 0) / 100);
            const taxable = baseAmount - disc;
            const taxAmt = taxable * ((item.tax_percent || 0) / 100);
            const itemTotal = taxable + taxAmt;
            return `
              <tr>
                <td>${i + 1}.</td>
                <td>
                  <strong style="color: #1e293b;">${escapeHtml(item.name || '-')}</strong>
                  ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ''}
                </td>
                ${taxType !== 'none' ? `<td class="text-center">${item.tax_percent || 0}%</td>` : ''}
                <td class="text-center">${qty}</td>
                <td class="text-right">${escapeHtml(formatCurrency(rate, invoice.currency))}</td>
                <td class="text-right">${escapeHtml(formatCurrency(baseAmount, invoice.currency))}</td>
                ${taxType !== 'none' ? (taxType === 'gst' ? `
                  <td class="text-right">${escapeHtml(formatCurrency(taxAmt / 2, invoice.currency))}</td>
                  <td class="text-right">${escapeHtml(formatCurrency(taxAmt / 2, invoice.currency))}</td>
                ` : `
                  <td class="text-right">${escapeHtml(formatCurrency(taxAmt, invoice.currency))}</td>
                `) : ''}
                <td class="text-right" style="font-weight: 600; color: #1e293b;">${escapeHtml(formatCurrency(itemTotal, invoice.currency))}</td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="2" style="font-weight: 700;">Total</td>
            ${taxType !== 'none' ? '<td></td>' : ''}
            <td class="text-center" style="font-weight: 700;">${items.reduce((sum, item) => sum + (item.quantity || 0), 0)}</td>
            <td></td>
            <td class="text-right" style="font-weight: 700;">${escapeHtml(formatCurrency(items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0), invoice.currency))}</td>
            ${taxType === 'gst' ? '<td></td><td></td>' : (taxType === 'igst' ? '<td></td>' : '')}
            <td class="text-right" style="font-weight: 700; color: #0f172a;">${escapeHtml(formatCurrency(invoice.grand_total, invoice.currency))}</td>
          </tr>
        </tbody>
      </table>

      <div class="bottom-section">
        <div class="bank-details-box">
          <h3>Bank Details</h3>
          <table>
            <tr><td><strong>Account Name</strong></td><td>${escapeHtml(invoice.bank_details?.beneficiary_name || business?.beneficiary_name || '-')}</td></tr>
            <tr><td><strong>Account Number</strong></td><td>${escapeHtml(invoice.bank_details?.account_number || business?.account_number || '-')}</td></tr>
            <tr><td><strong>IFSC</strong></td><td>${escapeHtml(invoice.bank_details?.ifsc_code || business?.ifsc_code || '-')}</td></tr>
            ${(invoice.bank_details?.swift_code || business?.swift_code) ? `<tr><td><strong>SWIFT Code</strong></td><td>${escapeHtml(invoice.bank_details?.swift_code || business?.swift_code)}</td></tr>` : ''}
            <tr><td><strong>Bank</strong></td><td>${escapeHtml(invoice.bank_details?.bank_name || business?.bank_name || '-')}</td></tr>
            ${(invoice.bank_details?.upi_id || business?.upi_id) ? `<tr><td><strong>UPI</strong></td><td>${escapeHtml(invoice.bank_details?.upi_id || business?.upi_id)}</td></tr>` : ''}
          </table>
        </div>
        
        <div class="summary-and-signature">
          <div class="invoice-summary-box">
            <div class="summary-row">
              <span>Amount</span>
              <strong>${escapeHtml(formatCurrency(invoice.subtotal, invoice.currency))}</strong>
            </div>
            ${(invoice.total_discount || 0) > 0 ? `
              <div class="summary-row" style="color: #16a34a;">
                <span>Discount</span>
                <strong>-${escapeHtml(formatCurrency(invoice.total_discount, invoice.currency))}</strong>
              </div>
            ` : ''}
            ${taxType === 'gst' ? `
              <div class="summary-row">
                <span>CGST</span>
                <strong>${escapeHtml(formatCurrency(invoice.cgst_amount, invoice.currency))}</strong>
              </div>
              <div class="summary-row">
                <span>SGST</span>
                <strong>${escapeHtml(formatCurrency(invoice.sgst_amount, invoice.currency))}</strong>
              </div>
            ` : ''}
            ${taxType === 'igst' ? `
              <div class="summary-row">
                <span>IGST</span>
                <strong>${escapeHtml(formatCurrency(invoice.igst_amount, invoice.currency))}</strong>
              </div>
            ` : ''}
            ${(invoice.additional_charges_amount || 0) > 0 ? `
              <div class="summary-row">
                <span>${escapeHtml(invoice.additional_charges_label || 'Additional Charges')}</span>
                <strong>${escapeHtml(formatCurrency(invoice.additional_charges_amount, invoice.currency))}</strong>
              </div>
            ` : ''}
            <div class="summary-row grand-total-row">
              <span>Total (INR)</span>
              <strong>${escapeHtml(formatCurrency(invoice.grand_total, invoice.currency))}</strong>
            </div>
            ${(invoice.amount_paid || 0) > 0 ? `
              <div class="summary-row" style="color: #16a34a; font-size: 12px; margin-top: 4px;">
                <span>Amount Paid</span>
                <strong>-${escapeHtml(formatCurrency(invoice.amount_paid, invoice.currency))}</strong>
              </div>
              <div class="summary-row" style="font-weight: 600; font-size: 13px;">
                <span>Balance Due</span>
                <strong>${escapeHtml(formatCurrency(invoice.balance_due, invoice.currency))}</strong>
              </div>
            ` : ''}
          </div>
          
          <div class="signature-container">
            ${business?.signature_url ? `<img src="${escapeHtml(business.signature_url)}" />` : '<div style="height: 50px;"></div>'}
            <div class="signature-line">Authorized Signatory</div>
          </div>
        </div>
      </div>

      ${invoice.terms_and_conditions ? `
        <div class="terms-conditions">
          <h4>Terms and Conditions</h4>
          <ol>
            ${invoice.terms_and_conditions.split('\n').filter(line => line.trim()).map(line => `<li>${escapeHtml(line)}</li>`).join('')}
          </ol>
        </div>
      ` : ''}

      <div class="enquiry-footer">
        For any enquiry, reach out via email at <strong>${escapeHtml(business?.email || '-')}</strong>, call on <strong>${escapeHtml(business?.phone || '-')}</strong>
      </div>

      <div class="refrens-footer">
        Generated by SecuredApp CRM
      </div>
    </body>
    </html>
  `;
}

// ── Payslip HTML ──────────────────────────────────────────────────────

export function generatePayslipHTML(data, user, business) {
  const basic = parseFloat(data.basicPay || 0);
  const hra = parseFloat(data.hra || 0);
  const conveyance = parseFloat(data.conveyance || 0);
  const specialAllowance = parseFloat(data.specialAllowance || 0);
  const allowances = parseFloat(data.allowances || 0);

  const breakdownSum = hra + conveyance + specialAllowance;
  const finalAllowances = allowances > 0 ? allowances : breakdownSum;
  const totalEarnings = basic + finalAllowances;

  const pf = parseFloat(data.providentFund || 0);
  const pt = parseFloat(data.professionalTax || 0);
  const tds = parseFloat(data.tds || 0);
  const totalAmtDeductions = pf + pt + tds;
  const netPay = totalEarnings - totalAmtDeductions;
  const monthName = MONTHS[(parseInt(data.month) || 1) - 1];

  // Build list of earnings rows
  const earningsRows = [
    { label: 'Basic Salary', value: basic }
  ];
  if (hra > 0) earningsRows.push({ label: 'House Rent Allowance (HRA)', value: hra });
  if (conveyance > 0) earningsRows.push({ label: 'Conveyance Allowance', value: conveyance });
  if (specialAllowance > 0) earningsRows.push({ label: 'Special Allowance', value: specialAllowance });

  // If there's an allowance overflow
  if (allowances > 0 && allowances !== breakdownSum) {
    const diff = allowances - breakdownSum;
    if (diff > 0) {
      earningsRows.push({ label: 'Other Allowances', value: diff });
    }
  }

  // Build list of deductions rows
  const deductionsRows = [];
  if (pf > 0) deductionsRows.push({ label: 'Provident Fund (PF)', value: pf });
  if (pt > 0) deductionsRows.push({ label: 'Professional Tax (PT)', value: pt });
  if (tds > 0) deductionsRows.push({ label: 'Income Tax (TDS)', value: tds });

  // Fallback if no deductions to show at least one row
  if (deductionsRows.length === 0) {
    deductionsRows.push({ label: 'No Deductions', value: 0 });
  }

  // Balance rows to have exact equal height
  const maxRows = Math.max(earningsRows.length, deductionsRows.length);
  while (earningsRows.length < maxRows) {
    earningsRows.push({ label: '&nbsp;', value: null });
  }
  while (deductionsRows.length < maxRows) {
    deductionsRows.push({ label: '&nbsp;', value: null });
  }

  const earningsHtml = earningsRows.map(row => `
    <tr>
      <td>${row.label === '&nbsp;' ? '&nbsp;' : escapeHtml(row.label)}</td>
      <td class="text-right">${row.value !== null ? `₹${row.value.toFixed(2)}` : ''}</td>
    </tr>
  `).join('');

  const deductionsHtml = deductionsRows.map(row => `
    <tr>
      <td>${row.label === '&nbsp;' ? '&nbsp;' : escapeHtml(row.label)}</td>
      <td class="text-right">${row.value !== null ? `₹${row.value.toFixed(2)}` : ''}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payslip - ${escapeHtml(user?.name || 'Employee')} - ${escapeHtml(monthName)} ${escapeHtml(data.year)}</title>
    </head>
    <body>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b; margin: 0; padding: 40px;
          line-height: 1.5; font-size: 14px; background: #ffffff;
        }
        @media print {
          @page { size: A4; margin: 0; }
          body { padding: 2cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr, .salary-table, .details-grid, .net-pay-strip, .remarks,
          .header, .print-footer {
            page-break-inside: avoid; break-inside: avoid;
          }
        }
        .header {
          border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px;
          display: flex; justify-content: space-between; align-items: flex-end;
        }
        .header h1 { margin: 0 0 4px 0; font-size: 24px; color: #065f46; font-weight: 700; }
        .header p { margin: 2px 0; font-size: 13px; color: #64748b; }
        .header-right { text-align: right; }
        .header-right h2 { margin: 0; font-size: 24px; color: #1e293b; letter-spacing: 0.05em; }
        .header-right p { margin: 4px 0 0 0; font-weight: 600; color: #059669; }
        .details-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 40px; margin-bottom: 30px; }
        .details-block h3 { margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
        .details-table { width: 100%; border-collapse: collapse; border: none; table-layout: fixed; }
        .details-table td { padding: 4px 0; font-size: 13px; border: none; vertical-align: top; }
        .detail-label { width: 115px; color: #64748b; }
        .detail-value { font-weight: 500; color: #334155; word-wrap: break-word; word-break: keep-all; }
        .salary-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .salary-table th { padding: 10px 16px; font-size: 12px; text-transform: uppercase; font-weight: 600; }
        .earnings-header { background-color: #ecfdf5; color: #065f46; border-bottom: 1px solid #a7f3d0; text-align: left; }
        .deductions-header { background-color: #fef2f2; color: #991b1b; border-bottom: 1px solid #fca5a5; text-align: left; }
        .salary-table td { width: 50%; padding: 0; vertical-align: top; }
        .inner-table { width: 100%; border-collapse: collapse; }
        .inner-table td { width: auto; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .inner-table tr:last-child td { border-bottom: none; }
        .total-strip { background-color: #f8fafc; font-weight: 600; border-top: 1px solid #e2e8f0; }
        .total-strip td { padding: 12px 16px !important; }
        .net-pay-strip { background-color: #059669; color: #ffffff; padding: 20px 24px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .net-pay-strip p { margin: 0; }
        .net-pay-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9; }
        .net-pay-value { font-size: 28px; font-weight: 700; }
        .footnote { font-size: 10px; color: rgba(255, 255, 255, 0.8); font-style: italic; text-align: right; max-width: 250px; line-height: 1.4; margin: 0; }
        .remarks { font-size: 13px; color: #64748b; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 12px; }
        .print-footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
      </style>
      <div class="header">
        <div>
          ${business?.logo_url ? `<img src="${escapeHtml(business.logo_url)}" style="height: 40px; margin-bottom: 8px; object-fit: contain;" />` : ''}
          <h1 style="margin: 0 0 4px 0; font-size: 24px; color: #065f46; font-weight: 700;">${escapeHtml(business?.company_name || 'Your Company')}</h1>
          ${business?.address_line1 ? `<p>${escapeHtml(business.address_line1)}${business.city ? `, ${escapeHtml(business.city)}` : ''}</p>` : ''}
        </div>
        <div class="header-right">
          <h2>PAYSLIP</h2>
          <p>For ${escapeHtml(monthName)} ${escapeHtml(data.year)}</p>
        </div>
      </div>

      <div class="details-grid">
        <div class="details-block">
          <h3>Employee Summary</h3>
          <table class="details-table">
            <tr><td class="detail-label">Employee Name:</td><td class="detail-value">${escapeHtml(user?.name || '-')}</td></tr>
            <tr><td class="detail-label">Employee ID:</td><td class="detail-value">${escapeHtml(data.employeeId || user?.employeeId || '-')}</td></tr>
            <tr><td class="detail-label">Designation:</td><td class="detail-value">${escapeHtml(data.designation || user?.designation || '-')}</td></tr>
            <tr><td class="detail-label">Department:</td><td class="detail-value">${escapeHtml(data.department || user?.department || '-')}</td></tr>
          </table>
        </div>
        <div class="details-block">
          <h3>Bank Details</h3>
          <table class="details-table">
            <tr><td class="detail-label">Bank Name:</td><td class="detail-value">${escapeHtml(data.bankName || user?.bankName || '-')}</td></tr>
            <tr><td class="detail-label">Account No:</td><td class="detail-value">${escapeHtml(data.accountNumber || user?.accountNumber || '-')}</td></tr>
            <tr><td class="detail-label">IFSC Code:</td><td class="detail-value">${escapeHtml(data.ifscCode || user?.ifscCode || '-')}</td></tr>
            <tr><td class="detail-label">PAN Number:</td><td class="detail-value">${escapeHtml(data.panNumber || user?.panNumber || '-')}</td></tr>
          </table>
        </div>
      </div>

      <table class="salary-table">
        <thead><tr><th class="earnings-header">Earnings</th><th class="deductions-header">Deductions</th></tr></thead>
        <tbody>
          <tr>
            <td style="border-right: 1px solid #e2e8f0;">
              <table class="inner-table">
                <tbody>
                  ${earningsHtml}
                  <tr class="total-strip"><td>Total Earnings</td><td class="text-right">₹${totalEarnings.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </td>
            <td>
              <table class="inner-table">
                <tbody>
                  ${deductionsHtml}
                  <tr class="total-strip"><td>Total Deductions</td><td class="text-right">₹${totalAmtDeductions.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="net-pay-strip">
        <div>
          <p class="net-pay-label">Net Salary Payable</p>
          <p class="net-pay-value">₹${netPay.toFixed(2)}</p>
        </div>
        <div style="text-align: right; display: flex; align-items: flex-end;">
          <p class="footnote">This is a computer generated document and does not require a signature.</p>
        </div>
      </div>

      ${data.remarks ? `<div class="remarks"><strong>Remarks:</strong> ${escapeHtml(data.remarks)}</div>` : ''}

      <div class="print-footer">
        ${escapeHtml(business?.company_name || 'Company')} — Generated by SecuredApp CRM
      </div>
    </body>
    </html>
  `;
}

// ── Print via Hidden Iframe ───────────────────────────────────────────

function printHTML(htmlContent) {
  logDebug('[Checkpoint 3/4] Creating hidden iframe for print...');
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);
  logDebug('[Checkpoint 4] Iframe attached to DOM:', document.body.contains(iframe));

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();
  logDebug('[Checkpoint 2] HTML written to iframe, length:', htmlContent.length, 'chars');

  const waitForResources = async () => {
    logDebug('[Checkpoint 5] Waiting for iframe resources...');
    const resourcePromise = (async () => {
      await doc.fonts.ready;
      logDebug('[Checkpoint 5] iframe fonts.ready resolved');
      const imgs = doc.getElementsByTagName('img');
      if (imgs.length > 0) {
        logDebug('[Checkpoint 5] Waiting for image(s) in iframe...');
        await Promise.all(Array.from(imgs).map(img =>
          new Promise(resolve => {
            if (img.complete) return resolve();
            img.onload = resolve;
            img.onerror = resolve;
          })
        ));
        logDebug('[Checkpoint 5] All iframe images loaded');
      }
    })();

    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
    await Promise.race([resourcePromise, timeoutPromise]);
  };

  waitForResources().then(() => {
    try {
      logDebug('[Checkpoint 6] Triggering iframe.contentWindow.print()');
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      logError('Print failed:', err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          logDebug('[Checkpoint 7] Print iframe cleaned up');
        }
      }, 1000);
    }
  }).catch((err) => {
    logError('Error waiting for print resources:', err);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  });
}

export function printInvoicePDF(invoice, business) {
  logDebug('[Checkpoint 1] printInvoicePDF started');
  const html = generateInvoiceHTML(invoice, business);
  logDebug('[Checkpoint 2] generateInvoiceHTML done');
  printHTML(html);
}

export function printPayslipPDF(data, user, business) {
  logDebug('[Checkpoint 1] printPayslipPDF started');
  const html = generatePayslipHTML(data, user, business);
  logDebug('[Checkpoint 2] generatePayslipHTML done');
  printHTML(html);
}

// ── Download via html2pdf ─────────────────────────────────────────────

function downloadPDFFromHTML(htmlContent, filename) {
  logDebug('[Checkpoint 2] downloadPDFFromHTML started');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = 'none';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  logDebug('[Checkpoint 4] Iframe attached to DOM:', document.body.contains(iframe));

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  const startDownload = () => {
    logDebug('[Checkpoint 5] All resources ready — starting download');

    const opt = {
      margin: 0.5,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 4, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    logDebug('[Checkpoint 6] Starting html2pdf');

    try {
      const pdfBuilder = typeof html2pdf === 'function' ? html2pdf : html2pdf.default;

      if (isIOS) {
        pdfBuilder().set(opt).from(doc.documentElement).output('bloburl').then((url) => {
          logDebug('[Checkpoint 7] PDF generated successfully for iOS — cleaning up iframe');
          window.open(url, '_blank');
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }).catch((err) => {
          logError('[Checkpoint 6/7] html2pdf error (iOS):', err);
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        });
      } else {
        pdfBuilder().set(opt).from(doc.documentElement).save().then(() => {
          logDebug('[Checkpoint 7] PDF saved successfully — cleaning up iframe');
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }).catch((err) => {
          logError('[Checkpoint 6/7] html2pdf error:', err);
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        });
      }
    } catch (err) {
      logError('[Checkpoint 6] Synchronous error launching html2pdf:', err);
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }
  };

  const waitForResources = async () => {
    try {
      logDebug('[Checkpoint 5] Waiting for iframe resources...');
      const resourcePromise = (async () => {
        await doc.fonts.ready;
        const imgs = doc.getElementsByTagName('img');
        if (imgs.length > 0) {
          logDebug('[Checkpoint 5] Waiting for image(s) in iframe...');
          await Promise.all(Array.from(imgs).map(img =>
            new Promise(resolve => {
              if (img.complete) return resolve();
              img.onload = resolve;
              img.onerror = resolve;
            })
          ));
        }
      })();

      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
      await Promise.race([resourcePromise, timeoutPromise]);
      startDownload();
    } catch (err) {
      logError('Error waiting for download resources:', err);
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }
  };

  waitForResources();
}

export async function downloadInvoicePDF(invoice, business) {
  logDebug('[Checkpoint 1] downloadInvoicePDF started');
  const businessCopy = { ...business };
  if (businessCopy) {
    if (businessCopy.logo_url) businessCopy.logo_url = await toBase64DataUrl(businessCopy.logo_url);
    if (businessCopy.signature_url) businessCopy.signature_url = await toBase64DataUrl(businessCopy.signature_url);
  }
  const html = generateInvoiceHTML(invoice, businessCopy);
  downloadPDFFromHTML(html, `Invoice_${invoice.invoice_number || 'Draft'}.pdf`);
}

export async function downloadPayslipPDF(data, user, business) {
  logDebug('[Checkpoint 1] downloadPayslipPDF started');
  const businessCopy = { ...business };
  if (businessCopy) {
    if (businessCopy.logo_url) businessCopy.logo_url = await toBase64DataUrl(businessCopy.logo_url);
    if (businessCopy.signature_url) businessCopy.signature_url = await toBase64DataUrl(businessCopy.signature_url);
  }
  const monthName = MONTHS[(parseInt(data.month) || 1) - 1];
  const userName = user?.name?.replace(/\s+/g, '_') || 'Employee';
  const html = generatePayslipHTML(data, user, businessCopy);
  downloadPDFFromHTML(html, `Payslip_${userName}_${monthName}_${data.year}.pdf`);
}
