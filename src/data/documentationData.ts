export interface PromptIteration {
  iteration: number;
  change: string;
  reason: string;
  impact: string;
}

export interface EdgeCaseItem {
  id: string;
  title: string;
  inputExample: string;
  handlingBehavior: string;
  handlingType: 'Handled' | 'Flagged' | 'Documented in Assumptions';
  verified: boolean;
}

export interface AiFailureExample {
  id: string;
  title: string;
  scenario: string;
  aiFirstAnswer: string;
  rootCause: string;
  fixApplied: string;
}

export const PROMPT_LOG_DATA: {
  iterations: PromptIteration[];
  architecturalQuestion: {
    question: string;
    answer: string;
    keyPoints: string[];
  };
} = {
  iterations: [
    {
      iteration: 1,
      change: 'Initial zero-shot prompt asking the LLM to output both structured item extraction and per-person math totals directly in JSON.',
      reason: 'Baseline test to evaluate if Gemini 3.7 could handle proportional tax and service charge distribution end-to-end.',
      impact: 'Observed ~₹2-₹5 arithmetic drift on proportional tax and failed exact whole-rupee reconciliation against printed total.',
    },
    {
      iteration: 2,
      change: 'Decoupled architecture: restricted LLM strictly to extracting printed receipt items, totals, participants, and consumption mappings, delegating all math to TypeScript.',
      reason: 'LLMs are probabilistic token predictors prone to rounding hallucinations; deterministic code guarantees mathematical invariance (sum of parts === grand total).',
      impact: 'Eliminated all arithmetic errors and allowed strict validation of extracted items vs printed subtotal.',
    },
    {
      iteration: 3,
      change: 'Added explicit extraction instructions for quantities vs line totals (e.g. "Dev and Nikhil each had chicken biryani" where Qty = 2, total = ₹560).',
      reason: 'First prompt version assigned ₹560 to both Dev and Nikhil, double-counting the dish.',
      impact: 'Correctly split multi-quantity identical items across named individuals without duplicating line totals.',
    },
    {
      iteration: 4,
      change: 'Added explicit payer detection rule: if no payer is named in text, return paid_by: null rather than defaulting to the first named person.',
      reason: 'Model previously picked the first participant as the default payer when unspecified.',
      impact: 'Adheres to ground rule: "The payer is named in the description. If no payer is stated, flag it rather than assume one."',
    },
    {
      iteration: 5,
      change: 'Explicitly removed 5% default fallback for service charges: extract service_charge strictly if printed on bill, else return 0.',
      reason: 'Prevented the LLM from inventing unprinted service charges on quick-service or standard cafe receipts.',
      impact: 'Zero service charge bills (e.g., Quick service cafe) are preserved with service_charge = 0.',
    },
  ],
  architecturalQuestion: {
    question: 'Did you let the model do the arithmetic, or extract structured data and compute the totals in code? Why?',
    answer:
      'We strictly extracted structured data via the multimodal LLM and computed all totals, proportional distributions, and reconciliations in deterministic TypeScript code.',
    keyPoints: [
      'Mathematical Precision: LLMs struggle with multi-step floating point pro-rating and rounding consistency (e.g. 1/3 splits across fractional tax rates). Code guarantees exact penny/rupee precision using Largest Remainder (Hare-Niemeyer) whole-rupee allocation.',
      'Guaranteed Component Invariant: Code guarantees that for every person, subtotal + tax_share + service_share + discount_share === total exactly.',
      'Guaranteed Reconciliation: The request contract requires `reconciliation.matches_bill: true`. Code deterministically allocates leftover rounding paise to the payer/absorber and records the exact assumption.',
      'Defensible Anomaly Detection: When line items sum to ₹980 but the printed total is ₹1000, deterministic code compares line item totals against printed subtotal and immediately raises an explicit flag without hallucinating phantom items.',
      'Auditable Fairness: Fairness rules (pre-tax proportional service charge, subtotal discount pro-rating) are encoded as pure mathematical functions with zero stochastic drift.',
    ],
  },
};

