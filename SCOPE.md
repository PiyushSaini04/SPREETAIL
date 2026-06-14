# SCOPE.md — Anomaly Log & Database Schema

## Overview

This document details every data anomaly found in the provided CSV (`expenses.csv`) across 42 rows, and describes how each was handled by the automated import script (`server/scripts/importCsv.js`).

---

## Database Schema

The application uses PostgreSQL via Prisma ORM with the following core models:

| Model | Purpose |
|-------|---------|
| `User` | Represents each flatmate (Aisha, Rohan, Priya, Meera, Dev, Sam, Kabir) |
| `Group` | A shared flat/household (one group: "The Flat") |
| `GroupMember` | Many-to-many link between Users and Groups with role (ADMIN/MEMBER) |
| `Expense` | A single expense record with amount, payer, split type, and date |
| `ExpenseSplit` | Each person's share of an expense (amountOwed, percentage, shares) |
| `Settlement` | A direct payment from one person to another (not an expense) |
| `Message` | Real-time chat messages attached to a specific expense |

### Key Design Decisions
- **Balances are calculated dynamically** (no stored balance table). This avoids stale data when expenses are updated or deleted.
- **`amount` on Expense is stored in INR always.** USD amounts are converted at import time.
- **`SplitType` is an enum**: `EQUAL | UNEQUAL | PERCENTAGE | SHARES`

---

## Anomaly Log

### 1. Duplicate Row — Marina Bites (2026-02-08)

| Field | Value |
|-------|-------|
| Description | `Dinner at Marina Bites` AND `dinner - marina bites` |
| Paid By | Dev (both) |
| Amount | ₹3200 (both) |

**Problem:** Two rows with the same date, payer, and amount for what appears to be the same dinner. The second entry has a slightly different description ("dinner - marina bites" vs "Dinner at Marina Bites") and no note.

**Action:** The second row is detected as an **exact duplicate** (same `date + payer + amount`). The second row is **skipped**. The first row is imported.

---

### 2. Comma in Amount — Electricity Feb (2026-02-10)

| Field | Value |
|-------|-------|
| Amount Raw | `1,200` |

**Problem:** The amount uses a comma as a thousands separator, which breaks numeric parsing.

**Action:** Commas are stripped before parsing. Imported as `₹1200`.

---

### 3. Mixed Case Payer Names

| Raw Name | Normalised To |
|----------|--------------|
| `priya` | `Priya` |
| `rohan` (Mar 14) | `Rohan` |
| `Priya S` | `Priya` (mapped as same person) |

**Action:** All names are normalised via a canonical name map before lookup or user creation.

---

### 4. Missing Payer — House Cleaning Supplies (2026-02-22)

| Field | Value |
|-------|-------|
| Note | "can't remember who paid" |

**Problem:** The `paid_by` field is empty. Splitwise requires a payer.

**Action:** Row **skipped** with anomaly logged. Cannot create an expense without knowing who paid.

---

### 5. Settlement Detected — Rohan Paid Aisha Back (2026-02-25)

| Field | Value |
|-------|-------|
| Description | "Rohan paid Aisha back" |
| split_type | *(empty)* |
| Note | "this is a settlement not an expense??" |

**Problem:** This is clearly a debt settlement (Rohan paying Aisha ₹5000), not a shared expense.

**Action:** Detected by missing `split_type`. Imported as a **Settlement** record (`paidById = Rohan`, `paidToId = Aisha`) instead of an Expense.

---

### 6. Percentage Sum ≠ 100% — Pizza Friday (2026-02-28)

| Field | Value |
|-------|-------|
| Split Details | Aisha 30%; Rohan 30%; Priya 30%; Meera 20% |
| Sum | 110% |
| Note | "percentages might be off" |

**Problem:** The four percentages add up to 110%, not 100%.

**Action:** Percentages are **proportionally normalized** to sum to 100% (each divided by 1.1). Anomaly logged.

---

### 7. Same issue — Weekend Brunch (2026-03-25)

Same 110% percentage issue as Pizza Friday.

**Action:** Same fix applied — normalized to 100%.

---

### 8. Date Format Inconsistency

