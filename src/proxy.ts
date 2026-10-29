import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Fail closed if Supabase credentials are missing
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: any[]) {
        cookiesToSet.forEach(({ name, value }: any) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }: any) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isProtectedRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/admin");

  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/register");

  // 1. Unauthenticated users cannot access protected dashboards
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. Authenticated user route enforcement
  if (user && (isProtectedRoute || path === "/onboarding" || isAuthRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", user.id)
      .maybeSingle();

    // A. Admin route protection
    if (path.startsWith("/admin")) {
      if (!profile || profile.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = profile ? (
          profile.role === "donor" ? (profile.is_verified ? "/dashboard/donor" : "/onboarding") :
          profile.role === "requester" ? (profile.is_verified ? "/dashboard/beneficiary" : "/onboarding") :
          profile.role === "volunteer" ? "/dashboard/volunteer" : "/login"
        ) : "/onboarding";
        return NextResponse.redirect(url);
      }
    }

    // B. Dashboard route protection & verification enforcement
    if (path.startsWith("/dashboard")) {
      if (!profile) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }

      // Donor dashboard: requires role === 'donor' AND is_verified === true
      if (path.startsWith("/dashboard/donor")) {
        if (profile.role !== "donor") {
          const url = request.nextUrl.clone();
          url.pathname = profile.role === "requester" ? (profile.is_verified ? "/dashboard/beneficiary" : "/onboarding") :
            profile.role === "volunteer" ? "/dashboard/volunteer" : "/admin";
          return NextResponse.redirect(url);
        }
        if (!profile.is_verified) {
          const url = request.nextUrl.clone();
          url.pathname = "/onboarding";
          return NextResponse.redirect(url);
        }
      }

      // Requester dashboard: requires role === 'requester' AND is_verified === true
      if (path.startsWith("/dashboard/beneficiary")) {
        if (profile.role !== "requester") {
          const url = request.nextUrl.clone();
          url.pathname = profile.role === "donor" ? (profile.is_verified ? "/dashboard/donor" : "/onboarding") :
            profile.role === "volunteer" ? "/dashboard/volunteer" : "/admin";
          return NextResponse.redirect(url);
        }
        if (!profile.is_verified) {
          const url = request.nextUrl.clone();
          url.pathname = "/onboarding";
          return NextResponse.redirect(url);
        }
      }

      // Volunteer dashboard: requires role === 'volunteer' (no phone verification required)
      if (path.startsWith("/dashboard/volunteer") && profile.role !== "volunteer") {
        const url = request.nextUrl.clone();
        url.pathname = profile.role === "donor" ? (profile.is_verified ? "/dashboard/donor" : "/onboarding") :
          profile.role === "requester" ? (profile.is_verified ? "/dashboard/beneficiary" : "/onboarding") : "/admin";
        return NextResponse.redirect(url);
      }
    }

    // C. Onboarding route protection: allow incomplete or unverified profiles to stay on /onboarding
    if (path === "/onboarding" && profile) {
      if (profile.role === "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
      if (profile.role === "volunteer") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/volunteer";
        return NextResponse.redirect(url);
      }
      if (profile.role === "donor" && profile.is_verified) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/donor";
        return NextResponse.redirect(url);
      }
      if (profile.role === "requester" && profile.is_verified) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/beneficiary";
        return NextResponse.redirect(url);
      }
      // If donor or requester is NOT verified, DO NOT redirect; let them complete verification on /onboarding!
    }

    // D. Auth route redirect for already signed in users
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      if (!profile) {
        url.pathname = "/onboarding";
      } else if (profile.role === "admin") {
        url.pathname = "/admin";
      } else if (profile.role === "volunteer") {
        url.pathname = "/dashboard/volunteer";
      } else if (profile.role === "donor") {
        url.pathname = profile.is_verified ? "/dashboard/donor" : "/onboarding";
      } else if (profile.role === "requester") {
        url.pathname = profile.is_verified ? "/dashboard/beneficiary" : "/onboarding";
      }
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
