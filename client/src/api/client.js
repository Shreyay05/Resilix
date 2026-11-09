/*
 * Integration seam for Resilix services.
 * Defaults to calling real microservices on http://localhost:5001.
 * Only falls back to in-browser mock if VITE_USE_MOCK_API=true is set.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const INVENTORY_API = import.meta.env.VITE_INVENTORY_API_URL || 'http://localhost:5002';
const PAYMENT_API = import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:5003';
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';

const wait = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export async function placeOrder({ productId, quantity, amount, customer }) {
  if (USE_MOCK) {
    console.log('[CLIENT] In mock API mode (in-browser simulation)');
    await wait(850);
    // Mirrors the payment-service rule: amounts > 10000 fail.
    if (amount > 10000) {
      return {
        status: 'FAILED',
        orderId: `RX-${Date.now().toString().slice(-6)}`,
        reason: 'Payment declined: Amount exceeds limit (Threshold: 10,000)',
        message: 'Demo saga compensation completed: reserved inventory was released.',
        steps: [
          { label: 'Order created', state: 'done' },
          { label: 'Inventory reserved', state: 'done' },
          { label: 'Payment declined', state: 'failed' },
          { label: 'Inventory released', state: 'compensated' },
          { label: 'Order cancelled', state: 'compensated' },
        ],
      };
    }
    return {
      status: 'SUCCESS',
      orderId: `RX-${Date.now().toString().slice(-6)}`,
      message: 'Order placed successfully!',
      steps: [
        { label: 'Order created', state: 'done' },
        { label: 'Inventory reserved', state: 'done' },
        { label: 'Payment successful', state: 'done' },
        { label: 'Order completed', state: 'done' },
      ],
    };
  }

  // Real microservices call to order-service orchestrator
  console.log(`[CLIENT] Sending POST ${API_BASE}/orders (Product #${productId}, Qty ${quantity}, Amount ₹${amount}, Customer: ${customer || 'Customer'})`);
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity, amount, customer }),
    });
    const data = await response.json();
    if (!response.ok) return { ...data, status: data.status || 'FAILED' };
    return { ...data, status: data.status || 'SUCCESS' };
  } catch (err) {
    console.error('[CLIENT] Failed to connect to Order Service:', err);
    return {
      status: 'FAILED',
      orderId: 'ERR',
      reason: `Could not reach Order Service at ${API_BASE}. Make sure Order Service is running on port 5001.`,
      steps: [{ label: `Connection to backend failed (${err.message})`, state: 'failed' }],
    };
  }
}

// Admin: Fetch live inventory stock levels
export async function fetchInventory() {
  try {
    const res = await fetch(`${INVENTORY_API}/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[CLIENT] Could not fetch live inventory from backend:', err.message);
    return null;
  }
}

// Admin: Restock / replenish stock
export async function adjustInventoryStock(productId, adjustment) {
  try {
    const res = await fetch(`${INVENTORY_API}/products/${productId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment }),
    });
    return await res.json();
  } catch (err) {
    console.error('[CLIENT] Could not adjust stock:', err);
    throw err;
  }
}

// Admin: Fetch all system orders
export async function fetchAllOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[CLIENT] Could not fetch orders from backend:', err.message);
    return [];
  }
}

// Admin: Fetch all payments
export async function fetchAllPayments() {
  try {
    const res = await fetch(`${PAYMENT_API}/payments`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[CLIENT] Could not fetch payments from backend:', err.message);
    return [];
  }
}

export { USE_MOCK };
