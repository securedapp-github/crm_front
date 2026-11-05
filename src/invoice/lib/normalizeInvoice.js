/**
 * normalizeInvoice.js — Single source of truth for invoice/business data normalization.
 *
 * Resolves all property name aliases between web view (InvoicePDFContent.jsx)
 * and vector PDF generator (InvoicePDFDocument.jsx) so both receive
 * identical data shapes with identical pre-computed financial numbers.
 */

import { calculateInvoiceTotals } from './invoiceUtils';

/**
 * Normalize a single line item, resolving all property aliases.
 */
export function normalizeItem(item) {
  if (!item) return item;
  const qty = Number(item.quantity ?? item.qty ?? 1) || 0;
  const rate = Number(item.rate ?? item.unit_price ?? item.price ?? 0);
  const discountPercent = Number(item.discount_percent ?? item.discount_rate ?? item.discount ?? 0);
  const base = qty * rate;
  const discount = base * (discountPercent / 100);
  const taxable = Math.max(0, base - discount);
  const taxPercent = Number(item.tax_percent ?? item.tax_rate ?? item.gst_rate ?? 0);

  return {
    ...item,
    // Canonical property names
    rate,
    unit_price: rate,
    quantity: qty,
    discount_percent: discountPercent,
    tax_percent: taxPercent,
    tax_rate: taxPercent,
    hsn_code: item.hsn_code ?? item.hsn_sac ?? item.hsn ?? '',
    hsn_sac: item.hsn_code ?? item.hsn_sac ?? item.hsn ?? '',
    name: item.name || item.item_name || item.title || item.description || '',
    description: item.description || item.desc || '',
    unit: item.unit || '',
    // Pre-computed per-item financials
    _base: Math.round(base * 100) / 100,
    _discount: Math.round(discount * 100) / 100,
    _taxable: Math.round(taxable * 100) / 100,
  };
}

/**
 * Normalize business data, resolving property aliases.
 */
export function normalizeBusiness(business) {
  if (!business) return business;
  return {
    ...business,
    company_name: business.company_name || business.name || '',
    gst_number: business.gst_number ?? business.gstin ?? '',
    gstin: business.gst_number ?? business.gstin ?? '',
    pan_number: business.pan_number ?? business.pan ?? '',
    pan: business.pan_number ?? business.pan ?? '',
    cin_number: business.cin_number ?? business.cin ?? '',
    beneficiary_name: business.beneficiary_name ?? business.account_holder_name ?? business.company_name ?? '',
    account_holder_name: business.beneficiary_name ?? business.account_holder_name ?? business.company_name ?? '',
    // Address: compose from parts if missing
    address: business.address || [
      business.address_line1,
      business.city,
      business.state,
      business.pincode ? `- ${business.pincode}` : ''
    ].filter(Boolean).join(', ') || '',
  };
}

/**
 * Normalize the full invoice object — items, customer fields, and financial totals.
 * Returns a new object; does NOT mutate the original.
 */
export function normalizeInvoice(rawInvoice, rawBusiness) {
  if (!rawInvoice) return { invoice: rawInvoice, business: rawBusiness };

  const business = normalizeBusiness(rawBusiness);
  const taxType = rawInvoice.tax_type || 'gst';
  const currency = rawInvoice.currency || 'INR';
  const items = (rawInvoice.items || []).map(normalizeItem);
  const additionalCharges = Number(rawInvoice.additional_charges_amount) || 0;

  // Authoritative totals computed from items
  const computed = calculateInvoiceTotals(items, taxType, additionalCharges);

  // Derive tax breakdown with fallback to tax_amount or computed values
  let total_tax = rawInvoice.total_tax ?? rawInvoice.tax_amount ?? computed.total_tax;
  let cgst_amount = rawInvoice.cgst_amount;
  let sgst_amount = rawInvoice.sgst_amount;
  let igst_amount = rawInvoice.igst_amount;

  if (taxType === 'gst') {
    if (cgst_amount === undefined || cgst_amount === null || (cgst_amount === 0 && (total_tax > 0 || computed.cgst_amount > 0))) {
      cgst_amount = (total_tax && total_tax > 0) ? Math.round((total_tax / 2) * 100) / 100 : computed.cgst_amount;
      sgst_amount = (total_tax && total_tax > 0) ? Math.round((total_tax / 2) * 100) / 100 : computed.sgst_amount;
    }
  } else if (taxType === 'igst') {
    if (igst_amount === undefined || igst_amount === null || (igst_amount === 0 && (total_tax > 0 || computed.igst_amount > 0))) {
      igst_amount = (total_tax && total_tax > 0) ? total_tax : computed.igst_amount;
    }
  }

  const subtotal = rawInvoice.subtotal ?? computed.subtotal;
  const total_discount = rawInvoice.total_discount ?? computed.total_discount;
  const grand_total = rawInvoice.grand_total ?? rawInvoice.total ?? computed.grand_total;
  const amount_paid = Number(rawInvoice.amount_paid) || 0;
  const balance_due = rawInvoice.balance_due ?? (grand_total - amount_paid);

  const invoice = {
    ...rawInvoice,
    items,
    tax_type: taxType,
    currency,
    // Customer field normalization
    customer_name: rawInvoice.customer_name || '',
    customer_email: rawInvoice.customer_email || '',
    customer_address: rawInvoice.customer_address ?? rawInvoice.billing_address ?? '',
    billing_address: rawInvoice.customer_address ?? rawInvoice.billing_address ?? '',
    customer_gst: rawInvoice.customer_gst ?? rawInvoice.customer_gstin ?? '',
    customer_gstin: rawInvoice.customer_gst ?? rawInvoice.customer_gstin ?? '',
    // Calculated and validated totals
    subtotal,
    total_discount,
    cgst_amount: cgst_amount ?? 0,
    sgst_amount: sgst_amount ?? 0,
    igst_amount: igst_amount ?? 0,
    total_tax: total_tax ?? 0,
    grand_total,
    amount_paid,
    balance_due,
    // Bank details normalization (per-invoice overrides fall through to business)
    bank_details: rawInvoice.bank_details || null,
  };

  return { invoice, business };
}
