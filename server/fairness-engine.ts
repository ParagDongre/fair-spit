import { ExtractedReceiptData, FairSplitResponse, PerPersonBreakdown, SettleUpItem } from '../src/types';

/**
 * Deterministic Fair Split Arithmetic Engine
 * 
 * Strict Ground Rules & Mathematical Invariants:
 * 1. Line items on the receipt are the ground truth.
 * 2. Each person pays for the items they consumed.
 * 3. Shared items are split equally among the specific consumers sharing that item.
 * 4. Pre-tax Food Subtotal forms the proportional basis for Service Charge, Tax, and Discounts.
 * 5. Deterministic Whole-Rupee Allocation (Hare-Niemeyer / Largest Remainder Method):
 *    - Applied independently to Subtotal, Service Charge, Tax, and Discount shares.
 *    - Guarantees strict component additivity for every single participant:
 *        subtotal + tax_share + service_share + discount_share === total
 *    - Never modifies `person.total` in isolation.
 * 6. Reconciliation:
 *    - Transparently allocates legitimate printed round-off to the designated absorber (payer or highest contributor)
 *      by adjusting the tax/subtotal component and documenting it in assumptions.
 *    - Unexplained discrepancies (unassigned items, mismatched subtotals, invalid grand totals)
 *      remain strictly flagged with `matches_bill: false`.
 * 7. Defensive AI Protection:
 *    - Normalizes participant names (trim, case-insensitive mapping).
 *    - Validates AI item assignments against actual receipt line items and amounts.
 *    - NEVER creates fake participants like "Guest 1" when participants are missing; flags instead.
 *    - Never invents service charges or items.
 */
