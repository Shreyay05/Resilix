const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Auto-load root .env if present
const rootEnv = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnv)) {
  fs.readFileSync(rootEnv, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const key = k.trim();
      if (!process.env[key]) process.env[key] = v.join('=').trim();
    }
  });
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5002;

// Initial catalog products matching database schema (id, name, stock, reserved_stock, price, category, icon)
const defaultProducts = [
  // --- Electronics (from inventory_db) ---
  { id: 1, name: 'Dell XPS 15 Laptop', category: 'Electronics', price: 1499.00, stock: 18, reserved_stock: 0, icon: null },
  { id: 2, name: 'Apple iPhone 16 Pro', category: 'Electronics', price: 1099.00, stock: 30, reserved_stock: 0, icon: null },
  { id: 3, name: 'Samsung Galaxy S25 Ultra', category: 'Electronics', price: 1199.00, stock: 22, reserved_stock: 0, icon: null },
  { id: 4, name: 'LG UltraWide 34-inch Monitor', category: 'Electronics', price: 499.00, stock: 13, reserved_stock: 0, icon: null },
  { id: 5, name: 'Sony PlayStation 5 Slim', category: 'Electronics', price: 449.00, stock: 20, reserved_stock: 0, icon: null },
  { id: 6, name: 'JBL Flip 6 Bluetooth Speaker', category: 'Electronics', price: 129.00, stock: 34, reserved_stock: 0, icon: null },
  { id: 7, name: 'Canon EOS R50 Mirrorless Camera', category: 'Electronics', price: 679.00, stock: 12, reserved_stock: 0, icon: null },
  { id: 8, name: 'Apple iPad Air 11-inch', category: 'Electronics', price: 599.00, stock: 24, reserved_stock: 0, icon: null },
  { id: 9, name: 'Kindle Paperwhite 16GB', category: 'Electronics', price: 149.00, stock: 40, reserved_stock: 0, icon: null },
  { id: 10, name: 'Anker 737 Power Bank', category: 'Electronics', price: 109.00, stock: 45, reserved_stock: 0, icon: null },

  // --- Clothing (from inventory_db) ---
  { id: 11, name: "Levi's Men's 511 Slim Fit Jeans", category: 'Clothing', price: 69.00, stock: 35, reserved_stock: 0, icon: null },
  { id: 12, name: 'Adidas Essentials 3-Stripes Track Pants', category: 'Clothing', price: 45.00, stock: 40, reserved_stock: 0, icon: null },
  { id: 13, name: "Puma Men's Running T-Shirt", category: 'Clothing', price: 29.99, stock: 55, reserved_stock: 0, icon: null },
  { id: 14, name: "H&M Women's Oversized Blazer", category: 'Clothing', price: 79.00, stock: 22, reserved_stock: 0, icon: null },
  { id: 15, name: "Zara Women's Satin Midi Dress", category: 'Clothing', price: 89.00, stock: 18, reserved_stock: 0, icon: null },
  { id: 16, name: 'Nike Dri-FIT Running Shorts', category: 'Clothing', price: 35.00, stock: 45, reserved_stock: 0, icon: null },

  // --- Accessories (from inventory_db) ---
  { id: 17, name: 'Ray-Ban Classic Aviator Sunglasses', category: 'Accessories', price: 165.00, stock: 30, reserved_stock: 0, icon: null },
  { id: 18, name: 'Fossil Grant Chronograph Watch', category: 'Accessories', price: 145.00, stock: 25, reserved_stock: 0, icon: null },
  { id: 19, name: 'Bellroy Slim Leather Wallet', category: 'Accessories', price: 79.00, stock: 50, reserved_stock: 0, icon: null },
  { id: 20, name: 'Herschel Little America Backpack', category: 'Accessories', price: 110.00, stock: 28, reserved_stock: 0, icon: null },
  { id: 21, name: 'Rolex Submariner Date Watch', category: 'Accessories', price: 1450.00, stock: 4, reserved_stock: 0, icon: null },
];

let useInMemory = false;
const inMemoryProducts = defaultProducts.map(p => ({ ...p }));

