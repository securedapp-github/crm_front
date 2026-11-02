import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { formatCurrency, numberToWords, format, calculateTaxBreakdown } from '@/invoice/lib/invoiceUtils';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    lineHeight: 1.4
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 16,
    marginBottom: 16
  },
  headerLeft: {
    maxWidth: 320
  },
  headerRight: {
    alignItems: 'flex-end',
    maxWidth: 220
  },
  badge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignSelf: 'flex-start',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 6
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3
  },
  metaLabel: {
    width: 80,
    color: '#64748b'
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  logo: {
    maxHeight: 50,
    maxWidth: 160,
    objectFit: 'contain',
    marginBottom: 6
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  addressesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12
  },
  addressBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10
  },
  addressBoxTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  addressName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2
  },
  addressText: {
    fontSize: 8.5,
    color: '#475569',
    marginBottom: 2
  },
  table: {
    marginBottom: 16
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  tableRowAlternate: {
    backgroundColor: '#f8fafc'
  },
  tableCell: {
    fontSize: 8.5,
    color: '#334155'
  },
  colNum: { width: '6%', textAlign: 'center' },
  colDesc: { width: '42%' },
  colHsn: { width: '12%', textAlign: 'center' },
  colQty: { width: '10%', textAlign: 'center' },
  colRate: { width: '14%', textAlign: 'right' },
  colAmount: { width: '16%', textAlign: 'right' },
  itemName: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 1
  },
  itemDesc: {
    fontSize: 7.5,
    color: '#64748b'
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 16
  },
  bottomLeft: {
    flex: 1.2
  },
  bottomRight: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 8.5
  },
  summaryLabel: {
    color: '#64748b'
  },
  summaryValue: {
    fontFamily: 'Helvetica',
    color: '#0f172a'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 6,
    marginTop: 4
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  },
  totalValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#059669'
  },
  amountWordsBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12
  },
  amountWordsLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#059669',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  amountWordsText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#065f46'
  },
  bankBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10
  },
  bankTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  bankItem: {
    fontSize: 8,
    color: '#475569',
    marginBottom: 2
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto'
  },
  termsBox: {
    maxWidth: 320
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 3
  },
  termsText: {
    fontSize: 7.5,
    color: '#64748b',
    lineHeight: 1.3
  },
  signatoryBox: {
    alignItems: 'center',
    width: 140
  },
  signatureImage: {
    maxHeight: 36,
    maxWidth: 120,
    objectFit: 'contain',
    marginBottom: 4
  },
  signaturePlaceholder: {
    height: 36
  },
  signatoryLine: {
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    width: '100%',
    paddingTop: 4,
    alignItems: 'center'
  },
  signatoryText: {
    fontSize: 7.5,
    color: '#64748b'
  },
  signatoryCompany: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
  }
});

