// Helper script to initialize local PostgreSQL databases and seed them
const { Client } = require('pg');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Shreya123';

const databases = ['inventory_db', 'order_db', 'payments_db'];

async function initLocalPostgres() {
  console.log('====================================================');
  console.log('🐘 Initializing Local PostgreSQL Databases');
  console.log('====================================================');
  console.log(`Connecting to PostgreSQL host: ${DB_HOST}:${DB_PORT} as user '${DB_USER}'...\n`);

  // Connect to the default 'postgres' database to create the others
  const rootClient = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres',
    connectionTimeoutMillis: 4000,
  });

  try {
    await rootClient.connect();
    console.log('✅ Connected to default PostgreSQL system database.');

    for (const dbName of databases) {
      const checkRes = await rootClient.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbName]
      );
      if (checkRes.rows.length === 0) {
        await rootClient.query(`CREATE DATABASE ${dbName};`);
        console.log(`   [CREATED] Database '${dbName}' created successfully.`);
      } else {
        console.log(`   [EXISTS]  Database '${dbName}' already exists.`);
      }
    }
  } catch (err) {
    console.error('\n❌ Could not connect to local PostgreSQL:');
    console.error(`   ${err.message}\n`);
    console.log('💡 Quick fixes:');
    console.log('   1. Make sure the PostgreSQL Windows service is running.');
    console.log('   2. If your password is NOT "Shreya123", run with your password:');
    console.log('      $env:DB_PASSWORD="your_password"; node setup-local-db.js');
    console.log('   3. If your username is different:');
    console.log('      $env:DB_USER="your_username"; node setup-local-db.js\n');
    await rootClient.end().catch(() => {});
    process.exit(1);
  } finally {
    await rootClient.end().catch(() => {});
  }

  console.log('\n🌱 Now running database seeder to create tables and mock products...');
  process.env.DB_PORT = DB_PORT.toString();
  process.env.ORDER_DB_PORT = DB_PORT.toString();
  process.env.INVENTORY_DB_PORT = DB_PORT.toString();
  process.env.PAYMENT_DB_PORT = DB_PORT.toString();
  process.env.DB_USER = DB_USER;
  process.env.DB_PASSWORD = DB_PASSWORD;

  require('./seed.js');
}

initLocalPostgres();
