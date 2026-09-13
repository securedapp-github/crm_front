import * as XLSX from 'xlsx';

export function exportToCSV(rows, columns, filename) {
  const data = rows.map((row) => {
    const obj = {};
    columns.forEach((c) => { obj[c.label] = c.accessor(row) ?? ''; });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.csv`);
}


export function exportInvoicesToCSV(invoices) {
  exportToCSV(invoices, [
    { label: 'Invoice Number', accessor: (r) => r.invoice_number },
    { label: 'Customer', accessor: (r) => r.customer_name },
    { label: 'Date', accessor: (r) => r.invoice_date },
    { label: 'Due Date', accessor: (r) => r.due_date },
    { label: 'Status', accessor: (r) => r.status },
    { label: 'Subtotal', accessor: (r) => r.subtotal },
    { label: 'Tax', accessor: (r) => r.total_tax },
    { label: 'Grand Total', accessor: (r) => r.grand_total },
    { label: 'Amount Paid', accessor: (r) => r.amount_paid },
    { label: 'Balance Due', accessor: (r) => r.balance_due }],
    'invoices-export');
}

export function exportPaymentsToCSV(payments) {
  exportToCSV(payments, [
    { label: 'Date', accessor: (r) => r.payment_date },
    { label: 'Invoice', accessor: (r) => r.invoice_number },
    { label: 'Customer', accessor: (r) => r.customer_name },
    { label: 'Method', accessor: (r) => r.payment_method },
    { label: 'Reference', accessor: (r) => r.reference_number },
    { label: 'Amount', accessor: (r) => r.amount }],
    'payments-export');
}
