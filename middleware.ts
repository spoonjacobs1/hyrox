import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/login";
  const authed = request.cookies.get("auth")?.value === "1";
  if (!authed && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (authed && isLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico).*)"] };