export function calculateFairSplit(extracted: ExtractedReceiptData): FairSplitResponse {
  const flags: string[] = [...(extracted.llm_flags || [])];
  const assumptions: string[] = [...(extracted.llm_assumptions || [])];

  // 1. Participant List Sanity & Normalization (Never create fake names like "Guest 1")
  const rawParticipants = Array.from(new Set((extracted.participants || []).map((p) => p.trim()).filter(Boolean)));
  let participants: string[] = [];

  if (rawParticipants.length === 0) {
    if (extracted.paid_by && extracted.paid_by.trim()) {
      participants = [extracted.paid_by.trim()];
    } else {
      flags.push('No participants could be identified in the description.');
    }
  } else {
    participants = rawParticipants;
  }

  // Name normalization lookup map for case-insensitive matching
  const participantLookup = new Map<string, string>();
  participants.forEach((p) => participantLookup.set(p.toLowerCase(), p));

  // Conservative item-name normalization (trim, lowercase, collapse internal whitespace, strip trailing punctuation)
  const normalizeItemName = (name: string): string => {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/[\s\-_]+/g, ' ')
      .replace(/[.,:;!?]+$/g, '');
  };

  // 2. Validate Line Items Sum vs Printed Subtotal & Grand Total
  const lineItemsSum = (extracted.items || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  
  const hasSubtotal = extracted.subtotal !== undefined && extracted.subtotal !== null && !isNaN(Number(extracted.subtotal));
  const hasGrandTotal = extracted.grand_total !== undefined && extracted.grand_total !== null && !isNaN(Number(extracted.grand_total));

  if (!hasSubtotal) {
    flags.push('Printed subtotal is missing from receipt data; subtotal cannot be verified.');
  }
  if (!hasGrandTotal) {
    flags.push('Printed grand total is missing from receipt data; final bill reconciliation cannot be established.');
  }

  const printedSubtotal = hasSubtotal ? Number(extracted.subtotal) : 0;
  const printedGrandTotal = hasGrandTotal ? Math.round(Number(extracted.grand_total)) : 0;
  const totalServiceCharge = Number(extracted.service_charge) || 0;
  const totalDiscount = Math.abs(Number(extracted.discount) || 0);
  const totalTax = Number(extracted.tax) || 0;
  const printedRoundOff = Number(extracted.round_off) || 0;

  // Check if line items sum equals printed subtotal
  if (hasSubtotal && Math.abs(lineItemsSum - printedSubtotal) > 0.5) {
    const diff = Math.abs(lineItemsSum - printedSubtotal);
    flags.push(
      `Extracted line items sum to ₹${lineItemsSum.toFixed(2)} but printed subtotal is ₹${printedSubtotal.toFixed(2)} — ₹${diff.toFixed(2)} unexplained`
    );
  }

  // Check if expected math matches printed grand total
  const expectedBillTotal = printedSubtotal + totalServiceCharge + totalTax - totalDiscount + printedRoundOff;
  if (hasGrandTotal && hasSubtotal && Math.abs(expectedBillTotal - printedGrandTotal) > 0.5) {
    const diff = Math.abs(printedGrandTotal - expectedBillTotal);
    flags.push(
      `Printed grand total is ₹${printedGrandTotal} but itemized sum with taxes/discounts is ₹${expectedBillTotal.toFixed(2)} — ₹${diff.toFixed(2)} unexplained`
    );
  }

  // 3. Check for unmatched description items
  if (extracted.unmatched_items_in_description && extracted.unmatched_items_in_description.length > 0) {
    extracted.unmatched_items_in_description.forEach((unmatched) => {
      flags.push(`Item '${unmatched}' mentioned in description was not found on the printed bill.`);
    });
  }

  // 4. Exact Consumption Mapping with Receipt Ground-Truth Validation & Duplicate-Line Guard
  const personExactSubtotals: Record<string, number> = {};
  const personItems: Record<string, string[]> = {};
  participants.forEach((p) => {
    personExactSubtotals[p] = 0;
    personItems[p] = [];
  });

  // Track claimed physical receipt line item indices to prevent charging the same line item multiple times
  const claimedReceiptItemIndices = new Set<number>();
  const receiptItems = extracted.items || [];
  const itemAssignments = extracted.item_assignments || [];
  
  itemAssignments.forEach((assignment) => {
    // Map consumer names safely
    const matchedConsumers: string[] = [];
    (assignment.consumed_by || []).forEach((c) => {
      const canonical = participantLookup.get(c.trim().toLowerCase());
      if (canonical) {
        matchedConsumers.push(canonical);
      } else {
        flags.push(`Consumer '${c}' for item '${assignment.item_name}' is not in the participant list.`);
      }
    });

    // Match physical receipt item by conservatively normalized name among unclaimed receipt lines
    const assignNameNorm = normalizeItemName(assignment.item_name);
    let matchedIndex = -1;
    for (let idx = 0; idx < receiptItems.length; idx++) {
      if (!claimedReceiptItemIndices.has(idx)) {
        if (normalizeItemName(receiptItems[idx].name) === assignNameNorm) {
          matchedIndex = idx;
          break;
        }
      }
    }

    let rawCost = Number(assignment.item_amount) || 0;
    let canonicalItemName = assignment.item_name;

    if (matchedIndex !== -1) {
      claimedReceiptItemIndices.add(matchedIndex);
      const receiptItem = receiptItems[matchedIndex];
      canonicalItemName = receiptItem.name;
      const receiptCost = Number(receiptItem.amount) || 0;

      // Compare Gemini-extracted item amount against receipt amount
      if (Math.abs(rawCost - receiptCost) > 0.01 && rawCost > 0) {
        flags.push(
          `AI amount discrepancy for '${canonicalItemName}': AI claimed ₹${rawCost.toFixed(2)}, but printed receipt shows ₹${receiptCost.toFixed(2)}. Using receipt amount as source of truth.`
        );
      }
      rawCost = receiptCost;
    } else {
      // Check if this item already had all copies claimed on the receipt
      const matchingCount = receiptItems.filter((it) => normalizeItemName(it.name) === assignNameNorm).length;
      if (matchingCount > 0) {
        flags.push(
          `Item '${assignment.item_name}' appears to be assigned more times than printed on receipt (${matchingCount} on receipt). Extra assignment ignored.`
        );
        return; // Prevent charging more than receipt copies
      }
    }

    if (matchedConsumers.length === 0) {
      flags.push(`Line item '${canonicalItemName}' (₹${rawCost}) was not claimed by any valid participant in the description.`);
    } else {
      const share = rawCost / matchedConsumers.length;
      const fractionStr = matchedConsumers.length > 1 ? ` (${formatFraction(1, matchedConsumers.length)})` : '';
      matchedConsumers.forEach((p) => {
        if (personExactSubtotals[p] !== undefined) {
          personExactSubtotals[p] += share;
          personItems[p].push(`${canonicalItemName}${fractionStr}`);
        }
      });
    }
  });

  // Check if any physical bill items remain unassigned
  let hasUnassignedBillItem = false;
  receiptItems.forEach((item, idx) => {
    if (!claimedReceiptItemIndices.has(idx)) {
      hasUnassignedBillItem = true;
      flags.push(`Line item '${item.name}' (₹${item.amount}) was not accounted for in description.`);
    }
  });

  const totalClaimedExactSubtotal = Object.values(personExactSubtotals).reduce((a, b) => a + b, 0);
  const isFullyAccounted = hasSubtotal && !hasUnassignedBillItem && Math.abs(totalClaimedExactSubtotal - printedSubtotal) < 0.5;
  const isBillInternallyConsistent = hasGrandTotal && hasSubtotal && Math.abs(expectedBillTotal - printedGrandTotal) < 0.5;

  // Resolve payer name normalized
  const rawPayer = (extracted.paid_by || '').trim();
  const payerName = rawPayer ? participantLookup.get(rawPayer.toLowerCase()) || null : null;

  // 5. Calculate Exact Pre-Tax Proportions & Target Quantities
  const absorberName = payerName || (participants.length > 0 ? participants.reduce((max, p) => 
    (personExactSubtotals[p] > (personExactSubtotals[max] || 0) ? p : max), participants[0]
  ) : null);

  // Exact proportional amounts
  const exactShares: {
    name: string;
    subtotal: number;
    service: number;
    tax: number;
    discount: number;
  }[] = participants.map((p) => {
    const sub = personExactSubtotals[p] || 0;
    const prop = totalClaimedExactSubtotal > 0 ? sub / totalClaimedExactSubtotal : 0;
    return {
      name: p,
      subtotal: sub,
      service: totalServiceCharge * prop,
      tax: totalTax * prop,
      discount: totalDiscount * prop,
    };
  });

  // Target component integer sums
  const targetSubtotalSum = isFullyAccounted ? Math.round(printedSubtotal) : Math.round(totalClaimedExactSubtotal);
  const targetServiceSum = isFullyAccounted ? Math.round(totalServiceCharge) : Math.round(exactShares.reduce((s, x) => s + x.service, 0));
  const targetTaxSum = isFullyAccounted ? Math.round(totalTax) : Math.round(exactShares.reduce((s, x) => s + x.tax, 0));
  const targetDiscountSum = isFullyAccounted ? Math.round(totalDiscount) : Math.round(exactShares.reduce((s, x) => s + x.discount, 0));

  // 6. Largest-Remainder (Hare-Niemeyer) Integer Rupee Allocation for Each Component
  const roundedSubtotals = allocateIntegerShares(
    exactShares.map((s) => ({ id: s.name, exact: s.subtotal })),
    targetSubtotalSum,
    absorberName
  );

  const roundedServices = allocateIntegerShares(
    exactShares.map((s) => ({ id: s.name, exact: s.service })),
    targetServiceSum,
    absorberName
  );

  const roundedTaxes = allocateIntegerShares(
    exactShares.map((s) => ({ id: s.name, exact: s.tax })),
    targetTaxSum,
    absorberName
  );

  const roundedDiscounts = allocateIntegerShares(
    exactShares.map((s) => ({ id: s.name, exact: s.discount })),
    targetDiscountSum,
    absorberName
  );

  // 7. Assemble Per-Person Breakdown with Guaranteed Component Invariant
  // subtotal + tax_share + service_share + discount_share === total
  const per_person: PerPersonBreakdown[] = participants.map((p) => {
    const sub = roundedSubtotals[p] || 0;
    const serv = roundedServices[p] || 0;
    const tx = roundedTaxes[p] || 0;
    const disc = roundedDiscounts[p] || 0;
    const discountShare = disc > 0 ? -disc : 0;
    const personTotal = sub + serv + tx + discountShare;

    return {
      name: p,
      items: personItems[p] || [],
      subtotal: sub,
      service_share: serv,
      tax_share: tx,
      discount_share: discountShare,
      total: personTotal,
    };
  });

  // 8. Reconcile Printed Bill Round-Off (e.g. +0.40 or -0.30 paise printed on receipt)
  // Legitimate roundoff is absorbed by the designated payer/absorber at the component level,
  // maintaining subtotal + service + tax + discount === total!
  const currentSumOfTotals = per_person.reduce((sum, p) => sum + p.total, 0);

  if (isFullyAccounted && isBillInternallyConsistent) {
    const finalResidual = printedGrandTotal - currentSumOfTotals;
    if (finalResidual !== 0 && Math.abs(finalResidual) <= 3 && absorberName) {
      const absorberPerson = per_person.find((p) => p.name === absorberName) || per_person[0];
      if (absorberPerson) {
        absorberPerson.tax_share += finalResidual;
        absorberPerson.total += finalResidual;

        const sign = finalResidual > 0 ? `+₹${finalResidual}` : `-₹${Math.abs(finalResidual)}`;
        assumptions.push(
          `Printed round-off adjustment of ${sign} absorbed by ${absorberPerson.name} (${
            absorberPerson.name === payerName ? 'payer' : 'highest contributor'
          }) to reconcile with printed grand total of ₹${printedGrandTotal}.`
        );
      }
    }
  }

  // Document Largest-Remainder allocations in assumptions
  if (totalServiceCharge > 0) {
    assumptions.push(`Service charge (₹${totalServiceCharge}) allocated proportionally based on pre-tax food subtotal.`);
  }
  if (totalTax > 0) {
    assumptions.push(`Tax / GST (₹${totalTax}) allocated proportionally based on pre-tax food subtotal.`);
  }
  if (totalDiscount > 0) {
    assumptions.push(`Bill discount (₹${totalDiscount}) allocated proportionally based on pre-tax food subtotal.`);
  }

  // 9. Reconciliation Verification
  const finalSumOfPersonTotals = per_person.reduce((sum, p) => sum + p.total, 0);
  const matchesBill = hasGrandTotal && hasSubtotal && isFullyAccounted && isBillInternallyConsistent && finalSumOfPersonTotals === printedGrandTotal;

  if (!matchesBill) {
    if (!hasGrandTotal) {
      flags.push('Reconciliation incomplete: printed grand total was missing from receipt.');
    } else {
      flags.push(
        `Reconciliation mismatch: sum of person totals (₹${finalSumOfPersonTotals}) does not match printed grand total (₹${printedGrandTotal}).`
      );
    }
  }

  // 10. Settle-up Graph
  const settle_up: SettleUpItem[] = [];

  if (!extracted.paid_by || !rawPayer) {
    flags.push('Payer was not stated in the description; settle-up instructions cannot be generated.');
  } else if (!payerName) {
    flags.push(`Payer '${extracted.paid_by}' named in description is not among the participants.`);
  } else {
    // Everyone except payer pays the payer their exact total
    per_person.forEach((person) => {
      if (person.name !== payerName && person.total > 0) {
        settle_up.push({
          from: person.name,
          to: payerName,
          amount: person.total,
        });
      }
    });
  }

  return {
    per_person,
    grand_total: printedGrandTotal,
    reconciliation: {
      sum_of_person_totals: finalSumOfPersonTotals,
      matches_bill: matchesBill,
    },
    paid_by: payerName,
    settle_up,
    assumptions,
    flags,
  };
}

