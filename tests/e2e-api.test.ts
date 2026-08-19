import dotenv from 'dotenv';
dotenv.config();

import { extractReceiptAndAssignments } from '../server/gemini';
import { calculateFairSplit } from '../server/fairness-engine';
import { SAMPLE_RECEIPTS } from '../src/data/sampleReceipts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('RUNNING END-TO-END /api/split FLOW WITH RECEIPT IMAGE & GEMINI');
  console.log('================================================================\n');

  const r1 = SAMPLE_RECEIPTS[0];
  console.log(`Testing with R1: ${r1.restaurant}`);
  console.log(`Description: "${r1.sampleDescription}"`);

  // Extract receipt data via Gemini or fallback mock
  const rawBase64 = r1.imageSvgBase64;
  const extracted = await extractReceiptAndAssignments(rawBase64, r1.sampleDescription);

  console.log('\nExtracted Data from Image & Description:');
  console.log(`- Subtotal: ₹${extracted.subtotal}`);
  console.log(`- Grand Total: ₹${extracted.grand_total}`);
  console.log(`- Paid by: ${extracted.paid_by}`);
  console.log(`- Participants (${extracted.participants.length}):`, extracted.participants);
  console.log(`- Items count: ${extracted.items.length}`);
  console.log(`- Item assignments count: ${extracted.item_assignments.length}`);

  // Run through deterministic arithmetic engine
  const splitResult = calculateFairSplit(extracted);

  console.log('\nFair Split Calculation Output:');
  console.log(`- Grand Total: ₹${splitResult.grand_total}`);
  console.log(`- Sum of Person Totals: ₹${splitResult.reconciliation.sum_of_person_totals}`);
  console.log(`- Matches Bill: ${splitResult.reconciliation.matches_bill}`);
  console.log('- Per Person Breakdown:');
  splitResult.per_person.forEach((p) => {
    console.log(`  * ${p.name}: subtotal ₹${p.subtotal} + service ₹${p.service_share} + tax ₹${p.tax_share} = ₹${p.total}`);
    // Check component additivity
    assert(
      p.subtotal + p.service_share + p.tax_share + p.discount_share === p.total,
      `Additivity failed for ${p.name}`
    );
  });

  assert(splitResult.grand_total === 1147, 'R1 grand total must be 1147');
  assert(splitResult.reconciliation.matches_bill === true, 'R1 must match bill');
  assert(splitResult.paid_by === 'Sameer', 'Payer must be Sameer');
  assert(splitResult.settle_up.length === 2, 'Ravi and Neha should settle with Sameer');

  console.log('\n✅ End-to-End Multimodal Extraction & Deterministic Split PASSED SUCCESSFULLY!');
}

runEndToEndVerification().catch((err) => {
  console.error('E2E Verification error:', err);
  process.exit(1);
});
