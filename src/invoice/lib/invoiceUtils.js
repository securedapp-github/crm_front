export const ITEM_UNITS = [
  { value: 'nos', label: 'Nos' },
  { value: 'hrs', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'month', label: 'Month' },
  { value: 'pcs', label: 'Pcs' },
  { value: 'units', label: 'Units' },
  { value: 'services', label: 'Service' },
  { value: 'fixed', label: 'Fixed' }
];

export const GST_STATE_CODES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory'
};

export function getStateCodeFromGSTIN(gstin) {
  if (!gstin || typeof gstin !== 'string') return null;
  const clean = gstin.trim();
  if (clean.length >= 2 && /^\d{2}/.test(clean)) {
    return clean.substring(0, 2);
  }
  return null;
}

export function detectTaxType({ supplierGstin, customerGstin, supplierState, customerState }) {
  const supplierCode = getStateCodeFromGSTIN(supplierGstin);
  const customerCode = getStateCodeFromGSTIN(customerGstin);

  if (supplierCode && customerCode) {
    return supplierCode === customerCode ? 'gst' : 'igst';
  }

  if (supplierState && customerState) {
    const s1 = supplierState.trim().toLowerCase();
    const s2 = customerState.trim().toLowerCase();
    return s1 === s2 ? 'gst' : 'igst';
  }

  return 'gst';
}

export function calculateItemAmount(item) {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const discountPercent = Number(item.discount_percent) || 0;
  const base = qty * rate;
  const discount = base * (discountPercent / 100);
  return Math.round((base - discount) * 100) / 100;
}

