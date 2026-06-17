const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-pi';

app.use(cors());
app.use(express.json());

// Serve uploads & Configure Multer for product images
const fs = require('fs');
const multer = require('multer');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- Authentication Middleware ---
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Toegang geweigerd. Geen token.' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Ongeldig token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Alleen toegang voor beheerders.' });
  }
  next();
};

// --- Routes: Auth ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM Users WHERE username = ?').get(username);
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Verkeerde gebruikersnaam of wachtwoord.' });
  }

  db.prepare('UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  const token = jwt.sign({ id: user.id, role: user.role, username: user.username, is_18_plus: !!user.is_18_plus }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, role: user.role, username: user.username });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, role, username, is_18_plus FROM Users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
  res.json({ id: user.id, role: user.role, username: user.username, is_18_plus: !!user.is_18_plus });
});

// --- Routes: Events ---
app.get('/api/events/active', (req, res) => {
  const event = db.prepare("SELECT * FROM Events WHERE status = 'ACTIVE'").get();
  res.json(event || null);
});

app.get('/api/admin/events', authenticate, requireAdmin, (req, res) => {
  const events = db.prepare("SELECT * FROM Events ORDER BY created_at DESC").all();
  res.json(events);
});

app.post('/api/admin/events', authenticate, requireAdmin, (req, res) => {
  const { name } = req.body;
  // Archive current active events
  db.prepare("UPDATE Events SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP WHERE status = 'ACTIVE'").run();
  // Create new
  const info = db.prepare("INSERT INTO Events (name, status) VALUES (?, 'ACTIVE')").run(name);
  res.json({ id: info.lastInsertRowid, name, status: 'ACTIVE' });
});

app.post('/api/admin/events/archive', authenticate, requireAdmin, (req, res) => {
  db.prepare("UPDATE Events SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP WHERE status = 'ACTIVE'").run();
  res.json({ success: true });
});

app.post('/api/admin/events/announcement', authenticate, requireAdmin, (req, res) => {
  const { announcement } = req.body;
  try {
    db.prepare("UPDATE Events SET announcement = ? WHERE status = 'ACTIVE'").run(announcement || null);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bijwerken van mededeling mislukt.' });
  }
});

