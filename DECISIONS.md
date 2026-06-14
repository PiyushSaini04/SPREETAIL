# DECISIONS.md — Architecture Decision Log

Each decision below documents the context, the options considered, and the rationale for the choice made during the 2-day build.

---

## 1. Balance Calculation: On-the-fly vs. Stored Table

**Context:** Every time an expense is added, edited, or deleted, balances between users change. We needed to decide how to store and surface this data.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| **Stored balance table** (increment/decrement on every mutation) | Very fast reads | Stale data risk; complex rollback on expense edit/delete |
| **On-the-fly calculation** (query all expenses + settlements, calculate at runtime) | Always accurate; simple mental model | Slightly slower at scale |

**Decision:** ✅ **On-the-fly calculation.**

**Rationale:** The dataset is small (a household of ~5 people). Correctness is more important than raw query speed. A stored table creates a secondary source of truth that can drift out of sync on bugs or crashes.

---

## 2. ORM: Prisma vs. Raw SQL vs. Knex

**Context:** We needed a way to query PostgreSQL from Node.js.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| **Prisma** | Type-safe, auto-generated client, great migrations, schema-as-code | Learning curve for complex queries |
| **Raw SQL (pg)** | Maximum control | Verbose, no type safety, manual migrations |
| **Knex** | Query builder, flexible | More boilerplate than Prisma, no schema-first approach |

**Decision:** ✅ **Prisma**

**Rationale:** Schema-first approach means the database structure is documented in one place (`schema.prisma`). The Prisma Client provides type safety and avoids raw SQL injection risks. Migrations are reproducible and version-controlled.

---

## 3. Real-time: Polling vs. WebSockets (Socket.io)

**Context:** The app needed real-time chat on expense detail pages.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| **HTTP Polling** | Simple, no extra dependencies | Wasteful, high latency |
| **Server-Sent Events (SSE)** | Native browser support, simple | One-direction only (server → client) |
| **Socket.io (WebSockets)** | Bidirectional, proven at scale, rooms support | More complex setup |

**Decision:** ✅ **Socket.io**

**Rationale:** Chat is inherently bidirectional. Socket.io provides rooms (one per expense), automatic reconnection, and a clean event-driven API. SSE can't handle user → server messages without a separate REST call.

---

## 4. Split Types: How Many to Support

**Context:** The CSV had `equal`, `unequal`, `percentage`, and `share` split types.

**Options Considered:**
- Support only `equal` (simplest)
- Support all four types

**Decision:** ✅ **All four split types**

**Rationale:** The assignment CSV explicitly contains all four types. Not supporting them would mean losing data fidelity during import. Each type has a clear calculation rule that can be encapsulated in a service function.

---

## 5. Currency: Convert to INR vs. Store Original

**Context:** Some Goa trip expenses were in USD. We needed to decide how to store them.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| **Store original currency, convert at display** | Preserves source data | Complex multi-currency balance math |
| **Convert to INR at import** | Simple; all balances in one unit | Loses original currency info |
| **Base Currency + Original Tracking** | Keeps source data, easy math | Requires extra schema fields |

**Decision:** ✅ **Base Currency + Original Currency Tracking (with user-confirmed exchange rate).**

**Rationale:** We added `originalAmount`, `currency`, and `exchangeRate` to the schema. Balances are calculated strictly using `amountInInr` to keep the math simple, but the original transaction data is preserved for transparency. The exchange rate is confirmed by the user during the Import Preview step.

---

## 6. Authentication: JWT vs. Sessions

**Context:** We needed to protect API routes.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| **JWT (stateless)** | No server-side session store, works easily with Vercel/Render | Token revocation is tricky |
| **Express Sessions + Redis** | Easy revocation | Requires Redis infrastructure |

**Decision:** ✅ **JWT (JSON Web Tokens)**

**Rationale:** For a 2-day MVP with a small user base and no logout-invalidation requirements, JWT is the simplest correct solution. It also works seamlessly with a stateless Render deployment.

---

## 7. Frontend: Vite + React vs. Next.js

**Context:** We needed to build a React SPA for the frontend.

**Options Considered:**
| Option | Pros | Cons |
|--------|------|------|
| **Vite + React** | Fast HMR, simple SPA routing | No SSR, client-side only |
| **Next.js** | SSR, file-based routing, excellent SEO | Overkill for a dashboard app; slower setup |

**Decision:** ✅ **Vite + React**

**Rationale:** This is an authenticated dashboard application — SEO is irrelevant since all pages require login. Vite provides faster development builds and simpler configuration for a 2-day timeline.

---

## 8. Duplicate Detection in CSV Import

**Context:** The CSV contained multiple potential duplicates (Marina Bites, Thalassa dinner).

**Options Considered:**
- **Strict key**: Skip if `date + payer + amount` match exactly
- **Fuzzy match**: Skip if description is similar (e.g. Levenshtein distance)
- **Interactive Preview Workflow**: Detect anomalies and prompt the user to approve/override

**Decision:** ✅ **Interactive Preview Workflow (Detect and present in UI)**

**Rationale:** The assignment requires that "silent guesses are a failing answer." Therefore, the system parses the CSV in memory, flags duplicates, negative amounts, ambiguous dates, and settlements, and presents a Preview UI to the user. The user explicitly approves or overrides actions before anything is written to the database.

---

## 9. Meera's Post-Move-Out Split Cleanup

**Context:** April expenses still list Meera in `split_with` even though she moved out on 2026-03-28.

**Options Considered:**
- Skip the rows entirely
- Import as-is (keep Meera in the split)
- Auto-remove Meera from splits after her move-out date
- **Explicit Membership Dates** (`joinedAt`, `leftAt`)

**Decision:** ✅ **Explicit Membership Dates (`joinedAt`, `leftAt`)**

**Rationale:** We added `joinedAt` and `leftAt` to `GroupMember`. A person's participation in expenses does not depend on whether they created an expense. The API now explicitly checks `expenseDate` against active membership dates and prevents assigning splits to users who were not active members at that time.

---

## 10. Settlement Detection

**Context:** The row "Rohan paid Aisha back" has no `split_type` and a note indicating it's a settlement.

**Options Considered:**
- Import as an expense with `split_type = EQUAL` between two people
- Skip the row
- Import as a `Settlement` record

**Decision:** ✅ **Import as a Settlement record**

**Rationale:** Expenses and settlements have fundamentally different semantics. An expense represents money spent on something that gets split. A settlement represents paying back an existing debt. Importing it as an expense would incorrectly inflate the group's total spend and distort balances.
