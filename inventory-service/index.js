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

// Initial catalog products (used for initial table population or in-memory fallback)
const defaultProducts = [
  // --- Electronics ---
  { id: 1, name: 'Sony WH-1000XM5 Headphones', category: 'Electronics', price: 399, stock: 25, reserved_stock: 0, detail: 'Wireless noise cancelling headphones', icon: 'headphones', tint: 'lilac', tag: 'BESTSELLER', rating: 4.9 },
  { id: 2, name: 'Apple AirPods Pro 2', category: 'Electronics', price: 199, stock: 45, reserved_stock: 0, detail: 'Adaptive audio, active noise cancellation', icon: 'earbuds', tint: 'sand', tag: 'DEAL', rating: 4.8 },
  { id: 3, name: 'Bose QuietComfort Ultra', category: 'Electronics', price: 429, stock: 18, reserved_stock: 0, detail: 'Immersive spatial audio headphones', icon: 'headphones2', tint: 'blue', rating: 4.8 },
  { id: 4, name: 'Logitech MX Master 3S Mouse', category: 'Electronics', price: 99, stock: 50, reserved_stock: 0, detail: 'Ergonomic performance wireless mouse', icon: 'mouse', tint: 'mint', rating: 4.7 },
  { id: 5, name: 'Keychron K2 Mechanical Keyboard', category: 'Electronics', price: 110, stock: 30, reserved_stock: 0, detail: 'Wireless compact tactile keyboard', icon: 'keyboard', tint: 'peach', rating: 4.7 },
  { id: 6, name: 'Dell UltraSharp 27" 4K Monitor', category: 'Electronics', price: 1299, stock: 12, reserved_stock: 0, detail: 'Flagship 4K HDR IPS display · Exceeds $1,000 limit', icon: 'monitor', tint: 'blue', tag: 'OVER $1K (DEMO SAGA)', rating: 4.8 },
  { id: 7, name: 'Apple MacBook Air M3', category: 'Electronics', price: 1499, stock: 8, reserved_stock: 0, detail: '16GB unified memory, 512GB SSD · Exceeds $1,000 limit', icon: 'laptop', tint: 'lilac', tag: 'OVER $1K (DEMO SAGA)', rating: 4.9 },
  { id: 8, name: 'Meta Quest 3 VR Headset', category: 'Electronics', price: 499, stock: 16, reserved_stock: 0, detail: 'Next-gen breakthrough mixed reality', icon: 'vr', tint: 'lilac', rating: 4.7 },
  { id: 9, name: 'Sonos Era 100 Smart Speaker', category: 'Electronics', price: 249, stock: 18, reserved_stock: 0, detail: 'Acoustic smart home sound system', icon: 'speaker', tint: 'mint', rating: 4.6 },

  // --- Clothing ---
  { id: 10, name: 'Classic Vintage Denim Jacket', category: 'Clothing', price: 120, stock: 35, reserved_stock: 0, detail: '100% organic durable heavyweight cotton denim', icon: 'shirt', tint: 'blue', tag: 'TRENDING', rating: 4.8 },
  { id: 11, name: 'Heavyweight Fleece Hoodie', category: 'Clothing', price: 75, stock: 55, reserved_stock: 0, detail: 'Brushed interior fleece with relaxed aesthetic cut', icon: 'shirt', tint: 'mint', rating: 4.7 },
  { id: 12, name: 'Merino Wool Trench Coat', category: 'Clothing', price: 340, stock: 20, reserved_stock: 0, detail: 'Double-breasted tailored weatherproof outerwear', icon: 'shirt', tint: 'sand', rating: 4.9 },
  { id: 13, name: 'Urban Techwear Cargo Pants', category: 'Clothing', price: 85, stock: 40, reserved_stock: 0, detail: 'Water-repellent stretch fabric with utility pockets', icon: 'shirt', tint: 'peach', rating: 4.6 },
  { id: 14, name: 'Designer Italian Cashmere Parka', category: 'Clothing', price: 1150, stock: 6, reserved_stock: 0, detail: 'Handcrafted luxury goose-down parka · Exceeds $1,000 limit', icon: 'shirt', tint: 'lilac', tag: 'OVER $1K (DEMO SAGA)', rating: 5.0 },

  // --- Accessories ---
  { id: 15, name: 'Top-Grain Leather Travel Backpack', category: 'Accessories', price: 180, stock: 25, reserved_stock: 0, detail: 'Full-grain vintage cowhide with padded laptop sleeve', icon: 'backpack', tint: 'sand', tag: 'POPULAR', rating: 4.8 },
  { id: 16, name: 'Polarized Aviator Sunglasses', category: 'Accessories', price: 150, stock: 30, reserved_stock: 0, detail: 'Handmade acetate frame with UV400 polarized optics', icon: 'glasses', tint: 'blue', rating: 4.7 },
  { id: 17, name: 'Minimalist RFID Slim Leather Wallet', category: 'Accessories', price: 45, stock: 75, reserved_stock: 0, detail: 'Bifold vegetable-tanned leather with quick card eject', icon: 'wallet', tint: 'mint', rating: 4.9 },
  { id: 18, name: 'Stainless Steel Chronograph Watch', category: 'Accessories', price: 260, stock: 22, reserved_stock: 0, detail: 'Sapphire crystal face with Japanese quartz movement', icon: 'watch', tint: 'peach', rating: 4.8 },
  { id: 19, name: 'Luxury Swiss Automatic Chronometer', category: 'Accessories', price: 1350, stock: 5, reserved_stock: 0, detail: 'Certified chronometer with 18k gold accents · Exceeds $1,000 limit', icon: 'watch', tint: 'lilac', tag: 'OVER $1K (DEMO SAGA)', rating: 5.0 },
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