export function calculateTaxBreakdown(items, taxType) {
  if (taxType === 'none' || !items || items.length === 0) return [];
  const breakdownMap = {};

  items.forEach((item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const base = qty * rate;
    const discountPercent = Number(item.discount_percent) || 0;
    const discount = base * (discountPercent / 100);
    const taxableAmount = Math.max(0, base - discount);
    const taxPercent = Number(item.tax_percent) || 0;

    if (!breakdownMap[taxPercent]) {
      breakdownMap[taxPercent] = {
        rate: taxPercent,
        taxableAmount: 0,
        taxAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0
      };
    }

    breakdownMap[taxPercent].taxableAmount += taxableAmount;
    if (taxType === 'gst') {
      const halfTax = taxableAmount * (taxPercent / 200);
      breakdownMap[taxPercent].cgst += halfTax;
      breakdownMap[taxPercent].sgst += halfTax;
      breakdownMap[taxPercent].taxAmount += halfTax * 2;
    } else if (taxType === 'igst') {
      const tax = taxableAmount * (taxPercent / 100);
      breakdownMap[taxPercent].igst += tax;
      breakdownMap[taxPercent].taxAmount += tax;
    }
  });

  return Object.values(breakdownMap).map(b => ({
    ...b,
    taxableAmount: Math.round(b.taxableAmount * 100) / 100,
    taxAmount: Math.round(b.taxAmount * 100) / 100,
    cgst: Math.round(b.cgst * 100) / 100,
    sgst: Math.round(b.sgst * 100) / 100,
    igst: Math.round(b.igst * 100) / 100
  })).sort((a, b) => a.rate - b.rate);
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
    const taxableAmount = Math.max(0, base - discount);
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

  const grandTotal = subtotal - totalDiscount + totalTax + Number(additionalCharges || 0);

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

export function generateInvoiceNumber(prefix = 'INV', number = 1) {
  const year = new Date().getFullYear();
  const padded = String(number).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount);
  const cleanNum = isNaN(num) ? 0 : num;
  const cleanCurrency = String(currency || 'INR').toUpperCase();
  const hasPaise = Math.abs(Math.round(cleanNum * 100)) % 100 !== 0;
  const fractionDigits = hasPaise ? 2 : 0;

  if (cleanCurrency === 'INR') {
    return '₹' + cleanNum.toLocaleString('en-IN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cleanCurrency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(cleanNum);
  } catch (err) {
    const symbolMap = { USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$' };
    const sym = symbolMap[cleanCurrency] || `${cleanCurrency} `;
    return `${sym}${hasPaise ? cleanNum.toFixed(2) : cleanNum.toFixed(0)}`;
  }
}

export function getStatusColor(status) {
  const colors = {
    draft: 'bg-muted text-muted-foreground border-border',
    sent: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    viewed: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    partially_paid: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    overdue: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
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

export function numberToWords(num, currency = 'INR') {
  const n = Number(num);
  const cleanCurrency = String(currency || 'INR').toUpperCase();

  const currencyUnits = {
    INR: { main: 'Rupees', sub: 'Paise', zero: 'Zero Rupees' },
    USD: { main: 'Dollars', sub: 'Cents', zero: 'Zero Dollars' },
    EUR: { main: 'Euros', sub: 'Cents', zero: 'Zero Euros' },
    GBP: { main: 'Pounds', sub: 'Pence', zero: 'Zero Pounds' }
  }[cleanCurrency] || { main: cleanCurrency, sub: 'Cents', zero: `Zero ${cleanCurrency}` };

  if (isNaN(n) || n === 0) return `${currencyUnits.zero} Only`;

  const intPart = Math.floor(Math.abs(n));
  const decPart = Math.round((Math.abs(n) - intPart) * 100);

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  // Indian numbering system (Lakh, Crore)
  function convertIndian(val) {
    if (val === 0) return '';
    if (val < 20) return ones[val];
    if (val < 100) return tens[Math.floor(val / 10)] + (val % 10 ? ' ' + ones[val % 10] : '');
    if (val < 1000) return ones[Math.floor(val / 100)] + ' Hundred' + (val % 100 ? ' ' + convertIndian(val % 100) : '');
    if (val < 100000) return convertIndian(Math.floor(val / 1000)) + ' Thousand' + (val % 1000 ? ' ' + convertIndian(val % 1000) : '');
    if (val < 10000000) return convertIndian(Math.floor(val / 100000)) + ' Lakh' + (val % 100000 ? ' ' + convertIndian(val % 100000) : '');
    return convertIndian(Math.floor(val / 10000000)) + ' Crore' + (val % 10000000 ? ' ' + convertIndian(val % 10000000) : '');
  }

  // Western numbering system (Million, Billion)
  function convertWestern(val) {
    if (val === 0) return '';
    if (val < 20) return ones[val];
    if (val < 100) return tens[Math.floor(val / 10)] + (val % 10 ? ' ' + ones[val % 10] : '');
    if (val < 1000) return ones[Math.floor(val / 100)] + ' Hundred' + (val % 100 ? ' ' + convertWestern(val % 100) : '');
    if (val < 1000000) return convertWestern(Math.floor(val / 1000)) + ' Thousand' + (val % 1000 ? ' ' + convertWestern(val % 1000) : '');
    if (val < 1000000000) return convertWestern(Math.floor(val / 1000000)) + ' Million' + (val % 1000000 ? ' ' + convertWestern(val % 1000000) : '');
    return convertWestern(Math.floor(val / 1000000000)) + ' Billion' + (val % 1000000000 ? ' ' + convertWestern(val % 1000000000) : '');
  }

  const converter = cleanCurrency === 'INR' ? convertIndian : convertWestern;

  let result = '';
  if (intPart > 0) {
    result += converter(intPart) + ' ' + currencyUnits.main;
  } else {
    result += currencyUnits.zero;
  }

  if (decPart > 0) {
    result += ' and ' + converter(decPart) + ' ' + currencyUnits.sub;
  }
  result += ' Only';
  return result;
}

export function getFullFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  const viteApiUrl = import.meta.env.VITE_API_URL;
  if (viteApiUrl) {
    try {
      const parsed = new URL(viteApiUrl);
      return `${parsed.origin}${url}`;
    } catch (e) {
      return url;
    }
  }
  return url;
}

export function formatDate(date, formatPattern = 'MMM dd, yyyy') {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '-';

  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = monthsShort[d.getMonth()];
  const year = d.getFullYear();

  if (formatPattern === 'dd MMM yyyy') {
    return `${day} ${month} ${year}`;
  }
  return `${month} ${day}, ${year}`;
}

export const format = formatDate;
