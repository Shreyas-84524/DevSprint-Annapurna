const AUTHENTICATED_DESTINATIONS = new Set([
  "/onboarding",
  "/dashboard/donor",
  "/dashboard/beneficiary",
  "/dashboard/volunteer",
  "/admin",
]);

/**
 * Accept only application-owned post-authentication destinations.
 * The server normally supplies this value, but browser navigation must still
 * fail closed if a malformed or external URL is ever returned.
 */
export function resolvePostAuthDestination(destination: unknown): string {
  return typeof destination === "string" && AUTHENTICATED_DESTINATIONS.has(destination)
    ? destination
    : "/onboarding";
}
