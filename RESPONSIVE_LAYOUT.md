# Responsive web layout

`ResponsiveLayoutContext` centralizes compact (<768), expanded (>=768), and
wide (>=1200) web modes. Native always uses compact behavior, regardless of
device width. `MarketplaceShell` keeps the navigator mounted while switching
header/sidebar visibility. Existing compact headers, drawer and bottom tabs
remain in use.

Route limits replace the old global 600px web frame: authentication 480px,
cart/checkout 880px, profile/settings 960px, details 1200px, marketplace 1440px.
Home, listings and search share responsive grids; product details uses two
columns on expanded web. Existing theme tokens and business logic are reused.

## Files

- App.tsx
- src/contexts/ResponsiveLayoutContext.tsx (new)
- src/components/layout/MarketplaceShell.tsx (new)
- src/components/AppFrame.web.tsx
- src/navigation/RootNavigator.tsx
- src/navigation/AppTabs.tsx
- src/navigation/SearchStack.tsx
- src/components/domain/CategoryCard.tsx
- src/components/domain/ProductCard.tsx
- src/components/domain/PromotionalCarousel.tsx
- src/screens/home/Home.tsx
- src/screens/home/ProductListing.tsx
- src/screens/home/ProductDetails.tsx
- src/screens/search/Search.tsx
- scripts/test-responsive-browser.cjs (new)
- RESPONSIVE_LAYOUT.md (new)

## Validation

- `npx tsc --noEmit`: passed.
- `npx expo export --platform web`: passed.
- `node scripts/test-auth-transport.cjs`: all five tests passed.
- `node scripts/test-responsive-browser.cjs`: passed in headless Edge with
  Playwright installed outside the application and supplied through NODE_PATH.
  Requires the Expo server at localhost:8082. Auth responses are mocked only
  in the browser test; no real accounts or payments are created.

Browser checks cover home at 375/768/1024/1280/1440px, navigation visibility,
horizontal page overflow, auth, search/results/empty state, category navigation,
listing, product details (including 768px), cart, checkout, settings and a short
window. Screenshots are written under TEMP/africlay-responsive-screenshots.

Native-device visual validation, synthetic long-name stress tests and deliberate
slow-loading tests remain manual follow-ups. Existing remote sample imagery and
sample-data text encoding were not modified. Backend, auth transport, OTP, JWT,
API contracts and frontend data services are unchanged.
