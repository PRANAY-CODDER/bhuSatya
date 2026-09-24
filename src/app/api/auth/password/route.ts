import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser, hashPassword, isLocalAuthMode, updateLocalPassword, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { current, next } = await req.json().catch(() => ({}));
  if (!current || !next || String(next).length < 6) {
    return Response.json({ error: "Current password and a new 6+ char password are required." }, { status: 400 });
  }
  if (isLocalAuthMode) {
    if (!updateLocalPassword(user.id, String(current), String(next))) return Response.json({ error: "Current password is incorrect." }, { status: 401 });
    await logAudit({ actor: user.name, action: "Password changed", category: "system" });
    return Response.json({ ok: true });
  }
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !verifyPassword(String(current), row.passwordHash)) {
    return Response.json({ error: "Current password is incorrect." }, { status: 401 });
  }
  await db.update(users).set({ passwordHash: hashPassword(String(next)) }).where(eq(users.id, user.id));
  await logAudit({ actor: user.name, action: "Password changed", category: "system" });
  return Response.json({ ok: true });
}
