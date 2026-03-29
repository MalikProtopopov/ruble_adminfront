import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_REFRESH_COOKIE } from "@/lib/config/auth-cookies";
import { getServerApiBase } from "@/lib/api/get-server-api-base";

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get(ADMIN_REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json(
      { error: { code: "NO_REFRESH", message: "No session" } },
      { status: 401 },
    );
  }

  const base = getServerApiBase();
  const res = await fetch(`${base}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
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
    const response = NextResponse.json(data, { status: res.status });
    response.cookies.delete(ADMIN_REFRESH_COOKIE);
    return response;
  }

  const payload = data as {
    access_token: string;
    refresh_token: string;
  };

  const response = NextResponse.json({ access_token: payload.access_token });
  response.cookies.set(ADMIN_REFRESH_COOKIE, payload.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
