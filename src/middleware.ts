import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
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
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protect specific dashboards and admin views
  const isProtectedRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/admin");

  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/register");

  if (isProtectedRoute && !isAuthRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Role-based protection for authenticated users
  if (user && (isProtectedRoute || path === "/onboarding")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", user.id)
      .maybeSingle();

    // 1. If trying to access admin, strictly require role === 'admin'
    if (path.startsWith("/admin")) {
      if (!profile || profile.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = profile ? (
          profile.role === "donor" ? "/dashboard/donor" :
          profile.role === "requester" ? "/dashboard/beneficiary" :
          profile.role === "volunteer" ? "/dashboard/volunteer" : "/login"
        ) : "/onboarding";
        return NextResponse.redirect(url);
      }
    }

    // 2. If trying to access dashboards, enforce role match
    if (path.startsWith("/dashboard")) {
      if (!profile) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }

      if (path.startsWith("/dashboard/donor") && profile.role !== "donor") {
        const url = request.nextUrl.clone();
        url.pathname = profile.role === "requester" ? "/dashboard/beneficiary" :
          profile.role === "volunteer" ? "/dashboard/volunteer" : "/admin";
        return NextResponse.redirect(url);
      }

      if (path.startsWith("/dashboard/beneficiary") && profile.role !== "requester") {
        const url = request.nextUrl.clone();
        url.pathname = profile.role === "donor" ? "/dashboard/donor" :
          profile.role === "volunteer" ? "/dashboard/volunteer" : "/admin";
        return NextResponse.redirect(url);
      }

      if (path.startsWith("/dashboard/volunteer") && profile.role !== "volunteer") {
        const url = request.nextUrl.clone();
        url.pathname = profile.role === "donor" ? "/dashboard/donor" :
          profile.role === "requester" ? "/dashboard/beneficiary" : "/admin";
        return NextResponse.redirect(url);
      }
    }

    // 3. If already onboarded, redirect from /onboarding to dashboard
    if (path === "/onboarding" && profile) {
      const url = request.nextUrl.clone();
      url.pathname = profile.role === "donor" ? "/dashboard/donor" :
        profile.role === "requester" ? "/dashboard/beneficiary" :
        profile.role === "volunteer" ? "/dashboard/volunteer" : "/admin";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any files with an extension (e.g. svg, png, jpg)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
