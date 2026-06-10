import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** MVP routes — everything else redirects to dashboard */
const ALLOWED_PREFIXES = [
  "/dashboard",
  "/users",
  "/pharmacies",
  "/orders",
  "/prescriptions",
  "/finance",
  "/audit",
  "/settings",
  "/login",
  "/forgot-password",
  "/reset-password",
];

/** Old URLs → canonical MVP paths */
const ALIAS_REDIRECTS: Record<string, string> = {
  "/revenue": "/finance/revenue",
  "/withdrawals": "/finance/withdrawals",
  "/suppliers": "/pharmacies",
  "/riders": "/users/riders",
  "/pharmacists": "/users/pharmacists",
  "/users": "/users/patients",
};

function isAllowed(pathname: string) {
  if (pathname === "/") return true;
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || /\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next();
  }

  const alias = ALIAS_REDIRECTS[pathname];
  if (alias) {
    return NextResponse.redirect(new URL(alias, request.url));
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) {
    return NextResponse.next();
  }

  if (!isAllowed(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
