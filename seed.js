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
  // --- Electronics ---
  { id: 1, name: 'Sony WH-1000XM5 Headphones', category: 'Electronics', price: 399, stock: 25, detail: 'Wireless noise cancelling headphones', icon: 'headphones', tint: 'lilac', tag: 'BESTSELLER', rating: 4.9 },
  { id: 2, name: 'Apple AirPods Pro 2', category: 'Electronics', price: 199, stock: 45, detail: 'Adaptive audio, active noise cancellation', icon: 'earbuds', tint: 'sand', tag: 'DEAL', rating: 4.8 },
  { id: 3, name: 'Bose QuietComfort Ultra', category: 'Electronics', price: 429, stock: 18, detail: 'Immersive spatial audio headphones', icon: 'headphones2', tint: 'blue', rating: 4.8 },
  { id: 4, name: 'Logitech MX Master 3S Mouse', category: 'Electronics', price: 99, stock: 50, detail: 'Ergonomic performance wireless mouse', icon: 'mouse', tint: 'mint', rating: 4.7 },
  { id: 5, name: 'Keychron K2 Mechanical Keyboard', category: 'Electronics', price: 110, stock: 30, detail: 'Wireless compact tactile keyboard', icon: 'keyboard', tint: 'peach', rating: 4.7 },
  { id: 6, name: 'Dell UltraSharp 27" 4K Monitor', category: 'Electronics', price: 1299, stock: 12, detail: 'Flagship 4K HDR IPS display · Exceeds $1,000 limit', icon: 'monitor', tint: 'blue', tag: 'OVER $1K (DEMO SAGA)', rating: 4.8 },
  { id: 7, name: 'Apple MacBook Air M3', category: 'Electronics', price: 1499, stock: 8, detail: '16GB unified memory, 512GB SSD · Exceeds $1,000 limit', icon: 'laptop', tint: 'lilac', tag: 'OVER $1K (DEMO SAGA)', rating: 4.9 },
  { id: 8, name: 'Meta Quest 3 VR Headset', category: 'Electronics', price: 499, stock: 16, detail: 'Next-gen breakthrough mixed reality', icon: 'vr', tint: 'lilac', rating: 4.7 },
  { id: 9, name: 'Sonos Era 100 Smart Speaker', category: 'Electronics', price: 249, stock: 18, detail: 'Acoustic smart home sound system', icon: 'speaker', tint: 'mint', rating: 4.6 },

  // --- Clothing ---
  { id: 10, name: 'Classic Vintage Denim Jacket', category: 'Clothing', price: 120, stock: 35, detail: '100% organic durable heavyweight cotton denim', icon: 'shirt', tint: 'blue', tag: 'TRENDING', rating: 4.8 },
  { id: 11, name: 'Heavyweight Fleece Hoodie', category: 'Clothing', price: 75, stock: 55, detail: 'Brushed interior fleece with relaxed aesthetic cut', icon: 'shirt', tint: 'mint', rating: 4.7 },
  { id: 12, name: 'Merino Wool Trench Coat', category: 'Clothing', price: 340, stock: 20, detail: 'Double-breasted tailored weatherproof outerwear', icon: 'shirt', tint: 'sand', rating: 4.9 },
  { id: 13, name: 'Urban Techwear Cargo Pants', category: 'Clothing', price: 85, stock: 40, detail: 'Water-repellent stretch fabric with utility pockets', icon: 'shirt', tint: 'peach', rating: 4.6 },
  { id: 14, name: 'Designer Italian Cashmere Parka', category: 'Clothing', price: 1150, stock: 6, detail: 'Handcrafted luxury goose-down parka · Exceeds $1,000 limit', icon: 'shirt', tint: 'lilac', tag: 'OVER $1K (DEMO SAGA)', rating: 5.0 },

  // --- Accessories ---
  { id: 15, name: 'Top-Grain Leather Travel Backpack', category: 'Accessories', price: 180, stock: 25, detail: 'Full-grain vintage cowhide with padded laptop sleeve', icon: 'backpack', tint: 'sand', tag: 'POPULAR', rating: 4.8 },
  { id: 16, name: 'Polarized Aviator Sunglasses', category: 'Accessories', price: 150, stock: 30, detail: 'Handmade acetate frame with UV400 polarized optics', icon: 'glasses', tint: 'blue', rating: 4.7 },
  { id: 17, name: 'Minimalist RFID Slim Leather Wallet', category: 'Accessories', price: 45, stock: 75, detail: 'Bifold vegetable-tanned leather with quick card eject', icon: 'wallet', tint: 'mint', rating: 4.9 },
  { id: 18, name: 'Stainless Steel Chronograph Watch', category: 'Accessories', price: 260, stock: 22, detail: 'Sapphire crystal face with Japanese quartz movement', icon: 'watch', tint: 'peach', rating: 4.8 },
  { id: 19, name: 'Luxury Swiss Automatic Chronometer', category: 'Accessories', price: 1350, stock: 5, detail: 'Certified chronometer with 18k gold accents · Exceeds $1,000 limit', icon: 'watch', tint: 'lilac', tag: 'OVER $1K (DEMO SAGA)', rating: 5.0 },
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