export const EDGE_CASES_DATA: EdgeCaseItem[] = [
  {
    id: 'EC-1',
    title: 'Missing Payer in Description',
    inputExample: '"Dev had pasta, Priya had salad. Everything else was shared."',
    handlingBehavior:
      'Sets `paid_by: null`, returns empty `settle_up: []`, and appends an explicit warning to `flags`: "Payer was not identified in the description; settle-up instructions cannot be generated."',
    handlingType: 'Flagged',
    verified: true, // Tested in tests/fairness.test.ts Test 5
  },
  {
    id: 'EC-2',
    title: 'Item in Description Not on Receipt',
    inputExample: '"Karan had the Tacos, Priya had the pasta" (Receipt only contains Burger and Pasta).',
    handlingBehavior:
      'Extracts unmatched item into `unmatched_items_in_description` and pushes to `flags`: "Item \'Tacos\' mentioned in description was not found on the printed bill." Does not fabricate pricing.',
    handlingType: 'Flagged',
    verified: true, // Tested in tests/fairness.test.ts Test 7
  },
  {
    id: 'EC-3',
    title: 'Printed Subtotal vs Line Items Discrepancy',
    inputExample: 'Receipt line items sum to ₹700, but printed subtotal is ₹800.',
    handlingBehavior:
      'Detects difference $|\\sum \\text{items} - \\text{subtotal}| > 0.5$ and appends flag: "Extracted line items sum to ₹700.00 but printed subtotal is ₹800.00 — ₹100.00 unexplained". Reconciles using printed grand total with matches_bill: false.',
    handlingType: 'Flagged',
    verified: true, // Tested in tests/fairness.test.ts Test 9
  },
  {
    id: 'EC-4',
    title: 'Ambiguous Group Wording ("The Rest of Us")',
    inputExample: '"Priya and Karan shared Gulab Jamun, everything else was common to all four (Aman, Priya, Karan, Sara)."',
    handlingBehavior:
      'Resolves "the rest of us" or "common to all" against the parsed roster of participants and documents the resolution in `assumptions`: "\'rest of us\' interpreted as Aman, Priya, Karan, Sara".',
    handlingType: 'Documented in Assumptions',
    verified: true, // Tested in benchmark R2 Tamarind Kitchen
  },
  {
    id: 'EC-5',
    title: 'Subsets Sharing Items (Odd Fractions)',
    inputExample: '"3 people shared a ₹340 dish (113.33 each) with 5% GST and 5% Service Charge."',
    handlingBehavior:
      'Allocates exact fractional shares, labels item as "Arrabiata Pasta (⅓)", applies proportional service and tax, rounds to rupee with Hare-Niemeyer method, and attributes leftover paise to payer with note in `assumptions`.',
    handlingType: 'Documented in Assumptions',
    verified: true, // Tested in benchmark R3 The Daily Grind
  },
  {
    id: 'EC-6',
    title: 'Bill with Zero / No Service Charge',
    inputExample: 'Quick-service cafe receipt without any service charge line item.',
    handlingBehavior:
      'Evaluates `service_share: 0` for all participants without runtime division errors or failing reconciliation.',
    handlingType: 'Handled',
    verified: true, // Tested in tests/fairness.test.ts Test 8
  },
  {
    id: 'EC-7',
    title: 'Bill-Level Discount (Percentage or Fixed Coupon)',
    inputExample: 'Receipt R4: WELCOME15 discount (-15% = -₹228).',
    handlingBehavior:
      'Allocates discount proportionally to each person pre-tax subtotal (`discount_share: -X`) in accordance with Fairness Rule 4.',
    handlingType: 'Handled',
    verified: true, // Tested in benchmark R4 Spice Route
  },
  {
    id: 'EC-8',
    title: 'Unclaimed / Omitted Line Items on Bill',
    inputExample: 'Bill lists Garlic Bread (₹160), but description mentions nobody having it.',
    handlingBehavior:
      'Flags: "Line item \'Garlic Bread\' (₹160) was not accounted for in description." Never fabricates consumption or silently assigns it to diners. Highlights discrepancy in `flags` and reports `matches_bill: false`.',
    handlingType: 'Flagged',
    verified: true, // Tested in tests/fairness.test.ts Test 6
  },
];

export const AI_FAILURE_EXAMPLES: AiFailureExample[] = [
  {
    id: 'FAIL-1',
    title: 'Defaulting Payer When Unspecified in Prompt',
    scenario: 'Description: "Ravi had pizza, Sara had pasta. Bill came to ₹800." (No payer stated).',
    aiFirstAnswer:
      'In early end-to-end testing, the model populated `paid_by: "Ravi"` and generated a settle-up transfer of ₹400 from Sara to Ravi.',
    rootCause:
      'The LLM completed all JSON schema fields aggressively and defaulted to the first participant when no payer was mentioned.',
    fixApplied:
      'Added strict instruction: if no payer is explicitly stated in description, `paid_by` must return `null`, leaving `settle_up: []` with an alert flag.',
  },
  {
    id: 'FAIL-2',
    title: 'Double-Counting Multi-Quantity Line Items',
    scenario: 'Receipt: Chicken Biryani (Qty 2, Total ₹560). Description: "Dev and Nikhil each had a chicken biryani."',
    aiFirstAnswer:
      'Assigned ₹560 to Dev and ₹560 to Nikhil, making individual food subtotals ₹1,120 instead of splitting the ₹560 line total.',
    rootCause:
      'The LLM treated the printed line amount as a per-unit price instead of total line cost for quantity 2.',
    fixApplied:
      'Updated extraction prompt and schema so the line total ₹560 is divided equally across both named consumers (₹280 each).',
  },
  {
    id: 'FAIL-3',
    title: 'Independent Rounding Violating Reconciliation',
    scenario: 'Receipt R1 with 3 participants and +0.40 roundoff (Grand Total ₹1147).',
    aiFirstAnswer:
      'Independent rounding of subtotal (440, 440, 160) + tax (24, 24, 9) + service (21, 21, 8) produced person totals of 485, 485, 176 = 1146, causing `reconciliation.matches_bill: false`.',
    rootCause:
      'Sum of independently rounded floats does not always equal the rounded sum of floats without a largest-remainder allocation step.',
    fixApplied:
      'Implemented the Largest Remainder (Hare-Niemeyer) algorithm for each individual component and allocated printed roundoff residuals directly to the absorber, maintaining `subtotal + service + tax + discount === total` and achieving `matches_bill: true`.',
  },
];
