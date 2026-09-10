import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'paybills.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT DEFAULT '',
    password TEXT NOT NULL,
    photo TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    emailVerified INTEGER DEFAULT 0,
    twoFactorSecret TEXT DEFAULT '',
    twoFactorEnabled INTEGER DEFAULT 0,
    referralCode TEXT UNIQUE NOT NULL,
    referredBy TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    device TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    lastActive TEXT DEFAULT (datetime('now')),
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS wallet (
    userId TEXT PRIMARY KEY,
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'NGN',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    service TEXT DEFAULT '',
    amount REAL NOT NULL,
    phone TEXT DEFAULT '',
    meter TEXT DEFAULT '',
    iuc TEXT DEFAULT '',
    token TEXT DEFAULT '',
    status TEXT DEFAULT 'success',
    method TEXT DEFAULT '',
    fee REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bill_reminders (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    service TEXT NOT NULL,
    amount REAL NOT NULL,
    phone TEXT DEFAULT '',
    meter TEXT DEFAULT '',
    iuc TEXT DEFAULT '',
    nextDue TEXT NOT NULL,
    frequency TEXT DEFAULT 'monthly',
    active INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_tokens (
    token TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS data_plans (
    id TEXT PRIMARY KEY,
    network TEXT NOT NULL,
    name TEXT NOT NULL,
    size TEXT NOT NULL,
    price REAL NOT NULL,
    cost_price REAL DEFAULT 0,
    validity TEXT NOT NULL,
    category TEXT DEFAULT 'monthly',
    active INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gift_cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    minAmount REAL DEFAULT 10,
    maxAmount REAL DEFAULT 500,
    rate REAL NOT NULL,
    cost_rate REAL DEFAULT 0,
    logo TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    active INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(userId);
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(createdAt);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
  CREATE INDEX IF NOT EXISTS idx_reminders_user ON bill_reminders(userId);
  CREATE INDEX IF NOT EXISTS idx_data_plans_network ON data_plans(network);
  CREATE INDEX IF NOT EXISTS idx_gift_cards_active ON gift_cards(active);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
`);

// Seed default settings
const defaultSettings = [
  ['platform_name', 'PayBills'],
  ['platform_fee_percent', '2'],
  ['min_fund_amount', '100'],
  ['max_fund_amount', '500000'],
  ['paystack_public_key', ''],
  ['paystack_secret_key', ''],
  ['maintenance_mode', 'false'],
  ['registration_open', 'true'],
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO admin_settings (key, value) VALUES (?, ?)');
for (const [key, value] of defaultSettings) {
  insertSetting.run(key, value);
}

// Seed data_plans if empty
const planCount = db.prepare('SELECT COUNT(*) as count FROM data_plans').get();
if (planCount.count === 0) {
  const insertPlan = db.prepare('INSERT INTO data_plans (id, network, name, size, price, cost_price, validity, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const plans = [
    ['mtn-d1', 'mtn', '75MB - 1 Day', '75MB', 100, 80, '1 Day', 'daily'],
    ['mtn-d2', 'mtn', '150MB - 1 Day', '150MB', 200, 160, '1 Day', 'daily'],
    ['mtn-d3', 'mtn', '350MB - 1 Day', '350MB', 350, 280, '1 Day', 'daily'],
    ['mtn-w1', 'mtn', '350MB - 7 Days', '350MB', 500, 400, '7 Days', 'weekly'],
    ['mtn-w2', 'mtn', '750MB - 7 Days', '750MB', 1000, 800, '7 Days', 'weekly'],
    ['mtn-w3', 'mtn', '1.5GB - 7 Days', '1.5GB', 1500, 1200, '7 Days', 'weekly'],
    ['mtn-m1', 'mtn', '300MB - 30 Days', '300MB', 500, 400, '30 Days', 'monthly'],
    ['mtn-m2', 'mtn', '1GB - 30 Days', '1GB', 1000, 800, '30 Days', 'monthly'],
    ['mtn-m3', 'mtn', '1.5GB - 30 Days', '1.5GB', 1500, 1200, '30 Days', 'monthly'],
    ['mtn-m4', 'mtn', '2GB - 30 Days', '2GB', 2000, 1600, '30 Days', 'monthly'],
    ['mtn-m5', 'mtn', '3GB - 30 Days', '3GB', 3000, 2400, '30 Days', 'monthly'],
    ['mtn-m6', 'mtn', '5GB - 30 Days', '5GB', 5000, 4000, '30 Days', 'monthly'],
    ['mtn-m7', 'mtn', '10GB - 30 Days', '10GB', 10000, 8000, '30 Days', 'monthly'],
    ['mtn-m8', 'mtn', '15GB - 30 Days', '15GB', 15000, 12000, '30 Days', 'monthly'],
    ['mtn-m9', 'mtn', '25GB - 30 Days', '25GB', 20000, 16000, '30 Days', 'monthly'],
    ['mtn-u1', 'mtn', '50GB - 30 Days', '50GB', 30000, 24000, '30 Days', 'unlimited'],
    ['mtn-u2', 'mtn', '100GB - 30 Days', '100GB', 50000, 40000, '30 Days', 'unlimited'],
    ['mtn-u3', 'mtn', 'Unlimited - 30 Days', 'Unlimited', 80000, 64000, '30 Days', 'unlimited'],
    ['airtel-d1', 'airtel', '50MB - 1 Day', '50MB', 100, 80, '1 Day', 'daily'],
    ['airtel-d2', 'airtel', '100MB - 1 Day', '100MB', 200, 160, '1 Day', 'daily'],
    ['airtel-d3', 'airtel', '200MB - 1 Day', '200MB', 350, 280, '1 Day', 'daily'],
    ['airtel-w1', 'airtel', '350MB - 7 Days', '350MB', 500, 400, '7 Days', 'weekly'],
    ['airtel-w2', 'airtel', '750MB - 7 Days', '750MB', 1000, 800, '7 Days', 'weekly'],
    ['airtel-w3', 'airtel', '1.5GB - 7 Days', '1.5GB', 1500, 1200, '7 Days', 'weekly'],
    ['airtel-m1', 'airtel', '500MB - 30 Days', '500MB', 500, 400, '30 Days', 'monthly'],
    ['airtel-m2', 'airtel', '1GB - 30 Days', '1GB', 1000, 800, '30 Days', 'monthly'],
    ['airtel-m3', 'airtel', '1.5GB - 30 Days', '1.5GB', 1500, 1200, '30 Days', 'monthly'],
    ['airtel-m4', 'airtel', '3GB - 30 Days', '3GB', 2000, 1600, '30 Days', 'monthly'],
    ['airtel-m5', 'airtel', '6GB - 30 Days', '6GB', 3000, 2400, '30 Days', 'monthly'],
    ['airtel-m6', 'airtel', '10GB - 30 Days', '10GB', 5000, 4000, '30 Days', 'monthly'],
    ['airtel-m7', 'airtel', '20GB - 30 Days', '20GB', 8000, 6400, '30 Days', 'monthly'],
    ['airtel-m8', 'airtel', '25GB - 30 Days', '25GB', 10000, 8000, '30 Days', 'monthly'],
    ['airtel-u1', 'airtel', '40GB - 30 Days', '40GB', 20000, 16000, '30 Days', 'unlimited'],
    ['airtel-u2', 'airtel', 'Unlimited - 30 Days', 'Unlimited', 50000, 40000, '30 Days', 'unlimited'],
    ['glo-d1', 'glo', '35MB - 1 Day', '35MB', 50, 40, '1 Day', 'daily'],
    ['glo-d2', 'glo', '100MB - 1 Day', '100MB', 100, 80, '1 Day', 'daily'],
    ['glo-d3', 'glo', '200MB - 1 Day', '200MB', 200, 160, '1 Day', 'daily'],
    ['glo-w1', 'glo', '350MB - 14 Days', '350MB', 300, 240, '14 Days', 'weekly'],
    ['glo-w2', 'glo', '750MB - 14 Days', '750MB', 500, 400, '14 Days', 'weekly'],
    ['glo-w3', 'glo', '1GB - 14 Days', '1GB', 1000, 800, '14 Days', 'weekly'],
    ['glo-m1', 'glo', '1GB - 30 Days', '1GB', 1000, 800, '30 Days', 'monthly'],
    ['glo-m2', 'glo', '2.5GB - 30 Days', '2.5GB', 2000, 1600, '30 Days', 'monthly'],
    ['glo-m3', 'glo', '5.8GB - 30 Days', '5.8GB', 3000, 2400, '30 Days', 'monthly'],
    ['glo-m4', 'glo', '10GB - 30 Days', '10GB', 5000, 4000, '30 Days', 'monthly'],
    ['glo-m5', 'glo', '14GB - 30 Days', '14GB', 7000, 5600, '30 Days', 'monthly'],
    ['glo-m6', 'glo', '20GB - 30 Days', '20GB', 10000, 8000, '30 Days', 'monthly'],
    ['glo-m7', 'glo', '29GB - 30 Days', '29GB', 15000, 12000, '30 Days', 'monthly'],
    ['glo-u1', 'glo', '50GB - 30 Days', '50GB', 20000, 16000, '30 Days', 'unlimited'],
    ['glo-u2', 'glo', '100GB - 30 Days', '100GB', 36000, 28800, '30 Days', 'unlimited'],
    ['9m-d1', '9mobile', '25MB - 1 Day', '25MB', 50, 40, '1 Day', 'daily'],
    ['9m-d2', '9mobile', '50MB - 1 Day', '50MB', 100, 80, '1 Day', 'daily'],
    ['9m-d3', '9mobile', '150MB - 1 Day', '150MB', 200, 160, '1 Day', 'daily'],
    ['9m-w1', '9mobile', '250MB - 7 Days', '250MB', 300, 240, '7 Days', 'weekly'],
    ['9m-w2', '9mobile', '500MB - 7 Days', '500MB', 500, 400, '7 Days', 'weekly'],
    ['9m-w3', '9mobile', '1GB - 7 Days', '1GB', 1000, 800, '7 Days', 'weekly'],
    ['9m-m1', '9mobile', '500MB - 30 Days', '500MB', 500, 400, '30 Days', 'monthly'],
    ['9m-m2', '9mobile', '1GB - 30 Days', '1GB', 1000, 800, '30 Days', 'monthly'],
    ['9m-m3', '9mobile', '2GB - 30 Days', '2GB', 1500, 1200, '30 Days', 'monthly'],
    ['9m-m4', '9mobile', '3GB - 30 Days', '3GB', 2000, 1600, '30 Days', 'monthly'],
    ['9m-m5', '9mobile', '5GB - 30 Days', '5GB', 3000, 2400, '30 Days', 'monthly'],
    ['9m-m6', '9mobile', '10GB - 30 Days', '10GB', 5000, 4000, '30 Days', 'monthly'],
    ['9m-m7', '9mobile', '15GB - 30 Days', '15GB', 7500, 6000, '30 Days', 'monthly'],
    ['9m-u1', '9mobile', '25GB - 30 Days', '25GB', 10000, 8000, '30 Days', 'unlimited'],
    ['9m-u2', '9mobile', '50GB - 30 Days', '50GB', 20000, 16000, '30 Days', 'unlimited'],
    ['sm-d1', 'smile', '500MB - 7 Days', '500MB', 500, 400, '7 Days', 'weekly'],
    ['sm-d2', 'smile', '1GB - 7 Days', '1GB', 1000, 800, '7 Days', 'weekly'],
    ['sm-m1', 'smile', '1GB - 30 Days', '1GB', 1000, 800, '30 Days', 'monthly'],
    ['sm-m2', 'smile', '2GB - 30 Days', '2GB', 1500, 1200, '30 Days', 'monthly'],
    ['sm-m3', 'smile', '3GB - 30 Days', '3GB', 2000, 1600, '30 Days', 'monthly'],
    ['sm-m4', 'smile', '5GB - 30 Days', '5GB', 3000, 2400, '30 Days', 'monthly'],
    ['sm-m5', 'smile', '10GB - 30 Days', '10GB', 5000, 4000, '30 Days', 'monthly'],
    ['sm-m6', 'smile', '15GB - 30 Days', '15GB', 7000, 5600, '30 Days', 'monthly'],
    ['sm-m7', 'smile', '25GB - 30 Days', '25GB', 10000, 8000, '30 Days', 'monthly'],
    ['sm-m8', 'smile', '50GB - 30 Days', '50GB', 15000, 12000, '30 Days', 'monthly'],
    ['sm-u1', 'smile', '100GB - 30 Days', '100GB', 25000, 20000, '30 Days', 'unlimited'],
    ['sm-u2', 'smile', 'Unlimited - 30 Days', 'Unlimited', 40000, 32000, '30 Days', 'unlimited'],
  ];
  for (const p of plans) {
    insertPlan.run(...p);
  }
}

// Seed gift_cards if empty
const gcCount = db.prepare('SELECT COUNT(*) as count FROM gift_cards').get();
if (gcCount.count === 0) {
  const insertGC = db.prepare('INSERT INTO gift_cards (id, name, currency, minAmount, maxAmount, rate, cost_rate, logo, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const gcs = [
    ['amazon-us', 'Amazon US', 'USD', 10, 500, 1600, 1500, '🛒', 1],
    ['amazon-uk', 'Amazon UK', 'GBP', 10, 300, 2000, 1900, '🛒', 1],
    ['apple-us', 'Apple US', 'USD', 10, 200, 1600, 1500, '', 1],
    ['google-play-us', 'Google Play US', 'USD', 10, 200, 1600, 1500, '🎮', 1],
    ['steam-us', 'Steam US', 'USD', 10, 200, 1600, 1500, '🎮', 1],
    ['spotify', 'Spotify', 'USD', 10, 100, 1600, 1500, '🎵', 1],
    ['netflix-us', 'Netflix US', 'USD', 10, 200, 1600, 1500, '🎬', 1],
    ['playstation-us', 'PlayStation US', 'USD', 10, 200, 1600, 1500, '🎮', 1],
    ['xbox-us', 'Xbox US', 'USD', 10, 200, 1600, 1500, '🎮', 1],
    ['itunes-us', 'iTunes US', 'USD', 10, 200, 1600, 1500, '🎵', 1],
  ];
  for (const gc of gcs) {
    insertGC.run(...gc);
  }
}

// Make default admin (first user gets admin role)
const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminUser) {
  db.prepare("UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY createdAt ASC LIMIT 1)").run();
}

export default db;
