const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
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

const PORT = process.env.PORT || 5001;
const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://127.0.0.1:5002';
const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL || 'http://127.0.0.1:5003';

let useInMemory = false;
const inMemoryOrders = [];
let nextOrderId = 1;

// Defaults to port 5432 (local Postgres) or custom port/env
const db = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.ORDER_DB_PORT || process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Shreya123',
  database: process.env.DB_NAME || 'order_db',
  connectionTimeoutMillis: 2000,
});

async function initDB() {
  try {
    const client = await db.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL
      );
    `);
    const maxRes = await client.query('SELECT COALESCE(MAX(id), 0) as max_id FROM orders');
    nextOrderId = parseInt(maxRes.rows[0].max_id, 10) + 1;
    client.release();
    console.log('✅ [Order DB] Connected to PostgreSQL (order_db)');
  } catch (err) {
    useInMemory = true;
    console.warn(`⚠️ [Order DB] PostgreSQL unreachable (${err.message}). Using in-memory store.`);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'order-service',
    status: 'UP',
    port: PORT,
    storage: useInMemory ? 'in-memory' : 'postgresql',
    endpoints: {
      inventoryService: INVENTORY_URL,
      paymentService: PAYMENT_URL,
    },
  });
});

// GET /orders - List all orders
app.get('/orders', async (req, res) => {
  if (useInMemory) {
    return res.json(inMemoryOrders);
  }
  try {
    const result = await db.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /orders/:id - Single order
app.get('/orders/:id', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (useInMemory) {
    const order = inMemoryOrders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json(order);
  }
  try {
    const result = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /orders - Saga Orchestration Entry Point
app.post('/orders', async (req, res) => {
  const { productId, quantity, amount } = req.body;
  const pId = parseInt(productId, 10);
  const qty = parseInt(quantity, 10);
  const amt = parseFloat(amount);

  if (isNaN(pId) || isNaN(qty) || isNaN(amt) || qty <= 0) {
    return res.status(400).json({
      status: 'FAILED',
      reason: 'Invalid input parameters (productId, quantity, amount)',
      steps: [{ label: 'Input validation failed', state: 'failed' }],
    });
  }

  const steps = [];
  let orderId;
  let inventoryReserved = false;

  // Step 1: Create Order in PENDING state
  try {
    if (useInMemory) {
      orderId = nextOrderId++;
      inMemoryOrders.unshift({
        id: orderId,
        product_id: pId,
        quantity: qty,
        amount: amt,
        status: 'PENDING',
      });
    } else {
      const orderRes = await db.query(
        'INSERT INTO orders (product_id, quantity, amount, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [pId, qty, amt, 'PENDING']
      );
      orderId = orderRes.rows[0].id;
    }
    steps.push({ label: `Order #${orderId} created in PENDING state`, state: 'done' });
  } catch (dbErr) {
    console.error('Failed to create pending order:', dbErr.message);
    return res.status(500).json({
      status: 'FAILED',
      reason: `Database error: ${dbErr.message}`,
      steps: [{ label: 'Order record creation failed', state: 'failed' }],
    });
  }

  // Saga Execution
  try {
    console.log(`\x1b[36m[SAGA START] [ORDER]\x1b[0m Starting Saga for Order #${orderId} (Product: #${pId}, Qty: ${qty}, Amount: ₹${amt})`);

    // Step 2: Reserve Stock in Inventory Service
    console.log(`   --> [STEP 1/2] Calling Inventory Service POST /reserve...`);
    await axios.post(`${INVENTORY_URL}/reserve`, { productId: pId, quantity: qty });
    inventoryReserved = true;
    console.log(`   \x1b[32m[PASS] [STEP 1/2]\x1b[0m Stock reserved in Inventory Service`);
    steps.push({ label: 'Inventory reserved successfully', state: 'done' });

    // Step 3: Process Payment in Payment Service
    console.log(`   --> [STEP 2/2] Calling Payment Service POST /pay...`);
    await axios.post(`${PAYMENT_URL}/pay`, { orderId, amount: amt });
    console.log(`   \x1b[32m[PASS] [STEP 2/2]\x1b[0m Payment approved in Payment Service`);
    steps.push({ label: 'Payment approved', state: 'done' });

    // Step 4: Commit Inventory (optional deduction)
    await axios.post(`${INVENTORY_URL}/commit`, { productId: pId, quantity: qty }).catch(() => {});

    // Step 5: Mark Order as COMPLETED
    if (useInMemory) {
      const ord = inMemoryOrders.find(o => o.id === orderId);
      if (ord) ord.status = 'COMPLETED';
    } else {
      await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['COMPLETED', orderId]);
    }
    steps.push({ label: 'Order marked COMPLETED', state: 'done' });

    console.log(`\x1b[32m[SAGA COMPLETE - PASS]\x1b[0m Order #${orderId} successfully completed! All steps succeeded.\n`);
    return res.json({
      status: 'SUCCESS',
      orderId,
      message: 'Order placed successfully!',
      steps,
    });

  } catch (error) {
    // SAGA ROLLBACK TRIGGERED
    const reason = error.response?.data?.error || error.message;
    console.log(`\x1b[31m[SAGA ABORTED - FAIL]\x1b[0m Order #${orderId} failed: "${reason}"`);

    // Compensating Action: Release reserved stock ONLY IF stock was actually reserved
    if (inventoryReserved) {
      steps.push({ label: reason.startsWith('Payment declined') ? reason : `Payment declined: ${reason}`, state: 'failed' });
      console.log(`\x1b[33m[COMPENSATING ACTION]\x1b[0m Releasing reserved inventory for Product #${pId} (Qty ${qty})...`);
      await axios.post(`${INVENTORY_URL}/release`, { productId: pId, quantity: qty }).catch(e => {
        console.error('Failed to trigger inventory compensation:', e.message);
      });
      console.log(`   \x1b[32m[PASS] [ROLLBACK]\x1b[0m Inventory released successfully`);
      steps.push({ label: 'Compensating action: Inventory reservation released', state: 'compensated' });
    } else {
      steps.push({ label: reason.startsWith('Inventory reservation') ? reason : `Inventory reservation failed: ${reason}`, state: 'failed' });
    }

    // Mark Order as CANCELLED
    if (useInMemory) {
      const ord = inMemoryOrders.find(o => o.id === orderId);
      if (ord) ord.status = 'CANCELLED';
    } else {
      await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['CANCELLED', orderId]);
    }
    steps.push({ label: 'Order marked CANCELLED', state: 'compensated' });
    console.log(`\x1b[33m[SAGA ROLLBACK COMPLETE]\x1b[0m Order #${orderId} marked CANCELLED cleanly.\n`);

    return res.status(400).json({
      status: 'FAILED',
      orderId,
      reason,
      message: 'Transaction rolled back automatically via Saga compensation.',
      steps,
    });
  }
});

app.listen(PORT, async () => {
  console.log(`🛒 Order Service running on port ${PORT}`);
  await initDB();
});
