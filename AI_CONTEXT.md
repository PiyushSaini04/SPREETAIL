# AI_CONTEXT.md — Spreetail Project Source of Truth

> This file is the single source of truth for the entire project.
> It is updated continuously after every answer provided by the developer.

---

## Project Overview

- **Assignment**: Reverse-engineer Splitwise, scope a 2-day MVP, build and deploy it.
- **Developer**: Internship engineer at Spreetail
- **Status**: ✅ Interview complete — All 16 sections answered. Ready for BUILD_PLAN.md.

---

## Minimum Product Requirements (Given)

1. Login module (authentication)
2. Create and manage groups (invite, add, remove users)
3. Create and manage expenses:
   - a. Split equally, unequally, by percentage, and by shares
   - b. User chat inside an expense with real-time updates
   - c. Group-wise balance and individual balance summary
   - d. Settle debts / record payments
4. Must use relational databases ONLY (no NoSQL)

---

## Section 1 — Product Goals & Research ✅

### Q1.1 — Primary Purpose
**Answer:** A simplified Splitwise clone that allows users to create groups, add expenses, split expenses among members, track balances, and settle debts efficiently.

### Q1.2 — Target Users
**Answer:** Any group of people who frequently share expenses and need an easy way to track payments and balances. Primary groups include:
- College students sharing hostel or apartment expenses
- Roommates managing rent, groceries, utilities
- Travel groups splitting trip expenses
- Friends organizing events/parties/outings
- Small teams or coworkers managing shared costs

MVP focus: Students and friend groups, but app is generic enough for any group.

### Q1.3 — Core Splitwise Workflows to Replicate
**Answer:**
- **User Management**: Registration, login, JWT auth
- **Group Management**: Create groups, add/remove members, view group details
- **Expense Management**: Add/edit/delete expenses; split equally, unequally, by percentage, by shares
- **Balance Tracking**: Group balances, individual balances, who owes whom
- **Settlements**: Record payments, update balances after settlement
- **Expense Communication**: Add comments/chat on expenses, real-time discussions

### Q1.4 — Splitwise UX Observations
**Keep:**
- Simple expense entry (minimal input)
- Clear balance summaries (immediate visibility of who owes/is owed)
- Group-centric organization
- Simple settlement flow
- Clean dashboard with total balances and active groups

**Simplify / Omit:**
- Email-based invitations → users added directly from registered users
- Multi-currency → INR (₹) only
- Advanced analytics → no spending charts or reports
- Payment gateway integrations → manual settlement recording only
- Complex notifications → no push/email alerts

---

## Section 2 — MVP Scope ✅

### Q2.1 — IN Scope
- **Auth**: Register, Login, JWT auth, Logout
- **Groups**: Create, view, add members, remove members
- **Expenses**: Create, edit, delete, view history
- **Splits**: Equal, unequal, percentage, share-based
- **Balances**: Group balance summary, individual balance, who owes whom
- **Settlements**: Record payment, auto-update balances
- **Chat**: Real-time chat per expense, view chat history
- **Deployment**: Frontend + Backend + PostgreSQL DB deployed
- **Docs**: README.md, BUILD_PLAN.md, AI_CONTEXT.md

### Q2.2 — OUT of Scope
- Notifications (email, push, SMS)
- Social features (friend requests, contact sync, user search outside groups)
- Financial integrations (UPI, Razorpay, Stripe, bank linking)
- Advanced Splitwise features (recurring expenses, category analytics, multi-currency)
- Profile features (pictures, status, activity feed)
- Admin features (audit logs, advanced permissions, multiple roles)
- Performance features (pagination, caching, offline support)

### Q2.3 — Simplifications vs Real Splitwise
- **Group roles**: Only Admin and Member — no custom permissions
- **Currency**: INR (₹) only
- **Debt simplification**: Balances shown as calculated — no debt optimization/consolidation algorithm
- **Invitations**: Members added only from registered users — no email invite flow
- **Settlements**: Manually recorded — no actual money transfer
- **Chat**: Basic real-time messaging only — no reactions, attachments, or read receipts
- **UI**: Simple and functional — usability over visual polish

### Q2.4 — Additional Features (time-permitting)
- **Expense Search**: Search by name or description
- **Recent Activity Section**: Latest expenses added and settlements recorded
- **Expense Tags**: Optional tags (Food, Travel, Rent, Shopping, Utilities, Personal)
- **Personal Dashboard**: Summary of total owed, total to receive, net balance, active groups, recent expenses

---

## Section 3 — User Personas & Workflows ✅

### Q3.1 — User Types

**1. Admin**
- Creates the group; manages members
- Can: create group, add/remove members, add expenses, view balances, record settlements, chat
- Cannot: nothing group-level is restricted for admin
- Example: Piyush creates "Goa Trip" and adds Rahul, Aman, Rohit

**2. Member**
- Added to a group by the admin
- Can: view expenses, add expenses, chat, view balances, record settlements
- Cannot: delete the group, remove other members

**3. System/Authenticated User**
- Any registered user
- Can: register, login, join/create groups, manage personal balances

