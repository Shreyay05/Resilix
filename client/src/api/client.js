/*
 * Integration seam for Resilix services.
 * Defaults to calling real microservices on http://localhost:5001.
 * Only falls back to in-browser mock if VITE_USE_MOCK_API=true is set.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';

const wait = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export async function placeOrder({ productId, quantity, amount }) {
  if (USE_MOCK) {
    console.log('[CLIENT] In mock API mode (in-browser simulation)');
    await wait(850);
    // Mirrors the current demo payment-service rule: amounts > 1000 fail.
    if (amount > 1000) {
      return {
        status: 'FAILED',
        orderId: `RX-${Date.now().toString().slice(-6)}`,
        reason: 'Payment declined: Amount exceeds limit',
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
  console.log(`[CLIENT] Sending POST ${API_BASE}/orders (Product #${productId}, Qty ${quantity}, Amount ₹${amount})`);
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity, amount }),
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

export { USE_MOCK };
