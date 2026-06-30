import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, Target, FileBarChart,
  UserCircle2, Sun, Moon, LogOut, Plus, Search, Pencil, Trash2,
  X, ChevronLeft, ChevronRight, Download, Bell, Wallet, TrendingUp,
  TrendingDown, Banknote, AlertTriangle, Filter, Menu, Eye, EyeOff,
  CalendarDays, CreditCard, ReceiptText, Tag, FileText, CheckCircle2,
  RefreshCw, Repeat, Landmark, Coins
} from "lucide-react";

/* ============================================================
   DESIGN TOKENS
   Palette: deep ink navy + jade accent (growth) + amber (caution)
   Typography: Outfit (display) / Inter (body) / JetBrains Mono (numerals)
   ============================================================ */
const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap";

const CATEGORIES = [
  { name: "Food", color: "#F97362", icon: "🍽" },
  { name: "Transport", color: "#5B9BD5", icon: "🚌" },
  { name: "Shopping", color: "#C77DFF", icon: "🛍" },
  { name: "Bills", color: "#FFB347", icon: "🧾" },
  { name: "Entertainment", color: "#FF6FA5", icon: "🎬" },
  { name: "Healthcare", color: "#4DD0B5", icon: "⚕" },
  { name: "Education", color: "#7C9CFF", icon: "🎓" },
  { name: "Salary", color: "#2BB87A", icon: "💼" },
  { name: "Investment", color: "#2BD0C4", icon: "📈" },
  { name: "Others", color: "#9AA3AF", icon: "📦" },
];
const PAYMENT_METHODS = ["Cash", "Credit Card", "Debit Card", "UPI", "Bank Transfer", "Wallet"];
const INCOME_CATS = ["Salary", "Investment", "Others"];
const CURRENCIES = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

