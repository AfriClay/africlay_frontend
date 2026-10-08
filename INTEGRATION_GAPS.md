# Marketplace integration gaps

This document records capabilities that the Expo client must not claim to
provide. The active contract source is `updated_backend_v4/Africlay-server`,
inspected on 2026-10-08. No environment or secret files were inspected.

## v4 integrations

- Cart requests and purchase controls are limited to `buyer`, `both`, and
  administrative roles accepted by the backend's buyer permission.
- Checkout creates one pending order and then initiates its M-Pesa payment
  with the returned order UUID and an explicit Kenyan phone number.
- Payment success is shown only after `GET /api/payments/<uuid>/` returns
  `succeeded`. Pending checks are bounded, cancellable, and refreshed when the
  app returns to the foreground.
- Wallet top-up is a separate flow. It uses one `Idempotency-Key` for retries
  of the same amount and phone number, and a new key when either value changes.
- Wallet balances and limit/offset transaction history use the v4 response
  shapes exactly.
- Seller orders expose no action while payment is pending. Processing orders
  can be cancelled or shipped with courier, tracking number, and shipping cost.
- Notifications use only `id`, `notification_type`, `title`, `message`,
  `is_read`, and `created_at`.

## Essential backend correction

The v4 M-Pesa callback previously moved a successful order to `processing`
but left its order-level `payment_status` as `pending` and `payment_method`
blank. The seller shipment endpoint requires `payment_status=paid`, so every
M-Pesa order would otherwise fail at shipment. The callback now stores:

- `status=processing`
- `payment_method=mpesa`
- `payment_status=paid`

A backend regression test covers this transition.

## Remaining backend limitations

| Area | Current limitation | Frontend behavior |
| --- | --- | --- |
| Payment recovery | No order-to-payment lookup route; detail lookup requires a payment UUID | Checkout keeps the returned payment UUID. If initiation response is uncertain, recovery deliberately calls the idempotent order-payment initiation route; it never retries automatically |
| Wallet top-up status | No payment-attempt detail route | The client does not invent polling. It shows the returned attempt state and lets the user refresh wallet balance and transactions |
| Notifications | Serializer has no action or target metadata | Rows can be marked read but do not guess a deep-link destination. Add declared action and target fields server-side before contextual navigation |
| Seller orders | Seller list excludes orders containing products from multiple sellers | The seller UI shows only records returned by the API |
| Delivery | Courier fields exist, but there is no tracking-event feed | The buyer sees courier and tracking number, not live tracking |
| Product management | No product or product-image DELETE route | Delete controls remain hidden |
| Catalog discovery | No server-side text search or store-product filter | Search/filtering uses the currently loaded public list |
| Buyer-to-seller upgrade | No authenticated role-change endpoint | Existing seller/both accounts can use seller tools; buyers cannot self-promote |
| Web auth | JWTs use browser local storage in the preserved auth transport | HttpOnly-cookie migration remains separate security work |

## Configuration

The Expo client continues to use `EXPO_PUBLIC_API_URL`, including the `/api`
suffix. The backend reads comma-separated browser origins from
`CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`. Production must include the
exact deployed web origin, such as `https://www.example.com`, with no path.
Local Expo Web origins must also be listed when used. Native Android and iOS
requests are not governed by browser CORS.

M-Pesa credentials, callback tokens, Django secrets, and database credentials
remain server-only and must never use an `EXPO_PUBLIC_` variable.

## Verification status

- Frontend TypeScript validation and production export are run after each v4
  integration change.
- The focused backend payment test is run when the v4 Python environment and
  its configured test dependencies are available.
- Live M-Pesa/provider callback verification requires deployed backend
  credentials and cannot be simulated by the frontend build.
