import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface RouteProfile {
  role: string;
  is_verified?: boolean;
}

export function getProtectedRouteRedirect(
  path: string,
  profile: RouteProfile | null
): string | null;
export function getProtectedRouteRedirect(
  pathname: string,
  user: any,
  profile: RouteProfile | null,
  isConfigured?: boolean
): string | null;
export function getProtectedRouteRedirect(
  path: string,
  arg2: any,
  arg3?: any,
  arg4?: any
): string | null {
  let profile: RouteProfile | null = null;
  if (arg3 !== undefined || typeof arg4 === 'boolean') {
    profile = arg3 ?? null;
  } else {
    profile = arg2 ?? null;
  }

  if (!profile) return '/onboarding';

  const homeRoute = profile.role === 'donor'
    ? '/dashboard/donor'
    : profile.role === 'requester'
      ? '/dashboard/beneficiary'
      : profile.role === 'volunteer'
        ? '/dashboard/volunteer'
        : '/admin';

  if (path.startsWith('/admin')) {
    return profile.role === 'admin' ? null : homeRoute;
  }
  if (path.startsWith('/dashboard/donor')) {
    return profile.role === 'donor' ? null : homeRoute;
  }
  if (path.startsWith('/dashboard/beneficiary')) {
    return profile.role === 'requester' ? null : homeRoute;
  }
  if (path.startsWith('/dashboard/volunteer')) {
    return profile.role === 'volunteer' ? null : homeRoute;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const path = request.nextUrl.pathname;
  const isProtectedRoute =
    path.startsWith('/dashboard') ||
    path.startsWith('/admin');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedRoute) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_CONFIGURATION_UNAVAILABLE',
            message: 'Authentication is temporarily unavailable.',
          },
        },
        { status: 503 }
      );
    }
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

  const isAuthRoute =
    path.startsWith('/login') ||
    path.startsWith('/register');

  // 1. Unauthenticated users cannot access protected dashboards
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Authenticated user route enforcement
  if (user && (isProtectedRoute || path === '/onboarding' || isAuthRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (isProtectedRoute) {
      const redirectPath = getProtectedRouteRedirect(path, profile);
      if (redirectPath) {
        const url = request.nextUrl.clone();
        url.pathname = redirectPath;
        return NextResponse.redirect(url);
      }
    }

    // Onboarding route protection: profiles with a canonical role go to that role's dashboard.
    if (path === '/onboarding' && profile) {
      if (profile.role === 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
      if (profile.role === 'volunteer') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/volunteer';
        return NextResponse.redirect(url);
      }
      if (profile.role === 'donor') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/donor';
        return NextResponse.redirect(url);
      }
      if (profile.role === 'requester') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/beneficiary';
        return NextResponse.redirect(url);
      }
    }

    // Auth route redirect for already signed in users
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      if (!profile) {
        url.pathname = '/onboarding';
      } else if (profile.role === 'admin') {
        url.pathname = '/admin';
      } else if (profile.role === 'volunteer') {
        url.pathname = '/dashboard/volunteer';
      } else if (profile.role === 'donor') {
        url.pathname = '/dashboard/donor';
      } else if (profile.role === 'requester') {
        url.pathname = '/dashboard/beneficiary';
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
