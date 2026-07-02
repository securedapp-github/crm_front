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
  const num = Number(amount);
  const cleanNum = isNaN(num) ? 0 : num;
  const cleanCurrency = String(currency || 'INR').toUpperCase();
  if (cleanCurrency === 'INR') {
    return '₹' + cleanNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cleanCurrency }).format(cleanNum);
  } catch (err) {
    return `${cleanCurrency} ${cleanNum.toFixed(2)}`;
  }
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
  const n = Number(num);
  if (isNaN(n) || n === 0) return 'Zero Rupees Only';

  const intPart = Math.floor(Math.abs(n));
  const decPart = Math.round((Math.abs(n) - intPart) * 100);

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(val) {
    if (val === 0) return '';
    if (val < 20) return ones[val];
    if (val < 100) return tens[Math.floor(val / 10)] + (val % 10 ? ' ' + ones[val % 10] : '');
    if (val < 1000) return ones[Math.floor(val / 100)] + ' Hundred' + (val % 100 ? ' ' + convert(val % 100) : '');
    if (val < 100000) return convert(Math.floor(val / 1000)) + ' Thousand' + (val % 1000 ? ' ' + convert(val % 1000) : '');
    if (val < 10000000) return convert(Math.floor(val / 100000)) + ' Lakh' + (val % 100000 ? ' ' + convert(val % 100000) : '');
    return convert(Math.floor(val / 10000000)) + ' Crore' + (val % 10000000 ? ' ' + convert(val % 10000000) : '');
  }

  let result = '';
  if (intPart > 0) {
    result += convert(intPart) + ' Rupees';
  } else {
    result += 'Zero Rupees';
  }

  if (decPart > 0) {
    result += ' and ' + convert(decPart) + ' Paise';
  }
  result += ' Only';
  return result;
}
