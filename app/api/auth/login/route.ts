import { COOKIE_NAME, createSessionToken, isBoardAuthConfigured } from "@/lib/board-session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isBoardAuthConfigured()) {
    return NextResponse.json(
      { error: "Password protection is not configured (set BOARD_PASSWORD)." },
      { status: 501 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  if (password !== process.env.BOARD_PASSWORD) {
    return NextResponse.json({ error: "That password is not quite right." }, { status: 401 });
  }

  const token = await createSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Could not create session." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
