import { type NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  isBoardAuthConfigured,
  verifySessionToken,
} from "@/lib/board-session";

function safeInternalPath(from: string | null): string {
  if (!from || !from.startsWith("/") || from.startsWith("//")) return "/";
  return from;
}

export async function middleware(request: NextRequest) {
  if (!isBoardAuthConfigured()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authed = await verifySessionToken(token);

  if (pathname.startsWith("/login")) {
    if (authed) {
      const from = request.nextUrl.searchParams.get("from");
      const dest = safeInternalPath(from);
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (authed) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set(
    "from",
    pathname === "/" ? "/" : pathname,
  );
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|ico|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
