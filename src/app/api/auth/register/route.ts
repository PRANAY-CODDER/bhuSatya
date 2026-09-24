import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createLocalUser, createSession, hashPassword, isLocalAuthMode, localUserExists } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";
import { z } from "@/app/api/auth/login/schema";
import { logAudit } from "@/lib/queries";

export const dynamic = "force-dynamic";

const COLORS = ["#10b981", "#ff9933", "#8b5cf6", "#3b82f6", "#f43f5e"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = z.register.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Name, valid email and 6+ char password required." }, { status: 400 });
    }
    const { name, email, password, role } = parsed.data;
    let user: { id: string; name: string; email: string; role: string; color: string };
    try {
      if (isLocalAuthMode) throw new Error("local auth mode");
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      if (existing.length) return Response.json({ error: "An account with this email already exists." }, { status: 409 });
      [user] = await db.insert(users).values({ name, email: email.toLowerCase(), passwordHash: hashPassword(password), role: role ?? "officer", color: COLORS[name.length % COLORS.length] }).returning();
      await logAudit({ actor: name, action: "Officer account created", category: "system", details: `Role: ${user.role}` });
    } catch {
      if (localUserExists(email)) return Response.json({ error: "An account with this email already exists." }, { status: 409 });
      user = createLocalUser(name, email, password, role ?? "officer");
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
