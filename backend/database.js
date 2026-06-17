const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'ordersystem.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS Events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT CHECK( status IN ('ACTIVE', 'ARCHIVED') ) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK( role IN ('ADMIN', 'GUEST') ) NOT NULL DEFAULT 'GUEST',
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS Products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    category TEXT NOT NULL,
    is_18_plus INTEGER NOT NULL DEFAULT 0,
    stock_amount INTEGER,
    stock_unit TEXT DEFAULT 'stuks',
    status TEXT CHECK( status IN ('AVAILABLE', 'OUT_OF_STOCK', 'HIDDEN') ) NOT NULL DEFAULT 'AVAILABLE'
  );

  CREATE TABLE IF NOT EXISTS ProductOptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    name TEXT NOT NULL,
    choices TEXT NOT NULL, -- Stored as JSON string
    FOREIGN KEY(product_id) REFERENCES Products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ProductIngredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    ingredient_product_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    FOREIGN KEY(product_id) REFERENCES Products(id) ON DELETE CASCADE,
    FOREIGN KEY(ingredient_product_id) REFERENCES Products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_id INTEGER,
    status TEXT CHECK( status IN ('PENDING', 'COMPLETED', 'CANCELLED') ) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES Users(id),
    FOREIGN KEY(event_id) REFERENCES Events(id)
  );

  CREATE TABLE IF NOT EXISTS OrderItems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    selected_options TEXT, -- Stored as JSON string
    remark TEXT,
    FOREIGN KEY(order_id) REFERENCES Orders(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES Products(id)
  );

  CREATE TABLE IF NOT EXISTS AgeVerificationRequests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    status TEXT CHECK( status IN ('PENDING', 'APPROVED', 'REJECTED') ) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Migrations
try {
  db.exec(`ALTER TABLE Events ADD COLUMN announcement TEXT`);
  console.log("Migration: Added announcement column to Events table.");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  db.exec(`ALTER TABLE Users ADD COLUMN is_18_plus INTEGER NOT NULL DEFAULT 0`);
  console.log("Migration: Added is_18_plus column to Users table.");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  db.exec(`ALTER TABLE ProductOptions ADD COLUMN type TEXT NOT NULL DEFAULT 'select'`);
  console.log("Migration: Added type column to ProductOptions table.");
} catch (e) {
  // Column already exists, safe to ignore
}

try {
  const schema = db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'Orders'").get();
  if (schema && schema.sql && !schema.sql.includes('PREPARING')) {
    console.log("Migration: Updating Orders status check constraint to include PREPARING...");
    db.exec(`
      PRAGMA foreign_keys = OFF;
      
      -- Create new table with updated CHECK constraint
      CREATE TABLE Orders_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        event_id INTEGER,
        status TEXT CHECK( status IN ('PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED') ) NOT NULL DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES Users(id),
        FOREIGN KEY(event_id) REFERENCES Events(id)
      );

      -- Copy data
      INSERT INTO Orders_new (id, user_id, event_id, status, created_at, completed_at)
      SELECT id, user_id, event_id, status, created_at, completed_at FROM Orders;

      -- Drop old table
      DROP TABLE Orders;

      -- Rename table
      ALTER TABLE Orders_new RENAME TO Orders;

      PRAGMA foreign_keys = ON;
    `);
    console.log("Migration: Orders table successfully migrated to include PREPARING status constraint.");
  }
} catch (e) {
  console.error("Migration failed for Orders status check constraint update:", e);
}

// Initialize a default admin user if none exists
const getAdmin = db.prepare("SELECT * FROM Users WHERE role = 'ADMIN'").get();
if (!getAdmin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare("INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)").run('admin', hash, 'ADMIN');
  console.log("Default admin account created (admin / admin123)");
}

// Initialize a default active event if none exists
const getActiveEvent = db.prepare("SELECT * FROM Events WHERE status = 'ACTIVE'").get();
if (!getActiveEvent) {
  db.prepare("INSERT INTO Events (name, status) VALUES (?, ?)").run('Welkom bij het Systeem', 'ACTIVE');
  console.log("Default active event created");
}

module.exports = db;
