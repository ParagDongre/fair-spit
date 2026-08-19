# Fair Split — Precision Restaurant Bill Splitter & Fairness Auditor

An AI-powered, deterministic restaurant bill splitter built with **React 19**, **Express**, **TypeScript**, and **Gemini 3.7 Flash**.

Fair Split pairs multimodal vision OCR and natural language understanding with a **deterministic arithmetic engine**. It enforces the 5 core fairness rules of dining math to compute exact whole-rupee allocations, guaranteed component additivity (`subtotal + service + tax - discount === total`), transparent assumption logging, and anomaly flagging.

---

## 🎯 The 5 Fairness Rules Implemented

1. **Individual Consumption Ground Truth**: Each diner pays only for the items they actually ordered or consumed.
2. **Subset Splitting**: Shared dishes (e.g., an appetizer shared by 2 out of 4 people) are split equally among that specific subset, with non-participating diners paying ₹0.
3. **Proportional Taxes & Service Charge**: Service charges and taxes (GST/VAT) are allocated proportionally to each diner's pre-tax food subtotal, not split as a flat average.
4. **Proportional Discounts**: Bill-level discounts and promo codes are pro-rated based on each diner's share of the food subtotal.
5. **Largest Remainder Whole-Rupee Allocation**:
   - Employs the **Largest Remainder (Hare-Niemeyer)** algorithm to distribute integer rupee amounts across Subtotals, Service Charges, Taxes, and Discounts with zero penny/paise drift.
   - Guaranteed component additivity for every individual diner:
     $$\text{subtotal} + \text{service\_share} + \text{tax\_share} - \text{discount\_share} = \text{total}$$
   - Absorbs legitimate printed round-offs explicitly by the designated payer (or highest spender) and documents it in `assumptions`.
   - Never artificially alters a diner's total to force reconciliation on true bill calculation errors; genuine arithmetic discrepancies are raised in `flags`.

---

## 🚀 Quickstart: Clone, Install & Run Locally

