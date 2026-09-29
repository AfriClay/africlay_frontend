# Marketplace integration gaps

This document tracks server capabilities that the Expo client must not claim
to provide. The active contract source is `new_updated_server` at backend
commit `4321405`, inspected on 2026-09-26.

## Newly integrated APIs

The frontend now uses the Django APIs for:

- account-scoped wishlist list, add, and remove
- public review lists plus authenticated create, edit, and delete
- account notifications, individual read state, and mark-all-read
- customer service booking creation, listing, and cancellation
- seller service booking listing and status transitions
- seller order listing and status updates

The previous placeholders and local-only wishlist behavior are no longer in
the active runtime path. These features use the shared JWT `apiClient`, React
Query keys, and existing profile/seller navigation.

## Remaining backend limitations

| Area | Current limitation | Frontend behavior |
| --- | --- | --- |
| Payments and wallet | No payment, payment-method, ledger, escrow, or webhook contract | No payment or wallet controls are presented |
| Buyer-to-seller upgrade | No authenticated role-change endpoint | Existing seller/both accounts can use seller tools; buyers cannot self-promote |
| Product management | No product or product-image DELETE route | Delete controls remain hidden |
| Catalog discovery | No server-side text search or store-product filter | Search/filtering uses the currently loaded public list |
| Notifications | List/read APIs exist, but backend workflows do not create notification records | The notification UI is real and may remain empty until backend emitters are added |
| Seller orders | The backend list excludes orders containing products from more than one seller | Seller UI accurately shows only records returned by the API |
| Reviews | No aggregate update connects review rows to stored store/product/service ratings | Detail review sections calculate their displayed average from fetched reviews |
| Delivery | No tracking event or shipment-detail API | No live tracking claim is shown |
| Messaging | Messages are read through conversation detail; the child messages route is POST-only | Frontend keeps the existing supported flow |
| Web auth | JWTs use browser local storage in the preserved auth transport | HttpOnly-cookie migration remains separate security work |

## Local backend correction

`PATCH /api/reviews/<uuid>/` previously rejected rating/comment-only partial
updates because serializer validation ignored the existing review target. The
serializer now considers instance values during partial validation, with a
regression test. This does not change models, routes, permissions, or auth.

## Verification status

- Frontend TypeScript validation passes.
- Frontend production web export passes.
- All 62 non-browser frontend contract/regression tests pass.
- Backend Docker execution is currently blocked locally because Docker
  Desktop's Linux engine is not running and `new_updated_server/.env` is
  absent. System Python also lacks Django and `uv` is unavailable.
- Live authenticated browser/device validation of the new APIs remains to be
  performed once the new backend is running with seeded users and records.