const catColor = (name) => CATEGORIES.find((c) => c.name === name)?.color || "#9AA3AF";
const catIcon = (name) => CATEGORIES.find((c) => c.name === name)?.icon || "📦";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKey = (d) => d.slice(0, 7);
const fmtMoney = (n, cur = "INR") => `${CURRENCIES[cur] || "₹"}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/* ============================================================
   FAKE PERSISTENCE LAYER (localStorage stands in for the SQL DB
   defined in database_schema.sql — see README for real backend)
   ============================================================ */
const DB_KEY = "expenseapp_db_v1";
const loadDB = () => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};
const saveDB = (db) => {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {}
};

function seedData() {
  const now = new Date();
  const mk = (offsetDay) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offsetDay);
    return d.toISOString().slice(0, 10);
  };
  const txs = [
    { id: uid(), date: mk(1), title: "Monthly salary", category: "Salary", amount: 65000, type: "income", method: "Bank Transfer", notes: "June payroll" },
    { id: uid(), date: mk(2), title: "Grocery run", category: "Food", amount: 2400, type: "expense", method: "UPI", notes: "" },
    { id: uid(), date: mk(3), title: "Electricity bill", category: "Bills", amount: 1800, type: "expense", method: "Bank Transfer", notes: "" },
    { id: uid(), date: mk(4), title: "Cab to office", category: "Transport", amount: 320, type: "expense", method: "Wallet", notes: "" },
    { id: uid(), date: mk(5), title: "Movie night", category: "Entertainment", amount: 900, type: "expense", method: "Credit Card", notes: "" },
    { id: uid(), date: mk(6), title: "Mutual fund SIP", category: "Investment", amount: 5000, type: "income", method: "Bank Transfer", notes: "Index fund" },
    { id: uid(), date: mk(7), title: "New headphones", category: "Shopping", amount: 3500, type: "expense", method: "Credit Card", notes: "" },
    { id: uid(), date: mk(9), title: "Dentist visit", category: "Healthcare", amount: 1200, type: "expense", method: "Cash", notes: "" },
    { id: uid(), date: mk(12), title: "Online course", category: "Education", amount: 2200, type: "expense", method: "Debit Card", notes: "UI/UX certification" },
    { id: uid(), date: mk(20), title: "Freelance project", category: "Others", amount: 12000, type: "income", method: "Bank Transfer", notes: "Logo design" },
    { id: uid(), date: mk(35), title: "Restaurant dinner", category: "Food", amount: 1650, type: "expense", method: "Credit Card", notes: "" },
    { id: uid(), date: mk(40), title: "Phone bill", category: "Bills", amount: 699, type: "expense", method: "UPI", notes: "" },
  ];
  return {
    users: [
      { id: "u1", name: "Demo User", email: "demo@expense.app", password: "demo1234", currency: "INR", phone: "+91 90000 00000", joined: todayISO() },
    ],
    transactions: { u1: txs },
    budgets: { u1: { monthlyLimit: 25000 } },
    recurring: { u1: [{ id: uid(), title: "Netflix", amount: 649, category: "Entertainment", day: 5 }] },
    goals: { u1: [{ id: uid(), title: "Emergency fund", target: 100000, saved: 32000 }] },
    loans: { u1: [{ id: uid(), title: "Car loan", principal: 400000, emi: 9800, monthsLeft: 28 }] },
    notifications: { u1: [] },
  };
}

/* ============================================================ */

export default function ExpenseManager() {
  const [theme, setTheme] = useState("light");
  const [db, setDb] = useState(() => loadDB() || seedData());
  const [session, setSession] = useState(null); // userId
  const [authMode, setAuthMode] = useState("login");

  useEffect(() => { saveDB(db); }, [db]);
  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  if (!document.getElementById("expapp-fonts")) {
    const link = document.createElement("link");
    link.id = "expapp-fonts";
    link.rel = "stylesheet";
    link.href = FONTS_LINK;
    document.head.appendChild(link);
  }

  const T = themeTokens(theme);

  if (!session) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif" }}>
        <AuthScreen db={db} setDb={setDb} onLogin={(uid_) => setSession(uid_)} T={T} mode={authMode} setMode={setAuthMode} />
      </div>
    );
  }

  return (
    <AppShell
      db={db} setDb={setDb} userId={session}
      onLogout={() => setSession(null)}
      theme={theme} setTheme={setTheme} T={T}
    />
  );
}

function themeTokens(theme) {
  const dark = theme === "dark";
  return {
    dark,
    bg: dark ? "#0B1120" : "#F4F6F9",
    panel: dark ? "#121A2C" : "#FFFFFF",
    panelAlt: dark ? "#1A2438" : "#F8FAFC",
    border: dark ? "#22304A" : "#E4E8EF",
    text: dark ? "#E7ECF5" : "#16213A",
    sub: dark ? "#8C9AB8" : "#677088",
    accent: "#1E9E7A",
    accent2: "#16805F",
    danger: "#E1574C",
    warn: "#E8A23A",
    blue: "#4D7CFE",
    cardShadow: dark ? "0 2px 14px rgba(0,0,0,0.35)" : "0 2px 14px rgba(30,40,70,0.06)",
  };
}

/* ============================================================
   AUTH SCREEN — Login / Register
   ============================================================ */
function AuthScreen({ db, setDb, onLogin, T, mode, setMode }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", currency: "INR" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (mode === "register") {
      if (!form.name.trim() || !form.email.trim() || !form.password) {
        setError("All fields are required."); return;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError("Enter a valid email address."); return; }
      if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (db.users.some((u) => u.email.toLowerCase() === form.email.toLowerCase())) {
        setError("An account with this email already exists."); return;
      }
      const id = uid();
      const newUser = { id, name: form.name, email: form.email, password: form.password, currency: form.currency, phone: "", joined: todayISO() };
      setDb((d) => ({
        ...d,
        users: [...d.users, newUser],
        transactions: { ...d.transactions, [id]: [] },
        budgets: { ...d.budgets, [id]: { monthlyLimit: 20000 } },
        recurring: { ...d.recurring, [id]: [] },
        goals: { ...d.goals, [id]: [] },
        loans: { ...d.loans, [id]: [] },
        notifications: { ...d.notifications, [id]: [] },
      }));
      onLogin(id);
    } else {
      const user = db.users.find((u) => u.email.toLowerCase() === form.email.toLowerCase());
      if (!user || user.password !== form.password) {
        setError("Invalid email or password."); return;
      }
      onLogin(user.id);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, #0B1120 0%, #102236 55%, #133029 100%)`,
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 920, display: "flex", borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
        <div style={{
          flex: 1, background: "linear-gradient(160deg,#123A2E,#0B1120)", color: "#E7ECF5",
          padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 280,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#1E9E7A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Wallet size={20} color="#fff" />
              </div>
              <span style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 19 }}>Finly</span>
            </div>
            <h1 style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 32, lineHeight: 1.25, marginTop: 40 }}>
              Know exactly<br />where your money<br />goes every month.
            </h1>
            <p style={{ color: "#8C9AB8", marginTop: 14, fontSize: 14.5, lineHeight: 1.6 }}>
              Track income and expenses, set budgets, and watch your savings trend — all in one calm dashboard.
            </p>
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#8C9AB8" }}>
            <Stat label="Transactions tracked" value="12,400+" />
            <Stat label="Categories" value="10" />
            <Stat label="Currencies" value="4" />
          </div>
        </div>

        <div style={{ flex: 1, background: "#fff", padding: "48px 40px", minWidth: 320 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
            <TabBtn active={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Log in</TabBtn>
            <TabBtn active={mode === "register"} onClick={() => { setMode("register"); setError(""); }}>Create account</TabBtn>
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <Field label="Full name">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Lee" style={inputStyle} />
              </Field>
            )}
            <Field label="Email address">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" style={inputStyle} />
            </Field>
            <Field label="Password">
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={{ ...inputStyle, paddingRight: 38 }} />
                <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: 10, top: 9, background: "none", border: "none", cursor: "pointer", color: "#677088" }}>
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            {mode === "register" && (
              <Field label="Preferred currency">
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inputStyle}>
                  {Object.keys(CURRENCIES).map((c) => <option key={c} value={c}>{c} ({CURRENCIES[c]})</option>)}
                </select>
              </Field>
            )}
            {error && (
              <div style={{ background: "#FDEDEB", color: "#B43A30", fontSize: 13, padding: "9px 12px", borderRadius: 8, display: "flex", gap: 6, alignItems: "center" }}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}
            <button type="submit" style={{
              marginTop: 6, background: "#1E9E7A", color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 0", fontWeight: 600, fontSize: 14.5, cursor: "pointer", fontFamily: "Outfit",
            }}>
              {mode === "login" ? "Log in" : "Create account"}
            </button>
            <p style={{ fontSize: 12.5, color: "#9AA3AF", textAlign: "center", marginTop: 4 }}>
              Demo login: <b>demo@expense.app</b> / <b>demo1234</b>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
const Stat = ({ label, value }) => (
  <div>
    <div style={{ fontFamily: "JetBrains Mono", fontWeight: 600, fontSize: 16, color: "#E7ECF5" }}>{value}</div>
    <div style={{ fontSize: 11.5 }}>{label}</div>
  </div>
);
const TabBtn = ({ active, onClick, children }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
    background: active ? "#16213A" : "#F1F3F7", color: active ? "#fff" : "#677088",
    fontWeight: 600, fontSize: 13.5, fontFamily: "Outfit",
  }}>{children}</button>
);
const Field = ({ label, children }) => (
  <label style={{ fontSize: 12.5, color: "#677088", fontWeight: 500, display: "flex", flexDirection: "column", gap: 5 }}>
    {label}
    {children}
  </label>
);
const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid #E4E8EF",
  fontSize: 14, fontFamily: "Inter", outline: "none", boxSizing: "border-box", background: "#fff", color: "#16213A",
};

