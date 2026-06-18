export function calculateItemAmount(item) {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const discountPercent = Number(item.discount_percent) || 0;
  const base = qty * rate;
  const discount = base * (discountPercent / 100);
  return base - discount;
}

export function calculateInvoiceTotals(items, taxType, additionalCharges = 0) {
  let subtotal = 0;
  let totalDiscount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let totalTax = 0;

  (items || []).forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const base = qty * rate;
    const discountPercent = Number(item.discount_percent) || 0;
    const discount = base * (discountPercent / 100);
    const taxableAmount = base - discount;
    const taxPercent = Number(item.tax_percent) || 0;

    subtotal += base;
    totalDiscount += discount;

    if (taxType === 'gst') {
      const halfTax = taxableAmount * (taxPercent / 200);
      cgst += halfTax;
      sgst += halfTax;
      totalTax += halfTax * 2;
    } else if (taxType === 'igst') {
      const tax = taxableAmount * (taxPercent / 100);
      igst += tax;
      totalTax += tax;
    }
  });

  const grandTotal = subtotal - totalDiscount + totalTax + Number(additionalCharges);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    total_discount: Math.round(totalDiscount * 100) / 100,
    cgst_amount: Math.round(cgst * 100) / 100,
    sgst_amount: Math.round(sgst * 100) / 100,
    igst_amount: Math.round(igst * 100) / 100,
    total_tax: Math.round(totalTax * 100) / 100,
    grand_total: Math.round(grandTotal * 100) / 100
  };
}

export function generateInvoiceNumber(prefix, number) {
  const year = new Date().getFullYear();
  const padded = String(number).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount) || 0;
  if (currency === 'INR') {
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export function getStatusColor(status) {
  const colors = {
    draft: 'bg-muted text-muted-foreground',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    paid: 'bg-emerald-100 text-emerald-700',
    partially_paid: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500'
  };
  return colors[status] || colors.draft;
}

export function getStatusLabel(status) {
  const labels = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    paid: 'Paid',
    partially_paid: 'Partially Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled'
  };
  return labels[status] || status;
}

export function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  let result = convert(intPart) + ' Rupees';
  if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise';
  result += ' Only';
  return result;
}
