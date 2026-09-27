const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const db = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'Shreya123',
  database: 'payments_db',
});

app.post('/pay', async (req, res) => {
  const { orderId, amount } = req.body;

  // SIMULATION RULE FOR EVALUATION DEMO:
  // Payments for amounts > 1000 fail deliberately to show Saga Rollback
  if (amount > 1000) {
    await db.query(
      'INSERT INTO payments (order_id, amount, status) VALUES ($1, $2, $3)',
      [orderId, amount, 'FAILED']
    );
    return res.status(400).json({ error: 'Payment declined: Amount exceeds limit' });
  }

  await db.query(
    'INSERT INTO payments (order_id, amount, status) VALUES ($1, $2, $3)',
    [orderId, amount, 'SUCCESS']
  );

  res.json({ message: 'Payment successful' });
});

app.listen(5003, () => console.log('Payment Service running on port 5003'));