/* ============================================================
   APP SHELL — sidebar + routed pages
   ============================================================ */
function AppShell({ db, setDb, userId, onLogout, theme, setTheme, T }) {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = db.users.find((u) => u.id === userId);
  const txs = db.transactions[userId] || [];
  const budget = db.budgets[userId] || { monthlyLimit: 0 };
  const cur = user.currency;

  const setTxs = (updater) => setDb((d) => ({ ...d, transactions: { ...d.transactions, [userId]: typeof updater === "function" ? updater(d.transactions[userId] || []) : updater } }));
  const setBudget = (b) => setDb((d) => ({ ...d, budgets: { ...d.budgets, [userId]: b } }));
  const setUser = (patch) => setDb((d) => ({ ...d, users: d.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)) }));

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    { id: "budget", label: "Budget", icon: PiggyBank },
    { id: "goals", label: "Goals & loans", icon: Target },
    { id: "reports", label: "Reports", icon: FileBarChart },
    { id: "profile", label: "Profile", icon: UserCircle2 },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }} />}
      <aside style={{
        width: 230, background: T.panel, borderRight: `1px solid ${T.border}`, padding: "22px 16px",
        display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 31,
        transform: sidebarOpen ? "translateX(0)" : undefined,
        transition: "transform .25s ease",
      }} className="exp-sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 22px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={18} color="#fff" />
          </div>
          <span style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 17 }}>Finly</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {navItems.map((n) => (
            <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 10,
              border: "none", cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 500,
              background: page === n.id ? (T.dark ? "#16213A" : "#E9F6F0") : "transparent",
              color: page === n.id ? T.accent : T.sub,
              transition: "background .15s",
            }}>
              <n.icon size={18} /> {n.label}
            </button>
          ))}
        </nav>
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
          border: "none", background: "transparent", color: T.danger, cursor: "pointer", fontWeight: 500, fontSize: 14,
        }}>
          <LogOut size={17} /> Log out
        </button>
      </aside>

      <main style={{ flex: 1, marginLeft: 0, padding: "20px 22px 50px", maxWidth: "100%" }} className="exp-main">
        <TopBar user={user} theme={theme} setTheme={setTheme} T={T} onMenu={() => setSidebarOpen(true)} txs={txs} budget={budget} cur={cur} />
        {page === "dashboard" && <Dashboard txs={txs} budget={budget} cur={cur} T={T} setPage={setPage} />}
        {page === "transactions" && <TransactionsPage txs={txs} setTxs={setTxs} cur={cur} T={T} />}
        {page === "budget" && <BudgetPage txs={txs} budget={budget} setBudget={setBudget} cur={cur} T={T} recurring={(db.recurring[userId] || [])} setRecurring={(r) => setDb((d) => ({ ...d, recurring: { ...d.recurring, [userId]: r } }))} />}
        {page === "goals" && <GoalsPage goals={db.goals[userId] || []} setGoals={(g) => setDb((d) => ({ ...d, goals: { ...d.goals, [userId]: g } }))} loans={db.loans[userId] || []} setLoans={(l) => setDb((d) => ({ ...d, loans: { ...d.loans, [userId]: l } }))} cur={cur} T={T} />}
        {page === "reports" && <ReportsPage txs={txs} user={user} T={T} cur={cur} />}
        {page === "profile" && <ProfilePage user={user} setUser={setUser} T={T} db={db} setDb={setDb} userId={userId} />}
      </main>
      <style>{`
        @media (min-width: 901px) {
          .exp-sidebar { position: sticky !important; transform: none !important; }
          .exp-main { margin-left: 0; }
        }
        @media (max-width: 900px) {
          .exp-sidebar { transform: translateX(-100%); }
        }
        * { box-sizing: border-box; }
        input, select, textarea { font-family: Inter, sans-serif; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 6px; }
      `}</style>
    </div>
  );
}

