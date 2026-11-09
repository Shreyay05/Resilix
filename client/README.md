# Resilix Store — React ecommerce mock UI

A customer-facing electronics ecommerce storefront for the Resilix project. This is not an admin dashboard. It is a frontend-only prototype with mock catalog data and a mock checkout flow.

## Run locally
```bash
npm install
npm run dev
```
Open the URL printed by Vite (usually http://localhost:5173).

## Included
- Responsive storefront and product collection
- Category filters, search, sort by price/rating
- Wishlist
- Shopping bag with quantity controls and shipping threshold
- Checkout form with mock payment flow
- Order history and saga outcome timeline
- Success flow and payment-decline / compensation flow
- API adapter to keep the UI ready for backend integration

## Resilix integration seam
- `src/api/client.js` is the only API adapter.
- `src/data/products.js` contains mock products based on the electronics catalog in `seed.js`.
- The current order service contract in the supplied backend is `POST http://localhost:5001/orders` with `{ productId, quantity, amount }`.
- Inventory service is currently internal to the order flow; the browser should not call it directly.
- `VITE_API_BASE_URL` and `VITE_USE_MOCK_API` are configurable in `.env`.
- To use the real order service, copy `.env.example` to `.env` and set `VITE_USE_MOCK_API=false`. The API needs to be reachable from the browser and configured for CORS.

## Important integration notes
- The current backend processes **one product per order request**. The demo submits one request per cart line until the backend is updated to accept an order with multiple items.
- The supplied payment service intentionally declines amounts over 1000 (in its current currency units) for saga rollback demonstration. This mock reflects that behavior to make compensation visible. Change the mock rule in `src/api/client.js` if your backend rule changes.
- Currency is displayed as INR with a demo conversion from the seeded catalog's numeric values. Confirm the intended currency/amount units before production integration.
- No real payment is taken, and checkout form data is only kept in browser memory.
- For production, do not expose database credentials to the frontend. Keep payment and inventory operations on the server and add authentication, validation, and proper order status endpoints.

## Suggested next API contracts
- `GET /products` — public product catalog and stock availability
- `POST /orders` — accept customer details and `items: [{ productId, quantity }]`; calculate prices server-side
- `GET /orders/:id` — fetch order and saga state
- `GET /orders?customerId=...` — authenticated customer order history
- Payment provider integration should remain server-side.
