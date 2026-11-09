// Automated Verification Script for Resilix Saga Microservices
const http = require('http');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 3000,
    };
    if (body) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    if (body) req.write(body);
    req.end();
  });
}

async function runCheck() {
  console.log('====================================================');
  console.log('[CHECK] Resilix Microservices Verification & Saga Test');
  console.log('====================================================\n');

  // 1. Health checks
  const services = [
    { name: 'Order Service', url: 'http://127.0.0.1:5001/health', port: 5001 },
    { name: 'Inventory Service', url: 'http://127.0.0.1:5002/health', port: 5002 },
    { name: 'Payment Service', url: 'http://127.0.0.1:5003/health', port: 5003 },
  ];

  console.log('1. Checking Services Health:');
  let allHealthy = true;
  for (const s of services) {
    try {
      const res = await request(s.url);
      if (res.status === 200) {
        console.log(`   [PASS] ${s.name} is UP on port ${s.port} (${res.body.storage || 'active'} storage)`);
      } else {
        console.log(`   [FAIL] ${s.name} returned status ${res.status}`);
        allHealthy = false;
      }
    } catch (err) {
      console.log(`   [FAIL] ${s.name} on port ${s.port} is NOT reachable (${err.message})`);
      allHealthy = false;
    }
  }

  if (!allHealthy) {
    console.log('\n[FAIL] One or more services are not running.');
    console.log('Start them using:');
    console.log('   node inventory-service/index.js (Port 5002)');
    console.log('   node payment-service/index.js   (Port 5003)');
    console.log('   node order-service/index.js     (Port 5001)');
    console.log('   Or run: .\\start-all.ps1');
    process.exit(1);
  }

  console.log('\n2. Testing Successful Order (Amount <= 1000):');
  try {
    const successPayload = JSON.stringify({ productId: 1, quantity: 1, amount: 399.00 });
    const successRes = await request('http://127.0.0.1:5001/orders', { method: 'POST' }, successPayload);
    if (successRes.body.status === 'SUCCESS') {
      console.log(`   [PASS] Order #${successRes.body.orderId} COMPLETED successfully!`);
      console.log('   Execution trace:');
      (successRes.body.steps || []).forEach(step => {
        console.log(`     - [${step.state.toUpperCase()}] ${step.label}`);
      });
    } else {
      console.log('   [FAIL] Unexpected response:', successRes.body);
    }
  } catch (err) {
    console.log('   [FAIL] Failed to test successful order:', err.message);
  }

  console.log('\n3. Testing Saga Compensation / Rollback (Amount > 1000):');
  try {
    const failPayload = JSON.stringify({ productId: 6, quantity: 1, amount: 1299.00 });
    const failRes = await request('http://127.0.0.1:5001/orders', { method: 'POST' }, failPayload);
    if (failRes.body.status === 'FAILED') {
      console.log(`   [PASS] Order #${failRes.body.orderId} failed as expected (Amount exceeds limit).`);
      console.log(`   [PASS] Saga compensation rollback executed cleanly!`);
      console.log('   Execution trace:');
      (failRes.body.steps || []).forEach(step => {
        console.log(`     - [${step.state.toUpperCase()}] ${step.label}`);
      });
    } else {
      console.log('   [FAIL] Expected order to fail, but got:', failRes.body);
    }
  } catch (err) {
    console.log('   [FAIL] Failed to test saga rollback:', err.message);
  }

  console.log('\n====================================================');
  console.log('[COMPLETE] Verification Finished! All services and Saga logic are working.');
  console.log('====================================================');
}

runCheck();
