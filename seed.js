const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Auto-load root .env if present
const rootEnv = path.resolve(__dirname, '.env');
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

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Shreya123';

// Defaults to 5432 (standard local PostgreSQL) or Docker ports if specified
const INVENTORY_PORT = parseInt(process.env.INVENTORY_DB_PORT || process.env.DB_PORT || '5432', 10);
const ORDER_PORT = parseInt(process.env.ORDER_DB_PORT || process.env.DB_PORT || '5432', 10);
const PAYMENT_PORT = parseInt(process.env.PAYMENT_DB_PORT || process.env.DB_PORT || '5432', 10);

const inventoryPool = new Pool({
  host: DB_HOST,
  port: INVENTORY_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: 'inventory_db',
  connectionTimeoutMillis: 3000,
});

const orderPool = new Pool({
  host: DB_HOST,
  port: ORDER_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: 'order_db',
  connectionTimeoutMillis: 3000,
});

const paymentPool = new Pool({
  host: DB_HOST,
  port: PAYMENT_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: 'payments_db',
  connectionTimeoutMillis: 3000,
});

const products = [
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

const mockOrders = [
  { productId: 1, quantity: 1, amount: 399.00, status: 'COMPLETED' },
  { productId: 10, quantity: 1, amount: 120.00, status: 'COMPLETED' },
  { productId: 6, quantity: 1, amount: 1299.00, status: 'CANCELLED' }, // Exceeds $1,000 threshold
  { productId: 4, quantity: 1, amount: 99.00, status: 'COMPLETED' },
  { productId: 15, quantity: 1, amount: 180.00, status: 'COMPLETED' },
  { productId: 14, quantity: 1, amount: 1150.00, status: 'CANCELLED' }, // Exceeds $1,000 threshold
  { productId: 11, quantity: 2, amount: 150.00, status: 'COMPLETED' },
  { productId: 17, quantity: 1, amount: 45.00, status: 'COMPLETED' },
];

async function seedData() {
  try {
    console.log('🌱 Starting database seeding...');

    // 1. Seed Inventory Database
    console.log(`--> Seeding inventory_db at ${DB_HOST}:${INVENTORY_PORT}...`);
    await inventoryPool.query(`
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
      TRUNCATE TABLE products RESTART IDENTITY;
    `);

    for (const prod of products) {
      await inventoryPool.query(
        'INSERT INTO products (name, category, price, stock, reserved_stock, detail, icon, tint, tag, rating) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9)',
        [prod.name, prod.category, prod.price, prod.stock, prod.detail, prod.icon, prod.tint, prod.tag, prod.rating]
      );
    }

    // 2. Seed Order Database
    console.log(`--> Seeding order_db at ${DB_HOST}:${ORDER_PORT}...`);
    await orderPool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL
      );
      TRUNCATE TABLE orders RESTART IDENTITY;
    `);

    for (const order of mockOrders) {
      await orderPool.query(
        'INSERT INTO orders (product_id, quantity, amount, status) VALUES ($1, $2, $3, $4)',
        [order.productId, order.quantity, order.amount, order.status]
      );
    }

    // 3. Seed Payment Database
    console.log(`--> Seeding payment_db at ${DB_HOST}:${PAYMENT_PORT}...`);
    await paymentPool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        status VARCHAR(20) NOT NULL
      );
      TRUNCATE TABLE payments RESTART IDENTITY;
    `);

    for (let i = 0; i < mockOrders.length; i++) {
      const order = mockOrders[i];
      const paymentStatus = order.status === 'COMPLETED' ? 'SUCCESS' : 'FAILED';
      await paymentPool.query(
        'INSERT INTO payments (order_id, amount, status) VALUES ($1, $2, $3)',
        [i + 1, order.amount, paymentStatus]
      );
    }

    console.log('✅ Databases successfully seeded with realistic data!');
  } catch (error) {
    console.error('❌ Error seeding databases:', error.message);
    console.log('\n💡 Note: If using Docker, start the databases first:');
    console.log('   docker compose up -d');
    console.log('   If using a local PostgreSQL, check that it is running and update credentials if needed.');
  } finally {
    await inventoryPool.end().catch(() => {});
    await orderPool.end().catch(() => {});
    await paymentPool.end().catch(() => {});
  }
}

seedData();
