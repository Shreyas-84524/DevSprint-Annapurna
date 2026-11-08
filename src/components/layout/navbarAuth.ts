const NAVBAR_DASHBOARD_DESTINATIONS = new Set([
  "/onboarding",
  "/dashboard/donor",
  "/dashboard/beneficiary",
  "/dashboard/volunteer",
  "/admin",
]);

export type NavbarSession =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; dashboardRoute: string };

export function resolveNavbarSession(
  responseOk: boolean,
  payload: unknown
): NavbarSession {
  if (!responseOk || !payload || typeof payload !== "object") {
    return { status: "signed_out" };
  }

  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return { status: "signed_out" };
  }

  const dashboardRoute = (data as { dashboardRoute?: unknown }).dashboardRoute;
  return typeof dashboardRoute === "string" &&
    NAVBAR_DASHBOARD_DESTINATIONS.has(dashboardRoute)
    ? { status: "signed_in", dashboardRoute }
    : { status: "signed_out" };
}
