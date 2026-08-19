import { GoogleGenAI, Type } from '@google/genai';
import { ExtractedReceiptData } from '../src/types';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please add it to your .env file or environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function extractReceiptAndAssignments(
  receiptBase64: string,
  description: string
): Promise<ExtractedReceiptData> {
  const prompt = `You are a precision restaurant bill analyzer and fairness auditor.
Your job is to:
1. Carefully read all printed text, line items, charges, taxes, and totals from the receipt image.
2. Read the user's plain-English description of "who had what" and "who paid".
3. Extract ONLY printed values. Never fabricate or invent items, prices, service charges, taxes, discounts, payers, or consumers.

Strict Ground Rules for Extraction:
- Service Charge: Extract ONLY if explicitly printed on the bill. If the receipt has NO service charge line item, return service_charge: 0. NEVER invent or assume a service charge.
- Tax / GST: Extract the exact printed tax amount (CGST + SGST or VAT/GST). If none printed, return 0.
- Discounts: Extract printed discount amount (e.g. coupon, promo like WELCOME15). If none, return 0.
- Round-off: Extract printed round-off if present, otherwise 0.
- Printed Grand Total: Extract the exact printed final bill total.
- Line Items: Capture every line item on the bill with exact name, quantity, and line total amount in INR (₹).
- Participants: Parse all person names mentioned in description. If no participants are found, return empty array [].
- Payer: Identify who paid ONLY if explicitly named in the description. If no payer is stated or if it's ambiguous, return paid_by: null. DO NOT guess or assume the payer!
- Item Assignments:
  - Assign each receipt item to the array of person names who consumed it based strictly on description.
  - If an item was common/shared by everyone, list all participants in consumed_by.
  - If an item was shared by a subset (e.g. "shared just by Priya and Karan"), list ["Priya", "Karan"].
  - If an item was consumed individually (e.g. "Dev and Nikhil each had a chicken biryani" where bill has qty 2 for ₹560), allocate the item to ["Dev", "Nikhil"].
  - If an item on the receipt is NOT claimed or mentioned in the description, DO NOT assign it to anyone (leave consumed_by: []).
- Unmatched Items: If a person is described as having an item that does NOT exist on the printed bill, list that item name in "unmatched_items_in_description".
- Assumptions: Record any semantic interpretations of group phrases in "llm_assumptions" (e.g. "'rest of us' interpreted as [Aman, Priya, Karan, Sara]").
- Flags: Record any unreadable text, ambiguous names, missing details, or printed irregularities in "llm_flags".

Description to analyze:
"${description}"
`;

  // Clean base64 string (strip data:image/...;base64, if present)
  let cleanBase64 = receiptBase64.trim();
  let mimeType = 'image/png';
  if (cleanBase64.startsWith('data:')) {
    const match = cleanBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      cleanBase64 = match[2];
    }
  }

  // Handle SVG inputs by converting or extracting SVG text if needed,
  // since Gemini API only accepts standard raster images (image/png, image/jpeg, image/webp)
  let parts: any[] = [];
  if (mimeType.includes('svg') || mimeType.includes('xml')) {
    // Decode base64 SVG into text prompt content for multimodal extraction
    try {
      const decodedSvg = Buffer.from(cleanBase64, 'base64').toString('utf-8');
      parts = [
        {
          text: `Receipt SVG Data:\n\`\`\`xml\n${decodedSvg}\n\`\`\`\n\n${prompt}`,
        },
      ];
    } catch {
      parts = [
        {
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ];
    }
  } else {
    // Normal raster image (PNG, JPG, WEBP)
    parts = [
      {
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      },
      {
        text: prompt,
      },
    ];
  }

  let lastError: any = null;
  const modelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
  const ai = getAiClient();

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: parts,
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                restaurant_name: { type: Type.STRING },
                bill_number: { type: Type.STRING },
                date: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      amount: { type: Type.NUMBER },
                    },
                    required: ['name', 'quantity', 'amount'],
                  },
                },
                subtotal: { type: Type.NUMBER },
                service_charge: { type: Type.NUMBER },
                tax: { type: Type.NUMBER },
                discount: { type: Type.NUMBER },
                round_off: { type: Type.NUMBER },
                grand_total: { type: Type.NUMBER },
                participants: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                paid_by: { type: Type.STRING, nullable: true },
                item_assignments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      item_name: { type: Type.STRING },
                      item_amount: { type: Type.NUMBER },
                      consumed_by: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      portion_note: { type: Type.STRING },
                    },
                    required: ['item_name', 'item_amount', 'consumed_by'],
                  },
                },
                unmatched_items_in_description: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                llm_assumptions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                llm_flags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'items',
                'subtotal',
                'grand_total',
                'participants',
                'item_assignments',
                'unmatched_items_in_description',
                'llm_assumptions',
                'llm_flags',
              ],
            },
          },
        });

        const rawJson = response.text ? response.text.trim() : '{}';
        const extractedData: ExtractedReceiptData = JSON.parse(rawJson);
        return extractedData;
      } catch (err: any) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw lastError;
}
