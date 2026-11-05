import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { numberToWords, format } from '@/invoice/lib/invoiceUtils';
import { normalizeInvoice } from '@/invoice/lib/normalizeInvoice';

// Disable mid-word hyphenation so item titles never awkwardly split (e.g., "Retainer" -> "Re-tainer")
Font.registerHyphenationCallback(word => [word]);

// Indian number formatting for pure numeric values without currency symbols (avoids Helvetica unicode glyph bugs)
function formatNumber(amount) {
  const num = Number(amount);
  const cleanNum = isNaN(num) ? 0 : num;
  const hasPaise = Math.abs(Math.round(cleanNum * 100)) % 100 !== 0;
  return cleanNum.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

// Format currency for PDF summary lines with standard Helvetica compatibility
function formatPDFCurrency(amount, currency = 'INR') {
  const num = Number(amount);
  const cleanNum = isNaN(num) ? 0 : num;
  const cleanCurrency = String(currency || 'INR').toUpperCase();
  const hasPaise = Math.abs(Math.round(cleanNum * 100)) % 100 !== 0;
  const fractionDigits = hasPaise ? 2 : 0;

  if (cleanCurrency === 'INR') {
    return 'Rs. ' + cleanNum.toLocaleString('en-IN', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cleanCurrency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(cleanNum);
  } catch {
    return `${cleanCurrency} ${cleanNum.toFixed(fractionDigits)}`;
  }
}

// Luxury Corporate Palette
const C = {
  emerald600: '#059669',
  emerald700: '#047857',
  emerald900: '#065f46',
  emerald50: '#ecfdf5',
  emerald100: '#a7f3d0',
  emerald200: '#6ee7b7',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  white: '#ffffff',
  red600: '#dc2626',
  red700: '#b91c1c',
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: C.slate800,
    backgroundColor: C.white,
    lineHeight: 1.4,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: C.slate200,
    paddingBottom: 10,
    marginBottom: 12,
  },
  headerLeft: { maxWidth: 330 },
  headerRight: { alignItems: 'flex-end', maxWidth: 220 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: C.emerald50,
    borderWidth: 0.75,
    borderColor: C.emerald100,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.emerald700,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  invoiceTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.slate900,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  metaLabel: { width: 58, color: C.slate500, fontSize: 8 },
  metaValue: { fontFamily: 'Helvetica-Bold', color: C.slate900, fontSize: 8 },
  logo: { maxHeight: 46, maxWidth: 150, objectFit: 'contain', marginBottom: 4 },
  companyNameHeader: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.slate900 },
  companySubtext: { fontSize: 7.5, color: C.slate600, marginTop: 1 },

  // ── Addresses ──
  addressesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  addressBox: {
    flex: 1,
    backgroundColor: C.slate50,
    borderRadius: 5,
    borderWidth: 0.75,
    borderColor: C.slate200,
    padding: 8,
  },
  addressBoxTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.emerald700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.slate900,
    marginBottom: 2,
  },
  addressText: { fontSize: 8.5, color: C.slate600, marginBottom: 2, lineHeight: 1.35 },
  addressMono: { fontSize: 8, color: C.slate800, fontFamily: 'Helvetica-Bold', marginBottom: 2 },

  // ── Items Table (10-Column Classic Emerald Green Layout) ──
  table: { marginBottom: 12 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.emerald600, // Emerald Green
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableHeaderCell: {
    color: C.white,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.slate200,
    paddingVertical: 5.5,
    paddingHorizontal: 6,
    alignItems: 'flex-start',
  },
  tableRowAlt: { backgroundColor: C.slate50 },
  tableCell: { fontSize: 7.5, color: C.slate700 },
  tableCellBold: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.slate900 },
  tableCellMono: { fontSize: 7, color: C.slate500 },
  tableCellTax: { fontSize: 7.5, color: C.slate800 },
  tableCellTaxRate: { fontSize: 6, color: C.slate400, marginTop: 1 },
  tableCellDiscount: { fontSize: 7.5, color: C.emerald700, fontFamily: 'Helvetica-Bold' },
  itemName: {
    fontFamily: 'Helvetica-Bold',
    color: C.slate900,
    fontSize: 8,
    marginBottom: 1,
  },
  itemDesc: {
    fontSize: 6.5,
    color: C.slate500,
    lineHeight: 1.25,
  },

  // 10 Column Widths (Full tax breakdown, zero wrapping)
  colNum: { width: '4%', textAlign: 'center' },
  colDesc: { width: '24%' },
  colHsn: { width: '8%', textAlign: 'center' },
  colQty: { width: '6%', textAlign: 'center' },
  colRate: { width: '10%', textAlign: 'right' },
  colDisc: { width: '8%', textAlign: 'right' },
  colTaxable: { width: '11%', textAlign: 'right' },
  colCgst: { width: '9%', textAlign: 'right' },
  colSgst: { width: '9%', textAlign: 'right' },
  colIgst: { width: '18%', textAlign: 'right' },
  colTotal: { width: '11%', textAlign: 'right' },

  // No-tax variants
  colDescNoTax: { width: '45%' },
  colQtyNoTax: { width: '8%', textAlign: 'center' },
  colRateNoTax: { width: '13%', textAlign: 'right' },
  colDiscNoTax: { width: '12%', textAlign: 'right' },
  colTotalNoTax: { width: '18%', textAlign: 'right' },

  // Table Total Row
  totalRow: {
    flexDirection: 'row',
    backgroundColor: C.slate100,
    borderTopWidth: 1.5,
    borderTopColor: C.slate300,
    paddingVertical: 5.5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  totalRowCell: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.slate900 },

  // ── Amount in Words (Mint Emerald Card) ──
  amountWordsBox: {
    backgroundColor: C.emerald50,
    borderWidth: 1,
    borderColor: C.emerald100,
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  amountWordsLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.emerald700,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  amountWordsText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: C.emerald900,
  },

  // ── Bottom Section: Bank Details + Summary Card ──
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 14,
  },
  bottomLeft: { flex: 1.15 },
  bottomRight: { flex: 1 },

  // Bank Box
  bankBox: {
    backgroundColor: C.slate50,
    borderWidth: 1,
    borderColor: C.slate200,
    borderRadius: 6,
    padding: 8,
  },
  bankTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.slate900,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  bankRow: { flexDirection: 'row', marginBottom: 2.5 },
  bankLabel: { width: 80, fontSize: 7.5, color: C.slate500 },
  bankValue: { fontSize: 7.5, color: C.slate800, flex: 1 },
  bankValueBold: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.slate900, flex: 1 },

  // Summary Card
  summaryCard: {
    backgroundColor: C.slate50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.slate200,
    padding: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
    fontSize: 8.5,
  },
  summaryLabel: { color: C.slate500 },
  summaryValue: { fontFamily: 'Helvetica', color: C.slate900 },
  summaryValueBold: { fontFamily: 'Helvetica-Bold', color: C.slate900 },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: C.slate300,
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.slate900,
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.emerald600,
  },

  // ── Footer ──
  footer: {
    borderTopWidth: 1,
    borderTopColor: C.slate200,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  termsBox: { maxWidth: 320 },
  termsTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.slate900,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  termsText: {
    fontSize: 7.5,
    color: C.slate600,
    lineHeight: 1.3,
  },
  signatoryBox: {
    alignItems: 'center',
    width: 140,
  },
  signatureImage: {
    maxHeight: 36,
    maxWidth: 120,
    objectFit: 'contain',
    marginBottom: 4,
  },
  signaturePlaceholder: {
    height: 36,
  },
  signatoryLine: {
    borderTopWidth: 1,
    borderTopColor: C.slate400,
    width: '100%',
    paddingTop: 4,
    alignItems: 'center',
  },
  signatoryCompany: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.slate900,
    textAlign: 'center',
  },
  signatoryText: {
    fontSize: 7.5,
    color: C.slate500,
    textAlign: 'center',
  },
});