### Q3.2 — End-to-End Flow

| Step | Actor | Action | System Response |
|------|-------|--------|-----------------|
| 1 | User | Register (name, email, password) | Validate, hash password, create account |
| 2 | User | Login (email, password) | Verify credentials, issue JWT, redirect to dashboard |
| 3 | Admin | Create Group (name: "Goa Trip") | Create group, assign creator as Admin |
| 4 | Admin | Add Members (Rahul, Aman, Rohit) | Create group-member relationships |
| 5 | Admin | Add Expense (Dinner, ₹2000, paid by Piyush, Equal split) | Create expense, store split info, update balances |
| 6 | System | Calculate split (₹2000 ÷ 4 = ₹500 each) | Rahul/Aman/Rohit each owe Piyush ₹500 |
| 7 | User | View balance | Dashboard: "You are owed ₹1500" / Group: per-member breakdown |
| 8 | Member | Chat on expense | Real-time messages visible to all group members |
| 9 | Rahul | Record settlement (₹500 to Piyush) | Create settlement record, update Rahul's balance to ₹0 |
| 10 | System | Recalculate totals | Dashboard updates: Aman ₹500, Rohit ₹500, Rahul ₹0 |

### Q3.3 — Edge Cases

| Case | Scenario | Resolution |
|------|----------|------------|
| **Leave with balance** | User tries to leave group with pending balance | Block exit: "Settle all balances before leaving" |
| **Delete settled expense** | Expense deleted after settlement | Recalculate balances; keep settlement records for audit |
| **Simultaneous edit** | Two users edit same expense at same time | Last Write Wins; no advanced conflict resolution for MVP |
| **Empty group** | No expenses in group | Show: "No expenses yet"; balances show ₹0/₹0 |
| **Invalid split** | Unequal splits don't sum to total (₹400+₹300+₹200 = ₹900 ≠ ₹1000) | Block submit: "Split amounts must equal total" |
| **Percentage > 100%** | Percentages sum to 120% | Block submit: "Total percentage must equal 100%" |
| **Zero shares** | All members assigned 0 shares | Reject: "Total shares must be greater than zero" |
| **Duplicate member** | Admin adds already-existing member | Prevent: "User is already a member of this group" |

---

## Section 4 — Data Model ✅

### Q4.1 — Users Table
```sql
users
-----
id            UUID, Primary Key
name          VARCHAR
email         VARCHAR, UNIQUE
password_hash VARCHAR
created_at    TIMESTAMP
updated_at    TIMESTAMP
```
- `email` must be unique
- Passwords stored as bcrypt hashes

### Q4.2 — Groups & Group Members Tables
```sql
groups
------
id          UUID, Primary Key
name        VARCHAR
created_by  UUID, FK → users.id
created_at  TIMESTAMP
updated_at  TIMESTAMP

group_members
-------------
id        UUID, Primary Key
group_id  UUID, FK → groups.id
user_id   UUID, FK → users.id
role      ENUM(ADMIN, MEMBER)
joined_at TIMESTAMP
```
- Many-to-many between users and groups via `group_members`
- Creator assigned ADMIN role automatically

### Q4.3 — Expenses Table
```sql
expenses
--------
id          UUID, Primary Key
group_id    UUID, FK → groups.id
description TEXT
amount      DECIMAL
created_by  UUID, FK → users.id   -- who recorded the expense
paid_by     UUID, FK → users.id   -- who actually paid
split_type  ENUM(EQUAL, UNEQUAL, PERCENTAGE, SHARES)
created_at  TIMESTAMP
updated_at  TIMESTAMP
```
> ⚠️ Schema updated in Section 7: `created_by` added to distinguish recorder from payer

### Q4.4 — Expense Splits Table
```sql
expense_splits
--------------
id          UUID, Primary Key
expense_id  UUID, FK → expenses.id
user_id     UUID, FK → users.id
amount_owed DECIMAL
percentage  DECIMAL, NULLABLE  -- used for PERCENTAGE split
shares      INTEGER, NULLABLE  -- used for SHARES split
created_at  TIMESTAMP
```

**Split storage examples:**

| Split Type | amount_owed | percentage | shares |
|------------|-------------|------------|--------|
| EQUAL | 400.00 | NULL | NULL |
| UNEQUAL | 500.00 | NULL | NULL |
| PERCENTAGE | 500.00 | 50.00 | NULL |
| SHARES | 600.00 | NULL | 3 |

### Q4.5 — Settlements Table
```sql
settlements
-----------
id         UUID, Primary Key
group_id   UUID, FK → groups.id
paid_by    UUID, FK → users.id
paid_to    UUID, FK → users.id
amount     DECIMAL
note       TEXT
created_at TIMESTAMP
```

### Q4.6 — Messages Table
```sql
messages
--------
id         UUID, Primary Key
expense_id UUID, FK → expenses.id
user_id    UUID, FK → users.id
content    TEXT
created_at TIMESTAMP
```
- One row per message; scoped per expense

