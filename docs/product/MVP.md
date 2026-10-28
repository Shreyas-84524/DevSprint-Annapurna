# Annapurna MVP

Status: authoritative active scope
Updated: 2026-10-28

## Goal

Deliver a food-only redistribution workflow in which a verified donor publishes one whole food listing, a verified requester claims it, an authenticated volunteer performs pickup quality control and delivery, and the requester confirms receipt.

## Core journey

1. A donor registers, signs in, completes the existing external OTP verification, and saves a location.
2. The donor publishes a food listing with expiry, pickup location, and an optional image.
3. A verified requester discovers nearby available food and atomically claims the whole listing.
4. An authenticated volunteer accepts the resulting delivery. Volunteers do not require additional OTP verification or manual approval in this MVP.
5. The volunteer reaches pickup and records a food quality check. Food QC is not account verification.
6. Passed food is collected and delivered while bounded browser GPS updates are persisted and shared only with authorized participants.
7. The volunteer records handover; the requester confirms receipt with an explicit action.
8. Dashboards and in-app notifications reflect the completed delivery.

## Roles and terminology

The canonical backend role values are `donor`, `requester`, `volunteer`, and `admin`. Existing `beneficiary` route and copy may remain temporarily as a compatibility surface, but new contracts and persisted role values use `requester`. Public signup must never offer `admin`. One account has exactly one MVP role.

## MVP rules

- One whole listing per claim; no partial quantity claims.
- At most one active claim per listing.
- At most one assigned volunteer per delivery.
- At most one active delivery per volunteer.
- Donor and requester verification is enforced server-side through the existing OTP proof interface.
- A user cannot change their own role or verification state.
- Pickup details and live tracking are visible only to authorized participants.
- Claim, volunteer acceptance, and delivery transitions are atomic and retry-safe.
- Tracking stops at terminal workflow states. Browser background or locked-phone tracking is explicitly not guaranteed.
- Notifications are in-app only for this release.

## Retained supporting scope

After the core journey works, retain and reconnect useful blog, event, FAQ, gallery, contact-message, and admin CMS features. Existing public content may remain, but food workflow navigation takes precedence.

## Excluded

Real payments, payouts, earnings or wallets, Aadhaar collection, tax receipts, NGO management, volunteer approval gates, replacement OTP delivery, and claims of reliable locked-phone tracking are excluded. Existing implementations or copy for these features are legacy and must not remain on the production path.

## MVP acceptance

- The full journey succeeds on a fresh reproducible development database.
- Competing claims and volunteer acceptances cannot create duplicates.
- Unauthorized role, pickup-detail, and tracking access fails.
- Expiry, QC rejection, cancellation, reconnect, retry, and session-expiry paths have defined behavior and tests.
- Code verification, user manual verification, deployment status, and production readiness are reported separately.

## Unresolved dependencies

- Secure configuration and live verification of the supplied Swift SMS OTP project key and Android gateway.
- Authorization and project identity of the configured Supabase MCP project.
- Dedicated Supabase project creation, if the configured project is not Annapurna.
- Current OpenRouteService account quota and key placement; this must be verified before Stage 4.
