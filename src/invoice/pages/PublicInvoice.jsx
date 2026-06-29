import React, { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/invoice/api/base44Client';
import { Button } from '@/invoice/components/ui/button';
import { Download, Printer } from 'lucide-react';
import InvoicePDFContent from '@/invoice/components/invoice/InvoicePDFContent';

export default function PublicInvoice() {
  const { id } = useParams();
  const printRef = useRef();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['public-invoice', id],
    queryFn: async () => {
      const list = await base44.entities.Invoice.filter({ id });
      return list[0] || null;
    }
  });

  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: async () => {
      const list = await base44.entities.Business.list();
      return list[0] || null;
    }
  });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${invoice?.invoice_number || 'Invoice'}</title>
      <style>body{margin:0;font-family:Inter,-apple-system,sans-serif}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
      </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Invoice Not Found</h1>
          <p className="text-muted-foreground">This invoice may have been removed or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-[900px] mx-auto space-y-4">
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-xl font-bold">{invoice.invoice_number}</h1>
            <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handlePrint}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>
        <div ref={printRef}>
          <InvoicePDFContent invoice={invoice} business={business} />
        </div>
        <p className="text-center text-xs text-muted-foreground no-print pt-4">
          Powered by InvoiceFlow
        </p>
      </div>
    </div>
  );
}