### Q4.7 — Balance Calculation Strategy
- **Computed on the fly** (no dedicated balances table)
- Formula: `Balance = Amount Paid - Amount Owed + Settlements Received - Settlements Paid`
- Rationale: simpler, no sync issues, always accurate, lower maintenance
- Dedicated `balances` table was considered but rejected (stale data risk, complex updates)

### Q4.8 — Tags
```sql
tags
----
id   UUID, Primary Key
name VARCHAR, UNIQUE

expense_tags
------------
expense_id UUID, FK → expenses.id
tag_id     UUID, FK → tags.id
PRIMARY KEY (expense_id, tag_id)
```
- Many-to-many between expenses and tags
- Predefined tag values: Food, Travel, Rent, Shopping, Utilities, Personal

### Entity Relationship Summary
```
users
  ├── group_members ────────────────┐
  ├── expenses (paid_by)           ├── groups
  ├── expense_splits                │
  ├── messages                     │
  └── settlements (paid_by/paid_to) ┘

expenses
  ├── expense_splits
  ├── messages
  └── expense_tags ────── tags
```

---

## Sections Pending

> ✅ Section 1 — Product Goals & Research
> ✅ Section 2 — MVP Scope
> ✅ Section 3 — User Personas & Workflows
> ✅ Section 4 — Data Model
> ✅ Section 5 — Authentication
> ✅ Section 6 — Groups
> ✅ Section 7 — Expenses
> ✅ Section 8 — Balances & Settlements
> ✅ Section 9 — Real-time Chat
> ✅ Section 10 — Frontend Architecture
> ✅ Section 11 — Backend Architecture
> ✅ Section 12 — Database
> ✅ Section 13 — API Design
> ✅ Section 14 — Deployment
> ✅ Section 15 — Testing
> ✅ Section 16 — Known Risks & Tradeoffs

**🎉 All 16 sections complete. Interview finished. Ready to produce BUILD_PLAN.md.**

---

## Section 5 — Authentication ✅

### Q5.1 — Auth Method
- **JWT Access Tokens only** (no refresh tokens)
- Token expiry: **24 hours**
- Reasoning: Refresh token rotation adds unnecessary complexity for a 2-day MVP; users simply re-login on expiry

### Q5.2 — Password Hashing
- **bcrypt** with cost factor **10**
- `bcrypt.hash(password, 10)`
- Rationale: Industry standard, good security, fast enough for MVP scale

### Q5.3 — Backend Protected Routes
- **JWT Auth Middleware** applied to all protected routes
- Flow: `Request → Authorization Header → JWT Middleware → Verify Token → Allow / 401`
- Header format: `Authorization: Bearer <jwt_token>`
- On invalid/missing token: return `401 Unauthorized`
- Protected routes include: `POST /groups`, `POST /expenses`, `POST /settlements`, `GET /dashboard`, `GET /groups/:id`, etc.

```js
// Middleware pseudocode
const token = req.headers.authorization?.split(" ")[1];
if (!token) return res.status(401).json({ message: "Unauthorized" });
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  next();
} catch {
  return res.status(401).json({ message: "Invalid Token" });
}
```

### Q5.4 — Frontend Protected Routes
- **Private Route Wrapper** component
- Checks for token in `localStorage`; if missing → redirect to `/login`
- Protected pages: `/dashboard`, `/groups`, `/groups/:id`, `/expenses/:id`, `/settlements`
- Public pages: `/login`, `/register`

### Q5.5 — Token Storage
- **`localStorage`** chosen
- Rationale: Easy to implement, works well with React, no extra backend cookie config
- Known tradeoff: More XSS-vulnerable than `httpOnly` cookies
- Future improvement noted: upgrade to access + refresh tokens with `httpOnly` secure cookies

---

## Section 6 — Groups ✅

### Q6.1 — Multiple Groups
- Yes, a user can belong to **multiple groups** simultaneously
- Implemented via the `group_members` join table (many-to-many)

### Q6.2 — Who Can Invite/Remove Members

| Action | Admin | Member |
|--------|-------|--------|
| Add Member | ✅ | ❌ |
| Remove Member | ✅ | ❌ |
| View Group | ✅ | ✅ |
| Add Expense | ✅ | ✅ |
| Add Settlement | ✅ | ✅ |
| Chat on Expense | ✅ | ✅ |

### Q6.3 — Last Admin Leaving
- **Scenario 1 (sole member)**: Block exit. Message: *"You cannot leave the group because you are the only member. Delete the group instead."*
- **Scenario 2 (other members exist)**: Block exit until admin transfers role. Message: *"Transfer admin role before leaving the group."*

### Q6.4 — Admin Role Transfer
- **Supported.** Admin selects a member to promote → system swaps roles
- After transfer: previous admin becomes MEMBER, selected user becomes ADMIN
- Previous admin can then leave freely

### Q6.5 — Group Deletion
- **Admin-only** action
- **Condition**: All balances must be settled (all = ₹0) before deletion is allowed
- If unsettled: Block with message *"All balances must be settled before deleting the group."*
- **On delete**: Cascade delete all related records — expenses, expense_splits, messages, settlements
- Soft delete NOT used for MVP; cascade delete chosen for simplicity

