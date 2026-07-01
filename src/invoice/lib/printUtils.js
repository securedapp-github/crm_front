import { format } from 'date-fns';
import { formatCurrency, numberToWords, getStatusLabel } from './invoiceUtils';
import { getTheme } from './invoiceThemes';

export function printInvoicePDF(invoice, business) {
  const items = invoice.items || [];
  const taxType = invoice.tax_type || 'gst';
  const theme = getTheme('securedapp-green');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoice_number || 'Draft'}</title>
      <script>window.onload = function() { window.print(); }</script>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 40px;
          line-height: 1.5;
          font-size: 14px;
          background: #ffffff;
        }
        @media print {
          body {
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        .header {
          background-color: #059669;
          color: #ffffff;
          padding: 24px 32px;
          border-radius: 12px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header h1 {
          margin: 0 0 4px 0;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.025em;
        }
        .header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .header p {
          margin: 2px 0;
          font-size: 13px;
          opacity: 0.9;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          padding: 0 8px;
        }
        .meta-block h3 {
          margin: 0 0 8px 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          font-weight: 600;
        }
        .meta-block p {
          margin: 2px 0;
        }
        .meta-block .client-name {
          font-weight: 600;
          font-size: 15px;
          color: #0f172a;
        }
        .meta-right {
          text-align: right;
        }
        .meta-right p {
          font-size: 13px;
        }
        .meta-right span {
          display: inline-block;
          min-width: 120px;
          color: #64748b;
        }
        .meta-right strong {
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        th {
          background-color: #f8fafc;
          color: #475569;
          font-weight: 600;
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          text-transform: uppercase;
          border-bottom: 1px solid #e2e8f0;
        }
        td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          color: #334155;
          vertical-align: top;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .item-desc {
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
        }
        .summary-wrapper {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .summary-table {
          width: 320px;
          border: none;
          margin: 0;
        }
        .summary-table td {
          padding: 8px 16px;
          border: none;
          font-size: 13px;
        }
        .summary-table tr.total-row td {
          border-top: 1px solid #e2e8f0;
          font-weight: 700;
          font-size: 15px;
          color: #0f172a;
          padding-top: 12px;
        }
        .in-words {
          background-color: #f0fdf4;
          border: 1px solid #dcfce7;
          color: #166534;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 30px;
          font-size: 13px;
        }
        .in-words span {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 600;
          color: #15803d;
          margin-bottom: 2px;
        }
        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          font-size: 12px;
          color: #64748b;
          margin-top: 20px;
        }
        .bottom-grid h4 {
          margin: 0 0 6px 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #475569;
          font-weight: 600;
        }
        .signature-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 40px;
          text-align: center;
        }
        .signature-box {
          width: 200px;
        }
        .signature-box img {
          max-height: 60px;
          object-fit: contain;
          margin-bottom: 8px;
        }
        .signature-line {
          border-top: 1px solid #cbd5e1;
          padding-top: 4px;
          font-size: 11px;
          color: #64748b;
        }
        .bank-details {
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
          margin-top: 30px;
          font-size: 12px;
        }
        .bank-details h4 {
          margin: 0 0 8px 0;
          font-size: 11px;
          text-transform: uppercase;
          color: #475569;
        }
        .bank-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px 20px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          ${business?.logo_url ? `<img src="${business.logo_url}" style="height: 48px; margin-bottom: 12px; object-fit: contain;" />` : `<h2>${business?.company_name || 'Your Business'}</h2>`}
          ${business?.address_line1 ? `<p>${business.address_line1}${business.city ? `, ${business.city}` : ''}${business.state ? `, ${business.state}` : ''} ${business.pincode || ''}</p>` : ''}
          ${business?.email ? `<p>Email: ${business.email}</p>` : ''}
          ${business?.phone ? `<p>Phone: ${business.phone}</p>` : ''}
        </div>
        <div class="meta-right" style="color: #ffffff;">
          <h1 style="color: #ffffff;">INVOICE</h1>
          <p style="opacity: 0.9;">${invoice.invoice_number}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-block">
          <h3>Billed To</h3>
          <p class="client-name">${invoice.customer_name}</p>
          ${invoice.customer_address ? `<p>${invoice.customer_address}</p>` : ''}
          ${invoice.customer_email ? `<p>${invoice.customer_email}</p>` : ''}
          ${invoice.customer_gst ? `<p style="font-size: 12px; margin-top: 4px;"><strong>GSTIN:</strong> ${invoice.customer_gst}</p>` : ''}
        </div>
        <div class="meta-block meta-right">
          <h3>Details</h3>
          <p><span>Invoice Date:</span> <strong>${invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd MMM yyyy') : '-'}</strong></p>
          <p><span>Due Date:</span> <strong>${invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : '-'}</strong></p>
          ${business?.gst_number ? `<p><span>GSTIN:</span> <strong>${business.gst_number}</strong></p>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 40%;">Item</th>
            <th style="width: 10%;">HSN</th>
            <th class="text-center" style="width: 8%;">Qty</th>
            <th class="text-right" style="width: 12%;">Rate</th>
            <th class="text-right" style="width: 8%;">Disc</th>
            ${taxType !== 'none' ? (taxType === 'gst' ? '<th class="text-right" style="width: 10%;">CGST</th><th class="text-right" style="width: 10%;">SGST</th>' : '<th class="text-right" style="width: 15%;">IGST</th>') : ''}
            <th class="text-right" style="width: 12%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, i) => {
            const base = (item.quantity || 0) * (item.rate || 0);
            const disc = base * ((item.discount_percent || 0) / 100);
            const taxable = base - disc;
            const taxAmt = taxable * ((item.tax_percent || 0) / 100);
            return `
              <tr>
                <td>${i + 1}</td>
                <td>
                  <strong>${item.name}</strong>
                  ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
                </td>
                <td>${item.hsn_code || '-'}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.rate, invoice.currency)}</td>
                <td class="text-right">${item.discount_percent || 0}%</td>
                ${taxType !== 'none' ? (taxType === 'gst' ? `
                  <td class="text-right">${formatCurrency(taxAmt / 2, invoice.currency)}<br/><span style="font-size: 10px; color: #64748b;">${(item.tax_percent || 0) / 2}%</span></td>
                  <td class="text-right">${formatCurrency(taxAmt / 2, invoice.currency)}<br/><span style="font-size: 10px; color: #64748b;">${(item.tax_percent || 0) / 2}%</span></td>
                ` : `
                  <td class="text-right">${formatCurrency(taxAmt, invoice.currency)}<br/><span style="font-size: 10px; color: #64748b;">${item.tax_percent || 0}%</span></td>
                `) : ''}
                <td class="text-right" style="font-weight: 500;">${formatCurrency(taxable, invoice.currency)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="summary-wrapper">
        <table class="summary-table">
          <tbody>
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">${formatCurrency(invoice.subtotal, invoice.currency)}</td>
            </tr>
            ${(invoice.total_discount || 0) > 0 ? `
              <tr style="color: #16a34a;">
                <td>Discount:</td>
                <td class="text-right">-${formatCurrency(invoice.total_discount, invoice.currency)}</td>
              </tr>
            ` : ''}
            ${taxType === 'gst' ? `
              <tr>
                <td>CGST:</td>
                <td class="text-right">${formatCurrency(invoice.cgst_amount, invoice.currency)}</td>
              </tr>
              <tr>
                <td>SGST:</td>
                <td class="text-right">${formatCurrency(invoice.sgst_amount, invoice.currency)}</td>
              </tr>
            ` : ''}
            ${taxType === 'igst' ? `
              <tr>
                <td>IGST:</td>
                <td class="text-right">${formatCurrency(invoice.igst_amount, invoice.currency)}</td>
              </tr>
            ` : ''}
            ${(invoice.additional_charges_amount || 0) > 0 ? `
              <tr>
                <td>${invoice.additional_charges_label || 'Additional Charges'}:</td>
                <td class="text-right">${formatCurrency(invoice.additional_charges_amount, invoice.currency)}</td>
              </tr>
            ` : ''}
            <tr class="total-row">
              <td>Total:</td>
              <td class="text-right">${formatCurrency(invoice.grand_total, invoice.currency)}</td>
            </tr>
            ${(invoice.amount_paid || 0) > 0 ? `
              <tr style="color: #16a34a; font-size: 12px;">
                <td>Amount Paid:</td>
                <td class="text-right">-${formatCurrency(invoice.amount_paid, invoice.currency)}</td>
              </tr>
              <tr style="font-weight: 600; font-size: 13px;">
                <td>Balance Due:</td>
                <td class="text-right">${formatCurrency(invoice.balance_due, invoice.currency)}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <div class="in-words">
        <span>Total in Words</span>
        <strong>${numberToWords(invoice.grand_total || 0)}</strong>
      </div>

      <div class="bottom-grid">
        <div>
          ${invoice.notes ? `
            <h4>Notes</h4>
            <p>${invoice.notes}</p>
          ` : ''}
        </div>
        <div>
          ${invoice.terms_and_conditions ? `
            <h4>Terms & Conditions</h4>
            <p>${invoice.terms_and_conditions}</p>
          ` : ''}
        </div>
      </div>

      ${(business?.bank_name || invoice?.bank_details?.bank_name) ? `
        <div class="bank-details">
          <h4>Bank Details</h4>
          <div class="bank-grid">
            ${(invoice.bank_details?.beneficiary_name || business?.beneficiary_name) ? `<p><strong>Beneficiary:</strong> ${invoice.bank_details?.beneficiary_name || business?.beneficiary_name}</p>` : ''}
            <p><strong>Bank:</strong> ${invoice.bank_details?.bank_name || business?.bank_name}${invoice.bank_details?.branch_name || business?.branch_name ? `, ${invoice.bank_details?.branch_name || business?.branch_name}` : ''}</p>
            <p><strong>Account No:</strong> ${invoice.bank_details?.account_number || business?.account_number}</p>
            <p><strong>IFSC:</strong> ${invoice.bank_details?.ifsc_code || business?.ifsc_code}</p>
            ${(invoice.bank_details?.upi_id || business?.upi_id) ? `<p><strong>UPI:</strong> ${invoice.bank_details?.upi_id || business?.upi_id}</p>` : ''}
          </div>
        </div>
      ` : ''}

      ${business?.signature_url ? `
        <div class="signature-section">
          <div class="signature-box">
            <img src="${business.signature_url}" />
            <div class="signature-line">Authorized Signatory</div>
          </div>
        </div>
      ` : ''}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function printPayslipPDF(data, user, business) {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const basic = parseFloat(data.basicPay || 0);
  const allowances = parseFloat(data.allowances || 0);
  const deductions = parseFloat(data.deductions || 0);
  const netPay = (basic + allowances) - deductions;
  const monthName = MONTHS[(parseInt(data.month) || 1) - 1];

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payslip - ${user?.name || 'Employee'} - ${monthName} ${data.year}</title>
      <script>window.onload = function() { window.print(); }</script>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 40px;
          line-height: 1.5;
          font-size: 14px;
          background: #ffffff;
        }
        @media print {
          body {
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        .header {
          border-bottom: 2px solid #059669;
          padding-bottom: 20px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .header h1 {
          margin: 0 0 4px 0;
          font-size: 24px;
          color: #065f46;
          font-weight: 700;
        }
        .header p {
          margin: 2px 0;
          font-size: 13px;
          color: #64748b;
        }
        .header-right {
          text-align: right;
        }
        .header-right h2 {
          margin: 0;
          font-size: 24px;
          color: #1e293b;
          letter-spacing: 0.05em;
        }
        .header-right p {
          margin: 4px 0 0 0;
          font-weight: 600;
          color: #059669;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 30px;
        }
        .details-block h3 {
          margin: 0 0 10px 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          font-weight: 600;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 4px;
        }
        .detail-row {
          display: flex;
          margin-bottom: 6px;
          font-size: 13px;
        }
        .detail-label {
          width: 140px;
          color: #64748b;
        }
        .detail-value {
          font-weight: 500;
          color: #334155;
        }
        .salary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .salary-table th {
          padding: 10px 16px;
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
        }
        .earnings-header {
          background-color: #ecfdf5;
          color: #065f46;
          border-bottom: 1px solid #a7f3d0;
          text-align: left;
        }
        .deductions-header {
          background-color: #fef2f2;
          color: #991b1b;
          border-bottom: 1px solid #fca5a5;
          text-align: left;
        }
        .salary-table td {
          width: 50%;
          padding: 0;
          vertical-align: top;
        }
        .inner-table {
          width: 100%;
          border-collapse: collapse;
        }
        .inner-table td {
          width: auto;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
        }
        .inner-table tr:last-child td {
          border-bottom: none;
        }
        .total-strip {
          background-color: #f8fafc;
          font-weight: 600;
          border-top: 1px solid #e2e8f0;
        }
        .total-strip td {
          padding: 12px 16px !important;
        }
        .net-pay-strip {
          background-color: #059669;
          color: #ffffff;
          padding: 20px 24px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .net-pay-strip p {
          margin: 0;
        }
        .net-pay-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.9;
        }
        .net-pay-value {
          font-size: 28px;
          font-weight: 700;
        }
        .footnote {
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
          text-align: right;
        }
        .remarks {
          font-size: 13px;
          color: #64748b;
          margin-top: 20px;
          border-top: 1px solid #f1f5f9;
          padding-top: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          ${business?.logo_url ? `<img src="${business.logo_url}" style="height: 40px; margin-bottom: 8px; object-fit: contain;" />` : `<h1>${business?.company_name || 'Your Company'}</h1>`}
          ${business?.address_line1 ? `<p>${business.address_line1}${business.city ? `, ${business.city}` : ''}</p>` : ''}
        </div>
        <div class="header-right">
          <h2>PAYSLIP</h2>
          <p>For ${monthName} ${data.year}</p>
        </div>
      </div>

      <div class="details-grid">
        <div class="details-block">
          <h3>Employee Summary</h3>
          <div class="detail-row">
            <div class="detail-label">Employee Name:</div>
            <div class="detail-value">${user?.name || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Employee ID:</div>
            <div class="detail-value">${data.employeeId || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Designation:</div>
            <div class="detail-value">${data.designation || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Department:</div>
            <div class="detail-value">${data.department || '-'}</div>
          </div>
        </div>

        <div class="details-block">
          <h3>Bank Details</h3>
          <div class="detail-row">
            <div class="detail-label">Bank Name:</div>
            <div class="detail-value">${data.bankName || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Account No:</div>
            <div class="detail-value">${data.accountNumber || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">IFSC Code:</div>
            <div class="detail-value">${data.ifscCode || '-'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">PAN Number:</div>
            <div class="detail-value">${data.panNumber || '-'}</div>
          </div>
        </div>
      </div>

      <table class="salary-table">
        <thead>
          <tr>
            <th class="earnings-header">Earnings</th>
            <th class="deductions-header">Deductions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <!-- Earnings Side -->
            <td style="border-right: 1px solid #e2e8f0;">
              <table class="inner-table">
                <tbody>
                  <tr>
                    <td>Basic Pay</td>
                    <td class="text-right">$${basic.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Allowances</td>
                    <td class="text-right">$${allowances.toFixed(2)}</td>
                  </tr>
                  <!-- Pad empty rows to match height if needed -->
                  <tr class="total-strip">
                    <td>Total Earnings</td>
                    <td class="text-right">$${(basic + allowances).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <!-- Deductions Side -->
            <td>
              <table class="inner-table">
                <tbody>
                  <tr>
                    <td>Provident Fund / Tax</td>
                    <td class="text-right">$${deductions.toFixed(2)}</td>
                  </tr>
                  <!-- Spacer row to align bottoms -->
                  <tr>
                    <td style="color: transparent;">-</td>
                    <td style="color: transparent;">-</td>
                  </tr>
                  <tr class="total-strip">
                    <td>Total Deductions</td>
                    <td class="text-right">$${deductions.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="net-pay-strip">
        <div>
          <p class="net-pay-label">Net Salary Payable</p>
          <p class="net-pay-value">$${netPay.toFixed(2)}</p>
        </div>
        <div style="text-align: right;">
          <p class="footnote">This is a computer generated document and does not require a signature.</p>
        </div>
      </div>

      ${data.remarks ? `
        <div class="remarks">
          <strong>Remarks:</strong> ${data.remarks}
        </div>
      ` : ''}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