export default function InvoicePDFDocument({ invoice: rawInvoice, business: rawBusiness }) {
  if (!rawInvoice) return null;

  const { invoice, business } = normalizeInvoice(rawInvoice, rawBusiness);
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
    <Document title={`Invoice-${invoice.invoice_number || 'Draft'}`} author={business?.company_name || 'SecuredApp'}>
      <Page size="A4" style={styles.page}>

        {/* ═══ Header ═══ */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{documentTitle}</Text>
            </View>
            <Text style={styles.invoiceTitle}>{invoice.invoice_number || 'INV-DRAFT'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Date:</Text>
              <Text style={styles.metaValue}>
                {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd MMM yyyy') : '-'}
              </Text>
            </View>
            {invoice.due_date && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due Date:</Text>
                <Text style={styles.metaValue}>{format(new Date(invoice.due_date), 'dd MMM yyyy')}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            {business?.logo_url ? (
              <Image src={business.logo_url} style={styles.logo} />
            ) : (
              <Text style={[styles.addressName, { fontSize: 12 }]}>{business?.company_name || 'Your Company'}</Text>
            )}
            {business?.company_name && business.logo_url && (
              <Text style={styles.companyNameHeader}>{business.company_name}</Text>
            )}
            {business?.email && <Text style={styles.companySubtext}>{business.email}</Text>}
            {business?.phone && <Text style={styles.companySubtext}>{business.phone}</Text>}
          </View>
        </View>

        {/* ═══ Billed By / Billed To ═══ */}
        <View style={styles.addressesContainer}>
          <View style={styles.addressBox}>
            <Text style={styles.addressBoxTitle}>Billed By (Supplier)</Text>
            <Text style={styles.addressName}>{business?.company_name || 'Your Business Name'}</Text>
            {business?.address && <Text style={styles.addressText}>{business.address}</Text>}
            {business?.email && <Text style={styles.addressText}>Email: {business.email}</Text>}
            {business?.phone && <Text style={styles.addressText}>Phone: {business.phone}</Text>}
            {business?.gst_number ? <Text style={styles.addressMono}>GSTIN: {business.gst_number}</Text> : null}
            {business?.pan_number ? <Text style={styles.addressMono}>PAN: {business.pan_number}</Text> : null}
            {business?.cin_number ? <Text style={styles.addressMono}>CIN: {business.cin_number}</Text> : null}
          </View>

          <View style={styles.addressBox}>
            <Text style={styles.addressBoxTitle}>Billed To (Customer)</Text>
            <Text style={styles.addressName}>{invoice.customer_name || '-'}</Text>
            {invoice.customer_address ? <Text style={styles.addressText}>{invoice.customer_address}</Text> : null}
            {invoice.customer_email ? <Text style={styles.addressText}>Email: {invoice.customer_email}</Text> : null}
            {invoice.customer_gst ? <Text style={styles.addressMono}>GSTIN: {invoice.customer_gst}</Text> : null}
            {invoice.customer_pan ? <Text style={styles.addressMono}>PAN: {invoice.customer_pan}</Text> : null}
          </View>
        </View>

        {/* ═══ Items Table (10-Column Classic Emerald Green Layout) ═══ */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeader} wrap={false}>
            <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
            <Text style={[styles.tableHeaderCell, hasTax ? styles.colDesc : styles.colDescNoTax]}>Item Description</Text>
            {hasTax && <Text style={[styles.tableHeaderCell, styles.colHsn]}>HSN/SAC</Text>}
            <Text style={[styles.tableHeaderCell, hasTax ? styles.colQty : styles.colQtyNoTax]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, hasTax ? styles.colRate : styles.colRateNoTax]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, hasTax ? styles.colDisc : styles.colDiscNoTax]}>Disc</Text>
            {hasTax && <Text style={[styles.tableHeaderCell, styles.colTaxable]}>Taxable</Text>}
            {taxType === 'gst' && (
              <>
                <Text style={[styles.tableHeaderCell, styles.colCgst]}>CGST</Text>
                <Text style={[styles.tableHeaderCell, styles.colSgst]}>SGST</Text>
              </>
            )}
            {taxType === 'igst' && (
              <Text style={[styles.tableHeaderCell, styles.colIgst]}>IGST</Text>
            )}
            <Text style={[styles.tableHeaderCell, hasTax ? styles.colTotal : styles.colTotalNoTax]}>Total</Text>
          </View>

          {/* Item Rows */}
          {items.map((item, index) => {
            const qty = Number(item.quantity) || 1;
            const rate = Number(item.rate) || 0;
            const baseAmount = qty * rate;
            const disc = baseAmount * ((Number(item.discount_percent) || 0) / 100);
            const taxable = Math.max(0, baseAmount - disc);
            const taxRate = Number(item.tax_percent) || 0;
            const taxAmt = taxType === 'none' ? 0 : taxable * (taxRate / 100);
            const itemTotal = taxable + taxAmt;
            const isAlt = index % 2 === 1;

            return (
              <View key={index} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} wrap={false}>
                <Text style={[styles.tableCellMono, styles.colNum]}>{index + 1}</Text>
                <View style={hasTax ? styles.colDesc : styles.colDescNoTax}>
                  <Text style={styles.itemName}>{item.name || item.description || `Item #${index + 1}`}</Text>
                  {item.description && item.name && item.description !== item.name && (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  )}
                </View>
                {hasTax && <Text style={[styles.tableCellMono, styles.colHsn]}>{item.hsn_code || '-'}</Text>}
                <Text style={[styles.tableCell, hasTax ? styles.colQty : styles.colQtyNoTax]}>
                  {qty}{item.unit ? ` ${item.unit}` : ''}
                </Text>
                <Text style={[styles.tableCell, hasTax ? styles.colRate : styles.colRateNoTax]}>{formatNumber(rate)}</Text>
                <Text style={[item.discount_percent > 0 ? styles.tableCellDiscount : styles.tableCellMono, hasTax ? styles.colDisc : styles.colDiscNoTax]}>
                  {item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}
                </Text>
                {hasTax && (
                  <Text style={[styles.tableCellBold, styles.colTaxable]}>{formatNumber(taxable)}</Text>
                )}
                {taxType === 'gst' && (
                  <>
                    <View style={styles.colCgst}>
                      <Text style={styles.tableCellTax}>{formatNumber(taxAmt / 2)}</Text>
                      <Text style={styles.tableCellTaxRate}>({taxRate / 2}%)</Text>
                    </View>
                    <View style={styles.colSgst}>
                      <Text style={styles.tableCellTax}>{formatNumber(taxAmt / 2)}</Text>
                      <Text style={styles.tableCellTaxRate}>({taxRate / 2}%)</Text>
                    </View>
                  </>
                )}
                {taxType === 'igst' && (
                  <View style={styles.colIgst}>
                    <Text style={styles.tableCellTax}>{formatNumber(taxAmt)}</Text>
                    <Text style={styles.tableCellTaxRate}>({taxRate}%)</Text>
                  </View>
                )}
                <Text style={[styles.tableCellBold, hasTax ? styles.colTotal : styles.colTotalNoTax]}>
                  {formatNumber(itemTotal)}
                </Text>
              </View>
            );
          })}

          {/* Total Footer Row */}
          <View style={styles.totalRow} wrap={false}>
            <Text style={[styles.totalRowCell, styles.colNum]}></Text>
            <Text style={[styles.totalRowCell, hasTax ? styles.colDesc : styles.colDescNoTax, { textTransform: 'uppercase', letterSpacing: 0.4 }]}>
              Total
            </Text>
            {hasTax && <Text style={[styles.totalRowCell, styles.colHsn]}></Text>}
            <Text style={[styles.totalRowCell, hasTax ? styles.colQty : styles.colQtyNoTax]}>{totalQuantity}</Text>
            <Text style={[styles.totalRowCell, hasTax ? styles.colRate : styles.colRateNoTax]}></Text>
            <Text style={[styles.totalRowCell, hasTax ? styles.colDisc : styles.colDiscNoTax, { color: C.emerald700 }]}>
              {(invoice.total_discount || 0) > 0 ? '-' + formatNumber(invoice.total_discount) : '-'}
            </Text>
            {hasTax && (
              <Text style={[styles.totalRowCell, styles.colTaxable]}>
                {formatNumber(totalTaxable)}
              </Text>
            )}
            {taxType === 'gst' && (
              <>
                <Text style={[styles.totalRowCell, styles.colCgst]}>{formatNumber(invoice.cgst_amount)}</Text>
                <Text style={[styles.totalRowCell, styles.colSgst]}>{formatNumber(invoice.sgst_amount)}</Text>
              </>
            )}
            {taxType === 'igst' && (
              <Text style={[styles.totalRowCell, styles.colIgst]}>{formatNumber(invoice.igst_amount)}</Text>
            )}
            <Text style={[styles.totalRowCell, hasTax ? styles.colTotal : styles.colTotalNoTax]}>
              {formatNumber(invoice.grand_total)}
            </Text>
          </View>
        </View>

        {/* ═══ Amount in Words (Mint Emerald Card) ═══ */}
        <View style={styles.amountWordsBox} wrap={false}>
          <Text style={styles.amountWordsLabel}>Total Amount in Words</Text>
          <Text style={styles.amountWordsText}>{numberToWords(invoice.grand_total, currency)}</Text>
        </View>

        {/* ═══ Bottom Section: Bank Details + Financial Summary ═══ */}
        <View style={styles.bottomSection} wrap={false}>
          {/* Bank Details (Left) */}
          <View style={styles.bottomLeft}>
            {hasBank && (
              <View style={styles.bankBox}>
                <Text style={styles.bankTitle}>Payment & Bank Information</Text>
                {bank.beneficiaryName ? (
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Account Name:</Text>
                    <Text style={styles.bankValue}>{bank.beneficiaryName}</Text>
                  </View>
                ) : null}
                {bank.accountNumber ? (
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Account No:</Text>
                    <Text style={styles.bankValueBold}>{bank.accountNumber}</Text>
                  </View>
                ) : null}
                {bank.bankName ? (
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Bank Name:</Text>
                    <Text style={styles.bankValue}>
                      {bank.bankName}{bank.branchName ? ', ' + bank.branchName : ''}
                    </Text>
                  </View>
                ) : null}
                {bank.ifscCode ? (
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>IFSC Code:</Text>
                    <Text style={styles.bankValueBold}>{bank.ifscCode}</Text>
                  </View>
                ) : null}
                {bank.swiftCode ? (
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>SWIFT Code:</Text>
                    <Text style={styles.bankValue}>{bank.swiftCode}</Text>
                  </View>
                ) : null}
                {bank.upiId ? (
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>UPI ID:</Text>
                    <Text style={[styles.bankValueBold, { color: C.emerald700 }]}>{bank.upiId}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Financial Summary Card (Right) */}
          <View style={styles.bottomRight}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxable Subtotal:</Text>
                <Text style={styles.summaryValue}>{formatPDFCurrency(totalTaxable, currency)}</Text>
              </View>

              {(invoice.total_discount || 0) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Discount:</Text>
                  <Text style={[styles.summaryValue, { color: C.red600 }]}>
                    - {formatPDFCurrency(invoice.total_discount, currency)}
                  </Text>
                </View>
              )}

              {taxType === 'gst' && (invoice.cgst_amount > 0 || invoice.total_tax > 0) && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>CGST:</Text>
                    <Text style={styles.summaryValue}>{formatPDFCurrency(invoice.cgst_amount, currency)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>SGST:</Text>
                    <Text style={styles.summaryValue}>{formatPDFCurrency(invoice.sgst_amount, currency)}</Text>
                  </View>
                </>
              )}

              {taxType === 'igst' && (invoice.igst_amount > 0 || invoice.total_tax > 0) && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>IGST:</Text>
                  <Text style={styles.summaryValue}>{formatPDFCurrency(invoice.igst_amount, currency)}</Text>
                </View>
              )}

              {(invoice.additional_charges_amount || 0) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{invoice.additional_charges_label || 'Additional Charges'}:</Text>
                  <Text style={styles.summaryValue}>{formatPDFCurrency(invoice.additional_charges_amount, currency)}</Text>
                </View>
              )}

              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                <Text style={styles.grandTotalValue}>{formatPDFCurrency(invoice.grand_total, currency)}</Text>
              </View>

              {(invoice.amount_paid || 0) > 0 && (
                <>
                  <View style={[styles.summaryRow, { marginTop: 3 }]}>
                    <Text style={styles.summaryLabel}>Amount Paid:</Text>
                    <Text style={[styles.summaryValue, { color: C.emerald700 }]}>
                      - {formatPDFCurrency(invoice.amount_paid, currency)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, { borderTopWidth: 0.5, borderTopColor: C.slate200, paddingTop: 3 }]}>
                    <Text style={[styles.summaryLabel, { fontFamily: 'Helvetica-Bold' }]}>Balance Due:</Text>
                    <Text style={[styles.summaryValueBold, { color: C.red700 }]}>
                      {formatPDFCurrency(invoice.balance_due, currency)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ═══ Footer: Terms & Signatory ═══ */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.termsBox}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              {business?.terms_and_conditions ||
                invoice.terms_and_conditions ||
                '1. Please remit payment by the due date.\n2. Invoices are subject to jurisdiction in Bengaluru, India.\n3. This is a computer-generated invoice.'}
            </Text>
          </View>

          <View style={styles.signatoryBox}>
            {business?.signature_url ? (
              <Image src={business.signature_url} style={styles.signatureImage} />
            ) : (
              <View style={styles.signaturePlaceholder} />
            )}
            <View style={styles.signatoryLine}>
              <Text style={styles.signatoryCompany}>For {business?.company_name || 'SecuredApp'}</Text>
              <Text style={styles.signatoryText}>Authorized Signatory</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}
