const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const db = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'Shreya123',
  database: 'inventory_db',
});

// Endpoint to reserve stock safely (Concurrency Control)
app.post('/reserve', async (req, res) => {
  const { productId, quantity } = req.body;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Lock the row to prevent other concurrent requests from modifying it
    const productRes = await client.query(
      'SELECT stock, reserved_stock FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    if (productRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const { stock, reserved_stock } = productRes.rows[0];
    const availableStock = stock - reserved_stock;

    if (availableStock < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient stock available' });
    }

    // Reserve the items
    await client.query(
      'UPDATE products SET reserved_stock = reserved_stock + $1 WHERE id = $2',
      [quantity, productId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Stock reserved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Compensating Action Endpoint (Rollback reserved stock)
app.post('/release', async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    await db.query(
      'UPDATE products SET reserved_stock = reserved_stock - $1 WHERE id = $2',
      [quantity, productId]
    );
    res.json({ message: 'Reserved stock released back' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5002, () => console.log('Inventory Service running on port 5002'));