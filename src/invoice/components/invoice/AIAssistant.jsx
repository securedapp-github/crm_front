import React, { useState } from 'react';
import { Button } from '@/invoice/components/ui/button';
import { Textarea } from '@/invoice/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/invoice/components/ui/dialog';
import { Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/invoice/api/base44Client';

export default function AIAssistant({ onGenerate }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert invoice creator. Given this natural language request, generate a complete invoice structure. 
Request: "${prompt}"
Return a JSON object with:
- customer_name, customer_email (guess if not provided)
- invoice_date (today), due_date (15 days from now)
- tax_type: "gst" (default)
- items: array with name, description, quantity, rate, discount_percent (0), tax_percent (18 default), hsn_code (guess appropriate HSN)
- notes: professional payment notes
- terms_and_conditions: standard payment terms
Calculate reasonable amounts. If rates aren't specified, use industry-standard Indian rates. Make descriptions professional. For GST, use 18% unless specified otherwise.`,
      response_json_schema: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          customer_email: { type: 'string' },
          invoice_date: { type: 'string' },
          due_date: { type: 'string' },
          tax_type: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                hsn_code: { type: 'string' },
                quantity: { type: 'number' },
                rate: { type: 'number' },
                discount_percent: { type: 'number' },
                tax_percent: { type: 'number' }
              }
            }
          },
          notes: { type: 'string' },
          terms_and_conditions: { type: 'string' }
        }
      }
    });
    setLoading(false);
    if (res) {
      onGenerate(res);
      setOpen(false);
      setPrompt('');
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 hover:border-purple-300 text-purple-700" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5" /> AI Assistant
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" /> AI Invoice Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Describe the invoice you want to create. Include client name, services, and amounts.</p>
            <Textarea
              placeholder={`e.g. "Create invoice for website development worth ₹75,000 for Zenith Solutions. Add GST."`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="h-32"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {['Website development ₹75,000 for XYZ Corp', 'SEO services ₹25,000/month for Acme Ltd', 'UI/UX design ₹45,000 + GST for Startup Inc'].map((suggestion) => (
                <button
                  key={suggestion}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-purple-100 transition-colors text-left"
                  onClick={() => setPrompt(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="gap-2 bg-purple-600 hover:bg-purple-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
