/*
 * Integration seam for the existing Resilix services.
 * Keep components calling this adapter rather than fetch() directly.
 * Current mode is MOCK; later set VITE_USE_MOCK_API=false and map the
 * request/response contracts to the deployed API gateway / order service.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
const USE_MOCK = (import.meta.env.VITE_USE_MOCK_API ?? 'true') !== 'false'

const wait = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms))

export async function placeOrder({ productId, quantity, amount }) {
  if (USE_MOCK) {
    await wait(850)
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
      }
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
    }
  }

  // Future integration: current order-service accepts { productId, quantity, amount }.
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity, amount }),
  })
  const data = await response.json()
  if (!response.ok) return { ...data, status: data.status || 'FAILED' }
  return { ...data, status: data.status || 'SUCCESS' }
}

export { USE_MOCK }