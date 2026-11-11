# Noor ERP – Required Updates: Implementation Plan

Source: "Noor ERP – Required Updates & Improvements" (৯টি section)।
Stack: Laravel 13 + Inertia v3 + React (TSX), Pest tests, PostgreSQL (prod) / SQLite (tests)।

> নোট: এই প্রজেক্টে **Product = Purchase Order (PO)**, **ProductMeal = PO line item**।
> কাজ শুরুর আগে `.ai/rules/*` পড়তে হবে — বিশেষ করে Services rule (invoice price PO থেকে আসবে, meal row `id` দিয়ে match) এবং Resources rule (সব numeric cast)।

---

## Phase ক্রম (Priority অনুযায়ী)

| Phase | কাজ | কেন এই ক্রমে |
| --- | --- | --- |
| 1 | §9 Challan Date, §6 Challan Report, §5 Report pagination | ছোট, দ্রুত ফল, কম ঝুঁকি |
| 2 | §7 Item Sequence | Invoice/PO হিসাব মেলানোর বাগ — জরুরি |
| 3 | §2 Payment Module | Attachment bug fix + Payment Serial |
| 4 | §1 Invoice Module | নতুন column + upload + PO link |
| 5 | §8 Party Billing Rules | Party table extension + invoice warning |
| 6 | §4 Dashboard | Query-heavy, আগের data ঠিক থাকা দরকার |
| 7 | §3 Data Export & Backup | সবশেষে, কারণ নতুন column গুলোও export এ লাগবে |

প্রতিটি phase আলাদা branch/PR; প্রতিটিতে Pest feature test বাধ্যতামূলক, তারপর `vendor/bin/pint --dirty --format agent`।

---

## Phase 1

### §9 Challan Date Management
**বর্তমান:** `resources/js/pages/noor-hotel/chalans.tsx:619` → `useState(new Date().toISOString().slice(0, 10))` — auto today বসে যায়।

**কাজ:**
1. Create mode এ `date` state খালি (`''`) রাখা; Edit mode এ challan এর নিজের date load।
2. Date input এ `required` + "তারিখ নির্বাচন করুন" placeholder/validation message।
3. Backend (`ChallanController` store/update): `date` → `required|date` নিশ্চিত করা (server-side default `now()` থাকলে সরানো)।
4. **Test:** date ছাড়া challan create → 422।

### §6 Challan Report – শুধু Delivered item
**বর্তমান:** `app/Http/Controllers/reports/ChallanReportController.php` সব item দেখায়, quantity `0` সহ।

**কাজ:**
1. Item mapping এ `quantity > 0` filter (eager load এ `items` constraint: `where('quantity', '>', 0)`)।
2. Cancelled challan default ভাবে বাদ (status filter না দিলে)।
3. যে challan এর সব item 0 → report থেকে বাদ (`whereHas('items', qty > 0)`)।
4. Print/PDF view এ একই filter।
5. **Test:** 0-qty item ও cancelled challan report response এ না আসা।

### §5 Report Module – Pagination
**বর্তমান:** Backend এ `per_page` (10–1000) আছে, কিন্তু frontend default 10 এবং Purchase Report এ pagination নেই।

**কাজ:**
1. Allowed list unify: `[25, 50, 100, 250, 500, 'all']`, default **25** — একটা shared helper/trait (`app/Http/Controllers/reports/Concerns/ResolvesPerPage.php` বা Request class)।
2. সব ৪টা report TSX এ per-page dropdown একই component দিয়ে (`resources/js/components/report-per-page.tsx`)।
3. Print/Export এ `per_page=1000` hardcode বাদ → `all=1` param, backend এ `->get()` (paginate নয়), যাতে ১০০০+ record ও আসে।
4. `PaymentReportController` এর in-memory `forPage` → DB-level paginate এ নেওয়া (performance)।
5. **Test:** `per_page=50` → 50 row; `all=1` → সব row।

---

## Phase 2

### §7 Serial & Item Sequence Management
**Root cause:** `InvoiceService::buildItemsFromChallans()` challan → challan_item এর loop order অনুযায়ী group করে, PO (product_meals) এর entry order অনুযায়ী নয়। `invoice_items` / `product_meals` এ কোনো `sort_order` নেই, এবং `Invoice::items()` এ `orderBy` নেই।

**কাজ:**
1. Migration: `product_meals.sort_order` (int) ও `invoice_items.sort_order` (int) যোগ।
   - Backfill: existing rows এ `sort_order = id` ক্রমে (product ভিত্তিক)।
2. `ProductService` create/update: incoming `meals[]` array index → `sort_order` সংরক্ষণ (meal row `id` দিয়ে match — rule মেনে)।
   - PO Import (Excel/email) এও row order → `sort_order`।
