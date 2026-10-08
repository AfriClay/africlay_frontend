# Django feature matrix

Source: `updated_backend_v4/Africlay-server` route files, views, serializers,
models, and tests inspected on 2026-10-08. All paths are relative to the Django host. `A`
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
| `/api/services/bookings/` | GET, POST U | service UUID, scheduled_at, notes -> owned booking | `bookingService` / ServiceDetails, MyBookings | Integrated |
| `/api/services/bookings/<uuid>/` | GET, DELETE U+customer | none -> booking; DELETE cancels pending/confirmed booking | `bookingService` / MyBookings | Integrated cancellation |
| `/api/services/seller/bookings/` | GET V | none -> bookings for seller services | `bookingService` / SellerBookings | Integrated |
| `/api/services/seller/bookings/<uuid>/` | PATCH V+owner | status -> booking | `bookingService` / SellerBookings | Integrated with allowed transition controls |
| `/api/cart/` | GET buyer | none -> cart with items | `cartService`, `CartContext` / Cart | Integrated; seller-only accounts do not request or display cart controls |
| `/api/cart/items/` | GET, POST buyer | product UUID, quantity -> owned items; POST 201/200 | `cartService` / Cart | Integrated; stock checked |
| `/api/cart/items/<uuid>/` | GET, PUT, PATCH, DELETE buyer+owner | quantity -> cart item; DELETE 204 | `cartService` / Cart | Integrated |
| `/api/cart/checkout/` | POST buyer | four shipping fields, optional payment_method -> 201 order | `orderService` / Checkout | Integrated; M-Pesa order flow creates a pending order then calls payment initiation |
| `/api/cart/orders/` | GET U | none -> buyer order array | `orderService` / MyOrders | Integrated |
| `/api/cart/orders/<uuid>/` | GET U+buyer | none -> order with items | `orderService` / OrderDetails | Integrated |
| `/api/cart/seller/orders/` | GET V | none -> seller order array | `orderService` / SellerOrders | Integrated; backend excludes multi-seller orders |
| `/api/cart/seller/orders/<uuid>/` | PATCH V | processing order: shipped requires courier_name, tracking_number, shipping_cost; cancelled is also allowed | `orderService` / SellerOrders | Integrated; pending-payment orders expose no seller action |
| `/api/payments/initiate/` | POST buyer | order_id, 2547XXXXXXXX phone_number -> payment | `paymentService` / Checkout | Integrated; existing active payment is returned instead of creating a duplicate |
| `/api/payments/<uuid>/` | GET buyer+order owner | none -> payment status/detail | `paymentService` / Checkout | Integrated with bounded, cancellable status refresh and foreground refresh |
| `/api/payments/wallets/` | GET, POST U | GET auto-creates KES wallet -> wallet array; POST currency -> wallet | `paymentService` / Wallet | Integrated GET; the client uses the KES wallet created by the server |
| `/api/payments/wallets/<uuid>/transactions/` | GET U+owner | limit/offset -> `{count,next,previous,results}` | `paymentService` / Wallet | Integrated first page with loading, empty, refresh, and error states |
| `/api/payments/mpesa/stk-push/` | POST U | whole-KES amount, Kenyan phone, required Idempotency-Key -> payment attempt | `paymentService` / Wallet | Integrated as wallet top-up, separate from order payment; same attempt reuses its key |
| `/api/cart/wishlist/` | GET U | none -> account wishlist with items | `wishlistService`, `WishlistContext` / Wishlist | Integrated |
| `/api/cart/wishlist/items/` | GET, POST U | product UUID -> item | `wishlistService`, `WishlistContext` / ProductDetails | Integrated |
| `/api/cart/wishlist/items/<uuid>/` | DELETE U+owner | none -> 204 | `wishlistService`, `WishlistContext` / Wishlist | Integrated |
| `/api/reviews/` | GET A, POST U | target filter or exactly one target UUID plus rating/comment -> review | `reviewService` / product, service, store details | Integrated |
| `/api/reviews/<uuid>/` | GET, PATCH, DELETE U | rating/comment -> review; DELETE 204 | `reviewService` / ReviewSection | Integrated; local backend fixes partial-update target validation |
| `/api/notifications/` | GET U | optional is_read filter -> owned notifications with id, notification_type, title, message, is_read, created_at | `notificationService` / Notifications, desktop shell | Integrated exactly; no action/target deep-link metadata is assumed |
| `/api/notifications/<uuid>/` | GET, PATCH U+owner | is_read -> notification | `notificationService` / Notifications | Integrated |
| `/api/notifications/mark-all-read/` | POST U | none -> marked_read count | `notificationService` / Notifications | Integrated |
| `/api/messages/conversations/` | GET, POST U | GET -> `{results:[conversation]}`; POST seller_id/store_id/product_id/service_id -> conversation | `messageService` / MessagesList, SellerStore | Integrated |
| `/api/messages/conversations/<uuid>/` | GET U+participant | none -> conversation including messages; marks incoming messages read | `messageService` / ConversationThread | Integrated |
| `/api/messages/conversations/<uuid>/messages/` | POST U+participant | body (max 2000), optional attachment URL/name -> message, 201 | `messageService` / ConversationThread | Integrated POST; GET is not implemented |
| `/api/common/sms/send/` | POST A | recipient/message -> SMS gateway result | none | Not applicable to marketplace client; utility/operations API |
| `/api/schema/`, `/api/docs/`, `/api/redoc/` | GET A | none -> OpenAPI schema/documentation | none | Not applicable to marketplace client |
| `/admin/` | Django admin | browser admin session -> admin UI | none | Not applicable to marketplace client |

There is still no backend route for role promotion, product/image deletion,
server-side product search, a public store-product filter, payment-attempt
detail lookup, or live courier tracking events. Notifications have no
action/target fields, so notification rows cannot safely deep-link to a
specific order, product, booking, or store.
