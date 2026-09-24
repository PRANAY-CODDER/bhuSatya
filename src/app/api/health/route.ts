import { db } from "@/db";
import { sql } from "drizzle-orm";
import { isLocalAuthMode } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isLocalAuthMode) return Response.json({ ok: true, mode: "local" });
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
