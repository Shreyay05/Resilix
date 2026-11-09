const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5003;

let useInMemory = false;
const inMemoryPayments = [];

// In docker-compose, payment-db is mapped to host port 5433.
// If using single local PostgreSQL instance, DB_PORT can be set to 5432.
const db = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'payments_db',
  connectionTimeoutMillis: 2000,
});

async function initDB() {
  try {
    const client = await db.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL
      );
    `);
    client.release();
    console.log('✅ [Payment DB] Connected to PostgreSQL (payments_db)');
  } catch (err) {
    useInMemory = true;
    console.warn(`⚠️ [Payment DB] PostgreSQL unreachable (${err.message}). Using in-memory store.`);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'payment-service',
    status: 'UP',
    port: PORT,
    storage: useInMemory ? 'in-memory' : 'postgresql',
  });
});

// GET /payments - List all payments
app.get('/payments', async (req, res) => {
  if (useInMemory) {
    return res.json(inMemoryPayments);
  }
  try {
    const result = await db.query('SELECT * FROM payments ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /payments/:orderId - Payment for order
app.get('/payments/:orderId', async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  if (useInMemory) {
    const payment = inMemoryPayments.find(p => p.order_id === orderId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    return res.json(payment);
  }
  try {
    const result = await db.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /pay - Process payment
app.post('/pay', async (req, res) => {
  const { orderId, amount } = req.body;
  const oId = parseInt(orderId, 10);
  const amt = parseFloat(amount);

  if (isNaN(oId) || isNaN(amt)) {
    return res.status(400).json({ error: 'Invalid orderId or amount' });
  }

  // SIMULATION RULE FOR EVALUATION DEMO:
  // Payments for amounts > 1000 fail deliberately to trigger Saga Compensation Rollback
  const isDeclined = amt > 1000;
  const status = isDeclined ? 'FAILED' : 'SUCCESS';

  if (useInMemory) {
    const record = { id: inMemoryPayments.length + 1, order_id: oId, amount: amt, status };
    inMemoryPayments.push(record);
    if (isDeclined) {
      console.log(`\x1b[31m[FAIL] [PAYMENT]\x1b[0m Order #${oId}: ₹${amt} DECLINED (exceeds ₹1,000 threshold -> triggers Saga compensation rollback)`);
      return res.status(400).json({ error: 'Payment declined: Amount exceeds limit (Threshold: 1000)' });
    }
    console.log(`\x1b[32m[PASS] [PAYMENT]\x1b[0m Order #${oId}: ₹${amt} APPROVED`);
    return res.json({ message: 'Payment successful', status: 'SUCCESS' });
  }

  try {
    await db.query(
      'INSERT INTO payments (order_id, amount, status) VALUES ($1, $2, $3)',
      [oId, amt, status]
    );

    if (isDeclined) {
      console.log(`\x1b[31m[FAIL] [PAYMENT]\x1b[0m Order #${oId}: ₹${amt} DECLINED (exceeds ₹1,000 threshold -> triggers Saga compensation rollback)`);
      return res.status(400).json({ error: 'Payment declined: Amount exceeds limit (Threshold: 1000)' });
    }

    console.log(`\x1b[32m[PASS] [PAYMENT]\x1b[0m Order #${oId}: ₹${amt} APPROVED`);
    res.json({ message: 'Payment successful', status: 'SUCCESS' });
  } catch (err) {
    console.log(`\x1b[31m[FAIL] [PAYMENT]\x1b[0m Order #${oId}: DB error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  console.log(`💳 Payment Service running on port ${PORT}`);
  await initDB();
});
