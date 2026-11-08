# Authentication and Role Routing Audit

Date: 2026-11-08  
Scope: donor login to food-donation interface; requester login to food-request interface

## Outcome

The deployed donor account authenticated successfully, but the client-side transition returned to `/login`. The session itself was valid: `GET /api/me` returned the authenticated, verified donor with `onboardingComplete: true` and `dashboardRoute: /dashboard/donor`. Direct navigation to `/dashboard/donor` rendered the food donation form.

The defect was isolated to frontend post-authentication navigation. `PasswordLoginForm` used delayed App Router navigation after the login Route Handler wrote the Supabase session cookie. A previously prefetched unauthenticated dashboard response could therefore be reused and redirect the user back to `/login`.

The correction validates the server-provided destination against the application-owned role routes and performs a full-document replacement. The next protected request consequently observes the committed cookie and cannot reuse the stale unauthenticated response.

## Owner findings

### Backend

- Supabase password authentication completed successfully.
- `/api/me` returned the correct canonical donor role, verified state, completed onboarding state, saved location, and donor dashboard destination.
- Proxy rules allow verified donors into `/dashboard/donor` and verified requesters into `/dashboard/beneficiary`.
- Direct donor dashboard navigation worked with the established session.
- No backend correction was warranted.

### Frontend

- Root cause: delayed `router.push()` after cookie-writing login combined with stale/prefetched unauthenticated route state.
- Correction: allowlist `/onboarding`, `/dashboard/donor`, `/dashboard/beneficiary`, `/dashboard/volunteer`, and `/admin`, then use `window.location.replace()` after successful login.
- External URLs, script URLs, unknown routes, and malformed destinations fail closed to `/onboarding`.
- The donor dashboard contains the surplus-food publishing interface.
- The requester compatibility route `/dashboard/beneficiary` contains nearby food discovery and whole-listing claim actions.

## Verification

- Full test suite: 243 passed, 0 failed.
- TypeScript: `npx tsc --noEmit` passed.
- Changed-file ESLint passed.
- Production build: `npx next build --webpack` passed with the existing local environment configuration.
- `git diff --check` passed.
- Live donor authentication, authenticated `/api/me`, and direct donor dashboard rendering were verified against the deployed site before the correction.

## Remaining release gate

The integrated correction must be deployed before the final live regression. After deployment, repeat donor login and confirm that the first post-submit navigation reaches `/dashboard/donor` without manually entering the dashboard URL. Repeat with a requester test account and confirm navigation to `/dashboard/beneficiary` and visibility of the food discovery/claim interface.

No user credentials or secrets were recorded in this audit.
