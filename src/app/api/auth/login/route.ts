import { NextResponse } from "next/server";
import { ADMIN_REFRESH_COOKIE } from "@/lib/config/auth-cookies";
import { getServerApiBase } from "@/lib/api/get-server-api-base";

export async function POST(request: Request) {
  const body = await request.json();
  const base = getServerApiBase();
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json(
      { error: { code: "PARSE_ERROR", message: "Invalid JSON from API" } },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const payload = data as {
    access_token: string;
    refresh_token: string;
    admin: { id: string; email: string; name: string };
  };

  const response = NextResponse.json({
    access_token: payload.access_token,
    admin: payload.admin,
  });

  response.cookies.set(ADMIN_REFRESH_COOKIE, payload.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
