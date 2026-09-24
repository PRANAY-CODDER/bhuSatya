import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-constants";

const LOGIN_PATH = "/login";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === LOGIN_PATH) {
    if (!hasSessionCookie) return NextResponse.next();

    const redirectPath = request.nextUrl.searchParams.get("redirect");
    const destination = redirectPath?.startsWith("/") && !redirectPath.startsWith("//") ? redirectPath : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const redirectUrl = new URL(LOGIN_PATH, request.url);
  redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
  return hasSessionCookie ? NextResponse.next() : NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};