export default function InvoicePDFDocument({ invoice, business }) {
  if (!invoice) return null;

  const items = invoice.items || [];
  const taxType = invoice.tax_type || 'gst';
  const currency = invoice.currency || 'INR';
  const taxBreakdown = calculateTaxBreakdown(items, taxType);
  const documentTitle = taxType === 'none' ? 'INVOICE' : 'TAX INVOICE';

  const subtotal = Number(taxBreakdown.taxableAmount || 0);
  const totalTax = Number(taxBreakdown.totalTax || 0);
  const grandTotal = Number(invoice.grand_total !== undefined ? invoice.grand_total : (invoice.total || 0));
  const amountPaid = Number(invoice.amount_paid || 0);
  const balanceDue = Number(invoice.balance_due !== undefined ? invoice.balance_due : (grandTotal - amountPaid));

  return (
    <Document title={`Invoice-${invoice.invoice_number || 'Draft'}`} author={business?.company_name || 'SecuredApp'}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.badge}>{documentTitle}</Text>
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
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Status:</Text>
              <Text style={[styles.metaValue, { textTransform: 'capitalize', color: invoice.status === 'paid' ? '#059669' : '#d97706' }]}>
                {invoice.status || 'Draft'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {business?.logo_url ? (
              <Image src={business.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{business?.company_name || 'Your Company'}</Text>
            )}
            {business?.company_name && business.logo_url && (
              <Text style={styles.companyName}>{business.company_name}</Text>
            )}
            {business?.email && <Text style={styles.addressText}>{business.email}</Text>}
            {business?.phone && <Text style={styles.addressText}>{business.phone}</Text>}
          </View>
        </View>

        {/* Addresses */}
        <View style={styles.addressesContainer}>
          <View style={styles.addressBox}>
            <Text style={styles.addressBoxTitle}>Billed By (Issuer)</Text>
            <Text style={styles.addressName}>{business?.company_name || 'Business'}</Text>
            {business?.address && <Text style={styles.addressText}>{business.address}</Text>}
            {business?.gstin && <Text style={styles.addressText}>GSTIN: {business.gstin}</Text>}
            {business?.pan && <Text style={styles.addressText}>PAN: {business.pan}</Text>}
          </View>

          <View style={styles.addressBox}>
            <Text style={styles.addressBoxTitle}>Billed To (Client)</Text>
            <Text style={styles.addressName}>{invoice.customer_name || 'Valued Customer'}</Text>
            {invoice.billing_address && <Text style={styles.addressText}>{invoice.billing_address}</Text>}
            {invoice.customer_email && <Text style={styles.addressText}>{invoice.customer_email}</Text>}
            {invoice.customer_phone && <Text style={styles.addressText}>{invoice.customer_phone}</Text>}
            {invoice.customer_gstin && <Text style={styles.addressText}>GSTIN: {invoice.customer_gstin}</Text>}
            {invoice.customer_pan && <Text style={styles.addressText}>PAN: {invoice.customer_pan}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Item Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colHsn]}>HSN/SAC</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate ({currency})</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount ({currency})</Text>
          </View>

          {items.map((item, index) => {
            const qty = Number(item.quantity) || 1;
            const rate = Number(item.unit_price) || 0;
            const lineTotal = Number(item.total !== undefined ? item.total : qty * rate);
            const isAlt = index % 2 === 1;

            return (
              <View key={index} style={[styles.tableRow, isAlt ? styles.tableRowAlternate : {}]} wrap={false}>
                <Text style={[styles.tableCell, styles.colNum]}>{index + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={styles.itemName}>{item.name || item.description || `Item #${index + 1}`}</Text>
                  {item.description && item.name && item.description !== item.name && (
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.colHsn]}>{item.hsn_sac || '-'}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{qty}</Text>
                <Text style={[styles.tableCell, styles.colRate]}>{rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                <Text style={[styles.tableCell, styles.colAmount, { fontFamily: 'Helvetica-Bold' }]}>
                  {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Bottom Section (Summary + Bank Details) */}
        <View style={styles.bottomSection} wrap={false}>
          <View style={styles.bottomLeft}>
            {/* Amount in Words */}
            <View style={styles.amountWordsBox}>
              <Text style={styles.amountWordsLabel}>Total Amount in Words</Text>
              <Text style={styles.amountWordsText}>{numberToWords(grandTotal, currency)}</Text>
            </View>

            {/* Bank Details */}
            {(business?.bank_name || business?.account_number || business?.upi_id) && (
              <View style={styles.bankBox}>
                <Text style={styles.bankTitle}>Payment & Bank Information</Text>
                {business?.bank_name && <Text style={styles.bankItem}>Bank: {business.bank_name}</Text>}
                {business?.account_holder_name && <Text style={styles.bankItem}>Account Name: {business.account_holder_name}</Text>}
                {business?.account_number && <Text style={styles.bankItem}>Account No: {business.account_number}</Text>}
                {business?.ifsc_code && <Text style={styles.bankItem}>IFSC Code: {business.ifsc_code}</Text>}
                {business?.upi_id && <Text style={styles.bankItem}>UPI ID: {business.upi_id}</Text>}
              </View>
            )}
          </View>

          {/* Totals Summary */}
          <View style={styles.bottomRight}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxable Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal, currency)}</Text>
            </View>

            {taxType === 'gst' && totalTax > 0 && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>CGST:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(totalTax / 2, currency)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>SGST:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(totalTax / 2, currency)}</Text>
                </View>
              </>
            )}

            {taxType === 'igst' && totalTax > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>IGST:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalTax, currency)}</Text>
              </View>
            )}

            {Number(invoice.discount_amount) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount:</Text>
                <Text style={[styles.summaryValue, { color: '#dc2626' }]}>- {formatCurrency(invoice.discount_amount, currency)}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total:</Text>
              <Text style={styles.totalValue}>{formatCurrency(grandTotal, currency)}</Text>
            </View>

            {amountPaid > 0 && (
              <>
                <View style={[styles.summaryRow, { marginTop: 4 }]}>
                  <Text style={styles.summaryLabel}>Amount Paid:</Text>
                  <Text style={[styles.summaryValue, { color: '#059669' }]}>{formatCurrency(amountPaid, currency)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { fontFamily: 'Helvetica-Bold' }]}>Balance Due:</Text>
                  <Text style={[styles.summaryValue, { fontFamily: 'Helvetica-Bold', color: '#b91c1c' }]}>
                    {formatCurrency(balanceDue, currency)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Footer: Terms & Signatory */}
        <View style={styles.footer} wrap={false}>
          <View style={styles.termsBox}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              {business?.terms_and_conditions ||
                invoice.terms_and_conditions ||
                '1. Please remit payment by the due date.\n2. Invoices are subject to jurisdiction in Hyderabad, India.\n3. This is a computer-generated invoice.'}
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