3. `ProductMeal` relation: `Product::meals()` → `->orderBy('sort_order')->orderBy('id')`।
4. `InvoiceService::buildItemsFromChallans()`: group করার পর items কে PO এবং `productMeal.sort_order` অনুযায়ী sort; `sort_order` invoice_items এ লেখা।
5. `Invoice::items()` → `->orderBy('sort_order')->orderBy('id')`।
6. Item Name = `productMeal.description` (PO এর মতোই), Quantity অপরিবর্তিত।
7. পুরনো invoice ঠিক করতে: `php artisan invoices:rebuild-items --apply` (existing command) চালানো — sort logic এখানেও প্রযোজ্য হবে।
8. Serial: Invoice/Challan/PO/Payment number generator গুলো (`generateNumber`) এক জায়গায় review — soft-deleted record সহ max ধরে, race condition এ `lockForUpdate`।
9. **Test:** PO তে A,B,C ক্রমে item → challan এ C,A,B ক্রমে deliver → invoice এ A,B,C।

---

## Phase 3 – §2 Payment Module

### Payment Serial Number
1. Migration: `payment_history.payment_number` (string, unique, nullable→backfill)। Format: `PAY-YYYY-00001`।
2. `PaymentHistory` model `creating` hook এ generate (Invoice::boot pattern অনুযায়ী)।
3. Backfill migration: `payment_date, id` ক্রমে number দেওয়া।
4. Payment list/report/print এ Invoice No এর পাশে Payment No কলাম।

### Payment List – শুধু সম্পন্ন Payment
1. Payment page এ tab/filter: **Paid / Received payments** (payment_history rows) বনাম **Due invoices**।
2. Default view: যেসব payment রেকর্ড হয়েছে (`payment_history` based list, payment_number সহ), status badge।
3. Backend: `PaymentPageController` / `InvoiceController::report` এ `?view=payments` endpoint।

### Attachment দেখা যাচ্ছে না (Bug)
**সম্ভাব্য কারণ যাচাই করতে হবে:**
- `php artisan storage:link` production (Docker) এ নেই → `/storage/...` 404।
- `InvoiceController:663` এর download route path mismatch।
- `payment.tsx:1308` শুধু invoice level `attachments` দেখায়, individual payment row এ নয়।

**কাজ:**
1. Docker entrypoint এ `storage:link` নিশ্চিত করা।
2. Public URL এর বদলে authenticated route দিয়ে serve: `GET payments/{payment}/attachment` (`Storage::disk('public')->response()`), যাতে symlink এর উপর নির্ভর না করে।
3. Payment history row এ "View attachment" link/preview (image → thumbnail, pdf → new tab)।
4. **Test:** attachment সহ payment → URL 200 দেয়, file content-type সঠিক।

---

## Phase 4 – §1 Invoice Module

### Terms & Conditions (Optional)
1. Migration: `invoices.terms_conditions` (text, nullable), `invoices.show_terms` (bool, default false)।
2. Optional default template: `parties.default_terms` (Phase 5 এর সাথে) — party select করলে prefill, edit/মুছে ফেলা যাবে।
3. Invoice form এ toggle + textarea; validation `nullable|string`।
4. Print/PDF template এ `show_terms && terms_conditions` হলে footer এ দেখানো।

### Invoice Attachment
1. নতুন table `invoice_attachments` (`invoice_id`, `path`, `original_name`, `mime`, `size`, `type` = `general|po`)। একাধিক file সমর্থন।
2. Upload/delete endpoint: `POST/DELETE invoices/{invoice}/attachments`।
3. Invoice view এ attachment list।

### PO Attachment / সংশ্লিষ্ট PO দেখা
1. Invoice → challans → product (PO) relation আগেই আছে; Invoice detail এ "Related POs" section — PO number, customer PO, `Product::attachment_url` (already exists) link।

### Customer PO না থাকলে Internal PO Number
1. Invoice print এ: `products.customer_po_number ?? products.code` (internal PO)। Label: "PO No." — কোনটা দেখানো হচ্ছে তা tooltip এ।

### PO তে Invoice Number সংরক্ষণ ও প্রদর্শন
1. Relation: `Product::invoices()` (through `challans → invoice_challans`), একটা helper `Product::invoiceNumbers()`।
2. PO list (`po.tsx`) ও PO show/print এ "Invoices" কলাম/section; `ProductResource` এ `invoice_numbers` (controllers rule মেনে `loadDeliveryTotals()` সহ)।
3. PO search এ invoice number দিয়েও খোঁজা যাবে।
4. **Test:** PO এর challan থেকে invoice তৈরি → PO resource এ সেই invoice_number।