---

## Section 7 — Expenses ✅

### Q7.1 — Who Can Create an Expense
- **Any group member** (admin or member) can create an expense
- Rationale: real-world participants pay for things without waiting for admin

### Q7.2 — Edit & Delete Permissions

| Action | Creator | Admin | Other Member |
|--------|---------|-------|--------------|
| Edit Expense | ✅ | ✅ | ❌ |
| Delete Expense | ✅ | ❌ | ❌ |

> Note: Only the **expense creator** OR **group admin** can edit. Only the expense creator or group admin can delete.

### Q7.3 — Split Calculation Rules

**EQUAL**
- Formula: `amount ÷ number_of_selected_participants`
- Participants: **subset selectable** (not all group members forced in)
- Validation: at least 1 participant must be selected

**UNEQUAL**
- User manually enters amount per participant
- Validation: `sum(amounts) must === total expense amount`
- Error: *"Split amounts must equal total expense amount."*

**PERCENTAGE**
- User enters % per participant
- System calculates: `amount × (user_percentage ÷ 100)`
- Validation: `sum(percentages) must === 100`
- Error: *"Total percentage must equal 100%."*

**SHARES**
- User enters integer share count per participant
- Formula: `amount × (user_shares ÷ total_shares)`
- Validation: `total_shares > 0`
- Error: *"Total shares must be greater than zero."*

### Q7.4 — Is Creator Always a Participant?
- **No.** Creator is NOT automatically included in the split
- Creator selects participants manually; they can exclude themselves
- Use case: recording an expense on behalf of others

### Q7.5 — Can "Paid By" Differ From Creator?
- **Yes.** `created_by` and `paid_by` are separate fields
- Example: Rahul records a hotel booking but marks "Paid By: Piyush"
- Schema impact: `created_by UUID FK → users.id` added to `expenses` table (applied to Section 4)

### Q7.6 — Expenses Outside a Group?
- **No.** All expenses must belong to exactly one group
- Personal (1-on-1) expenses not supported in MVP
- Workaround: create a 2-member group for individual tracking

---

## Section 8 — Balances & Settlements ✅

### Q8.1 — Net Balance Formula
```
Net Balance (per user per group)
= (Total Amount Paid)
- (Total Amount Owed in Splits)
+ (Settlements Received)
- (Settlements Paid)
```
- Positive balance → others owe this user
- Negative balance → this user owes others
- Zero → fully settled

### Q8.2 — Debt Simplification
- **Not implemented.** Debts shown as-is between each pair
- A→B ₹100 and B→C ₹100 displayed separately, NOT simplified to A→C ₹100
- Rationale: out of scope for 2-day MVP; simpler to implement, debug, and explain

### Q8.3 — "Settle Up" Mechanics
- Recording a settlement **inserts a row** into the `settlements` table
- Balances are then **recomputed dynamically** (no stored balance field updated)
- Flow: `Record Settlement → INSERT settlements → Recalculate balances → Update UI`

### Q8.4 — Partial Payments
- **Supported.** Users can pay any amount less than full debt
- Multiple partial settlements accumulate in `settlements` table
- System computes remaining balance by summing all settlement rows
- Example: Owe ₹500 → Pay ₹200 → Pay ₹100 → Pay ₹200 → Fully settled

### Q8.5 — "Who Owes Whom" Display
- **Net summary per pair** of users within a group
- Group view: flat list of directional debts (e.g., "Rahul → Piyush ₹500")
- Personal dashboard: aggregated across all groups
  - You Owe / You Are Owed / Net Balance
- Example group display:
  ```
  Rahul → Piyush  ₹500
  Aman  → Piyush  ₹300
  Rohit → Aman    ₹200
  ```

---

## Section 9 — Real-time Chat ✅

### Q9.1 — Real-time Library
- **Socket.io** chosen
- Architecture: `React Frontend → Socket.io Client → Socket.io Server → Express + PostgreSQL`
- Rejected: Raw WebSockets (more setup), HTTP polling (not truly real-time)
- Benefits: easy Node.js + React integration, auto-reconnect, event-based, fast to implement

### Q9.2 — Chat Scope
- **Per expense** (not per group)
- Each expense has its own dedicated Socket.io room / chat thread
- User flow: Open Expense → View Details → View Chat → Send Message

### Q9.3 — Message Persistence
- **Yes.** All messages saved to PostgreSQL `messages` table
- Flow: `Send Message → Save to DB → Broadcast via Socket.io → Update all clients`
- Chat history survives refresh, logout/login, and server restart

### Q9.4 — Timestamps
- **Yes.** Each message shows a timestamp from `created_at`
- Format: `HH:MM AM/PM` (e.g., "2:34 PM")
- No relative time ("2 mins ago"), no typing indicators

### Q9.5 — Who Can Chat
- **All group members** can view and send messages on any expense
- Non-split participants (e.g., Rohit not in the dinner split) can still chat
- Permissions: View Chat ✅, Send Message ✅, View History ✅ for all group members

