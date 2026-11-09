const { Pool } = require('pg');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || (process.env.DOCKER === 'false' ? 'postgres' : 'user');
const DB_PASSWORD = process.env.DB_PASSWORD || (process.env.DOCKER === 'false' ? 'Shreya123' : 'password');

// In Docker Compose: order-db is port 5431, inventory-db is 5432, payment-db is 5433.
// In single local PostgreSQL instance: all databases are typically on port 5432.
const INVENTORY_PORT = parseInt(process.env.INVENTORY_DB_PORT || process.env.DB_PORT || '5432', 10);
const ORDER_PORT = parseInt(process.env.ORDER_DB_PORT || process.env.DB_PORT || '5431', 10);
const PAYMENT_PORT = parseInt(process.env.PAYMENT_DB_PORT || process.env.DB_PORT || '5433', 10);

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
  // --- Audio & Wearables ---
  { name: 'Sony WH-1000XM5 Headphones', stock: 25 },
  { name: 'Apple AirPods Pro (2nd Gen)', stock: 45 },
  { name: 'Bose QuietComfort Ultra', stock: 18 },
  { name: 'Sennheiser HD 660S2 Open-Back', stock: 10 },
  { name: 'Blue Yeti USB Microphone', stock: 22 },

  // --- PC Peripherals & Displays ---
  { name: 'Logitech MX Master 3S Mouse', stock: 50 },
  { name: 'Keychron K2 Mechanical Keyboard', stock: 30 },
  { name: 'Razer DeathAdder V3 Pro', stock: 35 },
  { name: 'Dell UltraSharp 27" 4K Monitor', stock: 12 },
  { name: 'LG UltraGear 34" Curved OLED', stock: 7 },
  { name: 'CalDigit TS4 Thunderbolt 4 Dock', stock: 15 },

  // --- Laptops & Computers ---
  { name: 'Apple MacBook Air M3 (16GB, 512GB)', stock: 8 },
  { name: 'Dell XPS 15 Laptop', stock: 10 },
  { name: 'ASUS ROG Zephyrus G16 Gaming Laptop', stock: 5 },
  { name: 'Lenovo ThinkPad X1 Carbon Gen 11', stock: 14 },

  // --- Storage & Power ---
  { name: 'Samsung T7 1TB Portable SSD', stock: 60 },
  { name: 'SanDisk 2TB Extreme Portable SSD', stock: 40 },
  { name: 'Anker 737 Power Bank (24k mAh)', stock: 40 },
  { name: 'Belkin 3-in-1 MagSafe Charger', stock: 28 },

  // --- Gaming & Entertainment ---
  { name: 'PlayStation 5 DualSense Edge Controller', stock: 20 },
  { name: 'Asus ROG Ally Handheld Console', stock: 15 },
  { name: 'Steam Deck OLED 512GB', stock: 12 },
  { name: 'LG C3 55" OLED TV', stock: 5 },
  { name: 'Meta Quest 3 VR Headset', stock: 16 },

  // --- Smart Home & Networking ---
  { name: 'Elgato Stream Deck MK.2', stock: 25 },
  { name: 'Philips Hue Smart Bulb Starter Kit', stock: 30 },
  { name: 'Sonos Era 100 Smart Speaker', stock: 18 },
  { name: 'ASUS ROG Rapture WiFi 6E Router', stock: 9 },
  { name: 'Logitech Brio 4K Webcam', stock: 22 },
  { name: 'Elgato Cam Link 4K', stock: 14 }
];

const mockOrders = [
  { productId: 1, quantity: 1, amount: 399.00, status: 'COMPLETED' },
  { productId: 2, quantity: 2, amount: 198.00, status: 'COMPLETED' },
  { productId: 6, quantity: 1, amount: 1299.00, status: 'CANCELLED' }, // Exceeds 1000 threshold
  { productId: 3, quantity: 1, amount: 99.00, status: 'COMPLETED' },
  { productId: 4, quantity: 1, amount: 650.00, status: 'COMPLETED' },
  { productId: 8, quantity: 1, amount: 1499.00, status: 'CANCELLED' }, // Exceeds 1000 threshold
  { productId: 5, quantity: 3, amount: 297.00, status: 'COMPLETED' },
  { productId: 7, quantity: 2, amount: 220.00, status: 'COMPLETED' },
];

async function seedData() {
  try {
    console.log('🌱 Starting database seeding...');

    // 1. Seed Inventory Database
    console.log(`--> Seeding inventory_db at ${DB_HOST}:${INVENTORY_PORT}...`);
    await inventoryPool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        stock INT NOT NULL,
        reserved_stock INT DEFAULT 0
      );
      TRUNCATE TABLE products RESTART IDENTITY;
    `);

    for (const prod of products) {
      await inventoryPool.query(
        'INSERT INTO products (name, stock, reserved_stock) VALUES ($1, $2, 0)',
        [prod.name, prod.stock]
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
