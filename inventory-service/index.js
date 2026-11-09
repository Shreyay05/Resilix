const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5002;

// Initial catalog products (used for initial table population or in-memory fallback)
const defaultProducts = [
  { id: 1, name: 'Sony WH-1000XM5 Headphones', stock: 25, reserved_stock: 0 },
  { id: 2, name: 'Apple AirPods Pro (2nd Gen)', stock: 45, reserved_stock: 0 },
  { id: 3, name: 'Bose QuietComfort Ultra', stock: 18, reserved_stock: 0 },
  { id: 4, name: 'Logitech MX Master 3S Mouse', stock: 50, reserved_stock: 0 },
  { id: 5, name: 'Keychron K2 Mechanical Keyboard', stock: 30, reserved_stock: 0 },
  { id: 6, name: 'Dell UltraSharp 27" 4K Monitor', stock: 12, reserved_stock: 0 },
  { id: 7, name: 'Apple MacBook Air M3 (16GB, 512GB)', stock: 8, reserved_stock: 0 },
  { id: 8, name: 'Samsung T7 1TB Portable SSD', stock: 60, reserved_stock: 0 },
  { id: 9, name: 'Anker 737 Power Bank (24k mAh)', stock: 40, reserved_stock: 0 },
  { id: 10, name: 'PlayStation 5 DualSense Edge Controller', stock: 20, reserved_stock: 0 },
  { id: 11, name: 'Meta Quest 3 VR Headset', stock: 16, reserved_stock: 0 },
  { id: 12, name: 'Sonos Era 100 Smart Speaker', stock: 18, reserved_stock: 0 },
];

let useInMemory = false;
const inMemoryProducts = defaultProducts.map(p => ({ ...p }));

// Database connection configuration (supports Docker Compose, local Postgres, or custom env)
const db = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'inventory_db',
  connectionTimeoutMillis: 2000,
});

async function initDB() {
  try {
    const client = await db.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        stock INT NOT NULL,
        reserved_stock INT DEFAULT 0
      );
    `);
    const countRes = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      for (const prod of defaultProducts) {
        await client.query(
          'INSERT INTO products (name, stock, reserved_stock) VALUES ($1, $2, $3)',
          [prod.name, prod.stock, prod.reserved_stock]
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