### Q9.6 — Read Receipts
- **Not implemented.** No read receipts, delivered indicators, seen-by, unread counters, or typing indicators

---

## Section 10 — Frontend Architecture ✅

### Q10.1 — JavaScript Framework
- **React 19** with **Vite** as the build tool
- Additional libraries: React Router DOM, Axios, Socket.io Client

### Q10.2 — UI Component Library
- **Tailwind CSS** — primary styling
- **shadcn/ui** — optional reusable components if needed
- MUI, Ant Design, Bootstrap: not used

### Q10.3 — Pages / Screens

| # | Page | Key Features |
|---|------|--------------|
| 1 | Login | Email, Password, Login button |
| 2 | Register | Name, Email, Password, Register button |
| 3 | Dashboard | My Groups, Balance Summary, Recent Activity |
| 4 | Create Group | Group Name, Create button |
| 5 | Group Detail | Group info, Members list, Expenses list, Group Balances, Add Expense |
| 6 | Expense Detail | Expense info, Split details, Chat section, Edit/Delete |
| 7 | Add Expense | Description, Amount, Paid By, Participants, Split Type, Submit |
| 8 | Settlement | Select User, Amount, Record Settlement |
| 9 | Profile (optional) | User info, Logout |

### Q10.4 — Routing Structure
```
Public:
  /login
  /register

Protected:
  /                              → Dashboard
  /groups/create                 → Create Group
  /groups/:groupId               → Group Detail
  /groups/:groupId/expenses/new  → Add Expense
  /expenses/:expenseId           → Expense Detail
  /groups/:groupId/settlements   → Settlement
  /profile                       → Profile (optional)
```

### Q10.5 — State Management
- **React Context API** for global state
- `AuthContext`: current user, JWT token, isAuthenticated
- `SocketContext`: Socket.io connection instance
- Page-specific data: `useState` (e.g., `const [expenses, setExpenses] = useState([])`)
- Redux: rejected as overkill for MVP

### Q10.6 — Auth State Handling
- **JWT + localStorage + React Context + Axios Interceptors**
- Login flow: backend returns `{ token, user }` → stored in `localStorage` + `AuthContext`
- App startup: read token from `localStorage` → validate → populate `AuthContext`
- Every API request: Axios interceptor auto-attaches `Authorization: Bearer <token>`
- Private routes: `<PrivateRoute>` checks `AuthContext.isAuthenticated`; redirects to `/login` if false

---

## Section 11 — Backend Architecture ✅

### Q11.1 — Backend Framework
- **Node.js + Express.js**
- Stack: Node.js, Express.js, Prisma ORM, PostgreSQL, JWT, Socket.io
- NestJS/Django/FastAPI considered and rejected (more boilerplate / different language stack)

### Q11.2 — REST or GraphQL
- **REST API**
- GraphQL rejected: adds complexity, not needed for project scope

### Q11.3 — API Structure
- **Layered architecture**: Routes → Controllers → Services → Prisma ORM → PostgreSQL
```
src/
├── controllers/   ← request/response logic
├── services/      ← business logic (calculateBalances, createExpense, recordSettlement)
├── routes/        ← endpoint definitions
├── middleware/    ← auth, error handler
├── prisma/        ← schema + migrations
├── sockets/       ← Socket.io event handlers
├── utils/         ← helper functions
├── config/        ← env/config
└── server.js      ← entry point
```

### Q11.4 — DB Connection
- **Prisma ORM** with a **singleton PrismaClient**
- Prisma manages the connection pool automatically
- No manual connection handling
```js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export default prisma;
```

### Q11.5 — Middleware Stack
| Middleware | Purpose |
|------------|---------|
| `express.json()` | Parse JSON request bodies |
| `cors()` | Allow frontend-backend communication |
| `morgan("dev")` | Log API requests |
| `verifyToken()` | JWT auth guard on protected routes |
| `errorHandler` | Global error catch → `{ message: "Internal Server Error" }` |
- Rate limiting: **not implemented** (out of MVP scope)

### Q11.6 — Socket.io Integration
- **Shared HTTP server** — Express and Socket.io run on the same server/port
- Room strategy: each expense = one Socket.io room (e.g., `expense_12`)
- User joins room on opening an expense: `socket.join("expense_12")`

**Socket Events:**
| Event | Direction | Payload |
|-------|-----------|----------|
| `joinExpense` | Client → Server | `{ expenseId }` |
| `sendMessage` | Client → Server | `{ expenseId, message }` |
| `newMessage` | Server → Client | `{ user, message }` |

**Message Flow:** `Client sends → Save to PostgreSQL → Emit to expense room → All clients receive`

---

## Section 12 — Database ✅

### Q12.1 — Database
- **PostgreSQL** (confirmed final choice)
- Reasons: assignment requirement, Prisma support, ACID compliance, financial reliability, easy cloud deployment

### Q12.2 — ORM
- **Prisma ORM** exclusively — no raw SQL
- Prisma Queries, Prisma Relations, and Prisma Transactions used throughout