### 1. Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended). Check with `node -v`.
- **npm**: v9.0.0 or higher (bundled with Node.js).
- **Gemini API Key**: A free API key from [Google AI Studio](https://aistudio.google.com/).

---

### 2. Clone the Repository & Install Dependencies

```bash
# 1. Clone the repository
git clone https://github.com/ParagDongre/fair-spit.git
cd fair-split

# 2. Install all dependencies
npm install

# (Windows Users Only) If you encounter a lightningcss module error on Windows:
npm install --save-optional lightningcss-win32-x64-msvc
```

---

### 3. Configure Environment Variables

1. Copy the example environment configuration:
```bash
# macOS / Linux / Git Bash
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

# Windows Command Prompt (CMD)
copy .env.example .env
```

2. Open `.env` in your text editor and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> **Note**: The automated audit test suite (`npm test`) runs 100% offline and does **not** require an API key. A valid `GEMINI_API_KEY` is only required when processing new receipt images through the interactive web UI or the live `POST /api/split` endpoint.

---

### 4. Run the Application

#### Development Mode (with Hot Reloading)
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

#### Production Build & Start
```bash
# Compile frontend and bundle the Express server
npm run build

# Start the compiled production server
npm start
```
The application will be live at **[http://localhost:3000](http://localhost:3000)**.

---

### 5. Run the Automated Test Suite

```bash
# Run all 18 automated fairness and arithmetic audit tests
npm test

# Run TypeScript type checks (ensures zero compile errors)
npm run lint

# (Optional) Run the live multimodal Gemini API integration test (requires GEMINI_API_KEY in .env)
npx tsx tests/e2e-api.test.ts
```

---

## 📡 API Specification

### Endpoint: `POST /api/split`

Computes a fair, fully reconciled per-person breakdown from a receipt image and plain-English description.

#### Request Body
```json
{
  "receipt_base64": "<raw base64 string or data:image/...;base64,...>",
  "description": "Three of us — Ravi, Neha, Sameer. Ravi had cappuccino and sandwich. Neha had pasta and lime soda. Sameer had brownie. Sameer paid."
}
```

**Validation & Limits:**
- `receipt_base64`: Required non-empty string (supports PNG, JPG, WEBP, and base64 SVG). Max payload size: 20MB (`HTTP 400` / `413` on invalid input).
- `description`: Required non-empty plain-English string describing participants and consumption (`HTTP 400` if missing).

#### Successful Response (`HTTP 200 OK`)
```json
{
  "per_person": [
    {
      "name": "Ravi",
      "items": ["Cappuccino", "Grilled Chicken Sandwich"],
      "subtotal": 440,
      "service_share": 22,
      "tax_share": 23,
      "discount_share": 0,
      "total": 485
    },
    {
      "name": "Neha",
      "items": ["Penne Arrabiata", "Fresh Lime Soda"],
      "subtotal": 440,
      "service_share": 22,
      "tax_share": 23,
      "discount_share": 0,
      "total": 485
    },
    {
      "name": "Sameer",
      "items": ["Brownie"],
      "subtotal": 160,
      "service_share": 8,
      "tax_share": 9,
      "discount_share": 0,
      "total": 177
    }
  ],
  "grand_total": 1147,
  "reconciliation": {
    "sum_of_person_totals": 1147,
    "matches_bill": true
  },
  "paid_by": "Sameer",
  "settle_up": [
    { "from": "Ravi", "to": "Sameer", "amount": 485 },
    { "from": "Neha", "to": "Sameer", "amount": 485 }
  ],
  "assumptions": [
    "Service charge (₹52) allocated proportionally based on pre-tax food subtotal.",
    "Tax / GST (₹55) allocated proportionally based on pre-tax food subtotal.",
    "Printed round-off adjustment of +₹1 absorbed by Sameer (payer) to reconcile with printed grand total of ₹1147."
  ],
  "flags": []
}
```

---

## 🏗 System Architecture & Design Rationale

### Architectural Question:
> *Did you let the AI model do the arithmetic, or extract structured data and compute the totals in code? Why?*

### Decision: Decoupled AI Extraction + Deterministic Code Math
We strictly delegated **vision OCR and semantic mapping** to Gemini, while executing all **totals, pro-rations, remainder allocations, and settle-up calculations** in deterministic TypeScript (`server/fairness-engine.ts`).

```
┌─────────────────────────┐       ┌──────────────────────────────┐       ┌─────────────────────────────┐
│  Receipt Image (Base64) │       │   Gemini 3.7 Flash           │       │  Deterministic Engine       │
│           +             │ ───►  │   - Line Item & Price OCR    │ ───►  │  - Proportional Tax/Service │
│  English Description    │       │   - Participant Extraction   │       │  - Hare-Niemeyer Remainder  │
└─────────────────────────┘       │   - Consumption Mapping      │       │  - Settle-up Matrix         │
                                  └──────────────────────────────┘       └──────────────┬──────────────┘
                                                                                        │
                                                                                        ▼
                                                                         ┌─────────────────────────────┐
                                                                         │   Reconciled Output JSON    │
                                                                         │   (matches_bill: true)      │
                                                                         └─────────────────────────────┘
```

#### Why?
1. **Zero Arithmetic Drift**: LLMs are probabilistic token predictors prone to cumulative rounding drift (e.g., losing ₹1-₹2 across fractional 1/3 splits).
2. **Guaranteed Invariants**: Deterministic integer paise arithmetic guarantees that for every person:
   $$\text{subtotal} + \text{service\_share} + \text{tax\_share} - \text{discount\_share} = \text{total}$$
3. **Auditability & Anomaly Detection**: When a receipt contains genuine calculation discrepancies, code detects the mismatch immediately and flags it without hallucinating fake line items.

---
## 🛠️ How It Was Built (Development Process & Implementation Details)

Fair Split was engineered from the ground up with a **math-first, decoupled AI architecture**. Here is the exact step-by-step process of how the system was built:

### 1. Phase 1: Pure Mathematical Engine First (TypeScript)
Before writing any AI prompts or frontend code, we built and tested the deterministic arithmetic engine (`server/fairness-engine.ts`):
- **Integer Paise Arithmetic**: Avoided JavaScript floating-point errors (`0.1 + 0.2 !== 0.3`) by scaling all currency calculations to integer paise (cents).
- **Hare-Niemeyer (Largest Remainder) Algorithm**: Implemented proportional distribution for taxes, service charges, and discounts so that integer rounding never loses a single rupee.
- **Component Additivity Guarantee**: Enforced mathematical invariant tests so that for every individual:
  $$\text{subtotal} + \text{service\_share} + \text{tax\_share} - \text{discount\_share} = \text{total}$$
- **Settle-up Graph Matrix**: Built a directional debt resolution algorithm that calculates minimal transfer pairs (`from` $\rightarrow$ `to` $\rightarrow$ `amount`) based on who paid.

---

### 2. Phase 2: Multimodal AI Vision & Semantic Parsing (Gemini 3.7 Flash)
We integrated Google's `@google/genai` SDK (`server/gemini.ts`) strictly for OCR vision and semantic intent extraction:
- **Strict Structured JSON Schema**: Defined strict types (`Type.OBJECT`, `Type.ARRAY`, `Type.NUMBER`) so the model outputs predictable JSON without markdown codeblock drift.
- **Negative Prompting Constraints**: Instructed the LLM:
  - Extract **only** printed numbers; never fabricate prices or unlisted service charges.
  - If no payer is named in the user description, return `paid_by: null` instead of guessing.
  - If a user mentions an item not on the physical receipt, capture it in `unmatched_items_in_description` rather than adding phantom charges.
- **Multi-Format Input Support**: Added base64 image parsing supporting PNG, JPEG, WEBP, and raw XML/SVG receipts.

---

### 3. Phase 3: Full-Stack API Layer (Express + TypeScript)
We created a lightweight, high-performance Express server (`server.ts`):
- Built `POST /api/split` accepting `{ receipt_base64, description }` with 25MB payload support for high-res receipt photos.
- Orchestrated the two-step pipeline:
  1. `extractReceiptAndAssignments()` (Multimodal AI extraction)
  2. `calculateFairSplit()` (Deterministic math & reconciliation)
- Integrated Vite middleware to run both the API backend and frontend SPA under a single port (`3000`) for seamless local development and deployment.

---

### 4. Phase 4: Interactive React Frontend & Audit Inspector (React 19 + Tailwind CSS v4)
We built an interactive UI (`src/App.tsx` and `src/components/`):
- **Live Receipt Preview**: Displays the uploaded receipt alongside the plain-English dining notes.
- **Interactive Split Cards**: Color-coded diner breakdowns showing itemized dishes, proportional taxes, and final totals.
- **Reconciliation & Settle-up Ledger**: Clear badges confirming whether totals match the bill, plus one-click copyable settle-up payment instructions.
- **Interactive JSON Inspector**: Raw API response viewer with syntax highlighting for auditors and developers.
- **Preset Benchmarks**: 4 instant-load benchmark receipts (R1–R4) for testing without needing to take a photo.

---

### 5. Phase 5: Automated Testing & Edge-Case Hardening
We authored a 18-suite offline test framework (`tests/fairness.test.ts`):
- Validated all benchmark receipts (R1 Brew & Bite, R2 Tamarind Kitchen, R3 The Daily Grind, R4 Spice Route).
- Stress-tested edge cases: missing payers, 5-way odd splits on prime totals, zero service charge bills, unassigned items, and malformed inputs.
## 🛡 Edge Cases Considered & Handled

| Edge Case | Scenario Example | System Handling Behavior | Verified In |
| :--- | :--- | :--- | :--- |
| **Bills with NO Service Charge** | Quick service cafe with GST only. | Extracts `service_charge: 0`, allocates ₹0 service share without division-by-zero. | `Test 8` |
| **Receipt Math Discrepancy** | Printed total differs from line item sum. | Sets `matches_bill: false`, raises informative alert in `flags`, never forges numbers. | `Tests 9 & 10` |
| **Item in Description Not on Bill** | Diner describes eating Tacos; bill only has Pasta. | Placed in `unmatched_items_in_description` and flagged without inventing prices. | `Test 7` |
| **Ambiguous Group Phrases** | *"Priya had salad, rest of us had pizza."* | Model resolves participant set difference and logs interpretation in `assumptions`. | Verified |
| **Subset Sharing** | 4 diners present, 2 share a dessert. | Shared cost split 50/50 between the 2 sharing diners; other 2 diners pay ₹0. | `Test 2` |
| **Odd Fractional Splits** | ₹1,003 split across 5 people with GST. | Integer paise arithmetic + Hare-Niemeyer largest remainder allocation; zero drift. | `Test 13` |
| **Missing / Unnamed Payer** | No payer mentioned in text. | Sets `paid_by: null`, leaves `settle_up: []`, and flags missing payer. | `Test 5` |
| **Unassigned Line Items** | Item on bill not claimed by anyone. | Refuses to silently dump cost on others; flags item and marks `matches_bill: false`. | `Test 6` |

---

## 🔍 Where the AI Was Wrong & How We Fixed It

1. **Hallucinated Service Charges on Clean Cafe Receipts**
   - *Problem*: In zero-shot prompts, the model frequently defaulted to adding a 10% service charge on bills that had ₹0 service charge.
   - *Fix*: Implemented strict extraction constraints: *"Service Charge: Extract ONLY if explicitly printed on the bill. If none is printed, return service_charge: 0."*

2. **Rounding Drift on 3-Way Splits**
   - *Problem*: Splitting ₹350 pasta across 3 people in pure LLM generation yielded ₹116.66 each, losing ₹0.02 against the ₹350 bill total.
   - *Fix*: Stripped all arithmetic tasks from the LLM prompt. Deterministic code performs integer-paise math and distributes remainder paise using the Hare-Niemeyer method.

3. **Inventing Phantom Line Items**
   - *Problem*: When a user mentioned an item not on the bill (*"Sameer had garlic naan"* on a butter naan bill), the model fabricated a ₹60 item.
   - *Fix*: Added `unmatched_items_in_description` schema property so unbilled items are recorded as audit notes rather than billed line items.

---

## 🧪 Comprehensive Automated Test Suites

The test suite in `tests/fairness.test.ts` executes **18 automated verification suites**:

- **Test 1**: R1 Brew & Bite Café (Clean split + ₹0.40 roundoff, grand total ₹1,147)
- **Test 2**: R2 Tamarind Kitchen (Subset dessert split, grand total ₹1,345)
- **Test 3**: R3 The Daily Grind (1/3 fractions & unequal drink orders, grand total ₹1,720)
- **Test 4**: R4 Spice Route (WELCOME15 proportional discount, grand total ₹1,436)
- **Test 5**: Missing Payer Handling
- **Test 6**: Unassigned Line Items (Non-fabrication)
- **Test 7**: Items in Description Not on Receipt
- **Test 8**: Zero Service Charge Handling
- **Test 9**: Subtotal Mismatch Discrepancy Detection
- **Test 10**: Grand Total Math Discrepancy Detection
- **Test 11**: Unknown Consumer in Item Assignment
- **Test 12**: Case and Whitespace Normalization
- **Test 13**: 5 People Sharing ₹1,003 with 5% GST and 5% Service Charge
- **Test 14**: Duplicate Item Names on Single Receipt
- **Test 15**: AI Amount Discrepancy Safe Handling
- **Test 16**: Conservative Item Name Normalization
- **Test 17**: Missing Subtotal & Grand Total Rejection
- **Test 18**: Real Express HTTP Endpoint Contract & Validation

```bash
npm test
```

---

## 📂 Project Structure

```
fair-split/
├── src/
│   ├── components/          # UI Components (ReceiptUploader, SplitResults, JsonInspector, etc.)
│   ├── data/                # Benchmark receipt datasets (R1-R4) & audit documentation
│   ├── types.ts             # Global TypeScript schemas and interface definitions
│   ├── App.tsx              # Main interactive React application
│   ├── main.tsx             # Vite client entry point
│   └── index.css            # Tailwind CSS styling entry
├── server/
│   ├── fairness-engine.ts   # Deterministic arithmetic & Hare-Niemeyer reconciliation engine
│   └── gemini.ts            # Multimodal Gemini API integration & schema extractor
├── tests/
│   ├── fairness.test.ts     # 18 automated audit test suites (offline)
│   └── e2e-api.test.ts      # End-to-end multimodal Gemini extraction test
├── server.ts                # Express server with Vite middleware integration
├── vite.config.ts           # Vite configuration with Tailwind CSS plugin
├── package.json             # Dependencies and scripts
└── README.md                # Project documentation
```

---

## 🔧 Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **`Cannot find module lightningcss.win32-x64-msvc.node` (Windows)** | Windows native binary skipped by npm. | Run `npm install --save-optional lightningcss-win32-x64-msvc` or delete `node_modules` and re-run `npm install`. |
| **`GEMINI_API_KEY environment variable is required`** | Missing `.env` file or empty key. | Ensure `.env` exists in the root directory with `GEMINI_API_KEY=your_key` and restart the server. |
| **Port 3000 in use** | Another process is occupying port 3000. | Stop the other process or check running processes with `lsof -i :3000` (macOS/Linux) or `netstat -ano \| findstr :3000` (Windows). |
| **`tsx: command not found`** | Dependencies were not installed. | Run `npm install` before running scripts. |
| **Node.js version warning** | Node runtime is below v18. | Upgrade to Node.js 18 or 20 LTS using `nvm use 20` or by downloading from [nodejs.org](https://nodejs.org/). |

---

## 📄 License

MIT License. Free for open-source and commercial use.
