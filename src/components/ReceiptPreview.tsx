import React from 'react';
import { Receipt, FileText, Image as ImageIcon } from 'lucide-react';

interface ReceiptPreviewProps {
  receiptImageBase64: string;
  restaurantName?: string;
  isSvg?: boolean;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  receiptImageBase64,
  restaurantName,
  isSvg,
}) => {
  if (!receiptImageBase64) {
    return (
      <div
        id="receipt-preview-empty"
        className="w-full h-80 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center text-zinc-400 bg-zinc-50/50 p-6 text-center"
      >
        <Receipt className="w-12 h-12 stroke-1 mb-2 text-zinc-300" />
        <p className="text-sm font-medium text-zinc-600">No Receipt Selected</p>
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
          Upload a receipt image or select one of the sample receipts (R1–R4) to see a live preview.
        </p>
      </div>
    );
  }

  const src = receiptImageBase64.startsWith('data:')
    ? receiptImageBase64
    : `data:image/png;base64,${receiptImageBase64}`;

  return (
    <div id="receipt-preview-container" className="w-full flex flex-col items-center">
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 tracking-wide uppercase">
          <FileText className="w-3.5 h-3.5 text-zinc-500" />
          <span>Receipt View {restaurantName ? `— ${restaurantName}` : ''}</span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-mono">
          {isSvg ? 'Digital Render' : 'Image'}
        </span>
      </div>

      <div className="w-full max-h-[420px] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 flex justify-center shadow-xs">
        <img
          id="receipt-preview-image"
          src={src}
          alt="Receipt preview"
          className="max-h-[400px] w-auto object-contain rounded shadow-xs"
        />
      </div>
    </div>
  );
};
