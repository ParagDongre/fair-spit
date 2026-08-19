import dotenv from 'dotenv';
dotenv.config();

process.env.NODE_ENV = 'test';

import { calculateFairSplit } from '../server/fairness-engine';
import { SAMPLE_RECEIPTS } from '../src/data/sampleReceipts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

function verifyPersonAdditivity(res: any, suiteName: string) {
  res.per_person.forEach((p: any) => {
    const computedTotal = p.subtotal + p.service_share + p.tax_share + p.discount_share;
    assert(
      computedTotal === p.total,
      `${suiteName}: Additivity failed for ${p.name}. Subtotal (${p.subtotal}) + Service (${p.service_share}) + Tax (${p.tax_share}) + Discount (${p.discount_share}) = ${computedTotal}, but total is ${p.total}`
    );
  });
}

console.log('================================================================');
console.log('RUNNING COMPREHENSIVE SUITE OF 18 AUDIT TESTS FOR FAIR SPLIT');
console.log('================================================================\n');

// 1. R1 Brew & Bite Café (Clean split + ₹0.40 roundoff)
console.log('▶ TEST 1: R1 Brew & Bite Café');
const r1 = SAMPLE_RECEIPTS[0];
const res1 = calculateFairSplit({
  items: r1.items.map(it => ({ name: it.item, quantity: it.qty, amount: it.amount })),
  subtotal: r1.subtotal,
  service_charge: r1.serviceCharge,
  tax: r1.gst,
  discount: 0,
  round_off: r1.roundOff,
  grand_total: r1.grandTotal,
  participants: ['Ravi', 'Neha', 'Sameer'],
  paid_by: 'Sameer',
  item_assignments: [
    { item_name: 'Cappuccino', item_amount: 180, consumed_by: ['Ravi'] },
    { item_name: 'Grilled Chicken Sandwich', item_amount: 260, consumed_by: ['Ravi'] },
    { item_name: 'Penne Arrabiata', item_amount: 320, consumed_by: ['Neha'] },
    { item_name: 'Fresh Lime Soda', item_amount: 120, consumed_by: ['Neha'] },
    { item_name: 'Brownie', item_amount: 160, consumed_by: ['Sameer'] },
  ],
  unmatched_items_in_description: [],
  llm_assumptions: [],
  llm_flags: []
});
assert(res1.grand_total === 1147, 'R1 grand_total must be 1147');
assert(res1.reconciliation.sum_of_person_totals === 1147, 'R1 sum must be 1147');
assert(res1.reconciliation.matches_bill === true, 'R1 matches_bill must be true');
verifyPersonAdditivity(res1, 'R1');
console.log('  ✅ R1 Passed (Sum: ₹1147, Matches Bill: true, All components add up)');

// 2. R2 Tamarind Kitchen (All shared except dessert shared by subset)
console.log('▶ TEST 2: R2 Tamarind Kitchen (Subset dessert split)');
const r2 = SAMPLE_RECEIPTS[1];
const res2 = calculateFairSplit({
  items: r2.items.map(it => ({ name: it.item, quantity: it.qty, amount: it.amount })),
  subtotal: r2.subtotal,
  service_charge: r2.serviceCharge,
  tax: r2.gst,
  discount: 0,
  round_off: r2.roundOff,
  grand_total: r2.grandTotal,
  participants: ['Aman', 'Priya', 'Karan', 'Sara'],
  paid_by: 'Priya',
  item_assignments: [
    { item_name: 'Paneer Butter Masala', item_amount: 320, consumed_by: ['Aman', 'Priya', 'Karan', 'Sara'] },
    { item_name: 'Dal Makhani', item_amount: 260, consumed_by: ['Aman', 'Priya', 'Karan', 'Sara'] },
    { item_name: 'Butter Naan', item_amount: 240, consumed_by: ['Aman', 'Priya', 'Karan', 'Sara'] },
    { item_name: 'Jeera Rice', item_amount: 180, consumed_by: ['Aman', 'Priya', 'Karan', 'Sara'] },
    { item_name: 'Gulab Jamun (2 pc)', item_amount: 120, consumed_by: ['Priya', 'Karan'] },
    { item_name: 'Masala Papad', item_amount: 100, consumed_by: ['Aman', 'Priya', 'Karan', 'Sara'] },
  ],
  unmatched_items_in_description: [],
  llm_assumptions: [],
  llm_flags: []
});
assert(res2.grand_total === 1345, 'R2 grand_total must be 1345');
assert(res2.reconciliation.sum_of_person_totals === 1345, 'R2 sum must be 1345');
assert(res2.reconciliation.matches_bill === true, 'R2 matches_bill must be true');
verifyPersonAdditivity(res2, 'R2');
console.log('  ✅ R2 Passed (Sum: ₹1345, Matches Bill: true, All components add up)');