function TopBar({ user, theme, setTheme, T, onMenu, txs, budget, cur }) {
  const [showNotif, setShowNotif] = useState(false);
  const thisMonth = monthKey(todayISO());
  const monthExp = txs.filter((t) => t.type === "expense" && monthKey(t.date) === thisMonth).reduce((s, t) => s + Number(t.amount), 0);
  const pct = budget.monthlyLimit ? Math.round((monthExp / budget.monthlyLimit) * 100) : 0;
  const notifs = [];
  if (pct >= 100) notifs.push({ icon: AlertTriangle, text: `Budget exceeded — ${pct}% of monthly limit spent.`, tone: "danger" });
  else if (pct >= 90) notifs.push({ icon: AlertTriangle, text: `90% of monthly budget used.`, tone: "warn" });
  else if (pct >= 80) notifs.push({ icon: Bell, text: `80% of monthly budget used.`, tone: "warn" });
  const upcoming = txs.filter((t) => t.category === "Bills" && t.type === "expense").slice(0, 1);
  if (upcoming.length) notifs.push({ icon: ReceiptText, text: `Don't forget recurring bills this month.`, tone: "info" });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onMenu} className="exp-menu-btn" style={{ display: "none", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: 7, cursor: "pointer" }}>
          <Menu size={18} color={T.text} />
        </button>
        <div>
          <div style={{ fontSize: 13, color: T.sub }}>Welcome back,</div>
          <div style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 19 }}>{user.name.split(" ")[0]}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
        <button onClick={() => setShowNotif((s) => !s)} style={{ position: "relative", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, padding: 9, cursor: "pointer" }}>
          <Bell size={17} color={T.text} />
          {notifs.length > 0 && <span style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, borderRadius: 99, background: T.danger }} />}
        </button>
        {showNotif && (
          <div style={{ position: "absolute", top: 46, right: 70, width: 280, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: T.cardShadow, padding: 10, zIndex: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Notifications</div>
            {notifs.length === 0 && <div style={{ fontSize: 13, color: T.sub }}>You're all caught up.</div>}
            {notifs.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, padding: "8px 0", borderTop: i ? `1px solid ${T.border}` : "none", color: n.tone === "danger" ? T.danger : n.tone === "warn" ? T.warn : T.sub }}>
                <n.icon size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {n.text}
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 9, padding: 9, cursor: "pointer" }}>
          {theme === "light" ? <Moon size={17} color={T.text} /> : <Sun size={17} color={T.text} />}
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 99, background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontFamily: "Outfit", fontSize: 13 }}>
          {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .exp-menu-btn { display: flex !important; } }`}</style>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ txs, budget, cur, T, setPage }) {
  const thisMonth = monthKey(todayISO());
  const monthTxs = txs.filter((t) => monthKey(t.date) === thisMonth);
  const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;
  const savings = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  const pct = budget.monthlyLimit ? Math.min(200, Math.round((expense / budget.monthlyLimit) * 100)) : 0;

  const last6 = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const inc = txs.filter((t) => t.type === "income" && monthKey(t.date) === key).reduce((s, t) => s + Number(t.amount), 0);
      const exp = txs.filter((t) => t.type === "expense" && monthKey(t.date) === key).reduce((s, t) => s + Number(t.amount), 0);
      arr.push({ month: d.toLocaleString(undefined, { month: "short" }), income: inc, expense: exp, savings: inc - exp });
    }
    return arr;
  }, [txs]);

  const catData = useMemo(() => {
    const map = {};
    monthTxs.filter((t) => t.type === "expense").forEach((t) => { map[t.category] = (map[t.category] || 0) + Number(t.amount); });
    return Object.entries(map).map(([name, value]) => ({ name, value, color: catColor(name) }));
  }, [monthTxs]);

  const recent = [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 20 }}>
        <MetricCard T={T} icon={TrendingUp} color={T.accent} label="Total income" value={fmtMoney(income, cur)} sub="This month" />
        <MetricCard T={T} icon={TrendingDown} color={T.danger} label="Total expenses" value={fmtMoney(expense, cur)} sub="This month" />
        <MetricCard T={T} icon={Wallet} color={T.blue} label="Remaining balance" value={fmtMoney(balance, cur)} sub={balance >= 0 ? "On track" : "Overspent"} />
        <MetricCard T={T} icon={PiggyBank} color={T.warn} label="Monthly savings" value={`${savings}%`} sub="of income saved" />
      </div>

      {budget.monthlyLimit > 0 && (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13.5 }}>
            <span style={{ fontWeight: 600 }}>Monthly budget</span>
            <span style={{ color: pct >= 100 ? T.danger : pct >= 80 ? T.warn : T.sub }}>{fmtMoney(expense, cur)} / {fmtMoney(budget.monthlyLimit, cur)} ({pct}%)</span>
          </div>
          <div style={{ height: 9, background: T.panelAlt, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: pct >= 100 ? T.danger : pct >= 80 ? T.warn : T.accent, transition: "width .3s" }} />
          </div>
          {pct >= 80 && (
            <div style={{ marginTop: 8, fontSize: 12.5, color: pct >= 100 ? T.danger : T.warn, display: "flex", gap: 6, alignItems: "center" }}>
              <AlertTriangle size={14} /> {pct >= 100 ? "You've exceeded your monthly budget." : pct >= 90 ? "Heads up — you're at 90% of your budget." : "You've reached 80% of your monthly budget."}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 20 }} className="exp-chart-grid">
        <ChartCard T={T} title="Income vs expenses (6 months)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={last6}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="month" stroke={T.sub} fontSize={12} />
              <YAxis stroke={T.sub} fontSize={12} />
              <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12.5 }} />
              <Legend wrapperStyle={{ fontSize: 12.5 }} />
              <Bar dataKey="income" name="Income" fill={T.accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill={T.danger} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard T={T} title="Category-wise expenses">
          {catData.length === 0 ? <EmptyNote T={T} text="No expenses logged this month yet." /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {catData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(v, cur)} contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12.5 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }} className="exp-chart-grid">
        <ChartCard T={T} title="Monthly expense trend">
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={last6}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="month" stroke={T.sub} fontSize={12} />
              <YAxis stroke={T.sub} fontSize={12} />
              <Tooltip formatter={(v) => fmtMoney(v, cur)} contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12.5 }} />
              <Area type="monotone" dataKey="expense" stroke={T.danger} fill={T.danger} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard T={T} title="Savings trend">
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={last6}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="month" stroke={T.sub} fontSize={12} />
              <YAxis stroke={T.sub} fontSize={12} />
              <Tooltip formatter={(v) => fmtMoney(v, cur)} contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12.5 }} />
              <Line type="monotone" dataKey="savings" stroke={T.blue} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14.5 }}>Recent transactions</span>
          <button onClick={() => setPage("transactions")} style={{ fontSize: 12.5, color: T.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View all →</button>
        </div>
        {recent.length === 0 ? <EmptyNote T={T} text="No transactions yet — add your first one." /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recent.map((t) => <TxRow key={t.id} t={t} cur={cur} T={T} compact />)}
          </div>
        )}
      </div>
      <style>{`@media (max-width: 800px) { .exp-chart-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

const MetricCard = ({ T, icon: Icon, color, label, value, sub }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: T.cardShadow }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontSize: 12.5, color: T.sub, fontWeight: 500 }}>{label}</span>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color={color} />
      </div>
    </div>
    <div style={{ fontFamily: "JetBrains Mono", fontWeight: 600, fontSize: 22 }}>{value}</div>
    <div style={{ fontSize: 11.5, color: T.sub, marginTop: 3 }}>{sub}</div>
  </div>
);
const ChartCard = ({ T, title, children }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: T.cardShadow }}>
    <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);
