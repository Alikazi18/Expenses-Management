-- ============================================================
-- Finly — Monthly Expense Management System
-- Normalized MySQL schema + sample data
-- ============================================================

CREATE DATABASE IF NOT EXISTS finly CHARACTER SET utf8mb4;
USE finly;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,        -- bcrypt hash, never plaintext
  phone           VARCHAR(30),
  currency        CHAR(3) NOT NULL DEFAULT 'INR',
  theme           ENUM('light','dark') NOT NULL DEFAULT 'light',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- CATEGORIES (shared lookup table; supports custom user categories too)
-- ------------------------------------------------------------
CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NULL,              -- NULL = system default category
  name        VARCHAR(60) NOT NULL,
  type        ENUM('income','expense','both') NOT NULL DEFAULT 'expense',
  icon        VARCHAR(10),
  color_hex   CHAR(7) NOT NULL DEFAULT '#9AA3AF',
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_category_per_user (user_id, name)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE transactions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  category_id     INT UNSIGNED NOT NULL,
  title           VARCHAR(160) NOT NULL,
  amount          DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  type            ENUM('income','expense') NOT NULL,
  payment_method  ENUM('Cash','Credit Card','Debit Card','UPI','Bank Transfer','Wallet') NOT NULL,
  txn_date        DATE NOT NULL,
  notes           VARCHAR(500),
  is_recurring    BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_id    BIGINT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_category FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_tx_user_date (user_id, txn_date),
  INDEX idx_tx_user_category (user_id, category_id),
  INDEX idx_tx_user_type (user_id, type)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- RECURRING EXPENSES (templates that spawn transactions)
-- ------------------------------------------------------------
CREATE TABLE recurring_expenses (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  title       VARCHAR(160) NOT NULL,
  amount      DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  day_of_month TINYINT UNSIGNED NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_rec_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

ALTER TABLE transactions
  ADD CONSTRAINT fk_tx_recurring FOREIGN KEY (recurring_id) REFERENCES recurring_expenses(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- BUDGETS (one active monthly budget per user, history kept per month)
-- ------------------------------------------------------------
CREATE TABLE budgets (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  month           CHAR(7) NOT NULL,             -- format YYYY-MM
  monthly_limit   DECIMAL(14,2) NOT NULL CHECK (monthly_limit >= 0),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_budget_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_budget_month (user_id, month)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SAVINGS GOALS
-- ------------------------------------------------------------
CREATE TABLE goals (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  title         VARCHAR(120) NOT NULL,
  target_amount DECIMAL(14,2) NOT NULL CHECK (target_amount > 0),
  saved_amount  DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  target_date   DATE NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- LOANS / EMI TRACKER
-- ------------------------------------------------------------
CREATE TABLE loans (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  title           VARCHAR(120) NOT NULL,
  principal       DECIMAL(14,2) NOT NULL CHECK (principal >= 0),
  emi_amount      DECIMAL(14,2) NOT NULL CHECK (emi_amount > 0),
  months_remaining SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  interest_rate   DECIMAL(5,2) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_loan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  type        ENUM('budget_warning','bill_due','overspend','system') NOT NULL,
  message     VARCHAR(255) NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_unread (user_id, is_read)
) ENGINE=InnoDB;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO users (name, email, password_hash, phone, currency) VALUES
('Demo User', 'demo@expense.app', '$2b$10$placeholderHashGeneratedByBcrypt', '+91 90000 00000', 'INR');

INSERT INTO categories (user_id, name, type, icon, color_hex) VALUES
(NULL, 'Food', 'expense', '🍽', '#F97362'),
(NULL, 'Transport', 'expense', '🚌', '#5B9BD5'),
(NULL, 'Shopping', 'expense', '🛍', '#C77DFF'),
(NULL, 'Bills', 'expense', '🧾', '#FFB347'),
(NULL, 'Entertainment', 'expense', '🎬', '#FF6FA5'),
(NULL, 'Healthcare', 'expense', '⚕', '#4DD0B5'),
(NULL, 'Education', 'expense', '🎓', '#7C9CFF'),
(NULL, 'Salary', 'income', '💼', '#2BB87A'),
(NULL, 'Investment', 'both', '📈', '#2BD0C4'),
(NULL, 'Others', 'both', '📦', '#9AA3AF');

INSERT INTO budgets (user_id, month, monthly_limit) VALUES (1, DATE_FORMAT(CURDATE(), '%Y-%m'), 25000);

INSERT INTO transactions (user_id, category_id, title, amount, type, payment_method, txn_date, notes) VALUES
(1, 8, 'Monthly salary', 65000, 'income', 'Bank Transfer', CURDATE() - INTERVAL 1 DAY, 'June payroll'),
(1, 1, 'Grocery run', 2400, 'expense', 'UPI', CURDATE() - INTERVAL 2 DAY, NULL),
(1, 4, 'Electricity bill', 1800, 'expense', 'Bank Transfer', CURDATE() - INTERVAL 3 DAY, NULL),
(1, 2, 'Cab to office', 320, 'expense', 'Wallet', CURDATE() - INTERVAL 4 DAY, NULL),
(1, 5, 'Movie night', 900, 'expense', 'Credit Card', CURDATE() - INTERVAL 5 DAY, NULL),
(1, 9, 'Mutual fund SIP', 5000, 'income', 'Bank Transfer', CURDATE() - INTERVAL 6 DAY, 'Index fund'),
(1, 3, 'New headphones', 3500, 'expense', 'Credit Card', CURDATE() - INTERVAL 7 DAY, NULL),
(1, 6, 'Dentist visit', 1200, 'expense', 'Cash', CURDATE() - INTERVAL 9 DAY, NULL),
(1, 7, 'Online course', 2200, 'expense', 'Debit Card', CURDATE() - INTERVAL 12 DAY, 'UI/UX certification'),
(1, 10, 'Freelance project', 12000, 'income', 'Bank Transfer', CURDATE() - INTERVAL 20 DAY, 'Logo design');

INSERT INTO recurring_expenses (user_id, category_id, title, amount, day_of_month) VALUES
(1, 5, 'Netflix', 649, 5);

INSERT INTO goals (user_id, title, target_amount, saved_amount) VALUES
(1, 'Emergency fund', 100000, 32000);

INSERT INTO loans (user_id, title, principal, emi_amount, months_remaining, interest_rate) VALUES
(1, 'Car loan', 400000, 9800, 28, 9.5);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  user_id,
  DATE_FORMAT(txn_date, '%Y-%m') AS month,
  SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END) AS net_balance
FROM transactions
GROUP BY user_id, DATE_FORMAT(txn_date, '%Y-%m');

CREATE OR REPLACE VIEW v_category_breakdown AS
SELECT
  t.user_id,
  DATE_FORMAT(t.txn_date, '%Y-%m') AS month,
  c.name AS category,
  SUM(t.amount) AS total
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.type = 'expense'
GROUP BY t.user_id, DATE_FORMAT(t.txn_date, '%Y-%m'), c.name;
