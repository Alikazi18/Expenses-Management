# Finly — Monthly Expense Management System

A full-stack, production-style personal finance dashboard: track income and
expenses, set monthly budgets with overspend warnings, visualize trends, and
export reports — with a clean, responsive UI in light and dark mode.

## What's included

| File | What it is |
|---|---|
| `ExpenseManager.jsx` | The complete frontend — React SPA with auth, dashboard, transactions CRUD, budgets, goals/loans, reports, and a profile page. Runs immediately as a Claude artifact with `localStorage` standing in for the database, so you can try every feature right now. |
| `database_schema.sql` | Normalized MySQL schema (users, categories, transactions, budgets, recurring_expenses, goals, loans, notifications) + sample data + reporting views. |
| `backend_scaffold.js` | Express + MySQL backend entry point and annotated reference implementation for auth, transactions, and middleware — the folder structure for a real API. |

The frontend is fully functional on its own (it's a real SPA, not a mockup),
using `localStorage` as a stand-in database. To make it production-grade with
multi-device sync, swap the local persistence layer for calls to the backend
described below — the data shapes already match the SQL schema.

## Try it now

Open the artifact and log in with the seeded demo account:

- **Email:** `demo@expense.app`
- **Password:** `demo1234`

Or tap "Create account" to register your own and start from zero.

## Features

- Email/password registration and login (passwords hashed with bcrypt on the real backend; the schema never stores plaintext)
- Dashboard: total income, total expenses, remaining balance, monthly savings %, recent transactions
- Transactions: add, edit, delete, search, and filter by date range, category, amount range, and payment method, with pagination
- Categories: Food, Transport, Shopping, Bills, Entertainment, Healthcare, Education, Salary, Investment, Others
- Monthly budget with spending-limit alerts at 80%, 90%, and 100%
- Charts: income vs expenses, category breakdown, monthly expense trend, savings trend
- CSV export and a print-ready PDF report
- Light/dark mode toggle
- Responsive layout — desktop, tablet, mobile (collapsible sidebar)
- In-app notifications for budget thresholds and recurring bills
- Recurring expenses, savings goals, EMI/loan tracker
- Profile page — update name, email, phone, currency, and password
- Form validation throughout: required fields, positive-amount enforcement, valid email/date checks, clear inline error messages

## Database design

Six normalized tables plus two reporting views — see `database_schema.sql`:

- **users** — account + currency + theme preference
- **categories** — system defaults (`user_id IS NULL`) and user-defined ones
- **transactions** — the core ledger, foreign-keyed to users and categories, indexed on `(user_id, txn_date)` and `(user_id, category_id)` for fast dashboard queries
- **recurring_expenses** — templates that generate transactions
- **budgets** — one row per user per month, so budget history is preserved
- **goals**, **loans**, **notifications** — supporting features

Run it with:

```bash
mysql -u root -p < database_schema.sql
```

## Setting up the real backend (optional, for production)

The frontend currently persists to `localStorage`. To connect it to MySQL via
a real API, scaffold the backend like this:

```
backend/
├── server.js                  (see backend_scaffold.js)
├── .env.example
├── package.json
├── config/db.js
├── middleware/{auth,validate,error}.middleware.js
├── controllers/{auth,transactions,budget,reports}.controller.js
├── routes/{auth,transactions,budget,reports}.routes.js
└── utils/{jwt,csv,pdf}.js
```

1. `mkdir backend && cd backend && npm init -y`
2. `npm install express mysql2 bcrypt jsonwebtoken cors helmet express-rate-limit dotenv express-validator csv-writer pdfkit`
3. Copy the patterns from `backend_scaffold.js` into the matching files.
4. Create `.env`:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=finly
   JWT_SECRET=replace_with_a_long_random_string
   PORT=4000
   ```
5. Import the schema: `mysql -u root -p < database_schema.sql`
6. `node server.js`
7. In the frontend, replace the `loadDB`/`saveDB` localStorage calls with
   `fetch('/api/...')` calls using the same payload shapes (the field names
   already line up with the SQL columns, just camelCase ↔ snake_case).

### API surface to implement

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account, return JWT |
| POST | `/api/auth/login` | Verify credentials, return JWT |
| GET/POST/PUT/DELETE | `/api/transactions` | CRUD, with query params for filtering/pagination |
| GET/PUT | `/api/budgets/current` | Read/update this month's budget |
| GET | `/api/reports/csv` | Stream CSV export |
| GET | `/api/reports/pdf` | Stream PDF export |

All protected routes go through `authenticate` middleware, which verifies the
JWT from the `Authorization: Bearer <token>` header and attaches `req.user`.

## Validation rules enforced

- Required fields cannot be blank (title, date, category, amount)
- Amounts must be numeric and greater than zero — negative or zero amounts are rejected with an inline message
- Email format is checked on register, login, and profile update
- Passwords must be at least 6 characters; password changes verify the current password first
- Duplicate email registration is blocked with a clear error

## Tech stack used in this build

- **Frontend:** React (functional components + hooks), Recharts for charts, lucide-react for icons
- **Backend (scaffold provided):** Node.js + Express, MySQL via `mysql2`, JWT auth, bcrypt password hashing
- **Database:** MySQL, normalized to 3NF with foreign keys and indexes
- **Persistence in this demo:** `localStorage`, matching the same data shapes as the SQL schema for an easy swap-in