// 3. R3 The Daily Grind (Odd fractions 1/3, alcohol vs non-alcoholic)
console.log('▶ TEST 3: R3 The Daily Grind (1/3 fractions & unequal drinks)');
const r3 = SAMPLE_RECEIPTS[2];
const res3 = calculateFairSplit({
  items: r3.items.map(it => ({ name: it.item, quantity: it.qty, amount: it.amount })),
  subtotal: r3.subtotal,
  service_charge: r3.serviceCharge,
  tax: r3.gst,
  discount: 0,
  round_off: r3.roundOff,
  grand_total: r3.grandTotal,
  participants: ['Ishaan', 'Meera', 'Rohit'],
  paid_by: 'Rohit',
  item_assignments: [
    { item_name: 'Margherita Pizza', item_amount: 380, consumed_by: ['Ishaan', 'Meera', 'Rohit'] },
    { item_name: 'Arrabiata Pasta', item_amount: 340, consumed_by: ['Ishaan', 'Meera', 'Rohit'] },
    { item_name: 'Garlic Bread', item_amount: 160, consumed_by: ['Ishaan', 'Meera', 'Rohit'] },
    { item_name: 'Craft Beer', item_amount: 500, consumed_by: ['Ishaan', 'Rohit'] },
    { item_name: 'Virgin Mojito', item_amount: 180, consumed_by: ['Meera'] },
  ],
  unmatched_items_in_description: [],
  llm_assumptions: [],
  llm_flags: []
});
assert(res3.grand_total === 1720, 'R3 grand_total must be 1720');
assert(res3.reconciliation.sum_of_person_totals === 1720, 'R3 sum must be 1720');
assert(res3.reconciliation.matches_bill === true, 'R3 matches_bill must be true');
verifyPersonAdditivity(res3, 'R3');
console.log('  ✅ R3 Passed (Sum: ₹1720, Matches Bill: true, All components add up)');

// 4. R4 Spice Route (WELCOME15 discount of -15% / -₹228)
console.log('▶ TEST 4: R4 Spice Route (Proportional Discount)');
const r4 = SAMPLE_RECEIPTS[3];
const res4 = calculateFairSplit({
  items: r4.items.map(it => ({ name: it.item, quantity: it.qty, amount: it.amount })),
  subtotal: r4.subtotal,
  service_charge: r4.serviceCharge,
  tax: r4.gst,
  discount: r4.discount?.amount || 0,
  round_off: r4.roundOff,
  grand_total: r4.grandTotal,
  participants: ['Dev', 'Nikhil', 'Anjali', 'Farah'],
  paid_by: 'Anjali',
  item_assignments: [
    { item_name: 'Chicken Biryani', item_amount: 560, consumed_by: ['Dev', 'Nikhil'] },
    { item_name: 'Veg Biryani', item_amount: 240, consumed_by: ['Anjali'] },
    { item_name: 'Mutton Rogan Josh', item_amount: 420, consumed_by: ['Farah'] },
    { item_name: 'Raita', item_amount: 120, consumed_by: ['Dev', 'Nikhil', 'Anjali', 'Farah'] },
    { item_name: 'Soft Drinks', item_amount: 180, consumed_by: ['Dev', 'Nikhil', 'Anjali', 'Farah'] },
  ],
  unmatched_items_in_description: [],
  llm_assumptions: [],
  llm_flags: []
});
assert(res4.grand_total === 1436, 'R4 grand_total must be 1436');
assert(res4.reconciliation.sum_of_person_totals === 1436, 'R4 sum must be 1436');
assert(res4.reconciliation.matches_bill === true, 'R4 matches_bill must be true');
verifyPersonAdditivity(res4, 'R4');
console.log('  ✅ R4 Passed (Sum: ₹1436, Matches Bill: true, All components add up)');

