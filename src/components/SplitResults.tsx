import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Receipt,
  Scale,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { FairSplitResponse } from '../types';

interface SplitResultsProps {
  results: FairSplitResponse;
}

export const SplitResults: React.FC<SplitResultsProps> = ({ results }) => {
  const { per_person, grand_total, reconciliation, paid_by, settle_up, assumptions, flags } = results;

  return (
    <div id="split-results-container" className="space-y-4">
      {/* Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Grand Total */}
        <div id="card-grand-total" className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Grand Total</span>
            <Receipt className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-mono">₹{grand_total}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Printed Bill Amount</div>
        </div>

        {/* Card 2: Reconciliation */}
        <div id="card-reconciliation" className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Reconciliation</span>
            {reconciliation.matches_bill ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 font-mono">
              ₹{reconciliation.sum_of_person_totals}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                reconciliation.matches_bill
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {reconciliation.matches_bill ? '100% Balanced' : 'Mismatch'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Sum of Per-Person Totals</div>
        </div>

        {/* Card 3: Payer */}
        <div id="card-payer" className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Paid By</span>
            <UserCheck className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 truncate">
            {paid_by || <span className="text-zinc-400 font-normal italic">Unspecified</span>}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {paid_by ? `${settle_up.length} settle-up transfer(s)` : 'No payer detected in text'}
          </div>
        </div>
      </div>

      {/* Settle Up Section */}
      {settle_up.length > 0 && (
        <div id="settle-up-panel" className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 mb-3">
            <Scale className="w-4 h-4 text-zinc-700" />
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Who Owes Whom (Settle-Up)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {settle_up.map((transfer, idx) => (
              <div
                key={idx}
                id={`settle-up-item-${idx}`}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-200/80"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-zinc-900">{transfer.from}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-semibold text-xs text-zinc-900">{transfer.to}</span>
                </div>
                <span className="text-xs font-bold font-mono text-zinc-900 bg-white px-2.5 py-1 rounded border border-zinc-200">
                  ₹{transfer.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per Person Breakdown Table */}
      <div id="per-person-table-panel" className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Per-Person Reconciled Breakdown
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Proportional tax, service charge, and discounts allocated to each diner's food subtotal
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono">
            {per_person.length} Diner(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table id="breakdown-table" className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4 min-w-[200px]">Items Consumed / Shared</th>
                <th className="py-2.5 px-4 text-right">Subtotal</th>
                <th className="py-2.5 px-4 text-right">Tax (GST)</th>
                <th className="py-2.5 px-4 text-right">Service</th>
                <th className="py-2.5 px-4 text-right">Discount</th>
                <th className="py-2.5 px-4 text-right font-bold text-zinc-900">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono">
              {per_person.map((person, idx) => {
                const isPayer = person.name === paid_by;
                return (
                  <tr
                    key={idx}
                    id={`person-row-${person.name.toLowerCase()}`}
                    className={`hover:bg-zinc-50/50 transition-colors ${
                      isPayer ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-sans font-semibold text-zinc-900 flex items-center gap-1.5">
                      <span>{person.name}</span>
                      {isPayer && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium font-sans">
                          Payer
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-zinc-600">
                      <div className="flex flex-wrap gap-1">
                        {person.items.map((it, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-[11px] text-zinc-700"
                          >
                            {it}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-700">₹{person.subtotal}</td>
                    <td className="py-3 px-4 text-right text-zinc-700">₹{person.tax_share}</td>
                    <td className="py-3 px-4 text-right text-zinc-700">₹{person.service_share}</td>
                    <td className="py-3 px-4 text-right text-emerald-700">
                      {person.discount_share < 0 ? `-₹${Math.abs(person.discount_share)}` : '₹0'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-zinc-900 text-sm">
                      ₹{person.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-zinc-50 border-t-2 border-zinc-200 font-mono font-bold text-xs">
              <tr>
                <td colSpan={2} className="py-2.5 px-4 font-sans text-zinc-800 uppercase tracking-wider">
                  Reconciled Total
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-800">
                  ₹{per_person.reduce((s, p) => s + p.subtotal, 0)}
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-800">
                  ₹{per_person.reduce((s, p) => s + p.tax_share, 0)}
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-800">
                  ₹{per_person.reduce((s, p) => s + p.service_share, 0)}
                </td>
                <td className="py-2.5 px-4 text-right text-emerald-700">
                  {per_person.reduce((s, p) => s + p.discount_share, 0) < 0
                    ? `-₹${Math.abs(per_person.reduce((s, p) => s + p.discount_share, 0))}`
                    : '₹0'}
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-900 text-sm">
                  ₹{reconciliation.sum_of_person_totals}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Assumptions & Flags Accordions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Assumptions Box */}
        <div id="assumptions-panel" className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 mb-2 text-zinc-700">
            <Info className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider">Assumptions</h4>
          </div>
          {assumptions && assumptions.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-zinc-600 font-mono list-disc list-inside">
              {assumptions.map((assump, idx) => (
                <li key={idx} className="leading-relaxed">
                  {assump}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-400 italic">No semantic or round-off assumptions were needed.</p>
          )}
        </div>

        {/* Flags Box */}
        <div id="flags-panel" className="bg-white rounded-xl border border-zinc-200 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 mb-2 text-zinc-700">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-semibold uppercase tracking-wider">Auditing Flags</h4>
          </div>
          {flags && flags.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-amber-800 font-mono">
              {flags.map((flag, idx) => (
                <li key={idx} className="p-2 rounded bg-amber-50 border border-amber-200/70 leading-relaxed">
                  ⚠️ {flag}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero discrepancies detected. Bill items and math balance cleanly.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
