import React, { useState } from 'react';
import {
  FileCode,
  ShieldAlert,
  Bug,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  PROMPT_LOG_DATA,
  EDGE_CASES_DATA,
  AI_FAILURE_EXAMPLES,
} from '../data/documentationData';

export const DocumentationView: React.FC = () => {
  const [activeDocTab, setActiveDocTab] = useState<'prompts' | 'edgecases' | 'failures'>('prompts');

  return (
    <div id="documentation-section" className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs mt-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-200 bg-zinc-50/70">
        <button
          id="tab-prompt-log"
          type="button"
          onClick={() => setActiveDocTab('prompts')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            activeDocTab === 'prompts'
              ? 'border-zinc-900 text-zinc-900 bg-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Deliverable 2: Prompt Log & Architecture</span>
        </button>

        <button
          id="tab-edge-cases"
          type="button"
          onClick={() => setActiveDocTab('edgecases')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            activeDocTab === 'edgecases'
              ? 'border-zinc-900 text-zinc-900 bg-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Deliverable 3: Edge Cases Matrix</span>
        </button>

        <button
          id="tab-ai-failures"
          type="button"
          onClick={() => setActiveDocTab('failures')}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            activeDocTab === 'failures'
              ? 'border-zinc-900 text-zinc-900 bg-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>Deliverable 4: "Where the AI Was Wrong"</span>
        </button>
      </div>

      <div className="p-6">
        {/* Tab 1: Prompt Log & Architecture */}
        {activeDocTab === 'prompts' && (
          <div id="prompt-log-content" className="space-y-6">
            {/* Core Architectural Question & Answer Box */}
            <div className="p-4 rounded-xl bg-zinc-900 text-white border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  {PROMPT_LOG_DATA.architecturalQuestion.question}
                </h3>
              </div>
              <p className="text-sm font-medium text-emerald-300 mb-3">
                {PROMPT_LOG_DATA.architecturalQuestion.answer}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-300">
                {PROMPT_LOG_DATA.architecturalQuestion.keyPoints.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2 bg-zinc-800/60 p-2.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt Iterations Table */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-zinc-700" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                  Prompt Iteration History (1-line Rationale & Impact)
                </h4>
              </div>
              <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-700 font-semibold border-b border-zinc-200 uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-16 text-center">Iter #</th>
                      <th className="py-2.5 px-4 w-1/3">What Changed</th>
                      <th className="py-2.5 px-4 w-1/3">Why It Changed</th>
                      <th className="py-2.5 px-4">Outcome & Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-sans">
                    {PROMPT_LOG_DATA.iterations.map((iter) => (
                      <tr key={iter.iteration} className="hover:bg-zinc-50/50">
                        <td className="py-3 px-3 text-center font-mono font-bold text-zinc-600">
                          v{iter.iteration}
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-900">{iter.change}</td>
                        <td className="py-3 px-4 text-zinc-600">{iter.reason}</td>
                        <td className="py-3 px-4 text-emerald-700 bg-emerald-50/30 font-medium">
                          {iter.impact}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Edge Cases Matrix */}
        {activeDocTab === 'edgecases' && (
          <div id="edge-cases-content" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                  Required Edge Cases Considered & Verified
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  "I detected this case and chose to flag it rather than guess is a strong answer."
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-zinc-100 font-mono text-zinc-700">
                {EDGE_CASES_DATA.length} Edge Cases Documented
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EDGE_CASES_DATA.map((ec) => (
                <div
                  key={ec.id}
                  id={`edge-case-card-${ec.id.toLowerCase()}`}
                  className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold font-mono text-zinc-800">{ec.id}: {ec.title}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          ec.handlingType === 'Flagged'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : ec.handlingType === 'Documented in Assumptions'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {ec.handlingType}
                      </span>
                    </div>

                    <div className="mb-2 p-2 rounded bg-white border border-zinc-200/80 font-mono text-[11px] text-zinc-600">
                      <span className="text-zinc-400 select-none">Input: </span>
                      {ec.inputExample}
                    </div>

                    <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                      {ec.handlingBehavior}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Verification Status:</span>
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified in Engine
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Where the AI Was Wrong */}
        {activeDocTab === 'failures' && (
          <div id="ai-failures-content" className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                3 Concrete Examples Where the AI's First Output Was Wrong & How Caught/Fixed
              </h4>
              <p className="text-xs text-zinc-500 mt-0.5">
                Real failure modes captured during model evaluation and prompt hardening.
              </p>
            </div>

            <div className="space-y-4">
              {AI_FAILURE_EXAMPLES.map((failure, idx) => (
                <div
                  key={failure.id}
                  id={`ai-failure-card-${idx}`}
                  className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <span className="font-bold text-xs text-zinc-900">
                      Case {idx + 1}: {failure.title}
                    </span>
                    <span className="text-[11px] font-mono text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      Identified & Resolved
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded bg-zinc-50 border border-zinc-200">
                      <span className="font-semibold text-zinc-700 block mb-1">Scenario & Input</span>
                      <p className="text-zinc-600 font-mono text-[11px]">{failure.scenario}</p>
                    </div>

                    <div className="p-2.5 rounded bg-rose-50/70 border border-rose-200">
                      <span className="font-semibold text-rose-900 block mb-1">AI's Wrong Output</span>
                      <p className="text-rose-800 leading-relaxed">{failure.aiFirstAnswer}</p>
                    </div>

                    <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-200">
                      <span className="font-semibold text-emerald-900 block mb-1">Root Cause & Fix</span>
                      <p className="text-emerald-800 leading-relaxed font-sans">{failure.fixApplied}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