// 5. Missing Payer Test
console.log('▶ TEST 5: Missing Payer');
const t5 = calculateFairSplit({
  items: [{ name: 'Burger', quantity: 1, amount: 300 }, { name: 'Wrap', quantity: 1, amount: 200 }],
  subtotal: 500, service_charge: 25, tax: 25, discount: 0, round_off: 0, grand_total: 550,
  participants: ['UserA', 'UserB'],
  paid_by: null,
  item_assignments: [
    { item_name: 'Burger', item_amount: 300, consumed_by: ['UserA'] },
    { item_name: 'Wrap', item_amount: 200, consumed_by: ['UserB'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t5.paid_by === null, 'Missing payer must set paid_by to null');
assert(t5.settle_up.length === 0, 'Missing payer must produce empty settle_up list');
assert(t5.flags.some(f => f.includes('Payer was not stated')), 'Missing payer must be flagged');
verifyPersonAdditivity(t5, 'T5');
console.log('  ✅ Missing Payer Passed');

// 6. Unassigned Item on Bill
console.log('▶ TEST 6: Unassigned Item on Bill (Non-fabrication)');
const t6 = calculateFairSplit({
  items: [{ name: 'Pizza', quantity: 1, amount: 400 }, { name: 'Garlic Bread', quantity: 1, amount: 160 }],
  subtotal: 560, service_charge: 28, tax: 28, discount: 0, round_off: 0, grand_total: 616,
  participants: ['Aman', 'Priya'],
  paid_by: 'Aman',
  item_assignments: [
    { item_name: 'Pizza', item_amount: 400, consumed_by: ['Aman', 'Priya'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t6.flags.some(f => f.includes('Garlic Bread')), 'Unassigned Garlic Bread must be flagged');
assert(t6.reconciliation.matches_bill === false, 'Bill with unassigned item must not match bill total');
verifyPersonAdditivity(t6, 'T6');
console.log('  ✅ Unassigned Item Passed');

// 7. Item in Description Not on Receipt
console.log('▶ TEST 7: Item in Description Not on Receipt');
const t7 = calculateFairSplit({
  items: [{ name: 'Sandwich', quantity: 1, amount: 250 }],
  subtotal: 250, service_charge: 0, tax: 12.5, discount: 0, round_off: 0.5, grand_total: 263,
  participants: ['Karan', 'Priya'],
  paid_by: 'Karan',
  item_assignments: [
    { item_name: 'Sandwich', item_amount: 250, consumed_by: ['Karan'] }
  ],
  unmatched_items_in_description: ['Tacos'],
  llm_assumptions: [], llm_flags: []
});
assert(t7.flags.some(f => f.includes('Tacos')), 'Unmatched Tacos must be flagged');
console.log('  ✅ Unmatched Description Item Passed');

// 8. Bill with Zero Service Charge
console.log('▶ TEST 8: Zero Service Charge Handling');
const t8 = calculateFairSplit({
  items: [{ name: 'Coffee', quantity: 2, amount: 200 }],
  subtotal: 200, service_charge: 0, tax: 10, discount: 0, round_off: 0, grand_total: 210,
  participants: ['Alice', 'Bob'],
  paid_by: 'Alice',
  item_assignments: [
    { item_name: 'Coffee', item_amount: 200, consumed_by: ['Alice', 'Bob'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t8.per_person.every(p => p.service_share === 0), 'All service shares must be exactly 0');
assert(t8.reconciliation.matches_bill === true, 'Matches bill with zero service charge');
verifyPersonAdditivity(t8, 'T8');
console.log('  ✅ Zero Service Charge Passed');

// 9. Subtotal Mismatch Discrepancy
console.log('▶ TEST 9: Subtotal Mismatch Discrepancy');
const t9 = calculateFairSplit({
  items: [{ name: 'Item 1', quantity: 1, amount: 300 }, { name: 'Item 2', quantity: 1, amount: 400 }],
  subtotal: 800,
  service_charge: 0, tax: 0, discount: 0, round_off: 0, grand_total: 800,
  participants: ['X', 'Y'],
  paid_by: 'X',
  item_assignments: [
    { item_name: 'Item 1', item_amount: 300, consumed_by: ['X'] },
    { item_name: 'Item 2', item_amount: 400, consumed_by: ['Y'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t9.flags.some(f => f.includes('Extracted line items sum to ₹700.00 but printed subtotal is ₹800.00')), 'Must flag subtotal discrepancy');
assert(t9.reconciliation.matches_bill === false, 'Must not claim matches_bill when subtotal is discrepant');
console.log('  ✅ Subtotal Mismatch Flagging Passed');

// 10. Grand Total Math Discrepancy
console.log('▶ TEST 10: Grand Total Math Discrepancy');
const t10 = calculateFairSplit({
  items: [{ name: 'Item 1', quantity: 1, amount: 500 }],
  subtotal: 500, service_charge: 50, tax: 25, discount: 0, round_off: 0, grand_total: 650,
  participants: ['X'],
  paid_by: 'X',
  item_assignments: [
    { item_name: 'Item 1', item_amount: 500, consumed_by: ['X'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t10.flags.some(f => f.includes('Printed grand total is ₹650 but itemized sum with taxes/discounts is ₹575.00')), 'Must flag grand total mismatch');
assert(t10.reconciliation.matches_bill === false, 'Must not claim matches_bill on math mismatch');
console.log('  ✅ Grand Total Mismatch Flagging Passed');

// 11. Unknown Consumer in Item Assignment (Defensive AI Guard)
console.log('▶ TEST 11: Unknown Consumer in Item Assignment');
const t11 = calculateFairSplit({
  items: [{ name: 'Salad', quantity: 1, amount: 200 }],
  subtotal: 200, service_charge: 0, tax: 0, discount: 0, round_off: 0, grand_total: 200,
  participants: ['Ravi'],
  paid_by: 'Ravi',
  item_assignments: [
    { item_name: 'Salad', item_amount: 200, consumed_by: ['Stranger'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t11.flags.some(f => f.includes('Stranger')), 'Unknown consumer must be flagged');
assert(t11.reconciliation.matches_bill === false, 'Unassigned due to unknown consumer must not match bill');
console.log('  ✅ Unknown Consumer Flagging Passed');

// 12. Case and Whitespace Normalization
console.log('▶ TEST 12: Case and Whitespace Normalization');
const t12 = calculateFairSplit({
  items: [{ name: 'Pasta', quantity: 1, amount: 300 }],
  subtotal: 300, service_charge: 0, tax: 0, discount: 0, round_off: 0, grand_total: 300,
  participants: ['  Ravi  ', 'Neha'],
  paid_by: 'RAVI',
  item_assignments: [
    { item_name: 'Pasta', item_amount: 300, consumed_by: ['ravi'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t12.paid_by === 'Ravi', 'Normalized payer must be Ravi');
assert(t12.per_person.find(p => p.name === 'Ravi')?.total === 300, 'Ravi should be assigned 300');
assert(t12.reconciliation.matches_bill === true, 'Matches bill with normalized names');
verifyPersonAdditivity(t12, 'T12');
console.log('  ✅ Case and Whitespace Normalization Passed');

// 13. Odd Quantities & Fractions Non-Dividing Evenly
console.log('▶ TEST 13: 5 People Sharing ₹1,003 with 5% GST and 5% Service Charge');
const t13 = calculateFairSplit({
  items: [{ name: 'Feast Platter', quantity: 1, amount: 1003 }],
  subtotal: 1003, service_charge: 50.15, tax: 50.15, discount: 0, round_off: -0.30, grand_total: 1103,
  participants: ['A', 'B', 'C', 'D', 'E'],
  paid_by: 'A',
  item_assignments: [
    { item_name: 'Feast Platter', item_amount: 1003, consumed_by: ['A', 'B', 'C', 'D', 'E'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t13.grand_total === 1103, 'Grand total must be 1103');
assert(t13.reconciliation.sum_of_person_totals === 1103, 'Sum of person totals must be 1103');
assert(t13.reconciliation.matches_bill === true, 'Matches bill on odd fractions');
verifyPersonAdditivity(t13, 'T13');
console.log('  ✅ Odd Non-Dividing Quantities Passed');

// 14. Duplicate Line Item Name Guard (Multiple copies on receipt vs multiple assignments)
console.log('▶ TEST 14: Duplicate Item Names on Receipt');
const t14 = calculateFairSplit({
  items: [
    { name: 'Cold Coffee', quantity: 1, amount: 150 },
    { name: 'Cold Coffee', quantity: 1, amount: 150 }
  ],
  subtotal: 300, service_charge: 0, tax: 0, discount: 0, round_off: 0, grand_total: 300,
  participants: ['Aman', 'Priya'],
  paid_by: 'Aman',
  item_assignments: [
    { item_name: 'Cold Coffee', item_amount: 150, consumed_by: ['Aman'] },
    { item_name: 'Cold Coffee', item_amount: 150, consumed_by: ['Priya'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t14.grand_total === 300, 'T14 grand total must be 300');
assert(t14.reconciliation.matches_bill === true, 'T14 must match bill for duplicate line items');
assert(t14.per_person.find(p => p.name === 'Aman')?.total === 150, 'Aman pays 150');
assert(t14.per_person.find(p => p.name === 'Priya')?.total === 150, 'Priya pays 150');
verifyPersonAdditivity(t14, 'T14');
console.log('  ✅ Duplicate Item Names Passed');

// 15. AI Amount Discrepancy (Receipt is financial source of truth)
console.log('▶ TEST 15: AI Amount Discrepancy Handled Safely');
const t15 = calculateFairSplit({
  items: [
    { name: 'Biryani', quantity: 1, amount: 450 }
  ],
  subtotal: 450, service_charge: 0, tax: 0, discount: 0, round_off: 0, grand_total: 450,
  participants: ['Ravi'],
  paid_by: 'Ravi',
  item_assignments: [
    { item_name: 'Biryani', item_amount: 500, consumed_by: ['Ravi'] } // AI hallucinated 500 instead of 450
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t15.per_person.find(p => p.name === 'Ravi')?.total === 450, 'Must use receipt amount of 450 as ground truth');
assert(t15.flags.some(f => f.includes('AI amount discrepancy for \'Biryani\'')), 'Must flag AI amount discrepancy');
assert(t15.reconciliation.matches_bill === true, 'Matches bill because receipt amount was used');
verifyPersonAdditivity(t15, 'T15');
console.log('  ✅ AI Amount Discrepancy Passed');

// 16. Conservative Item-Name Normalization (Punctuation, Case, Multiple Spaces)
console.log('▶ TEST 16: Conservative Item Name Normalization');
const t16 = calculateFairSplit({
  items: [
    { name: '  Paneer Butter-Masala! ', quantity: 1, amount: 320 },
    { name: 'Garlic Naan (Butter)', quantity: 2, amount: 160 }
  ],
  subtotal: 480, service_charge: 0, tax: 0, discount: 0, round_off: 0, grand_total: 480,
  participants: ['Aman'],
  paid_by: 'Aman',
  item_assignments: [
    { item_name: 'paneer  butter masala', item_amount: 320, consumed_by: ['Aman'] },
    { item_name: 'Garlic Naan (Butter)', item_amount: 160, consumed_by: ['Aman'] }
  ],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t16.grand_total === 480, 'T16 grand total must be 480');
assert(t16.reconciliation.matches_bill === true, 'Conservative normalization must reconcile cleanly without false matches');
assert(t16.per_person[0].total === 480, 'Aman pays 480');
verifyPersonAdditivity(t16, 'T16');
console.log('  ✅ Conservative Item Name Normalization Passed');

// 17. Missing Subtotal / Missing Grand Total (Never silently substitute or claim reconciliation)
console.log('▶ TEST 17: Missing Subtotal and Grand Total on Receipt');
const t17 = calculateFairSplit({
  items: [{ name: 'Soup', quantity: 1, amount: 180 }],
  subtotal: undefined as any,
  service_charge: 0,
  tax: 0,
  discount: 0,
  round_off: 0,
  grand_total: undefined as any,
  participants: ['Sara'],
  paid_by: 'Sara',
  item_assignments: [{ item_name: 'Soup', item_amount: 180, consumed_by: ['Sara'] }],
  unmatched_items_in_description: [], llm_assumptions: [], llm_flags: []
});
assert(t17.reconciliation.matches_bill === false, 'Cannot claim matches_bill when grand_total is missing');
assert(t17.flags.some(f => f.includes('Printed subtotal is missing')), 'Must flag missing subtotal');
assert(t17.flags.some(f => f.includes('Printed grand total is missing')), 'Must flag missing grand total');
console.log('  ✅ Missing Subtotal & Grand Total Rejection Passed');

// 18. Real HTTP / In-Process Request Test for POST /api/split
console.log('▶ TEST 18: Real HTTP / In-Process Request Test for POST /api/split');
import { createExpressApp } from '../server';
import http from 'http';

async function runHttpEndpointTests() {
  const app = createExpressApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 18a. Rejects missing receipt_base64 with HTTP 400
    const resNoReceipt = await fetch(`${baseUrl}/api/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Ravi had pasta, Sameer paid.' }),
    });
    assert(resNoReceipt.status === 400, `Expected 400 for missing receipt_base64, got ${resNoReceipt.status}`);
    const noReceiptBody = await resNoReceipt.json();
    assert(typeof noReceiptBody.error === 'string', 'Expected error message for missing receipt');

    // 18b. Rejects missing description with HTTP 400
    const resNoDesc = await fetch(`${baseUrl}/api/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt_base64: 'abc12345' }),
    });
    assert(resNoDesc.status === 400, `Expected 400 for missing description, got ${resNoDesc.status}`);
    const noDescBody = await resNoDesc.json();
    assert(typeof noDescBody.error === 'string', 'Expected error message for missing description');

    // 18c. Rejects empty string description with HTTP 400
    const resEmptyDesc = await fetch(`${baseUrl}/api/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt_base64: 'abc12345', description: '   ' }),
    });
    assert(resEmptyDesc.status === 400, `Expected 400 for whitespace description, got ${resEmptyDesc.status}`);

    // 18d. Health check endpoint responds with 200
    const resHealth = await fetch(`${baseUrl}/api/health`);
    assert(resHealth.status === 200, `Expected 200 for health endpoint, got ${resHealth.status}`);
    const healthJson = await resHealth.json();
    assert(healthJson.status === 'ok', 'Health response must be ok');

    console.log('  ✅ Real HTTP Request Tests (Status Codes, Validation & Error Handling) Passed');
  } finally {
    server.close();
  }
}

await runHttpEndpointTests();

console.log('\n================================================================');
console.log('🎉 ALL 18 AUTOMATED VERIFICATION SUITES EXECUTED AND PASSED 100%');
console.log('================================================================');

process.exit(0);
