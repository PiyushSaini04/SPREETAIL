# BUILD_PLAN.md — Splitwise Clone MVP

> Generated from AI_CONTEXT.md after completing all 16 interview sections.
> This document is the architecture + process summary for the 2-day build.
> Source of truth: AI_CONTEXT.md

---

## 1. Project Summary

A simplified Splitwise clone built as a 2-day internship assignment for Spreetail.
Users can create groups, add expenses with 4 split types, track balances, settle debts,
and chat in real-time on each expense.

**Currency**: INR (₹) only  
**Users**: Generic — students, roommates, travel groups, coworkers  
**Relational DB required**: PostgreSQL

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS + shadcn/ui (optional) |
| Routing | React Router DOM |
| HTTP Client | Axios (with interceptors) |
| State Management | React Context API |
| Real-time | Socket.io Client |
| Backend | Node.js + Express.js |
| ORM | Prisma |
| Database | PostgreSQL (hosted on Neon) |
| Auth | JWT (24h expiry, bcrypt cost 10) |
| Real-time Server | Socket.io (shared HTTP server) |
| Testing | Jest + Supertest |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |
| DB Deploy | Neon PostgreSQL |
| CI/CD | GitHub Actions |

---

## 3. Monorepo / Repository Structure

```
splitwise-clone/
├── client/                  ← React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateGroup.jsx
│   │   │   ├── GroupDetail.jsx
│   │   │   ├── AddExpense.jsx
│   │   │   ├── ExpenseDetail.jsx
│   │   │   ├── Settlement.jsx
│   │   │   └── Profile.jsx
│   │   ├── routes/
│   │   │   └── PrivateRoute.jsx
│   │   ├── services/
│   │   │   └── api.js          ← Axios instance + interceptors
│   │   ├── utils/
│   │   └── App.jsx
│   ├── .env
│   ├── index.html
│   └── vite.config.js
│
├── server/                  ← Node.js + Express backend
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── group.controller.js
│   │   │   ├── expense.controller.js
│   │   │   ├── balance.controller.js
│   │   │   ├── settlement.controller.js
│   │   │   └── message.controller.js
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── group.service.js
│   │   │   ├── expense.service.js
│   │   │   ├── balance.service.js     ← balance calc logic
│   │   │   ├── split.service.js       ← split calculation logic
│   │   │   ├── settlement.service.js
│   │   │   └── message.service.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── group.routes.js
│   │   │   ├── expense.routes.js
│   │   │   ├── balance.routes.js
│   │   │   ├── settlement.routes.js
│   │   │   └── message.routes.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js     ← JWT verifyToken
│   │   │   └── error.middleware.js    ← global error handler
│   │   ├── sockets/
│   │   │   └── chat.socket.js        ← Socket.io event handlers
│   │   ├── utils/
│   │   └── config/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   │   ├── unit/
│   │   │   └── split.service.test.js
│   │   └── integration/
│   │       ├── auth.test.js
│   │       ├── group.test.js
│   │       ├── expense.test.js
│   │       └── settlement.test.js
│   ├── .env
│   └── server.js
│
├── .github/
│   └── workflows/
│       └── deploy.yml           ← GitHub Actions CI/CD
│
├── AI_CONTEXT.md
├── BUILD_PLAN.md
└── README.md
```

---

## 4. Database Schema

### 4.1 Prisma Schema (All Tables)

