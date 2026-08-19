import React, { useState } from 'react';
import { Copy, Check, Code, ShieldCheck } from 'lucide-react';
import { FairSplitResponse } from '../types';

interface JsonInspectorProps {
  data: FairSplitResponse | null;
}

export const JsonInspector: React.FC<JsonInspectorProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  if (!data) {
    return (
      <div id="json-empty" className="p-8 text-center bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-400 text-xs font-mono">
        Run a Fair Split to inspect the exact API JSON response.
      </div>
    );
  }

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="json-inspector-panel" className="bg-zinc-900 text-zinc-100 rounded-xl overflow-hidden shadow-xs border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            API Contract Output (application/json)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded">
            <ShieldCheck className="w-3 h-3" /> Contract Compliant
          </span>
          <button
            id="copy-json-button"
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="p-4 overflow-x-auto max-h-[500px]">
        <pre className="text-xs font-mono text-zinc-300 leading-relaxed">
          <code>{jsonString}</code>
        </pre>
      </div>
    </div>
  );
};
