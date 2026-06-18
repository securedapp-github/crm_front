export function exportToCSV(rows, columns, filename) {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows.map((row) =>
    columns.map((c) => {
      let val = c.accessor(row);
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  ).join('\n');

  const csv = header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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