```prisma
model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  groupsCreated  Group[]        @relation("GroupCreator")
  groupMembers   GroupMember[]
  expensesCreated Expense[]     @relation("ExpenseCreator")
  expensesPaid   Expense[]      @relation("ExpensePayer")
  expenseSplits  ExpenseSplit[]
  messages       Message[]
  settlementsPaid     Settlement[] @relation("SettlementPayer")
  settlementsReceived Settlement[] @relation("SettlementReceiver")
}

model Group {
  id        String   @id @default(uuid())
  name      String
  createdBy String
  creator   User     @relation("GroupCreator", fields: [createdBy], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]

  @@index([createdBy])
}

model GroupMember {
  id       String   @id @default(uuid())
  groupId  String
  userId   String
  role     Role     @default(MEMBER)
  joinedAt DateTime @default(now())

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
  @@index([groupId, userId])
}

enum Role {
  ADMIN
  MEMBER
}

model Expense {
  id          String      @id @default(uuid())
  groupId     String
  description String
  amount      Decimal     @db.Decimal(10, 2)
  createdById String
  paidById    String
  splitType   SplitType
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  group     Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdBy User         @relation("ExpenseCreator", fields: [createdById], references: [id])
  paidBy    User         @relation("ExpensePayer", fields: [paidById], references: [id])
  splits    ExpenseSplit[]
  messages  Message[]
  tags      ExpenseTag[]

  @@index([groupId])
  @@index([paidById])
}

enum SplitType {
  EQUAL
  UNEQUAL
  PERCENTAGE
  SHARES
}

model ExpenseSplit {
  id         String   @id @default(uuid())
  expenseId  String
  userId     String
  amountOwed Decimal  @db.Decimal(10, 2)
  percentage Decimal? @db.Decimal(5, 2)
  shares     Int?
  createdAt  DateTime @default(now())

  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@index([expenseId])
}

model Settlement {
  id        String   @id @default(uuid())
  groupId   String
  paidById  String
  paidToId  String
  amount    Decimal  @db.Decimal(10, 2)
  note      String?
  createdAt DateTime @default(now())

  group  Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy User  @relation("SettlementPayer",   fields: [paidById], references: [id])
  paidTo User  @relation("SettlementReceiver", fields: [paidToId], references: [id])

  @@index([groupId])
  @@index([paidById])
  @@index([paidToId])
}

model Message {
  id        String   @id @default(uuid())
  expenseId String
  userId    String
  content   String
  createdAt DateTime @default(now())

  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@index([expenseId])
}

model Tag {
  id   String @id @default(uuid())
  name String @unique

  expenses ExpenseTag[]
}

model ExpenseTag {
  expenseId String
  tagId     String

  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  tag     Tag     @relation(fields: [tagId], references: [id])

  @@id([expenseId, tagId])
}
```

---

## 5. API Endpoints

All routes prefixed: `/api/v1/`  
Auth header on protected routes: `Authorization: Bearer <token>`

### Auth (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Get current user (protected) |

### Groups (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/groups` | Create group |
| GET | `/groups` | Get user's groups |
| GET | `/groups/:groupId` | Group detail + members + balances |
| POST | `/groups/:groupId/members` | Add member |
| DELETE | `/groups/:groupId/members/:userId` | Remove member |
| PATCH | `/groups/:groupId/transfer-admin` | Transfer admin role |
| POST | `/groups/:groupId/leave` | Leave group |
| DELETE | `/groups/:groupId` | Delete group (admin only) |

### Expenses (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/expenses` | Create expense |
| GET | `/expenses/:expenseId` | Expense + splits |
| PATCH | `/expenses/:expenseId` | Edit expense |
| DELETE | `/expenses/:expenseId` | Delete expense |
| GET | `/groups/:groupId/expenses` | All group expenses |

### Balances (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups/:groupId/balances` | Who owes whom in group |
| GET | `/balances/me` | Personal summary across all groups |

### Settlements (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/settlements` | Record a payment |
| GET | `/groups/:groupId/settlements` | Settlement history |

### Messages (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/expenses/:expenseId/messages` | Chat history |
| POST | `/expenses/:expenseId/messages` | Save message |

### Tags (Optional, Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tags` | List all tags |
| POST | `/tags` | Create tag |

### Response Formats
```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "Group not found", "statusCode": 404 }
```

---

## 6. Split Calculation Logic

All split logic lives in `split.service.js`.

```
EQUAL:      amount ÷ selectedParticipantCount
UNEQUAL:    manually entered per user; must sum === amount
PERCENTAGE: amount × (userPercentage ÷ 100); percentages must sum === 100
SHARES:     amount × (userShares ÷ totalShares); totalShares must > 0
```

---

## 7. Balance Calculation Logic

Lives in `balance.service.js`. Always computed on the fly — no stored balance table.

```
Net Balance (per user per group)
= SUM(expenses.amount WHERE paidById = user)
- SUM(expense_splits.amountOwed WHERE userId = user AND expense is in group)
+ SUM(settlements.amount WHERE paidToId = user AND groupId = group)
- SUM(settlements.amount WHERE paidById = user AND groupId = group)

Positive → user is owed money
Negative → user owes money
Zero     → fully settled
```

**"Who owes whom"**: Computed per pair; no debt simplification / chain consolidation.

---

## 8. Socket.io Architecture

