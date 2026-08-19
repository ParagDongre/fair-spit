export interface PerPersonBreakdown {
  name: string;
  items: string[];
  subtotal: number;
  tax_share: number;
  service_share: number;
  discount_share: number;
  total: number;
}

export interface SettleUpItem {
  from: string;
  to: string;
  amount: number;
}

export interface Reconciliation {
  sum_of_person_totals: number;
  matches_bill: boolean;
}

export interface FairSplitResponse {
  per_person: PerPersonBreakdown[];
  grand_total: number;
  reconciliation: Reconciliation;
  paid_by: string | null;
  settle_up: SettleUpItem[];
  assumptions: string[];
  flags: string[];
}

export interface FairSplitRequest {
  receipt_base64: string;
  description: string;
}

export interface ExtractedLineItem {
  name: string;
  quantity: number;
  amount: number;
}

export interface ExtractedReceiptData {
  restaurant_name?: string;
  bill_number?: string;
  date?: string;
  items: ExtractedLineItem[];
  subtotal: number;
  service_charge: number;
  tax: number;
  discount: number;
  round_off: number;
  grand_total: number;
  participants: string[];
  paid_by: string | null;
  item_assignments: {
    item_name: string;
    item_amount: number;
    consumed_by: string[];
    portion_note?: string;
  }[];
  unmatched_items_in_description: string[];
  llm_assumptions: string[];
  llm_flags: string[];
}

export interface SampleReceipt {
  id: string;
  title: string;
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
  sampleDescription: string;
  imageSvgBase64: string;
}
