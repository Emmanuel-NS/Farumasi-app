import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Hospital portal is excluded from the MVP launch unless explicitly enabled. */
export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_MVP_PORTAL_ENABLED === "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/mvp-disabled" ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/mvp-disabled", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
