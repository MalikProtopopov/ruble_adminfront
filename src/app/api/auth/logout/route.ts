import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_REFRESH_COOKIE } from "@/lib/config/auth-cookies";
import { getServerApiBase } from "@/lib/api/get-server-api-base";

export async function POST() {
  const jar = await cookies();
  const refresh = jar.get(ADMIN_REFRESH_COOKIE)?.value;

  if (refresh) {
    const base = getServerApiBase();
    try {
      await fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
    } catch {
      /* ignore network errors on logout */
    }
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(ADMIN_REFRESH_COOKIE);
  return response;
}
