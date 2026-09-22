# Django feature matrix

Source: `updated_backend/Africlay-server` route files, views, serializers, and
models inspected on 2026-09-20. All paths are relative to the Django host. `A`
means public (`AllowAny`), `U` authenticated active user, `V` verified seller,
and `D` application admin. Owner filtering also applies where noted. A 400
response contains DRF field errors; object-not-found or inaccessible records
generally return 404. List responses are plain arrays unless stated otherwise.

Statuses describe the frontend after this parity pass. See
`INTEGRATION_GAPS.md` for backend limitations and verification notes.

| Route | Method / permission | Request -> response | Frontend service / screen | Status / remaining work |
| --- | --- | --- | --- | --- |
| `/api/auth/register/` | POST A | email, password, password_confirm, names, optional role/phone -> user | `authService` / Register | Integrated; role selected before registration |
| `/api/auth/verify-email/` | POST A | email, otp_code -> user, JWT pair | `authService` / OTPVerification | Integrated |
| `/api/auth/resend-otp/` | POST A | email, otp_type -> message | `authService` / OTPVerification | Integrated |
| `/api/auth/login/` | POST A | email, password -> user, JWT pair | `authService` / Login | Integrated |
| `/api/auth/token/refresh/` | POST A | refresh -> rotated JWT pair | `apiClient` | Integrated |
| `/api/auth/logout/` | POST U | refresh -> message; revokes refresh | `authService` / Profile, SideMenu | Integrated; web and native confirmation use platform-safe controls |
| `/api/auth/password-reset/` | POST A | email -> message | `authService` / ForgotPassword | Integrated |
| `/api/auth/password-reset/confirm/` | POST A | email, otp_code, new_password, confirmation -> message | `authService` / ForgotPassword | Integrated |
| `/api/auth/change-password/` | POST U | old/new password and confirmation -> message | `authService` / Settings | Partially integrated; service exists, no visible form |
| `/api/auth/me/` | GET U | none -> user with profile | `authService` / app startup | Integrated |
| `/api/auth/me/` | PUT, PATCH U | profile first/last name, avatar URL, bio, notification_preferences, phone -> `{message,user}` | `authService` / Settings, ProfileCompletion | Integrated for name, bio, phone; role cannot be changed here |
| `/api/auth/addresses/` | GET, POST U | address fields -> owned address or array | `addressService` / MyAddresses, Checkout | Integrated |
| `/api/auth/addresses/<uuid>/` | GET, PUT, PATCH, DELETE U+owner | address fields -> address; DELETE 204 | `addressService` / MyAddresses | Integrated |
| `/api/stores/` | GET A | none -> active store array | `productService` / seller listings | Integrated |
| `/api/stores/` | POST V | name, unique slug, optional store details/media -> store | `storeService` / StorefrontSetup | Integrated for verified seller accounts |
| `/api/stores/<slug>/` | GET A | none -> active store | `productService` / SellerStore | Integrated |
| `/api/stores/<slug>/` | PUT, PATCH V+owner | store fields -> store | `productService` / seller editor | Partially integrated |
| `/api/stores/<slug>/kyc/` | GET V+owner or D | none -> KYC or 404 | `storeService` / VerificationPending | Integrated |
| `/api/stores/<slug>/kyc/submit/` | POST V+owner | multipart business_name, registration/tax numbers, document_type, document -> KYC, 201/200 | `storeService` / KYCUpload | Integrated for image documents; rejected resubmission allowed |
| `/api/stores/<slug>/kyc/review/` | POST D | decision, rejection_reason if rejected -> KYC | none | Not applicable to marketplace client |
| `/api/products/categories/` | GET A, POST D | category fields -> category or array | `productService` / filters | Integrated GET; admin POST not applicable |
| `/api/products/categories/<uuid>/` | GET A, PUT/PATCH D | category fields -> category | none | Missing frontend integration for public detail; admin writes not applicable |
| `/api/products/tags/` | GET A, POST D | tag fields -> tag or array | `productService` / filters | Integrated GET; admin POST not applicable |
| `/api/products/tags/<uuid>/` | GET A, PUT/PATCH D | tag fields -> tag | none | Missing frontend integration for public detail; admin writes not applicable |
| `/api/products/` | GET A | optional category/tag slug query -> published, approved-store product array | `productService` / Home, Search, listing | Integrated; no server-side text search |
| `/api/products/<slug>/` | GET A | none -> published product | `productService` / ProductDetails | Integrated; writes by slug return 405 |
| `/api/products/manage/` | GET, POST V | product fields -> owned array or created product | `productService` / ProductManagement | Integrated |
| `/api/products/manage/<uuid>/` | GET, PUT, PATCH V+owner | product fields -> owned product | `productService` / AddEditProduct | Integrated; no DELETE |
| `/api/products/manage/<uuid>/images/` | GET, POST V+owner | multipart image, alt text, primary/order -> image or array | `productService` / AddEditProduct | Integrated; no image DELETE |
| `/api/services/categories/` | GET A, POST D | service category fields -> category or array | `serviceService` / Services, ServiceManagement | Integrated GET; admin POST not applicable |
| `/api/services/categories/<uuid>/` | GET A, PUT/PATCH D | category fields -> category | none | Missing frontend integration for public detail; admin writes not applicable |
| `/api/services/` | GET A | none -> published service array from active, approved stores | `serviceService` / Services, Home | Integrated |
| `/api/services/<slug>/` | GET A | none -> published service | `serviceService` / ServiceDetails | Integrated |
| `/api/services/manage/` | GET, POST V | service fields (name, slug, price, duration_minutes, optional category/tags/status) -> owned array or service | `serviceService` / ServiceManagement | Integrated |
| `/api/services/manage/<uuid>/` | GET, PUT, PATCH, DELETE V+owner | service fields -> service; DELETE 204 | `serviceService` / ServiceManagement | Integrated |
| `/api/services/manage/<uuid>/images/` | GET, POST V+owner | multipart image, alt text, primary/order -> image or array | `serviceService` / ServiceManagement | Integrated POST; GET images included in service detail |
| `/api/cart/` | GET U | none -> cart with items | `cartService` / Cart | Integrated; no clear route |
| `/api/cart/items/` | GET, POST U | product UUID, quantity -> owned items; POST 201/200 | `cartService` / Cart | Integrated; stock checked |
| `/api/cart/items/<uuid>/` | GET, PUT, PATCH, DELETE U+owner | quantity -> cart item; DELETE 204 | `cartService` / Cart | Integrated |
| `/api/cart/checkout/` | POST U | four shipping fields -> 201 pending order | `orderService` / Checkout | Integrated; no payment or idempotency key |
| `/api/cart/orders/` | GET U | none -> buyer order array | `orderService` / MyOrders | Integrated |
| `/api/cart/orders/<uuid>/` | GET U+buyer | none -> order with items | `orderService` / OrderDetails | Integrated |
| `/api/messages/conversations/` | GET, POST U | GET -> `{results:[conversation]}`; POST seller_id/store_id/product_id/service_id -> conversation | `messageService` / MessagesList, SellerStore | Integrated |
| `/api/messages/conversations/<uuid>/` | GET U+participant | none -> conversation including messages; marks incoming messages read | `messageService` / ConversationThread | Integrated |
| `/api/messages/conversations/<uuid>/messages/` | POST U+participant | body (max 2000), optional attachment URL/name -> message, 201 | `messageService` / ConversationThread | Integrated POST; GET is not implemented |
| `/api/common/sms/send/` | POST A | recipient/message -> SMS gateway result | none | Not applicable to marketplace client; utility/operations API |
| `/api/schema/`, `/api/docs/`, `/api/redoc/` | GET A | none -> OpenAPI schema/documentation | none | Not applicable to marketplace client |
| `/admin/` | Django admin | browser admin session -> admin UI | none | Not applicable to marketplace client |

There is no backend route for role promotion, wishlist persistence, reviews,
wallets, payments, notifications, service bookings, seller order management,
delivery tracking, or product/image deletion. Those are not inferred from
model names or existing frontend screens.
