# Phase 3 commerce integration

The Django API in `updated_backend/Africlay-server` owns cart, saved addresses,
checkout, and buyer orders. The Expo app uses the existing JWT `apiClient` for
these requests; it does not generate local orders or report a payment result.

## Verified routes

All routes below require authentication and operate on the signed-in user.
The list responses currently contain plain arrays, not paginated results.

| Method | Route | Request | Result |
| --- | --- | --- | --- |
| GET | `/api/cart/` | None | Current buyer cart and items |
| GET, POST | `/api/cart/items/` | POST: `product` UUID, positive `quantity` | Owned cart items; POST returns 201, or 200 when incrementing an existing item |
| GET, PATCH, PUT, DELETE | `/api/cart/items/<uuid>/` | PATCH/PUT: `quantity` | Owned item; DELETE returns 204 |
| POST | `/api/cart/checkout/` | `shipping_address`, `shipping_city`, `shipping_postal_code`, `shipping_country` | 201 with real order, or 400 validation error |
| GET | `/api/cart/orders/` | None | Buyer orders, newest first |
| GET | `/api/cart/orders/<uuid>/` | None | Buyer-owned order detail; other IDs return 404 |
| GET, POST | `/api/auth/addresses/` | POST: address fields | Owned saved addresses |
| GET, PATCH, PUT, DELETE | `/api/auth/addresses/<uuid>/` | PATCH/PUT: address fields | Owned address; DELETE returns 204 |

Cart items use a cart-item UUID distinct from the product UUID. Cart reads and
mutations use those identifiers accordingly. The backend checks available stock
when items are added or quantities updated. Checkout validates stock and product
and store availability, creates a `pending` order, decrements stock, and clears
the cart in one database transaction. Order statuses supported by the backend are
`pending`, `processing`, `shipped`, `delivered`, and `cancelled`. The frontend
shows the returned order ID and explicitly states that payment has not been
collected.

## Current API limits

- There is no standalone cart-clear endpoint; checkout clears the cart. Individual
  cart items can be deleted.
- There are no seller order list or status-update routes. The seller orders screen
  shows an unavailable state instead of demo orders or editable fake statuses.
- There is no payment endpoint in this phase. Placing an order is not payment.
- Cart item responses do not include image URLs, so the cart uses product names.
- The checkout endpoint accepts address fields, not a saved-address UUID. The
  selected saved address is mapped to the four required shipping fields.
- A lost checkout response is not automatically retried because the backend has
  no idempotency key. The UI directs the buyer to check My Orders first.

## Validation gap

The local browser test verifies an unauthenticated browser context cannot see
the buyer's cart, but it does not verify a click on the web Logout control.
The existing Profile and side-menu logout confirmations use React Native
`Alert.alert`, whose React Native Web implementation is a no-op. That auth UI
issue is outside this commerce phase and remains unresolved. No Android device
was attached for native logout validation.

## Validation

From `front_end`:

```powershell
npm exec -- tsc --noEmit
npx expo export --platform web
node scripts/test-commerce-integration.cjs
node scripts/test-auth-transport.cjs
node scripts/test-catalog-stability.cjs
```

For local browser validation, run Django at `http://localhost:8000`, seed the
Phase 2B catalog, and run Expo web at `http://localhost:8081`. Then run
`node scripts/test-phase3-live-browser.cjs`. This script creates a disposable,
verified local buyer with an unusable password, injects temporary JWTs into
the app's existing web storage for that test browser only, and checks cart
mutations, address selection, checkout, stock and cart changes,
persisted orders, and a signed-out browser context. To force a new checkout run,
set `PHASE3_TEST_BUYER` to a fresh `phase3-...@example.invalid` address. It
creates one real pending order in the local database per buyer; it does not
simulate payment.

From `updated_backend/Africlay-server`:

```powershell
docker compose exec -T backend python manage.py check
docker compose exec -T backend python manage.py test
```
