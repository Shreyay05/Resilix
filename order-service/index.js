const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');

const app = express();
app.use(express.json());

const db = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'Shreya123',
  database: 'order_db',
});

app.post('/orders', async (req, res) => {
  const { productId, quantity, amount } = req.body;

  // Step 1: Create Order in PENDING state
  const orderRes = await db.query(
    'INSERT INTO orders (product_id, quantity, amount, status) VALUES ($1, $2, $3, $4) RETURNING id',
    [productId, quantity, amount, 'PENDING']
  );
  const orderId = orderRes.rows[0].id;

  try {
    // Step 2: Call Inventory Service to Reserve Stock
    await axios.post('http://localhost:5002/reserve', { productId, quantity });

    // Step 3: Call Payment Service to Process Payment
    await axios.post('http://localhost:5003/pay', { orderId, amount });

    // Everything succeeded: Update Order to COMPLETED
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['COMPLETED', orderId]);
    return res.json({ status: 'SUCCESS', orderId, message: 'Order placed successfully!' });

  } catch (error) {
    // SAGA ROLLBACK TRIGGERED: Something failed along the chain
    console.log(`[SAGA TRIGGERED] Order ${orderId} failed: ${error.message}. Rolling back...`);

    // Compensating Action: Release reserved stock
    await axios.post('http://localhost:5002/release', { productId, quantity }).catch(e => {
      console.error('Failed to trigger inventory compensation:', e.message);
    });

    // Mark Order as CANCELLED
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['CANCELLED', orderId]);

    return res.status(400).json({
      status: 'FAILED',
      orderId,
      reason: error.response?.data?.error || error.message,
      message: 'Transaction rolled back automatically via Saga compensation.'
    });
  }
});

app.listen(5001, () => console.log('Order Service running on port 5001'));