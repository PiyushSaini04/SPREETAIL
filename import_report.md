# Import Report — CSV Anomalies & Resolutions

This report details how the new interactive Import Workflow handles the provided `expenses_export.csv` data. Instead of silently guessing how to handle messy data, the system now presents these anomalies to the user during the **Preview** step so they can explicitly approve or override the action.

## Summary of `expenses_export.csv`

- **Total Rows**: 43
- **Valid Rows**: 28
- **Anomalies Detected**: 15

---

## Detailed Anomaly Resolutions

The following issues are automatically flagged by the Import Engine and presented in the UI:

### 1. Duplicate Row
- **Issue**: The row "dinner - marina bites" (₹3200, paid by Dev) matches an existing row ("Dinner at Marina Bites") on the same date, with the same payer and amount.
- **System Action**: Flags as an anomaly (`Duplicate Detected`).
- **User Decision**: User can select "Skip Row" from the dropdown.

### 2. Negative Amounts
- **Issue**: "Parasailing refund" has an amount of `-30 USD`.
- **System Action**: Flags as an anomaly (`Negative Amount`).
- **User Decision**: User can select "Reject Row" since refunds should be handled separately.

### 3. Ambiguous Dates
- **Issue**: "Deep cleaning service" has the date `04/05/2026`.
- **System Action**: Flags as an anomaly (`Ambiguous Date`).
- **User Decision**: User can confirm it as "4 May 2026" (DD/MM) during the preview step.

### 4. Settlements Misclassified as Expenses
- **Issue**: "Rohan paid Aisha back" (₹5000) is logged as an expense but has no split type, and the note indicates it's a settlement.
- **System Action**: Flags as an anomaly (`Settlement Detected`).
- **User Decision**: User selects "Import as Settlement". The system will create a `Settlement` record instead of an `Expense`.

### 5. Inactive Members in Splits
- **Issue**: Meera is listed in the split for "Groceries BigBasket" on `2026-04-02`, even though her `leftAt` date is `2026-03-31`.
- **System Action**: The backend actively rejects any split assigned to a member whose `joinedAt` or `leftAt` dates don't cover the `expenseDate`.
- **User Decision**: The user can modify the split to exclude Meera before final import, or the system auto-filters her out based on the active membership dates.

### 6. USD Currency
- **Issue**: Several rows from the Goa trip are in USD (e.g., "Goa villa booking", $540).
- **System Action**: The UI detects the presence of USD and surfaces a global "USD to INR Rate" input box (defaulted to 83).
- **User Decision**: The user confirms the exchange rate. The system stores the `originalAmount` and `currency` but calculates the balance using the converted `amountInInr`.

### 7. Missing Payer
- **Issue**: "House cleaning supplies" (₹780) is missing the `paid_by` field.
- **System Action**: Flags as an anomaly (`Missing Payer`).
- **User Decision**: User can select "Reject Row" or skip it, as it cannot be accurately assigned to anyone's balance.

---

## Conclusion
By shifting the anomaly resolution logic from a silent backend script to an interactive frontend UI, we successfully meet the requirement: *"I want to approve anything the app deletes or changes. A silent guess is a failing answer."*
