import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "./schema";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, findLocalUser, isLocalAuthMode, verifyPassword, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = z.credentials.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Enter a valid email and password (6+ chars)." }, { status: 400 });
    }
    const { email, password } = parsed.data;
    let user: { id: string; name: string; email: string; role: string; color: string } | undefined;
    if (!isLocalAuthMode) {
      try {
        const [dbUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
        if (dbUser && verifyPassword(password, dbUser.passwordHash)) user = dbUser;
      } catch {
        user = findLocalUser(email, password) ?? undefined;
      }
    }
    if (!user) user = findLocalUser(email, password) ?? undefined;
    if (!user) {
      return Response.json({ error: "Invalid credentials. Try the demo accounts below." }, { status: 401 });
    }
    const token = await createSession(user.id);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const response = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, color: user.color } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
    });
    return response;
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