### Q12.3 — Migrations
- Schema lives in: `prisma/schema.prisma`
- Dev workflow: `npx prisma migrate dev --name <migration_name>`
- Production deploy: `npx prisma migrate deploy`
- Other useful commands: `npx prisma generate`, `npx prisma studio`

### Q12.4 — Indexes

| Table | Column(s) | Type | Used For |
|-------|-----------|------|----------|
| `users` | `email` | Single | Login, registration validation |
| `group_members` | `(group_id, user_id)` | Composite | Membership validation, permission checks |
| `expenses` | `group_id` | Single | Load group expenses, balance calculations |
| `expenses` | `paid_by` | Single | User expense summary |
| `expense_splits` | `expense_id` | Single | Load split details, balance calculations |
| `messages` | `expense_id` | Single | Load expense chat history |
| `settlements` | `group_id` | Single | Balance computation, settlement history |
| `settlements` | `paid_by` | Single | User balance summary |
| `settlements` | `paid_to` | Single | User balance summary |

### Q12.5 — DB Hosting
- **Deferred to Section 14 (Deployment)**

---

## Section 13 — API Design ✅

### Q13.1 — Versioning
- All routes prefixed with `/api/v1/`

### Q13.2 — Full Endpoint List

**Auth** (public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create new user account |
| POST | `/api/v1/auth/login` | Authenticate user, return JWT |
| GET | `/api/v1/auth/me` | Get current authenticated user profile |

**Groups** (protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/groups` | Create a new group |
| GET | `/api/v1/groups` | Get all groups for current user |
| GET | `/api/v1/groups/:groupId` | Get group details (info + members + balances) |
| POST | `/api/v1/groups/:groupId/members` | Add a member to the group |
| DELETE | `/api/v1/groups/:groupId/members/:userId` | Remove a member |
| PATCH | `/api/v1/groups/:groupId/transfer-admin` | Transfer admin role |
| POST | `/api/v1/groups/:groupId/leave` | Leave a group |
| DELETE | `/api/v1/groups/:groupId` | Delete a group (admin only) |

**Expenses** (protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/expenses` | Create new expense |
| GET | `/api/v1/expenses/:expenseId` | Get expense + split details |
| PATCH | `/api/v1/expenses/:expenseId` | Edit expense |
| DELETE | `/api/v1/expenses/:expenseId` | Delete expense |
| GET | `/api/v1/groups/:groupId/expenses` | Get all expenses in a group |

**Balances** (protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/groups/:groupId/balances` | Group balance — who owes whom |
| GET | `/api/v1/balances/me` | Personal summary (total owed, receivable, net) |

**Settlements** (protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/settlements` | Record a settlement payment |
| GET | `/api/v1/groups/:groupId/settlements` | Get settlement history for group |

**Messages / Chat** (protected; Socket.io handles real-time)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/expenses/:expenseId/messages` | Get chat history for an expense |
| POST | `/api/v1/expenses/:expenseId/messages` | Save a chat message |

**Tags** (optional, protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tags` | Get available tags |
| POST | `/api/v1/tags` | Create a new tag |

### Q13.3 — Error Response Format
```json
{
  "success": false,
  "message": "Group not found",
  "statusCode": 404
}
```

### Q13.4 — Success Response Format
```json
{
  "success": true,
  "data": { ... }
}
```

### Q13.5 — Auth Header
- All protected endpoints require: `Authorization: Bearer <jwt_token>`
- Public endpoints (no auth): `POST /api/v1/auth/register`, `POST /api/v1/auth/login`

---

## Section 14 — Deployment ✅

### Q14.1 — Backend Hosting
- **Render** (free tier)
- GitHub → Render → Express API
- Auto SSL, env var management, Node.js support

### Q14.2 — Frontend Hosting
- **Vercel** (free tier)
- GitHub → Vercel → React App
- Global CDN, fast deploys, excellent React support

### Q14.3 — Database Hosting
- **Neon PostgreSQL** (free tier, serverless)
- Architecture: `Frontend (Vercel) → Backend (Render) → DB (Neon)`

### Q14.4 — Environment Variables

**Backend** (stored in `.env` locally, Render dashboard in prod):
```
DATABASE_URL=postgresql://...
JWT_SECRET=mysecretkey
PORT=5000
CLIENT_URL=https://splitwise-clone.vercel.app
CORS_ORIGIN=https://splitwise-clone.vercel.app
NODE_ENV=production
SOCKET_CORS_ORIGIN=https://splitwise-clone.vercel.app
```

**Frontend** (stored in `.env` locally, Vercel dashboard in prod):
```
VITE_API_URL=https://splitwise-api.onrender.com
VITE_SOCKET_URL=https://splitwise-api.onrender.com
```
- No secrets committed to GitHub

### Q14.5 — CI/CD
- **GitHub Actions** — auto-deploy on push to `main`
- Vercel + Render both trigger automatic redeploys from GitHub

### Q14.6 — Public URLs
- Frontend: `https://splitwise-clone.vercel.app`
- Backend: `https://splitwise-api.onrender.com`
- Custom domain: not required for MVP

---

## Section 15 — Testing ✅

### Q15.1 — Unit Testing
- **Yes** — limited, critical business logic only
- Framework: **Jest**
- What is tested:
  - All 4 split calculation functions (equal, unequal, percentage, shares)
  - Balance calculation formula (`Paid - Owed + Received - PaidSettlements`)
  - Input validation functions (percentages sum to 100, unequal sum matches total, shares > 0)
- What is NOT tested: controllers, routes, Socket.io events, UI components

### Q15.2 — Integration Testing
- **Yes** — critical API flows only
- Framework: **Jest + Supertest**
- APIs covered:
  - `POST /api/v1/auth/register` + `POST /api/v1/auth/login`
  - `POST /api/v1/groups` (verify group created, creator becomes admin)
  - `POST /api/v1/expenses` (verify expense stored + splits created)
  - `POST /api/v1/settlements` (verify settlement saved + balance recalculates)
- Not every endpoint tested — time-constrained MVP

### Q15.3 — Manual Test Flows (pre-submission)

| Flow | Steps | Verify |
|------|-------|--------|
| 1. Auth | Register → Login → Logout | JWT stored, protected routes work, logout clears session |
| 2. Groups | Create → Add Members → Remove → Transfer Admin | Permissions correct |
| 3. Expenses | Create with all 4 split types | Correct amounts calculated |
| 4. Balances | Multiple expenses → view group balance | Who owes whom, net balance |
| 5. Settlements | Create debt → full + partial settle → verify update | Balance recalculates |
| 6. Edit Expense | Edit → verify balance update | Updated totals |
| 7. Delete Expense | Delete → verify balance recalculation | Correct totals |
| 8. Chat | Two tabs open → send message → instant receive | Real-time + persistence |
| 9. Auth guards | Hit protected route without JWT, non-admin actions | Correct 401/403 errors |
| 10. Edge cases | Leave with balance, delete group with debt, invalid splits, duplicate member | Correct error messages |

### Q15.4 — Test Framework Summary

| Layer | Framework | Scope |
|-------|-----------|-------|
| Backend unit | Jest | Split calc, balance formula, validators |
| Backend integration | Jest + Supertest | Critical API endpoints |
| Frontend | None (MVP) | Manual testing only |
| Future frontend | React Testing Library + Vitest | Component + UI interaction tests |

---

## Section 16 — Known Risks & Tradeoffs ✅

### Q16.1 — Riskiest Parts

| Risk Area | Why Risky | Mitigation |
|-----------|-----------|------------|
| **Balance Calculation** (highest) | 4 split types + settlements + edit/delete all affect balances; any bug = wrong debt display | Unit tests, centralized balance service, manual testing |
| **Socket.io Real-time Chat** | Room mgmt, reconnection, broadcasting; messages could duplicate or miss | One room per expense, persist before broadcast, simple event structure |
| **Expense Split UI** | Dynamic form switches between 4 split types; validation complex | Separate component per split type, strong frontend validation |
| **Deployment & Env Vars** | 3 separate services (Vercel + Render + Neon) + CORS + Socket CORS | Explicit env vars, deployment tested before submission |

### Q16.2 — Known Simplifications / Hardcoding

| Decision | What's Simplified | Production Alternative |
|----------|-------------------|------------------------|
| Auth storage | JWT in `localStorage` (XSS risk) | HTTP-only cookies |
| Currency | INR only, hardcoded | Multi-currency with conversion |
| Debt simplification | None — raw balances shown | Graph-based settlement algorithm |
| Pagination | None — full lists loaded | Cursor/offset pagination |
| Rate limiting | None | Express rate-limit middleware |
| Input sanitization | Basic validation only | DOMPurify, parameterized queries (Prisma handles SQL injection) |
| Notifications | None | Email (Nodemailer), push (FCM) |
| File uploads | None | AWS S3 / Cloudinary |

### Q16.3 — What Would Be Done Differently With More Time
- Graph-based debt simplification algorithm
- Access token + refresh token + HTTP-only cookies
- Email notifications (expense added, settlement recorded, member added)
- Email invitations for non-registered users
- Expense attachments (bills, receipts, images via S3/Cloudinary)
- Better mobile responsiveness
- Advanced analytics (monthly spending, category breakdown, trends)
- Full test coverage (frontend, E2E, Socket.io)
- Soft deletes (mark as deleted instead of cascade)

### Q16.4 — Known Limitations for README
1. **Currency**: INR (₹) only — no multi-currency support
2. **Debt simplification**: Balances shown as calculated; no chain optimization (A→B→C not simplified)
3. **No payment gateway**: Settlements are manually recorded only
4. **No friend system**: Users can only be added from registered accounts within groups
5. **No notifications**: No email, push, or SMS alerts
6. **No file uploads**: Receipts/images cannot be attached to expenses
7. **Basic security**: JWT stored in `localStorage` instead of HTTP-only cookies
8. **No pagination**: Full data loaded — may degrade with large datasets
9. **Minimal chat**: Real-time text only; no reactions, read receipts, typing indicators, or attachments

---

## Section 17 — Assignment-Specific Decisions (NEW — Updated Assignment)

### Q17.1 — Active Membership Rule
**Answer:** Option B — Membership dates are explicitly stored and managed.

**Reasoning:** A person's participation in expenses should not depend on whether they created an expense. Real group membership is a separate concept from expense activity. This gives accurate balance calculations when people join or leave mid-way.

**Membership Table:**
| User | Join Date | Leave Date |
|------|-----------|------------|
| Aisha | 2026-02-01 | NULL (active) |
| Rohan | 2026-02-01 | NULL (active) |
| Priya | 2026-02-01 | NULL (active) |
| Meera | 2026-02-01 | 2026-03-31 |
| Dev | 2026-03-08 | 2026-03-14 |
| Sam | 2026-04-08 | NULL (active) |

**Schema Change:** `group_members` gets a `left_at TIMESTAMP NULL` column.

**Balance Rule:** When calculating who owes what for a given expense, only members who were active on the **expense date** are included.
- Expense date 2026-04-15 → active: Aisha, Rohan, Priya, Sam — excluded: Meera, Dev

### Q17.2 — CSV Import Flow Strategy
**Answer:** Option A (Preview → Review → Confirm → Import)

**Reasoning:** The assignment explicitly states: "I want to approve anything the app deletes or changes." and "A silent guess is a failing answer." Therefore, the system cannot automatically modify, skip, merge, or delete records without user approval.

**Final Import Workflow:**
1. **Upload CSV**: User uploads `expenses_export.csv`.
2. **Parse & Validate**: System scans all rows and detects anomalies (missing users, duplicates, invalid dates, unknown members, negative amounts, membership conflicts).
3. **Generate Import Preview**: Returns summary and list of anomalies with proposed actions. NO DB writes.
4. **User Review**: User explicitly approves or overrides each anomaly in the UI.
5. **Confirm Import**: User clicks confirm.
6. **Database Transaction**: System creates Members, Expenses, Splits, Settlements in a single transaction based on approved actions.
7. **Success Report**: Displays imported, skipped, and user-approved fixes.

**API Design:**
- `POST /api/v1/import/preview`: Returns `{ summary, anomalies, proposedActions }`. No DB writes.
- `POST /api/v1/import/confirm`: Payload `{ approvedActions }`. Performs actual DB inserts.

### Q17.3 — Currency Handling Strategy
**Answer:** Option A — Base Currency + Original Currency Tracking

**Database Design:**
Add these fields to the `expenses` table:
- `original_amount DECIMAL`
- `currency VARCHAR`
- `exchange_rate DECIMAL`
- `amount_in_inr DECIMAL` (used for all balance calculations)
- `expense_date TIMESTAMP` (replacing the assumption that `created_at` is the expense date)

**Benefits:** Transparent, original currency/rate preserved, simple balance calculations in single currency. Matches Priya's "no magic numbers" requirement.

### Q17.4 — Exchange Rate Strategy
**Answer:** The exchange rate should be user-confirmed during the import review step.

**Decision:**
Do NOT hardcode 83 INR. Instead, the Import Preview will detect USD expenses, suggest a rate, and allow the user to edit it before confirming the import. The approved rate is then used to calculate `amount_in_inr` and stored in the database.

### Q17.5 — Anomaly Handling Policies

**1. Negative Amounts**
- **Policy:** Flag as anomaly.
- **Suggested Action:** Reject row (Reason: Expense amounts must be > 0).
- **User Actions:** Fix amount manually, Skip row, or Cancel import. No silent conversion.

**2. Duplicates**
- **Policy:** Detect and show in preview.
- **Condition:** Same Date + Same Amount + Same Description + Same Payer.
- **Suggested Action:** Skip duplicate (Requires user approval).

**3. Settlements as Expenses**
- **Policy:** Do not import as normal expenses.
- **Preview:** Detected Settlement Transaction.
- **Suggested Action:** Import as Settlement.
- **User Actions:** Approve conversion, Treat as expense, or Skip row.

**4. Invalid / Ambiguous Dates**
- **Policy:** Never guess.
- **Preview:** Show ambiguous date (e.g., 03/04/2026).
- **User Actions:** Require user confirmation by choosing format (`DD/MM/YYYY` or `MM/DD/YYYY`).

---

## Prompts & Responses

### [Session Start — 2026-06-14]

**User Prompt:**
> Assigned the junior engineer to reverse-engineer Splitwise, scope a 2-day MVP, and build a working deployed app. Provided 16 sections of questions to go through one at a time. Minimum requirements given: auth, groups, expenses (4 split types + chat + balances + settlements), relational DB only.

**Agent Response:**
> Created `AI_CONTEXT.md`. Starting interview from Section 1.

---

### [Section 1 — Completed]

**User answers logged for Q1.1–Q1.4.**
- Primary purpose: simplified Splitwise clone
- Target users: any group, focus on students/friends
- Workflows: full CRUD for users, groups, expenses, balances, settlements, chat
- UX: keep simplicity and clarity; omit email invites, multi-currency, analytics, payment gateways, notifications

---
