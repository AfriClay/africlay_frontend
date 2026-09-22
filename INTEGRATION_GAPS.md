# Marketplace integration gaps

This document tracks frontend controls that must not claim server-backed
behavior without a contract in `updated_backend/Africlay-server`.

## Demo behavior found and disposition in `front_end/src`

| Area | Existing frontend behavior | Required disposition |
| --- | --- | --- |
| Seller onboarding | Local role promotion, KYC approval button, and storefront success state | Use real store/KYC routes for verified seller accounts; do not pretend a buyer role can be promoted |
| Services | `productService.fetchServices` reads `src/mock/services` via `simulateNetwork`; booking sheet promises a request | Use real service routes; remove booking action until a booking API exists |
| Messaging | `messageService` reads `src/mock/messages`, generates local IDs and support replies | Use conversation endpoints; no automatic reply |
| Wishlist | `WishlistContext` saves product IDs to AsyncStorage | Remove persistence and save controls until a wishlist API exists |
| Wallet/payment | `walletService` returns fixed balance and escrow values; profile has demo prompts and cards | Remove wallet/payment navigation and actions; backend has no payment contract |
| Reviews | `reviewService` returns `src/mock/reviews` | Remove review screen/navigation; no review API |
| Notifications | `notificationService` returns `src/mock/notifications` | Remove entry point and route; no notification API |
| User stats | Auth mapper returns zero order/wishlist/review counts | Do not present the latter two as real account stats; use buyer orders for order count if needed |
| Google login | Frontend displays an unavailable Google auth action | Remove the action; Django JWT is the only active provider |
| Delivery tracking | Old UI copy implied real-time tracking | Do not show tracking without an endpoint |

The live navigation now omits wallet, payment methods, reviews, wishlist, and
notifications. Product cards/details no longer show a fake wishlist action;
service details no longer promise booking. The demo service and message
sources are not imported by production code, and their fake service modules
were removed. Seller onboarding uses backend role, store, and KYC responses;
it cannot promote an existing buyer account. Profile edits, logout, services,
and messaging use Django responses rather than local success state.

| Removed or disabled feature | Frontend files changed | Backend contract needed to restore it |
| --- | --- | --- |
| Wallet, deposits, withdrawals, payment methods | `ProfileStack.tsx`, `Profile.tsx`, `OtherProfileScreens.tsx`, `DashboardHome.tsx`, `walletService.ts` (removed) | Ledger, payment method, initiation, and status APIs with authorization and audit semantics |
| Reviews | `SellerStore.tsx`, `ProfileStack.tsx`, `Profile.tsx`, `reviewService.ts` (removed) | Review list/create/moderation routes and ownership rules |
| Notifications | `RootNavigator.tsx`, `Home.tsx`, `MarketplaceShell.tsx`, `notificationService.ts` (removed) | Account-scoped list/read and delivery semantics |
| Wishlist | `ProductCard.tsx`, `ProductDetails.tsx`, `ProfileStack.tsx`, `WishlistContext.tsx` | Account-scoped list/add/remove routes |
| Service booking | `ServiceDetails.tsx`, `ServiceCard.tsx` | Booking create/list/status contract |
| Google login | `GetStarted.tsx`, `Login.tsx`, `AuthContext.tsx`, `authService.ts` | Backend-supported OAuth exchange and account linking |
| Delivery tracking | `OtherProfileScreens.tsx` | Tracking status/events route tied to orders |
| Buyer-to-seller upgrade | `AuthContext.tsx`, `RoleSelection.tsx`, `StartSelling.tsx` | Authenticated role-change endpoint with authorization and verification rules |
| Seller order management | `SellerOrders.tsx`, `DashboardHome.tsx` | Seller-scoped order list/detail/status routes |
| Product and image deletion | `ProductManagement.tsx`, `AddEditProduct.tsx` | Owner-scoped DELETE routes |

## Backend work needed before re-enabling unsupported features

- Buyer-to-seller role change requires an authenticated, authorization-checked
  backend endpoint. `PATCH /api/auth/me/` updates profile and phone, not role.
  Existing verified seller accounts can create a store and submit KYC.
- Wishlist needs user-scoped list/add/remove endpoints. Device-only persistence
  would not satisfy this client/server parity requirement.
- Wallet balances, deposits, withdrawals, payment methods, payment initiation,
  escrow, and payment status require a real payment/ledger contract. Checkout
  currently creates an unpaid `pending` order only.
- Reviews require list and creation endpoints with ownership and moderation
  rules. Store/product rating fields do not constitute a review API.
- Notifications need user-scoped list/read endpoints and delivery semantics.
- Service booking requires a booking create/list/status contract; published
  services alone do not support booking.
- Seller order list and status updates require seller-scoped routes. The buyer
  order routes cannot be repurposed for them.
- Product/image deletion, server-side product text search, and delivery tracking
  need explicit routes. The app must not synthesize them.
- Admin KYC review (`POST /api/stores/<slug>/kyc/review/`) is intentionally not
  integrated into the marketplace client. It belongs in an admin workflow.
- Conversation messages are returned by `GET /api/messages/conversations/<uuid>/`.
  Despite the URL, `GET` on its `/messages/` child is not implemented (405).
- `PATCH /api/auth/me/` assumes every user has a related `UserProfile` row.
  A local test buyer created directly with `User.objects.get_or_create()` did
  not have one and received a Django 500 until the disposable fixture was
  repaired. Normal registration creates a profile; legacy/imported users
  without one remain a backend data-integrity risk.
- Web JWTs remain in browser `localStorage` under the existing auth transport.
  This parity pass preserved auth behavior, so it does not establish the
  previously requested HttpOnly-cookie production security model. That
  requires a separate backend/browser auth transport change and review.

## Verification notes

The backend contract was checked against route files, views, serializers, and
models before changing app behavior. API success is reported only from backend
responses. Any feature that cannot be completed without a missing backend
contract remains unavailable rather than using local mock data.

On 2026-09-20, Django `check` and all 88 backend tests passed. The frontend
TypeScript check, web export, and 53 focused tests passed. Live browser checks
passed for catalog/cart/order regression, published service listing and slug
detail, buyer-to-seller conversation and message, profile PATCH persistence,
and web logout. The named local Phase 2B tile test fixture had only one unit
left; stock was restored to five for its existing quantity regression. A
published local service fixture was created for the service browser check.
No native-device pass or fresh-seller KYC document submission was performed in
this parity pass. Backend tests cover store creation, KYC document submission,
approval/rejection, and service image upload; the frontend adapters have
contract-shaped request/response tests for store creation, KYC multipart, and
service image upload.
