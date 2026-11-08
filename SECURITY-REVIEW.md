# AfriClay Public Website Security Review

**Review date:** 8 November 2026  
**Target:** [https://www.africlaymarket.com/](https://www.africlaymarket.com/)

## Summary

A limited passive review of the public homepage and its homepage-linked JavaScript assets found no confirmed sensitive-data exposure or exploitable vulnerability within the reviewed scope.

One low-risk hardening inconsistency was observed: security headers present on the JavaScript asset responses were absent from the homepage HTML response. This is a configuration improvement, not evidence that the site is exploitable.

## Finding

| # | Severity | Location | Evidence | Assessment |
|---|---|---|---|---|
| 1 | Low | Homepage HTML response | The homepage response did not include `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`. Homepage-linked JavaScript assets did include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=`. | Apply appropriate document-level headers consistently. Introduce CSP in report-only mode first, review reports, and enforce only after checking application compatibility. The absence of these headers alone does not demonstrate an exploitable vulnerability. |

## Other observations

- The homepage returned `200 OK` with `Content-Type: text/html; charset=utf-8`.
- `Server: Vercel` identifies the hosting provider but does not disclose a software version.
- `Strict-Transport-Security: max-age=63072000` was present.
- `Access-Control-Allow-Origin: *` was observed on the public homepage. This header alone is not evidence of a vulnerability for a public resource.
- The homepage response did not set a cookie.
- The homepage-linked JavaScript assets returned `200 OK`. No source-map reference or obvious private-key/token patterns were found during the limited static inspection. This is not a guarantee that no secrets exist elsewhere.
- Standard Expo/React Native Web template comments and a browser-local development fallback string were observed. No credential or confirmed internal-host disclosure was identified. Production configuration should ensure local development fallbacks cannot be selected in deployed builds.

## Scope and limitations

This review used normal unauthenticated GET requests for the public homepage and its homepage-linked static JavaScript assets, followed by inspection of their public responses. It did not submit forms, authenticate, probe API endpoints, enumerate routes, scan ports, fuzz inputs, or attempt exploitation. It did not inspect deployment configuration, backend behavior, private assets, or authenticated pages.

This was not a full penetration test or a certification that the website is secure. Further review should be performed by an authorized security professional before making broader security claims.