```
React Client ──socket.io-client──► Express HTTP Server ──socket.io──► PostgreSQL
```

- Socket.io runs on the **same HTTP server** as Express
- Each expense = one Socket.io room: `expense_<expenseId>`

**Events:**
| Event | Direction | Payload |
|-------|-----------|---------|
| `joinExpense` | Client → Server | `{ expenseId }` |
| `sendMessage` | Client → Server | `{ expenseId, message, userId }` |
| `newMessage` | Server → Client | `{ id, userId, userName, content, createdAt }` |

**Message flow:** Client sends → Save to PostgreSQL → Emit to room → All clients receive

---

## 9. Frontend Routing

```
Public:
  /login
  /register

Protected (wrapped in <PrivateRoute>):
  /                              → Dashboard
  /groups/create                 → Create Group
  /groups/:groupId               → Group Detail
  /groups/:groupId/expenses/new  → Add Expense
  /expenses/:expenseId           → Expense Detail
  /groups/:groupId/settlements   → Record Settlement
  /profile                       → Profile (optional)
```

---

## 10. Auth Flow

```
1. Login → POST /api/v1/auth/login
2. Backend returns { token, user }
3. Frontend: localStorage.setItem("token", token)
4. AuthContext updated: { user, token, isAuthenticated: true }
5. Axios interceptor: config.headers.Authorization = `Bearer ${token}` on every request
6. PrivateRoute: checks AuthContext.isAuthenticated → allow or redirect /login
7. Logout: localStorage.removeItem("token") + clear AuthContext
```

---

## 11. Key Business Rules

| Rule | Behavior |
|------|----------|
| Creator of group → auto ADMIN | On group creation |
| Only ADMIN can add/remove members | 403 for members |
| Only ADMIN can delete group | 403 for members |
| Group deletion requires all balances = ₹0 | Block with error |
| Admin leaving → must transfer role first | Block with error |
| Sole member leaving → must delete group instead | Block with error |
| Expense edit/delete → creator OR admin only | 403 for others |
| Leave group with balance → blocked | Block with error |
| Duplicate member → prevented | 400 error |
| Invalid split → blocked at API level | 400 error |
| Expense deleted after settlement → balances recalculated, settlement rows kept | Cascade behaviour |

---

## 12. Environment Variables

