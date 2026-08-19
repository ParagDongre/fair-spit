import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Receipt,
  FileCode2,
  Terminal,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Table,
} from 'lucide-react';
import { SAMPLE_RECEIPTS } from './data/sampleReceipts';
import { ReceiptUploader } from './components/ReceiptUploader';
import { ReceiptPreview } from './components/ReceiptPreview';
import { SplitResults } from './components/SplitResults';
import { JsonInspector } from './components/JsonInspector';
import { DocumentationView } from './components/DocumentationView';
import { FairSplitResponse } from './types';

export default function App() {
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>('R1');
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [results, setResults] = useState<FairSplitResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'app' | 'json' | 'docs'>('app');

  // Initialize with sample R1
  useEffect(() => {
    const r1 = SAMPLE_RECEIPTS[0];
    if (r1) {
      setSelectedSampleId(r1.id);
      setReceiptBase64(r1.imageSvgBase64);
      setDescription(r1.sampleDescription);
    }
  }, []);

  const handleRunSplit = async () => {
    if (!receiptBase64 || !description.trim()) {
      setError('Please provide both a receipt image and a description.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/split', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receipt_base64: receiptBase64.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Server responded with status ${response.status}`);
      }

      const data: FairSplitResponse = await response.json();
      setResults(data);
      if (activeMainTab === 'docs') {
        setActiveMainTab('app');
      }
    } catch (err: any) {
      console.error('Fair split failed:', err);
      setError(err?.message || 'Failed to analyze receipt. Please check the receipt format.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSample = SAMPLE_RECEIPTS.find((s) => s.id === selectedSampleId);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-zinc-900 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-zinc-900">Fair Split</h1>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono font-medium">
                  POST /api/split
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 hidden sm:block">
                AI Receipt Parsing & Deterministic Fairness Reconciler
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
            <button
              id="nav-tab-app"
              type="button"
              onClick={() => setActiveMainTab('app')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors ${
                activeMainTab === 'app'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Interactive Split</span>
            </button>

            <button
              id="nav-tab-json"
              type="button"
              onClick={() => setActiveMainTab('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors ${
                activeMainTab === 'json'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Raw JSON Contract</span>
            </button>

            <button
              id="nav-tab-docs"
              type="button"
              onClick={() => setActiveMainTab('docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors ${
                activeMainTab === 'docs'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Deliverables 2-4 Docs</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        {error && (
          <div
            id="error-alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Execution Error</span>
              <p className="mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Interactive Split App */}
        {activeMainTab === 'app' && (
          <div className="space-y-6">
            {/* Split Form & Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form & Uploader (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <ReceiptUploader
                  receiptBase64={receiptBase64}
                  setReceiptBase64={setReceiptBase64}
                  description={description}
                  setDescription={setDescription}
                  selectedSampleId={selectedSampleId}
                  setSelectedSampleId={setSelectedSampleId}
                  isLoading={isLoading}
                  onRunSplit={handleRunSplit}
                />
              </div>

              {/* Right Column: Receipt Preview (5 cols) */}
              <div className="lg:col-span-5">
                <ReceiptPreview
                  receiptImageBase64={receiptBase64}
                  restaurantName={selectedSample?.restaurant}
                  isSvg={Boolean(selectedSample)}
                />
              </div>
            </div>

            {/* Results Section */}
            {results && (
              <div className="pt-4 border-t border-zinc-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                      Calculated Fairness & Settle-Up Breakdown
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Fully reconciled per-person breakdown with tax, service charge, and discounts allocated proportionally
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveMainTab('json')}
                    className="text-xs font-mono font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1.5 rounded transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" /> View Raw JSON
                  </button>
                </div>
                <SplitResults results={results} />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Raw JSON Contract Inspector */}
        {activeMainTab === 'json' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">API Contract Specification</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Verify that `POST /api/split` responds with the exact required schema fields.
                </p>
              </div>
              {results && (
                <button
                  type="button"
                  onClick={() => setActiveMainTab('app')}
                  className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1 bg-zinc-100 px-3 py-1.5 rounded"
                >
                  ← Back to Interactive View
                </button>
              )}
            </div>
            <JsonInspector data={results} />
          </div>
        )}

        {/* Tab 3: Documentation for Deliverables 2-4 */}
        {activeMainTab === 'docs' && (
          <div>
            <div className="mb-2">
              <h2 className="text-base font-bold text-zinc-900 tracking-tight">Assignment Deliverables Documentation</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Comprehensive documentation covering Prompt Iteration Log, Edge Cases Matrix, and AI Failure Case Notes.
              </p>
            </div>
            <DocumentationView />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-4 mt-12 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Tetriz Assignment Submission — "Fair Split"</span>
          <span className="text-zinc-400">Deployed API & Frontend · Model: Gemini 3.7 Flash + TypeScript Engine</span>
        </div>
      </footer>
    </div>
  );
}