const EmptyNote = ({ T, text }) => <div style={{ color: T.sub, fontSize: 13, textAlign: "center", padding: "30px 0" }}>{text}</div>;

const TxRow = ({ t, cur, T, compact, onEdit, onDelete }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: compact ? "8px 4px" : "10px 6px", borderRadius: 10, borderBottom: compact ? "none" : `1px solid ${T.border}` }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: catColor(t.category) + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
      {catIcon(t.category)}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
      <div style={{ fontSize: 11.5, color: T.sub }}>{t.category} · {t.method} · {t.date}</div>
    </div>
    <div style={{ fontFamily: "JetBrains Mono", fontWeight: 600, fontSize: 13.5, color: t.type === "income" ? T.accent : T.danger, whiteSpace: "nowrap" }}>
      {t.type === "income" ? "+" : "-"}{fmtMoney(t.amount, cur)}
    </div>
    {!compact && (
      <div style={{ display: "flex", gap: 4 }}>
        <IconBtn T={T} icon={Pencil} onClick={onEdit} />
        <IconBtn T={T} icon={Trash2} onClick={onDelete} danger />
      </div>
    )}
  </div>
);
const IconBtn = ({ T, icon: Icon, onClick, danger }) => (
  <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 7, color: danger ? T.danger : T.sub }}>
    <Icon size={15} />
  </button>
);

/* ============================================================
   TRANSACTIONS PAGE — CRUD, search, filter, pagination
   ============================================================ */
function TransactionsPage({ txs, setTxs, cur, T }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ category: "", method: "", type: "", from: "", to: "", minAmt: "", maxAmt: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState(null); // { mode: 'add'|'edit', data }
  const [page, setPageNum] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (query && !(`${t.title} ${t.notes} ${t.category}`.toLowerCase().includes(query.toLowerCase()))) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.method && t.method !== filters.method) return false;
      if (filters.type && t.type !== filters.type) return false;
      if (filters.from && t.date < filters.from) return false;
      if (filters.to && t.date > filters.to) return false;
      if (filters.minAmt && Number(t.amount) < Number(filters.minAmt)) return false;
      if (filters.maxAmt && Number(t.amount) > Number(filters.maxAmt)) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [txs, query, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPageNum(1); }, [query, filters]);

  const deleteTx = (id) => { if (confirm("Delete this transaction?")) setTxs((ts) => ts.filter((t) => t.id !== id)); };

  const exportCSV = () => {
    const header = "Date,Title,Category,Amount,Type,Method,Notes\n";
    const rows = filtered.map((t) => [t.date, t.title, t.category, t.amount, t.type, t.method, (t.notes || "").replace(/,/g, ";")].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "transactions.csv";
    a.click();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 20, margin: 0 }}>Transactions</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportCSV} style={btnGhost(T)}><Download size={15} /> Export CSV</button>
          <button onClick={() => setModal({ mode: "add" })} style={btnPrimary(T)}><Plus size={15} /> Add transaction</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: T.sub }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, notes, or category…"
            style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.panel, color: T.text, fontSize: 13.5 }} />
        </div>
        <button onClick={() => setShowFilters((s) => !s)} style={btnGhost(T)}><Filter size={15} /> Filters</button>
      </div>

      {showFilters && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 16, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
          <SelectF T={T} label="Category" value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })} options={["", ...CATEGORIES.map((c) => c.name)]} />
          <SelectF T={T} label="Payment method" value={filters.method} onChange={(v) => setFilters({ ...filters, method: v })} options={["", ...PAYMENT_METHODS]} />
          <SelectF T={T} label="Type" value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} options={["", "income", "expense"]} />
          <MiniInput T={T} label="From date" type="date" value={filters.from} onChange={(v) => setFilters({ ...filters, from: v })} />
          <MiniInput T={T} label="To date" type="date" value={filters.to} onChange={(v) => setFilters({ ...filters, to: v })} />
          <MiniInput T={T} label="Min amount" type="number" value={filters.minAmt} onChange={(v) => setFilters({ ...filters, minAmt: v })} />
          <MiniInput T={T} label="Max amount" type="number" value={filters.maxAmt} onChange={(v) => setFilters({ ...filters, maxAmt: v })} />
          <button onClick={() => setFilters({ category: "", method: "", type: "", from: "", to: "", minAmt: "", maxAmt: "" })} style={{ ...btnGhost(T), alignSelf: "end" }}>Clear all</button>
        </div>
      )}

      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 10 }}>
        {pageItems.length === 0 ? <EmptyNote T={T} text="No transactions match your filters." /> : (
          pageItems.map((t) => <TxRow key={t.id} t={t} cur={cur} T={T} onEdit={() => setModal({ mode: "edit", data: t })} onDelete={() => deleteTx(t.id)} />)
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, padding: "0 6px" }}>
          <span style={{ fontSize: 12.5, color: T.sub }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IconBtn T={T} icon={ChevronLeft} onClick={() => setPageNum((p) => Math.max(1, p - 1))} />
            <span style={{ fontSize: 12.5 }}>{page} / {totalPages}</span>
            <IconBtn T={T} icon={ChevronRight} onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))} />
          </div>
        </div>
      </div>

      {modal && (
        <TxModal T={T} mode={modal.mode} initial={modal.data} onClose={() => setModal(null)}
          onSave={(tx) => {
            if (modal.mode === "add") setTxs((ts) => [...ts, { ...tx, id: uid() }]);
            else setTxs((ts) => ts.map((t) => (t.id === tx.id ? tx : t)));
            setModal(null);
          }} />
      )}
    </div>
  );
}