---

## Phase 5 – §8 Party-wise Billing Rules & Warning
1. Migration (`parties`): `vat_rate` (decimal nullable), `billing_instructions` (text nullable), `default_terms` (text nullable), `show_billing_warning` (bool default true)।
2. Party form (`party.tsx`) এ "Billing Rules" section — create/edit।
3. Invoice create এ party select করলে **Alert/Warning banner**:
   `Party: ABC Organization — VAT: 5% — Instructions: ...`
4. VAT apply: party `vat_rate` থাকলে invoice item VAT এ সেটা suggest/apply (PO vat_rate এর সাথে mismatch হলে warning দেখাবে, user confirm করবে)।
5. `PartyResource` এ নতুন field cast সহ।
6. **Test:** party এর billing rules save/update; invoice create page এ party data তে rules আসে।

---

## Phase 6 – §4 Dashboard Update
**বর্তমান:** `DashboardController` শুধু count/total দেখায়; `totalDue` challan থেকে হিসাব (ভুল হতে পারে)।

**নতুন widgets (month filter সহ, default চলতি মাস):**
| Widget | Data source |
| --- | --- |
| এই মাসে সবচেয়ে বেশি Order দেওয়া Party | `products` (PO) count/qty, party অনুযায়ী group |
| এই মাসে সবচেয়ে বেশি আয় (Party) | `payment_history.amount` sum by `invoices.party_id`, `payment_date` এই মাস |
| সবচেয়ে বেশি Due Party | `invoices.amount_due` sum by party |
| মাসভিত্তিক Party-wise Order ও Sales | last 12 months, party × month (chart + table) |
| Top Customers | order count, invoiced total, paid, due |
| আয়-ব্যয়-বকেয়া সারসংক্ষেপ | Invoiced, Received, Due (ব্যয় data এখন নেই — আলোচনা দরকার) |

**কাজ:**
1. Query logic `app/Services/DashboardService.php` এ (controller পাতলা রাখা)।
2. Heavy অংশ `Inertia::defer()` + skeleton loader।
3. `totalDue` ঠিক করা: `Invoice::sum('amount_due')`।
4. Charts: existing chart library (package.json দেখে) — নতুন dependency লাগলে approval।
5. **Test:** factory data দিয়ে প্রতিটি metric এর সঠিক party/amount।

> ❓ **প্রশ্ন:** "ব্যয়" (Expense) এর কোনো module এখন নেই। Expense module বানাতে হবে, নাকি শুধু আয় ও বকেয়া দেখালেই হবে?

---

## Phase 7 – §3 Data Export & Backup
1. **Full Export page** (`/admin/export`, permission `export_data`):
   - Module select (Parties, POs + items, Challans + items, Invoices + items, Payments) + date range।
   - Format: **CSV/Excel** (multi-sheet XLSX) — Excel এর জন্য `maatwebsite/excel` বা `openspout` package লাগবে → **dependency approval দরকার**; না হলে native streamed CSV (ZIP এ সব module)।
   - বড় data → Queue job এ generate, শেষ হলে notification + download link।
2. **Full Backup:**
   - `php artisan erp:backup` command: `pg_dump` + `storage/app/public` (attachments) → ZIP, `storage/app/backups` এ।
   - Scheduler এ daily auto backup, পুরনো ৩০ দিনের বেশি গুলো auto delete।
   - Admin page থেকে "Backup now" ও download।
3. প্রতিটি report এর বর্তমান Export (Phase 1 এর `all=1`) এর সাথে consistent।
4. **Test:** export job প্রতিটি module এর expected header ও row count দেয়; permission ছাড়া 403।

---

## Approval / সিদ্ধান্ত লাগবে
1. Expense data কোথা থেকে আসবে (Dashboard §4)।
2. Excel export এর জন্য নতুন composer package যোগ করার অনুমতি (§3)।
3. Payment Serial format (`PAY-YYYY-00001` ঠিক আছে কিনা)।
4. Report default per-page 25 ঠিক আছে কিনা।
5. Party VAT rule invoice এ **auto apply** হবে, নাকি শুধু **warning** দেখাবে।

## প্রতিটি Phase এর Definition of Done
- Migration (`php artisan make:migration`) + rollback কাজ করে।
- Pest feature test পাস (`php artisan test --compact --filter=...`)।
- `vendor/bin/pint --dirty --format agent` চালানো।
- `npm run build` এ TS error নেই।
- নতুন non-obvious সিদ্ধান্ত `.ai/rules` এ `record-rule` দিয়ে রেকর্ড।
