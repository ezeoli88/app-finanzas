import { NextResponse, type NextRequest } from "next/server";
import {
  sanitizeRedirectPath,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/session-token";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isLoginRoute = pathname === "/login";

  if (session && isLoginRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!session && !isLoginRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", sanitizeRedirectPath(`${pathname}${search}`));

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