const SelectF = ({ T, label, value, onChange, options }) => (
  <label style={{ fontSize: 12, color: T.sub, display: "flex", flexDirection: "column", gap: 4 }}>
    {label}
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "8px 8px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.panelAlt, color: T.text, fontSize: 13 }}>
      {options.map((o) => <option key={o} value={o}>{o || "All"}</option>)}
    </select>
  </label>
);
const MiniInput = ({ T, label, value, onChange, type }) => (
  <label style={{ fontSize: 12, color: T.sub, display: "flex", flexDirection: "column", gap: 4 }}>
    {label}
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "8px 8px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.panelAlt, color: T.text, fontSize: 13 }} />
  </label>
);
const btnPrimary = (T) => ({ display: "flex", alignItems: "center", gap: 6, background: T.accent, color: "#fff", border: "none", padding: "9px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13.5, fontWeight: 600 });
const btnGhost = (T) => ({ display: "flex", alignItems: "center", gap: 6, background: T.panel, color: T.text, border: `1px solid ${T.border}`, padding: "9px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13.5, fontWeight: 500 });

function TxModal({ T, mode, initial, onClose, onSave }) {
  const [form, setForm] = useState(initial || { date: todayISO(), title: "", category: "Food", amount: "", method: "Cash", notes: "", type: "expense" });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.date) e.date = "Date is required.";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = "Enter an amount greater than 0.";
    if (!form.category) e.category = "Choose a category.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, amount: Number(form.amount), id: form.id });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,15,25,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ background: T.panel, borderRadius: 16, padding: 22, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontFamily: "Outfit", fontSize: 17 }}>{mode === "add" ? "Add transaction" : "Edit transaction"}</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.sub }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["expense", "income"].map((ty) => (
            <button key={ty} type="button" onClick={() => setForm({ ...form, type: ty, category: ty === "income" ? "Salary" : "Food" })}
              style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${form.type === ty ? (ty === "income" ? T.accent : T.danger) : T.border}`,
                background: form.type === ty ? (ty === "income" ? T.accent + "1A" : T.danger + "1A") : "transparent",
                color: form.type === ty ? (ty === "income" ? T.accent : T.danger) : T.sub, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", fontSize: 13.5 }}>
              {ty}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FormField T={T} label="Title" error={errors.title}>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Grocery shopping" style={mInput(T)} />
          </FormField>
          <div style={{ display: "flex", gap: 10 }}>
            <FormField T={T} label="Date" error={errors.date} style={{ flex: 1 }}>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={mInput(T)} />
            </FormField>
            <FormField T={T} label="Amount" error={errors.amount} style={{ flex: 1 }}>
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={mInput(T)} />
            </FormField>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <FormField T={T} label="Category" error={errors.category} style={{ flex: 1 }}>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={mInput(T)}>
                {(form.type === "income" ? CATEGORIES.filter((c) => INCOME_CATS.includes(c.name) || true) : CATEGORIES).map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </FormField>
            <FormField T={T} label="Payment method" style={{ flex: 1 }}>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} style={mInput(T)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
          </div>
          <FormField T={T} label="Notes (optional)">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Add a note…" style={{ ...mInput(T), resize: "vertical" }} />
          </FormField>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={{ ...btnGhost(T), flex: 1, justifyContent: "center" }}>Cancel</button>
          <button type="submit" style={{ ...btnPrimary(T), flex: 1, justifyContent: "center" }}>{mode === "add" ? "Add transaction" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
const FormField = ({ T, label, error, children, style }) => (
  <div style={style}>
    <label style={{ fontSize: 12.5, color: T.sub, fontWeight: 500, display: "block", marginBottom: 5 }}>{label}</label>
    {children}
    {error && <div style={{ fontSize: 11.5, color: T.danger, marginTop: 4 }}>{error}</div>}
  </div>
);
const mInput = (T) => ({ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.panelAlt, color: T.text, fontSize: 13.5, outline: "none" });

/* ============================================================
   BUDGET PAGE
   ============================================================ */
function BudgetPage({ txs, budget, setBudget, cur, T, recurring, setRecurring }) {
  const [limit, setLimit] = useState(budget.monthlyLimit);
  const [newRec, setNewRec] = useState({ title: "", amount: "", category: "Bills", day: 1 });
  const thisMonth = monthKey(todayISO());
  const expense = txs.filter((t) => t.type === "expense" && monthKey(t.date) === thisMonth).reduce((s, t) => s + Number(t.amount), 0);
  const pct = limit ? Math.round((expense / limit) * 100) : 0;

  const catBreak = useMemo(() => {
    const map = {};
    txs.filter((t) => t.type === "expense" && monthKey(t.date) === thisMonth).forEach((t) => { map[t.category] = (map[t.category] || 0) + Number(t.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [txs]);

  return (
    <div>
      <h2 style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Monthly budget</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="exp-chart-grid">
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Set spending limit</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} style={mInput(T)} />
            <button onClick={() => setBudget({ ...budget, monthlyLimit: Number(limit) || 0 })} style={btnPrimary(T)}>Save</button>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span>Spent this month</span>
              <span style={{ fontWeight: 600, color: pct >= 100 ? T.danger : pct >= 80 ? T.warn : T.accent }}>{fmtMoney(expense, cur)} ({pct}%)</span>
            </div>
            <div style={{ height: 10, background: T.panelAlt, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: pct >= 100 ? T.danger : pct >= 80 ? T.warn : T.accent }} />
            </div>
            {[80, 90, 100].map((mark) => pct >= mark && (
              <div key={mark} style={{ marginTop: 8, fontSize: 12.5, color: mark === 100 ? T.danger : T.warn, display: "flex", gap: 6, alignItems: "center" }}>
                <AlertTriangle size={14} /> {mark === 100 ? "Budget limit exceeded." : `Reached ${mark}% of your monthly budget.`}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Spending by category this month</div>
          {catBreak.length === 0 ? <EmptyNote T={T} text="No expenses logged yet this month." /> : catBreak.map(([name, amt]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{catIcon(name)}</span>
              <span style={{ fontSize: 13, flex: 1 }}>{name}</span>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 13, fontWeight: 600 }}>{fmtMoney(amt, cur)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginTop: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}><Repeat size={16} /> Recurring expenses</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input placeholder="Title (e.g. Rent)" value={newRec.title} onChange={(e) => setNewRec({ ...newRec, title: e.target.value })} style={{ ...mInput(T), flex: 2, minWidth: 140 }} />
          <input type="number" placeholder="Amount" value={newRec.amount} onChange={(e) => setNewRec({ ...newRec, amount: e.target.value })} style={{ ...mInput(T), flex: 1, minWidth: 100 }} />
          <select value={newRec.category} onChange={(e) => setNewRec({ ...newRec, category: e.target.value })} style={{ ...mInput(T), flex: 1, minWidth: 120 }}>
            {CATEGORIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <input type="number" min="1" max="31" placeholder="Day" value={newRec.day} onChange={(e) => setNewRec({ ...newRec, day: e.target.value })} style={{ ...mInput(T), width: 70 }} />
          <button onClick={() => { if (!newRec.title || !newRec.amount) return; setRecurring([...recurring, { ...newRec, id: uid(), amount: Number(newRec.amount) }]); setNewRec({ title: "", amount: "", category: "Bills", day: 1 }); }} style={btnPrimary(T)}><Plus size={14} /> Add</button>
        </div>
        {recurring.length === 0 ? <EmptyNote T={T} text="No recurring expenses set up." /> : recurring.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${T.border}` }}>
            <span>{catIcon(r.category)}</span>
            <span style={{ flex: 1, fontSize: 13.5 }}>{r.title}</span>
            <span style={{ fontSize: 12, color: T.sub }}>Day {r.day} · {r.category}</span>
            <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, fontSize: 13.5 }}>{fmtMoney(r.amount, cur)}</span>
            <IconBtn T={T} icon={Trash2} danger onClick={() => setRecurring(recurring.filter((x) => x.id !== r.id))} />
          </div>
        ))}
      </div>
      <style>{`@media (max-width: 800px) { .exp-chart-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

/* ============================================================
   GOALS & LOANS PAGE
   ============================================================ */
function GoalsPage({ goals, setGoals, loans, setLoans, cur, T }) {
  const [g, setG] = useState({ title: "", target: "", saved: "" });
  const [l, setL] = useState({ title: "", principal: "", emi: "", monthsLeft: "" });

  return (
    <div>
      <h2 style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Goals &amp; loans</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="exp-chart-grid">
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 12, display: "flex", gap: 7, alignItems: "center" }}><Target size={16} /> Savings goals</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <input placeholder="Goal name" value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} style={{ ...mInput(T), flex: 2, minWidth: 120 }} />
            <input type="number" placeholder="Target" value={g.target} onChange={(e) => setG({ ...g, target: e.target.value })} style={{ ...mInput(T), flex: 1, minWidth: 90 }} />
            <input type="number" placeholder="Saved" value={g.saved} onChange={(e) => setG({ ...g, saved: e.target.value })} style={{ ...mInput(T), flex: 1, minWidth: 90 }} />
            <button onClick={() => { if (!g.title || !g.target) return; setGoals([...goals, { ...g, id: uid(), target: Number(g.target), saved: Number(g.saved || 0) }]); setG({ title: "", target: "", saved: "" }); }} style={btnPrimary(T)}><Plus size={14} /></button>
          </div>
          {goals.length === 0 ? <EmptyNote T={T} text="No savings goals yet." /> : goals.map((go) => {
            const p = Math.min(100, Math.round((go.saved / go.target) * 100));
            return (
              <div key={go.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 500 }}>{go.title}</span>
                  <span style={{ color: T.sub }}>{fmtMoney(go.saved, cur)} / {fmtMoney(go.target, cur)}</span>
                </div>
                <div style={{ height: 8, background: T.panelAlt, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${p}%`, height: "100%", background: T.accent }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 12, display: "flex", gap: 7, alignItems: "center" }}><Landmark size={16} /> EMI / loan tracker</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <input placeholder="Loan name" value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} style={{ ...mInput(T), flex: 2, minWidth: 110 }} />
            <input type="number" placeholder="EMI" value={l.emi} onChange={(e) => setL({ ...l, emi: e.target.value })} style={{ ...mInput(T), flex: 1, minWidth: 80 }} />
            <input type="number" placeholder="Months left" value={l.monthsLeft} onChange={(e) => setL({ ...l, monthsLeft: e.target.value })} style={{ ...mInput(T), flex: 1, minWidth: 90 }} />
            <button onClick={() => { if (!l.title || !l.emi) return; setLoans([...loans, { ...l, id: uid(), principal: Number(l.principal || 0), emi: Number(l.emi), monthsLeft: Number(l.monthsLeft || 0) }]); setL({ title: "", principal: "", emi: "", monthsLeft: "" }); }} style={btnPrimary(T)}><Plus size={14} /></button>
          </div>
          {loans.length === 0 ? <EmptyNote T={T} text="No loans tracked." /> : loans.map((ln) => (
            <div key={ln.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${T.border}` }}>
              <Coins size={16} color={T.sub} />
              <span style={{ flex: 1, fontSize: 13.5 }}>{ln.title}</span>
              <span style={{ fontSize: 12, color: T.sub }}>{ln.monthsLeft} mo left</span>
              <span style={{ fontFamily: "JetBrains Mono", fontWeight: 600, fontSize: 13.5 }}>{fmtMoney(ln.emi, cur)}/mo</span>
              <IconBtn T={T} icon={Trash2} danger onClick={() => setLoans(loans.filter((x) => x.id !== ln.id))} />
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 800px) { .exp-chart-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

/* ============================================================
   REPORTS PAGE — export
   ============================================================ */
function ReportsPage({ txs, user, T, cur }) {
  const exportCSV = () => {
    const header = "Date,Title,Category,Amount,Type,Method,Notes\n";
    const rows = txs.map((t) => [t.date, t.title, t.category, t.amount, t.type, t.method, (t.notes || "").replace(/,/g, ";")].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${user.name.replace(/\s/g, "_")}_transactions.csv`;
    a.click();
  };

  const exportPDF = () => {
    const win = window.open("", "_blank");
    const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const rows = txs.sort((a, b) => b.date.localeCompare(a.date)).map((t) =>
      `<tr><td>${t.date}</td><td>${t.title}</td><td>${t.category}</td><td>${t.type}</td><td>${t.method}</td><td style="text-align:right">${fmtMoney(t.amount, cur)}</td></tr>`
    ).join("");
    win.document.write(`
      <html><head><title>Expense report — ${user.name}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#16213A}
        h1{font-size:20px;margin-bottom:4px} p{color:#677088;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}
        th,td{border-bottom:1px solid #E4E8EF;padding:7px 8px;text-align:left}
        .summary{display:flex;gap:24px;margin-top:16px}
        .summary div{font-size:13px} .summary b{display:block;font-size:17px;margin-top:2px}
      </style></head><body>
      <h1>Monthly expense report</h1>
      <p>${user.name} · generated ${todayISO()}</p>
      <div class="summary">
        <div>Total income<b>${fmtMoney(income, cur)}</b></div>
        <div>Total expenses<b>${fmtMoney(expense, cur)}</b></div>
        <div>Net balance<b>${fmtMoney(income - expense, cur)}</b></div>
      </div>
      <table><thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Type</th><th>Method</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div>
      <h2 style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Reports &amp; export</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <ReportCard T={T} icon={FileText} title="Export as CSV / Excel" desc="Download all transactions as a spreadsheet-ready CSV file." action="Download CSV" onClick={exportCSV} />
        <ReportCard T={T} icon={FileBarChart} title="Export as PDF" desc="Generate a printable PDF summary with totals and full transaction history." action="Download PDF" onClick={exportPDF} />
      </div>
      <div style={{ marginTop: 16, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, fontSize: 13, color: T.sub }}>
        Tip: use the filters on the Transactions page to narrow down a date range or category before exporting from there for a scoped report.
      </div>
    </div>
  );
}
const ReportCard = ({ T, icon: Icon, title, desc, action, onClick }) => (
  <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
    <div style={{ width: 38, height: 38, borderRadius: 10, background: T.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
      <Icon size={18} color={T.accent} />
    </div>
    <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 14 }}>{desc}</div>
    <button onClick={onClick} style={btnPrimary(T)}><Download size={14} /> {action}</button>
  </div>
);

/* ============================================================
   PROFILE PAGE
   ============================================================ */
function ProfilePage({ user, setUser, T, db, setDb, userId }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || "", currency: user.currency });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const save = (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (!form.name.trim()) { setErr("Name cannot be empty."); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setErr("Enter a valid email address."); return; }
    setUser(form);
    setMsg("Profile updated.");
  };

  const changePw = (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (pw.current !== user.password) { setErr("Current password is incorrect."); return; }
    if (pw.next.length < 6) { setErr("New password must be at least 6 characters."); return; }
    setUser({ password: pw.next });
    setPw({ current: "", next: "" });
    setMsg("Password changed.");
  };

  return (
    <div>
      <h2 style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Profile</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="exp-chart-grid">
        <form onSubmit={save} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>Personal information</div>
          <FormField T={T} label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={mInput(T)} /></FormField>
          <FormField T={T} label="Email"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={mInput(T)} /></FormField>
          <FormField T={T} label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={mInput(T)} /></FormField>
          <FormField T={T} label="Currency">
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={mInput(T)}>
              {Object.keys(CURRENCIES).map((c) => <option key={c} value={c}>{c} ({CURRENCIES[c]})</option>)}
            </select>
          </FormField>
          <button type="submit" style={{ ...btnPrimary(T), justifyContent: "center" }}>Save changes</button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <form onSubmit={changePw} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Change password</div>
            <FormField T={T} label="Current password"><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} style={mInput(T)} /></FormField>
            <FormField T={T} label="New password"><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} style={mInput(T)} /></FormField>
            <button type="submit" style={{ ...btnGhost(T), justifyContent: "center" }}>Update password</button>
          </form>
          {(msg || err) && (
            <div style={{ padding: 12, borderRadius: 10, fontSize: 13, background: err ? "#FDEDEB" : "#E9F6F0", color: err ? "#B43A30" : "#1E9E7A", display: "flex", gap: 7, alignItems: "center" }}>
              {err ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />} {err || msg}
            </div>
          )}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, fontSize: 13, color: T.sub }}>
            Member since {user.joined}. All your data is stored locally in this browser for this demo.
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 800px) { .exp-chart-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