// Database connection configuration (supports Docker Compose, local Postgres, or custom env)
const db = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.INVENTORY_DB_PORT || process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Shreya123',
  database: process.env.DB_NAME || 'inventory_db',
  connectionTimeoutMillis: 2000,
});

async function initDB() {
  try {
    const client = await db.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'Electronics',
        price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        stock INT NOT NULL,
        reserved_stock INT DEFAULT 0,
        detail VARCHAR(255) DEFAULT '',
        icon VARCHAR(50) DEFAULT 'box',
        tint VARCHAR(50) DEFAULT 'lilac',
        tag VARCHAR(50) DEFAULT '',
        rating NUMERIC(3, 1) DEFAULT 4.8
      );
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Electronics';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS detail VARCHAR(255) DEFAULT '';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'box';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS tint VARCHAR(50) DEFAULT 'lilac';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS tag VARCHAR(50) DEFAULT '';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1) DEFAULT 4.8;
    `);
    const countRes = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      for (const prod of defaultProducts) {
        await client.query(
          'INSERT INTO products (name, category, price, stock, reserved_stock, detail, icon, tint, tag, rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [prod.name, prod.category, prod.price, prod.stock, prod.reserved_stock, prod.detail, prod.icon, prod.tint, prod.tag, prod.rating]
        );
      }
    }
    client.release();
    console.log('✅ [Inventory DB] Connected to PostgreSQL (inventory_db)');
  } catch (err) {
    useInMemory = true;
    console.warn(`⚠️ [Inventory DB] PostgreSQL unreachable (${err.message}). Using in-memory store.`);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'inventory-service',
    status: 'UP',
    port: PORT,
    storage: useInMemory ? 'in-memory' : 'postgresql',
  });
});

// GET /products - List all products
app.get('/products', async (req, res) => {
  if (useInMemory) {
    return res.json(inMemoryProducts);
  }
  try {
    const result = await db.query('SELECT * FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /products/:id - Single product
app.get('/products/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (useInMemory) {
    const product = inMemoryProducts.find(p => p.id === id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json(product);
  }
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /products/:id/adjust - Admin endpoint to replenish/adjust stock
app.post('/products/:id/adjust', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const adjustment = parseInt(req.body.adjustment || 0, 10);

  if (isNaN(id) || isNaN(adjustment)) {
    return res.status(400).json({ error: 'Invalid id or adjustment amount' });
  }

  if (useInMemory) {
    const product = inMemoryProducts.find(p => p.id === id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    product.stock = Math.max(0, product.stock + adjustment);
    console.log(`\x1b[35m[ADMIN]\x1b[0m Stock for Product #${id} adjusted by ${adjustment}. New stock: ${product.stock}`);
    return res.json({ message: 'Stock updated successfully', product });
  }

  try {
    const result = await db.query(
      'UPDATE products SET stock = GREATEST(0, stock + $1) WHERE id = $2 RETURNING *',
      [adjustment, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    console.log(`\x1b[35m[ADMIN]\x1b[0m Stock for Product #${id} adjusted by ${adjustment}. New stock: ${result.rows[0].stock}`);
    res.json({ message: 'Stock updated successfully', product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reserve - Safe Stock Reservation with Concurrency Control
app.post('/reserve', async (req, res) => {
  const { productId, quantity } = req.body;
  const pId = parseInt(productId, 10);
  const qty = parseInt(quantity, 10);

  if (isNaN(pId) || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Invalid productId or quantity' });
  }

  if (useInMemory) {
    const product = inMemoryProducts.find(p => p.id === pId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const availableStock = product.stock - product.reserved_stock;
    if (availableStock < qty) {
      console.log(`\x1b[31m[FAIL] [INVENTORY]\x1b[0m Insufficient stock for Product #${pId} (requested: ${qty}, available: ${availableStock})`);
      return res.status(400).json({ error: 'Insufficient stock available' });
    }
    product.reserved_stock += qty;
    console.log(`\x1b[32m[PASS] [INVENTORY]\x1b[0m Reserved ${qty} unit(s) of Product #${pId} (${product.name}). Remaining available: ${product.stock - product.reserved_stock}`);
    return res.json({ message: 'Stock reserved successfully', reserved: qty, available: product.stock - product.reserved_stock });
  }

  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');

    // Row-level lock to prevent concurrent race conditions
    const productRes = await client.query(
      'SELECT stock, reserved_stock, name FROM products WHERE id = $1 FOR UPDATE',
      [pId]
    );

    if (productRes.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log(`\x1b[31m[FAIL] [INVENTORY]\x1b[0m Product #${pId} not found`);
      return res.status(404).json({ error: 'Product not found' });
    }

    const { stock, reserved_stock, name } = productRes.rows[0];
    const availableStock = stock - reserved_stock;

    if (availableStock < qty) {
      await client.query('ROLLBACK');
      console.log(`\x1b[31m[FAIL] [INVENTORY]\x1b[0m Insufficient stock for Product #${pId} (${name}) (requested: ${qty}, available: ${availableStock})`);
      return res.status(400).json({ error: 'Insufficient stock available' });
    }

    await client.query(
      'UPDATE products SET reserved_stock = reserved_stock + $1 WHERE id = $2',
      [qty, pId]
    );

    await client.query('COMMIT');
    console.log(`\x1b[32m[PASS] [INVENTORY]\x1b[0m Reserved ${qty} unit(s) of Product #${pId} (${name}). Remaining available: ${availableStock - qty}`);
    res.json({ message: 'Stock reserved successfully', reserved: qty, available: availableStock - qty });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.log(`\x1b[31m[FAIL] [INVENTORY]\x1b[0m Error reserving stock: ${err.message}`);
    res.status(500).json({ error: err.message });
  } finally {
    if (client) client.release();
  }
});

// POST /release - Saga Compensating Action (Rollback reserved stock)
app.post('/release', async (req, res) => {
  const { productId, quantity } = req.body;
  const pId = parseInt(productId, 10);
  const qty = parseInt(quantity, 10);

  if (useInMemory) {
    const product = inMemoryProducts.find(p => p.id === pId);
    if (product) {
      product.reserved_stock = Math.max(0, product.reserved_stock - (qty || 0));
    }
    console.log(`\x1b[33m[COMPENSATING ROLLBACK] [INVENTORY]\x1b[0m Released ${qty} reserved unit(s) of Product #${pId} back to available stock`);
    return res.json({ message: 'Reserved stock released back' });
  }

  try {
    await db.query(
      'UPDATE products SET reserved_stock = GREATEST(0, reserved_stock - $1) WHERE id = $2',
      [qty, pId]
    );
    console.log(`\x1b[33m[COMPENSATING ROLLBACK] [INVENTORY]\x1b[0m Released ${qty} reserved unit(s) of Product #${pId} back to available stock`);
    res.json({ message: 'Reserved stock released back' });
  } catch (err) {
    console.log(`\x1b[31m[FAIL] [INVENTORY]\x1b[0m Error releasing stock: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /commit - Finalize reserved stock on successful order
app.post('/commit', async (req, res) => {
  const { productId, quantity } = req.body;
  const pId = parseInt(productId, 10);
  const qty = parseInt(quantity, 10);

  if (useInMemory) {
    const product = inMemoryProducts.find(p => p.id === pId);
    if (product) {
      product.stock = Math.max(0, product.stock - (qty || 0));
      product.reserved_stock = Math.max(0, product.reserved_stock - (qty || 0));
    }
    console.log(`\x1b[32m[COMMITTED] [INVENTORY]\x1b[0m Finalized order deduction for Product #${pId} (${qty} units)`);
    return res.json({ message: 'Reserved stock committed' });
  }

  try {
    await db.query(
      'UPDATE products SET stock = GREATEST(0, stock - $1), reserved_stock = GREATEST(0, reserved_stock - $1) WHERE id = $2',
      [qty, pId]
    );
    console.log(`\x1b[32m[COMMITTED] [INVENTORY]\x1b[0m Finalized order deduction for Product #${pId} (${qty} units)`);
    res.json({ message: 'Reserved stock committed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  console.log(`📦 Inventory Service running on port ${PORT}`);
  await initDB();
});
