import { SampleReceipt } from '../types';

export function createReceiptSvgDataUri(receipt: {
  restaurant: string;
  location: string;
  date: string;
  billNo: string;
  items: { item: string; qty: number; amount: number }[];
  subtotal: number;
  discount?: { name: string; amount: number; rateStr?: string };
  serviceCharge: number;
  gst: number;
  roundOff: number;
  grandTotal: number;
}): string {
  const itemRows = receipt.items
    .map(
      (it) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; font-family: monospace;">
        <span style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${it.item}</span>
        <span style="width: 35px; text-align: center;">${it.qty}</span>
        <span style="width: 70px; text-align: right;">₹${it.amount.toFixed(2)}</span>
      </div>`
    )
    .join('');

  const discountRow = receipt.discount
    ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #15803d; font-family: monospace;">
        <span>Discount (${receipt.discount.name} ${receipt.discount.rateStr || ''})</span>
        <span>-₹${receipt.discount.amount.toFixed(2)}</span>
      </div>`
    : '';

  const svgContent = `
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="580" viewBox="0 0 400 580">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="background-color: #faf9f6; color: #1a1a1a; padding: 24px 20px; font-family: 'Courier New', Courier, monospace; height: 100%; box-sizing: border-box; border: 1px solid #e0deda; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <div style="text-align: center; border-bottom: 1px dashed #737373; padding-bottom: 12px; margin-bottom: 14px;">
          <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${receipt.restaurant}</h2>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #525252;">${receipt.location}</p>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #737373; margin-top: 8px;">
            <span>Date: ${receipt.date}</span>
            <span>Bill #${receipt.billNo}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; border-bottom: 1px solid #1a1a1a; padding-bottom: 4px; margin-bottom: 8px;">
          <span style="flex: 1; text-align: left;">ITEM</span>
          <span style="width: 35px; text-align: center;">QTY</span>
          <span style="width: 70px; text-align: right;">AMT (₹)</span>
        </div>

        <div style="border-bottom: 1px dashed #737373; padding-bottom: 10px; margin-bottom: 10px;">
          ${itemRows}
        </div>

        <div style="font-size: 12px; border-bottom: 1px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-family: monospace;">
            <span>Subtotal</span>
            <span>₹${receipt.subtotal.toFixed(2)}</span>
          </div>
          ${discountRow}
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-family: monospace;">
            <span>Service Charge (5%)</span>
            <span>₹${receipt.serviceCharge.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-family: monospace;">
            <span>GST (5% CGST+SGST)</span>
            <span>₹${receipt.gst.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; color: #737373; font-family: monospace;">
            <span>Round-off</span>
            <span>${receipt.roundOff >= 0 ? '+' : ''}₹${receipt.roundOff.toFixed(2)}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; padding: 4px 0 12px 0; border-bottom: 2px solid #1a1a1a; font-family: monospace;">
          <span>GRAND TOTAL</span>
          <span>₹${receipt.grandTotal}</span>
        </div>

        <div style="text-align: center; margin-top: 14px; font-size: 10px; color: #737373;">
          <p style="margin: 0 0 2px 0;">*** THANK YOU FOR DINING WITH US ***</p>
          <p style="margin: 0;">GSTIN: 29AABCU9603R1ZX</p>
        </div>
      </div>
    </foreignObject>
  </svg>
  `;

  // Convert SVG string to base64
  const base64 = btoa(unescape(encodeURIComponent(svgContent)));
  return `data:image/svg+xml;base64,${base64}`;
}

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'R1',
    title: 'R1: Brew & Bite Café',
    restaurant: 'Brew & Bite Café',
    location: 'Koramangala, Bengaluru',
    date: '12 Mar 2026',
    billNo: '0142',
    items: [
      { item: 'Cappuccino', qty: 1, amount: 180 },
      { item: 'Grilled Chicken Sandwich', qty: 1, amount: 260 },
      { item: 'Penne Arrabiata', qty: 1, amount: 320 },
      { item: 'Fresh Lime Soda', qty: 1, amount: 120 },
      { item: 'Brownie', qty: 1, amount: 160 },
    ],
    subtotal: 1040,
    serviceCharge: 52,
    gst: 54.6,
    roundOff: 0.4,
    grandTotal: 1147,
    sampleDescription:
      'Three of us — Ravi, Neha, Sameer. Ravi had the cappuccino and the sandwich. Neha had the pasta and the lime soda. Sameer had the brownie. Sameer paid.',
    imageSvgBase64: createReceiptSvgDataUri({
      restaurant: 'Brew & Bite Café',
      location: 'Koramangala, Bengaluru',
      date: '12 Mar 2026',
      billNo: '0142',
      items: [
        { item: 'Cappuccino', qty: 1, amount: 180 },
        { item: 'Grilled Chicken Sandwich', qty: 1, amount: 260 },
        { item: 'Penne Arrabiata', qty: 1, amount: 320 },
        { item: 'Fresh Lime Soda', qty: 1, amount: 120 },
        { item: 'Brownie', qty: 1, amount: 160 },
      ],
      subtotal: 1040,
      serviceCharge: 52,
      gst: 54.6,
      roundOff: 0.4,
      grandTotal: 1147,
    }),
  },
  {
    id: 'R2',
    title: 'R2: Tamarind Kitchen',
    restaurant: 'Tamarind Kitchen',
    location: 'HSR Layout, Bengaluru',
    date: '14 Mar 2026',
    billNo: '2207',
    items: [
      { item: 'Paneer Butter Masala', qty: 1, amount: 320 },
      { item: 'Dal Makhani', qty: 1, amount: 260 },
      { item: 'Butter Naan', qty: 4, amount: 240 },
      { item: 'Jeera Rice', qty: 1, amount: 180 },
      { item: 'Gulab Jamun (2 pc)', qty: 2, amount: 120 },
      { item: 'Masala Papad', qty: 2, amount: 100 },
    ],
    subtotal: 1220,
    serviceCharge: 61,
    gst: 64.05,
    roundOff: -0.05,
    grandTotal: 1345,
    sampleDescription:
      'Four of us: Aman, Priya, Karan, Sara. The Gulab Jamun was shared just by Priya and Karan. Everything else was common to all four. Priya paid.',
    imageSvgBase64: createReceiptSvgDataUri({
      restaurant: 'Tamarind Kitchen',
      location: 'HSR Layout, Bengaluru',
      date: '14 Mar 2026',
      billNo: '2207',
      items: [
        { item: 'Paneer Butter Masala', qty: 1, amount: 320 },
        { item: 'Dal Makhani', qty: 1, amount: 260 },
        { item: 'Butter Naan', qty: 4, amount: 240 },
        { item: 'Jeera Rice', qty: 1, amount: 180 },
        { item: 'Gulab Jamun (2 pc)', qty: 2, amount: 120 },
        { item: 'Masala Papad', qty: 2, amount: 100 },
      ],
      subtotal: 1220,
      serviceCharge: 61,
      gst: 64.05,
      roundOff: -0.05,
      grandTotal: 1345,
    }),
  },
  {
    id: 'R3',
    title: 'R3: The Daily Grind',
    restaurant: 'The Daily Grind',
    location: 'Powai, Mumbai',
    date: '15 Mar 2026',
    billNo: '1188',
    items: [
      { item: 'Margherita Pizza', qty: 1, amount: 380 },
      { item: 'Arrabiata Pasta', qty: 1, amount: 340 },
      { item: 'Garlic Bread', qty: 1, amount: 160 },
      { item: 'Craft Beer', qty: 2, amount: 500 },
      { item: 'Virgin Mojito', qty: 1, amount: 180 },
    ],
    subtotal: 1560,
    serviceCharge: 78,
    gst: 81.9,
    roundOff: 0.1,
    grandTotal: 1720,
    sampleDescription:
      'Ishaan, Meera, Rohit. Pizza, pasta and garlic bread shared equally by all three. The two beers were Ishaan and Rohit only. The mojito was Meera’s. Rohit paid.',
    imageSvgBase64: createReceiptSvgDataUri({
      restaurant: 'The Daily Grind',
      location: 'Powai, Mumbai',
      date: '15 Mar 2026',
      billNo: '1188',
      items: [
        { item: 'Margherita Pizza', qty: 1, amount: 380 },
        { item: 'Arrabiata Pasta', qty: 1, amount: 340 },
        { item: 'Garlic Bread', qty: 1, amount: 160 },
        { item: 'Craft Beer', qty: 2, amount: 500 },
        { item: 'Virgin Mojito', qty: 1, amount: 180 },
      ],
      subtotal: 1560,
      serviceCharge: 78,
      gst: 81.9,
      roundOff: 0.1,
      grandTotal: 1720,
    }),
  },
  {
    id: 'R4',
    title: 'R4: Spice Route (15% Coupon)',
    restaurant: 'Spice Route',
    location: 'Jubilee Hills, Hyderabad',
    date: '16 Mar 2026',
    billNo: '5521',
    items: [
      { item: 'Chicken Biryani', qty: 2, amount: 560 },
      { item: 'Veg Biryani', qty: 1, amount: 240 },
      { item: 'Mutton Rogan Josh', qty: 1, amount: 420 },
      { item: 'Raita', qty: 2, amount: 120 },
      { item: 'Soft Drinks', qty: 3, amount: 180 },
    ],
    subtotal: 1520,
    discount: { name: 'WELCOME15', amount: 228, rateStr: '-15%' },
    serviceCharge: 76,
    gst: 68.4,
    roundOff: -0.4,
    grandTotal: 1436,
    sampleDescription:
      'Dev and Nikhil each had a chicken biryani. Anjali had the veg biryani. Farah had the rogan josh. The raita and soft drinks were common to all four. We used a 15% off coupon. Anjali paid.',
    imageSvgBase64: createReceiptSvgDataUri({
      restaurant: 'Spice Route',
      location: 'Jubilee Hills, Hyderabad',
      date: '16 Mar 2026',
      billNo: '5521',
      items: [
        { item: 'Chicken Biryani', qty: 2, amount: 560 },
        { item: 'Veg Biryani', qty: 1, amount: 240 },
        { item: 'Mutton Rogan Josh', qty: 1, amount: 420 },
        { item: 'Raita', qty: 2, amount: 120 },
        { item: 'Soft Drinks', qty: 3, amount: 180 },
      ],
      subtotal: 1520,
      discount: { name: 'WELCOME15', amount: 228, rateStr: '-15%' },
      serviceCharge: 76,
      gst: 68.4,
      roundOff: -0.4,
      grandTotal: 1436,
    }),
  },
];
