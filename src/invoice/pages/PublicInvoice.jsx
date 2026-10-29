import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { invoiceApi } from '@/invoice/api/invoiceClient';
import { Button } from '@/invoice/components/ui/button';
import { Badge } from '@/invoice/components/ui/badge';
import { Download, Printer, CheckCircle2 } from 'lucide-react';
import InvoicePDFContent from '@/invoice/components/invoice/InvoicePDFContent';
import { printInvoicePDF, downloadInvoicePDF } from '@/utils/pdfManager';
import { getStatusColor, getStatusLabel, formatCurrency } from '@/invoice/lib/invoiceUtils';

export default function PublicInvoice() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-invoice', id],
    queryFn: async () => {
      try {
        const res = await invoiceApi.getPublicInvoice(id);
        if (res && res.invoice) {
          return res;
        }
      } catch (err) {
        console.warn('Public endpoint failed, attempting fallback:', err);
      }
      // Fallback for authenticated users viewing their own invoice
      try {
        const list = await invoiceApi.entities.Invoice.filter({ id });
        const businessList = await invoiceApi.entities.Business.list();
        return {
          invoice: list?.[0] || null,
          business: businessList?.[0] || null
        };
      } catch (err) {
        throw new Error('Could not load invoice');
      }
    },
    retry: 1
  });

  const invoice = data?.invoice;
  const business = data?.business;

  const [downloading, setDownloading] = React.useState(false);

  const handlePrint = () => {
    if (invoice) {
      printInvoicePDF(invoice, business);
    }
  };

  const handleDownload = async () => {
    if (!invoice || downloading) return;
    try {
      setDownloading(true);
      await downloadInvoicePDF(invoice, business);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading invoice...</p>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center space-y-3 max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900">Invoice Not Found</h1>
          <p className="text-sm text-slate-500">
            This invoice may have been archived, deleted, or the share link provided is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100/70 py-8 px-4">
      <div className="max-w-[920px] mx-auto space-y-5">
        {/* Top Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 font-display">
                  {invoice.invoice_number}
                </h1>
                <Badge className={getStatusColor(invoice.status) + " border text-[11px] font-medium"}>
                  {getStatusLabel(invoice.status)}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Billed to <strong className="text-slate-700">{invoice.customer_name || 'Customer'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-300"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button
              size="sm"
              disabled={downloading}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-75"
              onClick={handleDownload}
            >
              {downloading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <InvoicePDFContent invoice={invoice} business={business} />
        </div>

        {/* Footer */}
        <div className="text-center space-y-1 pt-2 pb-6 text-xs text-slate-400">
          <p className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Verified & Issued via SecuredApp CRM Invoicing
          </p>
          <p className="text-[11px] text-slate-400">
            For billing inquiries or wire transfers, refer to the payment details specified above.
          </p>
        </div>
      </div>
    </div>
  );
}
