import { cookies } from "next/headers";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { eq, gt, and } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

export const SESSION_COOKIE = "bhulekh_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const isLocalAuthMode = process.env.BHULEKH_LOCAL_MODE === "true";

type LocalAccount = SafeUser & { passwordHash: string };
const localState = globalThis as typeof globalThis & {
  __bhulekhLocalAccounts?: Map<string, LocalAccount>;
  __bhulekhLocalSessions?: Map<string, { userId: string; expiresAt: number }>;
};

const localAccounts = localState.__bhulekhLocalAccounts ?? new Map<string, LocalAccount>();
const localSessions = localState.__bhulekhLocalSessions ?? new Map<string, { userId: string; expiresAt: number }>();
localState.__bhulekhLocalAccounts = localAccounts;
localState.__bhulekhLocalSessions = localSessions;

if (!localAccounts.size) {
  localAccounts.set("admin@bhulekh.gov.in", {
    id: "00000000-0000-4000-8000-000000000001",
    name: "District Admin",
    email: "admin@bhulekh.gov.in",
    role: "admin",
    color: "#10b981",
    passwordHash: hashPassword("admin123"),
  });
  localAccounts.set("officer@bhulekh.gov.in", {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Review Officer",
    email: "officer@bhulekh.gov.in",
    role: "officer",
    color: "#3b82f6",
    passwordHash: hashPassword("officer123"),
  });
}

/* ------------------------------ password utils ----------------------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/* ------------------------------ session utils ------------------------------ */

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  try {
    if (isLocalAuthMode) throw new Error("local auth mode");
    await db.insert(sessions).values({ token, userId, expiresAt });
  } catch {
    localSessions.set(token, { userId, expiresAt: expiresAt.getTime() });
  }
  return token;
}

export function findLocalUser(email: string, password: string): SafeUser | null {
  const user = localAccounts.get(email.toLowerCase());
  return user && verifyPassword(password, user.passwordHash) ? user : null;
}

export function createLocalUser(name: string, email: string, password: string, role: string): SafeUser {
  const normalizedEmail = email.toLowerCase();
  const user: LocalAccount = {
    id: randomUUID(),
    name,
    email: normalizedEmail,
    role,
    color: ["#10b981", "#ff9933", "#8b5cf6", "#3b82f6", "#f43f5e"][name.length % 5],
    passwordHash: hashPassword(password),
  };
  localAccounts.set(normalizedEmail, user);
  return user;
}

export function localUserExists(email: string) {
  return localAccounts.has(email.toLowerCase());
}

export function updateLocalPassword(userId: string, current: string, next: string) {
  const user = [...localAccounts.values()].find((account) => account.id === userId);
  if (!user || !verifyPassword(current, user.passwordHash)) return false;
  user.passwordHash = hashPassword(next);
  return true;
}

export async function setSessionCookie(token: string, expiresAt?: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt ?? new Date(Date.now() + SESSION_TTL_MS),
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      if (isLocalAuthMode) throw new Error("local auth mode");
      await db.delete(sessions).where(eq(sessions.token, token));
    } catch {
      localSessions.delete(token);
    }
  }
  jar.delete(SESSION_COOKIE);
}

export type SafeUser = Pick<User, "id" | "name" | "email" | "role" | "color">;

export async function getSessionUser(): Promise<SafeUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const localSession = localSessions.get(token);
  if (localSession) {
    if (localSession.expiresAt <= Date.now()) {
      localSessions.delete(token);
      return null;
    }
    return [...localAccounts.values()].find((account) => account.id === localSession.userId) ?? null;
  }
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        color: users.color,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
