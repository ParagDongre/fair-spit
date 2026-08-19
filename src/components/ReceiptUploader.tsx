import React, { useRef } from 'react';
import { Upload, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
import { SAMPLE_RECEIPTS } from '../data/sampleReceipts';
import { SampleReceipt } from '../types';

interface ReceiptUploaderProps {
  receiptBase64: string;
  setReceiptBase64: (base64: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  selectedSampleId: string | null;
  setSelectedSampleId: (id: string | null) => void;
  isLoading: boolean;
  onRunSplit: () => void;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  receiptBase64,
  setReceiptBase64,
  description,
  setDescription,
  selectedSampleId,
  setSelectedSampleId,
  isLoading,
  onRunSplit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setReceiptBase64(result);
      setSelectedSampleId(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: SampleReceipt) => {
    setSelectedSampleId(sample.id);
    setReceiptBase64(sample.imageSvgBase64);
    setDescription(sample.sampleDescription);
  };

  return (
    <div id="receipt-uploader-panel" className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">Receipt & Dining Description</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Upload a bill image or pick a benchmark sample to test</p>
        </div>
      </div>

      {/* Sample Quick Selector */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
          Benchmark Sample Bills (R1–R4)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SAMPLE_RECEIPTS.map((sample) => {
            const isSelected = selectedSampleId === sample.id;
            return (
              <button
                key={sample.id}
                id={`sample-button-${sample.id.toLowerCase()}`}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className={`flex flex-col p-2.5 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs'
                    : 'border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100/80 text-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold font-mono">{sample.id}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <span className="text-[11px] font-medium truncate w-full">{sample.restaurant}</span>
                <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  Total: ₹{sample.grandTotal}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drag and drop upload */}
      <div className="mb-4">
        <div
          id="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 transition-colors rounded-lg p-4 text-center cursor-pointer bg-zinc-50/40"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
          <p className="text-xs font-medium text-zinc-700">
            {receiptBase64 ? 'Click or drop to replace bill photo' : 'Click or drop custom bill photo here'}
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Supports PNG, JPG, JPEG, WEBP</p>
        </div>
      </div>

      {/* Description Textarea */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="description-input" className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
            Dining Description & Payer
          </label>
          <span className="text-[11px] text-zinc-400">Plain English</span>
        </div>
        <textarea
          id="description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 'Three of us — Ravi, Neha, Sameer. Ravi had the cappuccino and the sandwich. Neha had the pasta and the lime soda. Sameer had the brownie. Sameer paid.'"
          rows={4}
          className="w-full text-xs font-mono p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 resize-y"
        />
      </div>

      {/* Action Button */}
      <button
        id="run-fair-split-button"
        type="button"
        disabled={isLoading || !receiptBase64 || !description.trim()}
        onClick={onRunSplit}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white font-medium text-xs tracking-wide transition-all shadow-xs"
      >
        {isLoading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Extracting & Calculating Fair Split...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Run Fair Split & Reconcile</span>
          </>
        )}
      </button>
    </div>
  );
};
