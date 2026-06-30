// ============================================================
// Finly backend — Express + MySQL scaffold
// File: server.js (entry point)
// Run: node server.js  (after `npm install` and configuring .env)
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const transactionRoutes = require('./routes/transactions.routes');
const budgetRoutes = require('./routes/budget.routes');
const reportRoutes = require('./routes/reports.routes');
const { authenticate } = require('./middleware/auth.middleware');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 })); // basic abuse protection

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require valid JWT)
app.use('/api/transactions', authenticate, transactionRoutes);
app.use('/api/budgets', authenticate, budgetRoutes);
app.use('/api/reports', authenticate, reportRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Centralized error handler — keeps error shape consistent across the API
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Finly API listening on port ${PORT}`));

/* ============================================================
   FOLDER STRUCTURE FOR THE FULL BACKEND
   (create these files following the same patterns as server.js)
   ============================================================

   backend/
   ├── server.js                  <- this file
   ├── .env.example
   ├── package.json
   ├── config/
   │   └── db.js                  <- mysql2/promise connection pool
   ├── middleware/
   │   ├── auth.middleware.js     <- verifies JWT, attaches req.user
   │   ├── validate.middleware.js <- express-validator wrapper
   │   └── error.middleware.js    <- centralized error formatting
   ├── controllers/
   │   ├── auth.controller.js     <- register, login, password hashing (bcrypt)
   │   ├── transactions.controller.js
   │   ├── budget.controller.js
   │   └── reports.controller.js
   ├── routes/
   │   ├── auth.routes.js
   │   ├── transactions.routes.js
   │   ├── budget.routes.js
   │   └── reports.routes.js
   └── utils/
       ├── jwt.js                 <- sign/verify helpers
       └── csv.js / pdf.js        <- export helpers (csv-writer, pdfkit)

   ============================================================
   EXAMPLE: config/db.js
   ============================================================
   const mysql = require('mysql2/promise');
   const pool = mysql.createPool({
     host: process.env.DB_HOST,
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME,
     waitForConnections: true,
     connectionLimit: 10,
   });
   module.exports = pool;

   ============================================================
   EXAMPLE: controllers/auth.controller.js (register)
   ============================================================
   const bcrypt = require('bcrypt');
   const jwt = require('jsonwebtoken');
   const db = require('../config/db');

   exports.register = async (req, res, next) => {
     try {
       const { name, email, password, currency } = req.body;
       if (!name || !email || !password) {
         return res.status(400).json({ error: 'Name, email and password are required.' });
       }
       const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
       if (existing.length) return res.status(409).json({ error: 'Email already registered.' });

       const hash = await bcrypt.hash(password, 10);
       const [result] = await db.query(
         'INSERT INTO users (name, email, password_hash, currency) VALUES (?, ?, ?, ?)',
         [name, email, hash, currency || 'INR']
       );
       const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, { expiresIn: '7d' });
       res.status(201).json({ token });
     } catch (err) { next(err); }
   };

   ============================================================
   EXAMPLE: middleware/auth.middleware.js
   ============================================================
   const jwt = require('jsonwebtoken');
   exports.authenticate = (req, res, next) => {
     const header = req.headers.authorization;
     if (!header) return res.status(401).json({ error: 'Missing authorization header.' });
     try {
       const token = header.split(' ')[1];
       req.user = jwt.verify(token, process.env.JWT_SECRET);
       next();
     } catch {
       res.status(401).json({ error: 'Invalid or expired token.' });
     }
   };

   ============================================================
   EXAMPLE: controllers/transactions.controller.js (validated create)
   ============================================================
   exports.create = async (req, res, next) => {
     try {
       const { categoryId, title, amount, type, paymentMethod, txnDate, notes } = req.body;
       if (!title || !categoryId || !type || !txnDate) {
         return res.status(400).json({ error: 'Missing required fields.' });
       }
       if (amount === undefined || isNaN(amount) || Number(amount) <= 0) {
         return res.status(400).json({ error: 'Amount must be a positive number.' });
       }
       const [result] = await db.query(
         `INSERT INTO transactions (user_id, category_id, title, amount, type, payment_method, txn_date, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
         [req.user.id, categoryId, title, amount, type, paymentMethod, txnDate, notes || null]
       );
       res.status(201).json({ id: result.insertId });
     } catch (err) { next(err); }
   };
*/
