import React, { useState, useEffect, useRef } from 'react';
import { getInvoicePDFBlob } from '@/utils/pdfManager';
import { Button } from '@/invoice/components/ui/button';
import { ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

export default function LivePDFViewer({ invoice, business, className = '' }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const blobUrlRef = useRef(null);

  const generatePDF = async () => {
    if (!invoice) return;
    try {
      setLoading(true);
      setError(null);
      const blob = await getInvoicePDFBlob(invoice, business);
      if (blob) {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } else {
        throw new Error('Failed to generate PDF blob');
      }
    } catch (err) {
      console.error('LivePDFViewer error:', err);
      setError(err.message || 'Error generating live vector PDF');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePDF();
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [
    invoice?.invoice_number,
    invoice?.grand_total,
    invoice?.subtotal,
    invoice?.status,
    invoice?.tax_type,
    invoice?.items?.length,
    invoice?.customer_name,
    business?.company_name
  ]);

  return (
    <div className={`flex flex-col rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900 shadow-lg ${className}`}>
      {/* Top status & toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-slate-200 text-xs border-b border-slate-700/80">
        <span className="flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Vector PDF Canvas (A4 595 × 842 pt)
        </span>
        <div className="flex items-center gap-2">
          {blobUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(blobUrl, '_blank')}
              className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-700 gap-1"
            >
              <ExternalLink className="h-3 w-3" /> Open in New Tab
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={generatePDF}
            disabled={loading}
            className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-700 gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Frame body */}
      <div className="relative min-h-[600px] lg:min-h-[780px] bg-slate-950 flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-xs text-slate-300 font-medium">Compiling pixel-perfect vector PDF...</p>
          </div>
        )}

        {error ? (
          <div className="p-6 text-center text-rose-400 max-w-md space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
            <p className="text-sm font-semibold">Could not render vector PDF preview</p>
            <p className="text-xs text-slate-400">{error}</p>
            <Button size="sm" variant="outline" onClick={generatePDF} className="text-xs">Try Again</Button>
          </div>
        ) : blobUrl ? (
          <iframe
            src={`${blobUrl}#view=FitH`}
            className="w-full h-[650px] lg:h-[840px] border-0 bg-white"
            title="Live Invoice Vector PDF"
          />
        ) : null}
      </div>
    </div>
  );
}