### Backend (`server/.env`)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_key
PORT=5000
CLIENT_URL=https://splitwise-clone.vercel.app
CORS_ORIGIN=https://splitwise-clone.vercel.app
NODE_ENV=production
SOCKET_CORS_ORIGIN=https://splitwise-clone.vercel.app
```

### Frontend (`client/.env`)
```
VITE_API_URL=https://splitwise-api.onrender.com
VITE_SOCKET_URL=https://splitwise-api.onrender.com
```

---

## 13. Implementation Phases

### Phase 1 — Backend Foundation (Day 1, Morning)
- [ ] Init Node.js + Express project
- [ ] Set up Prisma with PostgreSQL (Neon)
- [ ] Write `schema.prisma` with all 8 models
- [ ] Run `prisma migrate dev --name init`
- [ ] Set up middleware: cors, json, morgan, error handler
- [ ] Implement Auth: register, login, JWT middleware, `/auth/me`

### Phase 2 — Core Backend APIs (Day 1, Afternoon)
- [ ] Groups CRUD: create, list, detail, add/remove member, transfer admin, leave, delete
- [ ] Expenses CRUD: create (with all 4 split types), get, edit, delete, list by group
- [ ] `split.service.js`: implement and unit test all 4 split calculation functions
- [ ] `balance.service.js`: implement net balance formula, who-owes-whom query
- [ ] Balances routes: group balance, personal balance
- [ ] Settlements: record payment, list by group
- [ ] Messages: get history, save message

### Phase 3 — Socket.io (Day 1, Evening)
- [ ] Initialize Socket.io on shared HTTP server
- [ ] Implement `chat.socket.js`: joinExpense, sendMessage, newMessage events
- [ ] Test with two browser tabs

### Phase 4 — Frontend Foundation (Day 2, Morning)
- [ ] Init React + Vite project
- [ ] Configure Tailwind CSS
- [ ] Set up React Router DOM with all routes
- [ ] Build `AuthContext` + `SocketContext`
- [ ] Set up Axios instance with interceptors
- [ ] Build `PrivateRoute` component
- [ ] Build Login + Register pages (public)

### Phase 5 — Core Frontend Pages (Day 2, Morning–Afternoon)
- [ ] Dashboard: groups list, balance summary, recent activity
- [ ] Create Group page
- [ ] Group Detail page: members, expenses list, group balance
- [ ] Add Expense page: dynamic form for all 4 split types with validation
- [ ] Expense Detail page: split breakdown + chat section
- [ ] Settlement page: select user, enter amount, submit

### Phase 6 — Real-time Chat UI (Day 2, Afternoon)
- [ ] Socket.io client setup in `SocketContext`
- [ ] Chat component on Expense Detail page: join room, send/receive messages, timestamp display

### Phase 7 — Testing (Day 2, Afternoon)
- [ ] Unit tests for `split.service.js` (all 4 types + edge cases)
- [ ] Unit tests for `balance.service.js` formula
- [ ] Unit tests for validation functions
- [ ] Integration tests: auth, group creation, expense creation, settlement

### Phase 8 — Deployment (Day 2, Evening)
- [ ] Create Neon PostgreSQL database, copy connection string
- [ ] Deploy backend to Render: set env vars, run `prisma migrate deploy`
- [ ] Deploy frontend to Vercel: set `VITE_API_URL` and `VITE_SOCKET_URL`
- [ ] Set up GitHub Actions workflow for auto-deploy
- [ ] End-to-end smoke test on live URLs

### Phase 9 — Manual Testing & Documentation (Day 2, Evening)
- [ ] Run all 10 manual test flows (from Section 15)
- [ ] Write `README.md` with setup instructions + known limitations
- [ ] Final review of `AI_CONTEXT.md`

---

## 14. Testing Plan

### Unit Tests (Jest)
- `split.service.test.js`: equal, unequal, percentage, shares calculations
- `balance.service.test.js`: net balance formula
- `validators.test.js`: percentage sum === 100, unequal sum === total, shares > 0

### Integration Tests (Jest + Supertest)
- `auth.test.js`: register + login flows
- `group.test.js`: group creation, member management
- `expense.test.js`: expense creation + splits stored
- `settlement.test.js`: settlement recorded + balance recalculated

### Manual Test Flows
1. Auth: Register → Login → Logout
2. Groups: Create → Add Members → Remove → Transfer Admin
3. Expenses: Create with all 4 split types, verify amounts
4. Balances: Multiple expenses → view who owes whom
5. Settlements: Full + partial settlement → verify balance update
6. Edit Expense: Edit → verify balance recalculates
7. Delete Expense: Delete → verify balance recalculates
8. Chat: Two tabs → real-time message + persistence
9. Auth Guards: protected routes without JWT, non-admin actions
10. Edge Cases: leave with balance, delete group with debt, invalid splits, duplicate member

---

## 15. Known Limitations (for README)

1. INR (₹) only — no multi-currency
2. No debt simplification (A→B→C not optimized to A→C)
3. No payment gateway — manual settlement recording only
4. No friend system — members added from registered users only
5. No notifications — no email/push/SMS
6. No file uploads — no receipt/image attachments
7. JWT in `localStorage` — not production-grade security
8. No pagination — full lists loaded
9. Minimal chat — no reactions, read receipts, typing indicators

---

## 16. Deployment Architecture

```
┌─────────────────────────────────────────────┐
│  Developer pushes to GitHub main branch     │
└────────────────┬────────────────────────────┘
                 │
        GitHub Actions (CI/CD)
                 │
        ┌────────┴────────┐
        │                 │
   Vercel Deploy      Render Deploy
   (React frontend)   (Express backend)
        │                 │
   splitwise-       splitwise-api
   clone.vercel.app .onrender.com
                          │
                   Neon PostgreSQL
                   (hosted database)
```

---

## 17. Deliverables Checklist

- [ ] `AI_CONTEXT.md` — continuously updated source of truth ✅
- [ ] `BUILD_PLAN.md` — this document ✅
- [ ] Full working codebase (frontend + backend)
- [ ] `README.md` with setup instructions
- [ ] Deployed frontend URL (Vercel)
- [ ] Deployed backend URL (Render)
- [ ] PostgreSQL database (Neon)

---

*BUILD_PLAN.md generated 2026-06-14 based on AI_CONTEXT.md interview (Sections 1–16).*