// GET detailed stats, guest list and orders for a specific event
app.get('/api/admin/events/:id/details', authenticate, requireAdmin, (req, res) => {
  const eventId = req.params.id;
  try {
    const event = db.prepare("SELECT * FROM Events WHERE id = ?").get(eventId);
    if (!event) return res.status(404).json({ error: 'Evenement niet gevonden.' });

    // 1. Product stats (completed items)
    const stats = db.prepare(`
      SELECT p.name, p.category, COUNT(oi.id) as quantity
      FROM OrderItems oi
      JOIN Products p ON oi.product_id = p.id
      JOIN Orders o ON oi.order_id = o.id
      WHERE o.event_id = ? AND o.status = 'COMPLETED'
      GROUP BY p.id
      ORDER BY quantity DESC
    `).all(eventId);

    // 2. Guest list who ordered
    const guests = db.prepare(`
      SELECT DISTINCT u.id, u.username
      FROM Orders o
      JOIN Users u ON o.user_id = u.id
      WHERE o.event_id = ?
    `).all(eventId);

    // 3. Detailed orders list
    const orders = db.prepare(`
      SELECT o.*, u.username as guest_name
      FROM Orders o
      JOIN Users u ON o.user_id = u.id
      WHERE o.event_id = ?
      ORDER BY o.created_at DESC
    `).all(eventId);

    const enrichedOrders = orders.map(order => {
      const items = db.prepare(`
        SELECT oi.*, p.name as product_name, p.category as product_category
        FROM OrderItems oi
        JOIN Products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(order.id);

      return {
        ...order,
        items: items.map(it => ({
          ...it,
          selected_options: JSON.parse(it.selected_options || '{}')
        }))
      };
    });

    res.json({ event, stats, guests, orders: enrichedOrders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fout bij ophalen van evenement details.' });
  }
});

// --- Routes: Users (Admin) ---
app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id, username, role, is_18_plus, last_login FROM Users").all();
  res.json(users.map(u => ({ ...u, is_18_plus: !!u.is_18_plus })));
});

app.post('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  const { username, password, role, is_18_plus } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare("INSERT INTO Users (username, password_hash, role, is_18_plus) VALUES (?, ?, ?, ?)").run(username, hash, role || 'GUEST', is_18_plus ? 1 : 0);
    res.json({ id: info.lastInsertRowid, username, role, is_18_plus: !!is_18_plus });
  } catch (err) {
    res.status(400).json({ error: 'Gebruikersnaam bestaat al.' });
  }
});

app.put('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  const { username, password, role, is_18_plus } = req.body;
  const userId = req.params.id;
  try {
    if (password && password.trim()) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare("UPDATE Users SET username = ?, password_hash = ?, role = ?, is_18_plus = ? WHERE id = ?")
        .run(username, hash, role, is_18_plus ? 1 : 0, userId);
    } else {
      db.prepare("UPDATE Users SET username = ?, role = ?, is_18_plus = ? WHERE id = ?")
        .run(username, role, is_18_plus ? 1 : 0, userId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Bewerken mislukt. Gebruikersnaam bestaat mogelijk al.' });
  }
});

app.delete('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  const userId = req.params.id;
  if (Number(userId) === req.user.id) {
    return res.status(400).json({ error: 'Je kunt je eigen account niet verwijderen.' });
  }

  try {
    const runTx = db.transaction(() => {
      // Anonymize user's orders to preserve statistics
      db.prepare("UPDATE Orders SET user_id = NULL WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM Users WHERE id = ?").run(userId);
    });

    runTx();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verwijderen van gebruiker mislukt.' });
  }
});

// --- Routes: Products (Admin & Guest) ---
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare("SELECT * FROM Products WHERE status != 'HIDDEN'").all();
    const enriched = products.map(p => {
      const options = db.prepare("SELECT * FROM ProductOptions WHERE product_id = ?").all(p.id);
      const parsedOptions = options.map(opt => ({
        ...opt,
        choices: JSON.parse(opt.choices || '[]')
      }));
      const ingredients = db.prepare("SELECT * FROM ProductIngredients WHERE product_id = ?").all(p.id);
      return {
        ...p,
        is_18_plus: !!p.is_18_plus,
        options: parsedOptions,
        ingredients: ingredients
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen van producten.' });
  }
});

app.get('/api/admin/products', authenticate, requireAdmin, (req, res) => {
  try {
    const products = db.prepare("SELECT * FROM Products").all();
    const enriched = products.map(p => {
      const options = db.prepare("SELECT * FROM ProductOptions WHERE product_id = ?").all(p.id);
      const parsedOptions = options.map(opt => ({
        ...opt,
        choices: JSON.parse(opt.choices || '[]')
      }));
      const ingredients = db.prepare("SELECT * FROM ProductIngredients WHERE product_id = ?").all(p.id);
      return {
        ...p,
        is_18_plus: !!p.is_18_plus,
        options: parsedOptions,
        ingredients: ingredients
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Fout bij ophalen van producten.' });
  }
});

app.post('/api/admin/products/upload', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Geen bestand geüpload.' });
  }
  res.json({ filename: req.file.filename });
});

app.post('/api/admin/products', authenticate, requireAdmin, (req, res) => {
  const { name, description, image_url, category, is_18_plus, status, options } = req.body;
  try {
    const runTx = db.transaction(() => {
      const info = db.prepare("INSERT INTO Products (name, description, image_url, category, is_18_plus, status) VALUES (?, ?, ?, ?, ?, ?)").run(
        name, description || '', image_url || null, category, is_18_plus ? 1 : 0, status || 'AVAILABLE'
      );
      const productId = info.lastInsertRowid;
      
      if (options && Array.isArray(options)) {
        const insertOpt = db.prepare("INSERT INTO ProductOptions (product_id, name, type, choices) VALUES (?, ?, ?, ?)");
        for (const opt of options) {
          insertOpt.run(productId, opt.name, opt.type || 'select', JSON.stringify(opt.choices || []));
        }
      }
      
      const { is_composition, ingredients } = req.body;
      if (is_composition && ingredients && Array.isArray(ingredients)) {
        const insertIng = db.prepare("INSERT INTO ProductIngredients (product_id, ingredient_product_id, amount) VALUES (?, ?, ?)");
        for (const ing of ingredients) {
          insertIng.run(productId, parseInt(ing.ingredient_id, 10), parseInt(ing.amount, 10));
        }
      }

      return productId;
    });

    const productId = runTx();
    res.json({ id: productId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Product toevoegen mislukt.' });
  }
});

app.put('/api/admin/products/:id', authenticate, requireAdmin, (req, res) => {
  const { name, description, image_url, category, is_18_plus, status, options } = req.body;
  const productId = req.params.id;
  try {
    const runTx = db.transaction(() => {
      db.prepare("UPDATE Products SET name=?, description=?, image_url=?, category=?, is_18_plus=?, status=? WHERE id=?").run(
        name, description || '', image_url || null, category, is_18_plus ? 1 : 0, status, productId
      );

      // Remove existing options and insert new ones
      db.prepare("DELETE FROM ProductOptions WHERE product_id = ?").run(productId);

      if (options && Array.isArray(options)) {
        const insertOpt = db.prepare("INSERT INTO ProductOptions (product_id, name, type, choices) VALUES (?, ?, ?, ?)");
        for (const opt of options) {
          insertOpt.run(productId, opt.name, opt.type || 'select', JSON.stringify(opt.choices || []));
        }
      }

      const { is_composition, ingredients } = req.body;
      db.prepare("DELETE FROM ProductIngredients WHERE product_id = ?").run(productId);
      if (is_composition && ingredients && Array.isArray(ingredients)) {
        const insertIng = db.prepare("INSERT INTO ProductIngredients (product_id, ingredient_product_id, amount) VALUES (?, ?, ?)");
        for (const ing of ingredients) {
          insertIng.run(productId, parseInt(ing.ingredient_id, 10), parseInt(ing.amount, 10));
        }
      }
    });

    runTx();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Product wijzigen mislukt.' });
  }
});

app.put('/api/admin/products/:id/stock', authenticate, requireAdmin, (req, res) => {
  const { stock_amount, stock_unit } = req.body;
  const productId = req.params.id;
  try {
    const amount = stock_amount === '' || stock_amount === null ? null : parseInt(stock_amount, 10);
    db.prepare("UPDATE Products SET stock_amount=?, stock_unit=? WHERE id=?").run(
      amount, stock_unit || 'stuks', productId
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Voorraad wijzigen mislukt.' });
  }
});

// --- Routes: Orders (Guest & Admin) ---
app.post('/api/orders', authenticate, (req, res) => {
  const activeEvent = db.prepare("SELECT * FROM Events WHERE status = 'ACTIVE'").get();
  if (!activeEvent) {
    return res.status(400).json({ error: 'Er is geen actief evenement om voor te bestellen.' });
  }
  
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Geen items opgegeven.' });
  }

  // Check if user is 18+ if ordering 18+ items
  const user = db.prepare('SELECT is_18_plus FROM Users WHERE id = ?').get(req.user.id);
  const isUser18 = user ? !!user.is_18_plus : false;

  for (const item of items) {
    const product = db.prepare('SELECT is_18_plus FROM Products WHERE id = ?').get(item.product_id);
    if (product && product.is_18_plus && !isUser18) {
      return res.status(403).json({ error: 'Je bent niet gemachtigd om 18+ producten te bestellen.' });
    }
  }

  const insertOrder = db.prepare("INSERT INTO Orders (user_id, event_id, status) VALUES (?, ?, 'PENDING')");
  const insertOrderItem = db.prepare("INSERT INTO OrderItems (order_id, product_id, selected_options, remark) VALUES (?, ?, ?, ?)");

  try {
    const runTx = db.transaction(() => {
      const info = insertOrder.run(req.user.id, activeEvent.id);
      const orderId = info.lastInsertRowid;
      
      for (const item of items) {
        insertOrderItem.run(
          orderId,
          item.product_id,
          JSON.stringify(item.selected_options || {}),
          item.remark || ''
        );
      }
      return orderId;
    });

    const orderId = runTx();
    res.json({ success: true, orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bestelling plaatsen mislukt.' });
  }
});

app.get('/api/orders', authenticate, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, e.name as event_name 
      FROM Orders o
      JOIN Events e ON o.event_id = e.id
      WHERE o.user_id = ? AND e.status = 'ACTIVE'
      ORDER BY o.created_at DESC
    `).all(req.user.id);

    const enriched = orders.map(order => {
      const items = db.prepare(`
        SELECT oi.*, p.name as product_name, p.category as product_category, p.is_18_plus
        FROM OrderItems oi
        JOIN Products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(order.id);
      
      const parsedItems = items.map(item => ({
        ...item,
        selected_options: JSON.parse(item.selected_options || '{}')
      }));

      return {
        ...order,
        items: parsedItems
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ophalen van bestellingen mislukt.' });
  }
});

app.post('/api/orders/:id/cancel', authenticate, (req, res) => {
  const orderId = req.params.id;
  try {
    const order = db.prepare("SELECT * FROM Orders WHERE id = ?").get(orderId);
    if (!order) return res.status(404).json({ error: 'Bestelling niet gevonden.' });
    if (order.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Niet gemachtigd.' });
    }
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Bestelling is al in behandeling of afgerond.' });
    }

    db.prepare("UPDATE Orders SET status = 'CANCELLED' WHERE id = ?").run(orderId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Annuleren mislukt.' });
  }
});

// --- Admin Orders (Fase 4 & 5) ---
app.get('/api/admin/orders', authenticate, requireAdmin, (req, res) => {
  try {
    const activeEvent = db.prepare("SELECT * FROM Events WHERE status = 'ACTIVE'").get();
    if (!activeEvent) return res.json([]);

    const orders = db.prepare(`
      SELECT o.*, u.username as guest_name
      FROM Orders o
      JOIN Users u ON o.user_id = u.id
      WHERE o.event_id = ? AND o.status IN ('PENDING', 'PREPARING')
      ORDER BY o.created_at ASC
    `).all(activeEvent.id);

    const enriched = orders.map(order => {
      const items = db.prepare(`
        SELECT oi.*, p.name as product_name, p.category as product_category, p.is_18_plus
        FROM OrderItems oi
        JOIN Products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(order.id);

      const parsedItems = items.map(item => ({
        ...item,
        selected_options: JSON.parse(item.selected_options || '{}')
      }));

      return {
        ...order,
        items: parsedItems
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fout bij ophalen van bestellingen.' });
  }
});

app.post('/api/admin/orders/:id/prepare', authenticate, requireAdmin, (req, res) => {
  const orderId = req.params.id;
  try {
    db.prepare("UPDATE Orders SET status = 'PREPARING' WHERE id = ?").run(orderId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Status wijzigen naar bereiden mislukt.' });
  }
});

app.post('/api/admin/orders/:id/complete', authenticate, requireAdmin, (req, res) => {
  const orderId = req.params.id;
  try {
    db.prepare("UPDATE Orders SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(orderId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Afronden mislukt.' });
  }
});

// --- Routes: Age Verification ---

// Get current user's request
app.get('/api/store/age-verification', authenticate, (req, res) => {
  try {
    const request = db.prepare("SELECT * FROM AgeVerificationRequests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(req.user.id);
    res.json({ request: request || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fout bij ophalen leeftijdsverificatie.' });
  }
});

// Submit a new request
app.post('/api/store/age-verification', authenticate, (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM AgeVerificationRequests WHERE user_id = ? AND status = 'PENDING'").get(req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Je hebt al een openstaand verzoek.' });
    }
    
    // Create new request
    db.prepare("INSERT INTO AgeVerificationRequests (user_id, status) VALUES (?, 'PENDING')").run(req.user.id);
    
    // Create a notification for the admin
    db.prepare("INSERT INTO Notifications (message, type) VALUES (?, 'AGE_VERIFICATION')").run(`Nieuw 18+ verzoek binnengekomen van ${req.user.username}`);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fout bij aanvragen verificatie.' });
  }
});

// Admin: Get all requests
app.get('/api/admin/age-verifications', authenticate, requireAdmin, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT a.*, u.username 
      FROM AgeVerificationRequests a 
      JOIN Users u ON a.user_id = u.id 
      ORDER BY 
        CASE WHEN a.status = 'PENDING' THEN 0 ELSE 1 END,
        a.created_at DESC
    `).all();
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fout bij ophalen verzoeken.' });
  }
});

// Admin: Resolve a request
app.post('/api/admin/age-verifications/:id/resolve', authenticate, requireAdmin, (req, res) => {
  const { status } = req.body; // 'APPROVED' or 'REJECTED'
  const requestId = req.params.id;
  
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Ongeldige status.' });
  }

  try {
    const request = db.prepare("SELECT * FROM AgeVerificationRequests WHERE id = ?").get(requestId);
    if (!request) return res.status(404).json({ error: 'Verzoek niet gevonden.' });

    db.prepare("UPDATE AgeVerificationRequests SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, requestId);
    
    if (status === 'APPROVED') {
      db.prepare("UPDATE Users SET is_18_plus = 1 WHERE id = ?").run(request.user_id);
    } else if (status === 'REJECTED') {
      db.prepare("UPDATE Users SET is_18_plus = 0 WHERE id = ?").run(request.user_id);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fout bij afhandelen verzoek.' });
  }
});

// --- Routes: Notifications ---

app.get('/api/admin/notifications', authenticate, requireAdmin, (req, res) => {
  try {
    const notifications = db.prepare("SELECT * FROM Notifications ORDER BY created_at DESC LIMIT 50").all();
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fout bij ophalen notificaties.' });
  }
});

app.post('/api/admin/notifications/:id/read', authenticate, requireAdmin, (req, res) => {
  try {
    db.prepare("UPDATE Notifications SET is_read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fout bij markeren als gelezen.' });
  }
});

app.post('/api/admin/notifications/read-all', authenticate, requireAdmin, (req, res) => {
  try {
    db.prepare("UPDATE Notifications SET is_read = 1 WHERE is_read = 0").run();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fout bij markeren van alle notificaties.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server draait op poort ${PORT} en luistert naar alle netwerkinterfaces.`);
});
