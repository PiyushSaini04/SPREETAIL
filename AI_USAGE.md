# AI_USAGE.md — AI Tools & Honest Assessment

## Tools Used

| Tool | Version | Used For |
|------|---------|----------|
| **Antigravity (Gemini/Claude)** | Google DeepMind | Full-stack scaffolding, business logic, debugging, documentation |

---

## Key Prompts Used

1. *"Build a 2-day Splitwise clone MVP with Node.js/Express, Prisma, PostgreSQL, React/Vite, and Socket.io. Include equal, unequal, percentage, and share-based splits. No payments, no file uploads, INR currency."*

2. *"Write the balance calculation service. It should read all expenses and settlements for a group and return a list of who owes what to whom."*

3. *"Implement the CSV import script that reads expenses.csv, detects anomalies (duplicates, bad dates, missing payers, wrong currencies), inserts data into the database, and generates an import_report.md."*

4. *"Write SCOPE.md documenting every anomaly in the CSV data and how it was handled, plus the database schema."*

5. *"Implement a 2-step Import Preview and Confirm workflow so the user can approve or override anomalies before inserting."*

6. *"Update the backend to enforce explicit membership dates `joinedAt` and `leftAt` so balances are correctly calculated when users move in and out."*

7. *"Fix: when registering a new user the server throws ERR_MODULE_NOT_FOUND for bcryptjs."*

---

## Three Concrete Cases Where the AI Produced Something Wrong

### Case 1: The `node_modules` Was Pushed to GitHub

**What happened:**
When the AI ran `git init && git add . && git commit`, it staged and committed the entire `server/node_modules` directory (thousands of files) because no `.gitignore` existed at that time. The AI should have created a `.gitignore` before the first `git add`.

**How it was caught:**
The user noticed the GitHub repository was enormous and contained `node_modules` files. The commit history also showed thousands of "create mode 100644 server/node_modules/..." entries.

**What was changed:**
The AI then ran:
```bash
git rm -r --cached server/node_modules
git add .gitignore
git commit -m "chore: remove node_modules from repository"
git push origin main
```
A proper `.gitignore` was created at the project root to prevent this from happening again. The correct flow should always be: **create `.gitignore` → `git init` → `git add .`**, not the reverse.

---

### Case 2: The Server Crashed Due to Missing `bcryptjs` Package

**What happened:**
The AI generated `auth.service.js` with an `import bcrypt from 'bcryptjs'` statement but failed to add `bcryptjs` to `server/package.json`. The backend started but crashed on the first registration request with `ERR_MODULE_NOT_FOUND`.

**How it was caught:**
The user reported that registration was failing with the browser showing `net::ERR_CONNECTION_REFUSED`. Server logs confirmed `Cannot find package 'bcryptjs'`.

**What was changed:**
`bcryptjs` was installed manually via `npm install bcryptjs`. The AI then also added `bcrypt` (native C++ version) as a fallback. Going forward, the AI should always verify that every imported package is declared in `package.json` before running the server.

---

### Case 3: CSV Amount Field `1,200` Was Mishandled

**What happened:**
The AI's initial CSV parsing logic used `parseFloat()` directly on the raw string `"1,200"`. In JavaScript, `parseFloat("1,200")` returns `1` (it stops parsing at the comma), silently producing a wrong amount. The Electricity Feb expense would have been imported as ₹1 instead of ₹1200.

**How it was caught:**
During review of the anomaly handling code, the `1,200` value in the raw CSV was identified as a potential failure case. A manual trace of the code showed that `parseFloat("1,200")` would return `1`, not `1200`.

**What was changed:**
The `parseAmount()` function was updated to strip commas before parsing:
```js
const cleaned = raw.replace(/,/g, '').trim();
const num = parseFloat(cleaned);
```
This correctly handles Indian-style number formatting. The fix was also added to the anomaly logger so the import report documents this transformation.

---

## Reflection

The AI was highly effective at scaffolding boilerplate code (routes, controllers, Prisma schema, React components) and at explaining complex topics like balance calculation logic. However, it required careful human review in three key areas:

1. **Dependency management** — Always verify package.json matches imports.
2. **Git workflows** — Always set up `.gitignore` before the first commit.
3. **Edge cases in data parsing** — AI-generated parsing code tends to miss locale-specific formats (commas in numbers, DD/MM date order, trailing spaces in amounts).

The assignment was completed more efficiently with AI assistance, but the human developer's role was critical in catching silent data bugs and enforcing correct git hygiene.