| Row | Raw Date | Format | Parsed As |
|-----|----------|--------|-----------|
| March rent | `01/03/2026` | DD/MM/YYYY | 1 March 2026 |
| Airport cab | `Mar 14` | Text month | 14 March 2026 |
| Deep cleaning | `04/05/2026` | Ambiguous | 4 May 2026 (DD/MM, Indian locale) |

**Action:** Multiple date formats are supported. Ambiguous `DD/MM/YYYY` is treated as Indian locale (DD/MM). `Mar 14` is assumed to be 2026.

---

### 9. Ambiguous Date — Deep Cleaning Service (`04/05/2026`)

**Problem:** The note says "is this April 5 or May 4? format is a mess."

**Action:** Treated as `DD/MM/YYYY` = **4 May 2026**. Anomaly logged explaining the assumption.

---

### 10. USD Currency — Goa Trip Expenses

| Row | Amount | Currency | Converted |
|-----|--------|----------|-----------|
| Goa villa booking | $540 | USD | ₹44,820 |
| Beach shack lunch | $84 | USD | ₹6,972 |
| Parasailing | $150 | USD | ₹12,450 |

**Action:** Converted at **1 USD = ₹83** (fixed rate at time of import). Anomaly logged for each.

---

### 11. Negative Amount — Parasailing Refund (2026-03-12)

| Field | Value |
|-------|-------|
| Amount | `-30 USD` |

**Problem:** Negative expense amounts cause calculation issues.

**Action:** Row **skipped**. The refund reduces the original Parasailing expense's real cost, but since we can't modify an already-imported expense retroactively without a separate debit record, this is logged as skipped.

---

### 12. Missing Currency — Groceries DMart (2026-03-15)

| Field | Value |
|-------|-------|
| Note | "forgot to set currency" |

**Action:** **Defaulted to INR** since all other non-Goa-trip expenses are in INR. Anomaly logged.

---

### 13. Zero Amount — Dinner Order Swiggy (2026-03-22)

| Field | Value |
|-------|-------|
| Amount | `0` |
| Note | "counted twice earlier - fixing later" |

**Action:** Row **skipped** (zero-amount expenses are meaningless for balances).

---

### 14. Ad-hoc Member — Kabir (Parasailing, 2026-03-11)

| Field | Value |
|-------|-------|
| split_with | `Aisha;Rohan;Priya;Dev;Dev's friend Kabir` |

**Problem:** "Dev's friend Kabir" is a one-time guest, not a flat member.

**Action:** Kabir is created as a User in the system (as `Kabir`) and included in the split. Anomaly noted.

---

### 15. Near-Duplicate — Thalassa Dinner (2026-03-11)

| Row | Payer | Amount |
|-----|-------|--------|
| "Dinner at Thalassa" | Aisha | ₹2400 |
| "Thalassa dinner" | Rohan | ₹2450 |

**Problem:** Same dinner, logged by two different people with slightly different amounts. The note says "Aisha also logged this I think hers is wrong."

**Action:** Both rows are imported (different payers + amounts = different deduplication keys). Anomaly logged. The group can manually delete the incorrect one via the app UI.

---

### 16. Meera After Move-Out (April expenses)

| Row | Date | split_with |
|-----|------|------------|
| Groceries BigBasket | 2026-04-02 | `Aisha;Rohan;Priya;Meera` |

**Problem:** Meera moved out on 2026-03-28 but is still listed in the April expense split.

**Action:** Meera is **automatically removed** from splits for all expenses dated after 2026-03-28. Anomaly logged.

---

### 17. Conflicting Split Type — Furniture (2026-04-18)

| Field | Value |
|-------|-------|
| split_type | `equal` |
| split_details | `Aisha 1; Rohan 1; Priya 1; Sam 1` |

**Problem:** Split type says equal but share-style details are also present.

**Action:** Treated as **EQUAL** (split_details ignored). Anomaly logged.

---

### 18. Sam Deposit (2026-04-08)

| Field | Value |
|-------|-------|
| Description | "Sam deposit share" |
| split_with | `Aisha` |

**Problem:** Sam paying Aisha a deposit isn't really a shared expense — it's a payment. However unlike the Rohan/Aisha settlement, it has `split_type = equal`, suggesting it was logged as an expense.

**Action:** Imported as-is (equal expense between Sam and Aisha since `split_type` is present). Anomaly noted.