/**
 * Largest Remainder (Hare-Niemeyer) Algorithm for Integer Rupee Allocation
 */
function allocateIntegerShares(
  entries: { id: string; exact: number }[],
  targetTotal: number,
  absorberId?: string | null
): Record<string, number> {
  const result: Record<string, number> = {};
  if (entries.length === 0) return result;

  // 1. Floor integers
  let currentSum = 0;
  const withRemainders = entries.map((e, idx) => {
    const floorVal = Math.floor(e.exact);
    const rem = e.exact - floorVal;
    currentSum += floorVal;
    return { id: e.id, floorVal, rem, originalIndex: idx };
  });

  let remainderToDistribute = targetTotal - currentSum;

  // 2. Sort by largest fraction descending; absorber gets tie-breaking priority
  withRemainders.sort((a, b) => {
    if (Math.abs(b.rem - a.rem) > 0.00001) {
      return b.rem - a.rem;
    }
    if (a.id === absorberId) return -1;
    if (b.id === absorberId) return 1;
    return a.originalIndex - b.originalIndex;
  });

  // 3. Distribute remaining units
  for (let i = 0; i < withRemainders.length; i++) {
    if (remainderToDistribute > 0) {
      withRemainders[i].floorVal += 1;
      remainderToDistribute -= 1;
    }
  }

  // 4. Populate result
  withRemainders.forEach((item) => {
    result[item.id] = item.floorVal;
  });

  return result;
}

function formatFraction(num: number, den: number): string {
  if (den === 2) return '½';
  if (den === 3) return '⅓';
  if (den === 4) return '¼';
  if (den === 5) return '⅕';
  if (den === 6) return '⅙';
  if (den === 8) return '⅛';
  return `${num}/${den}`;
}
