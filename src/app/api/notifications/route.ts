import { isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";
import { isLocalAuthMode } from "@/lib/auth";
import { localData } from "@/lib/local-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ rows: await getNotifications() });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (isLocalAuthMode) {
    if (body.all) localData.notifications.forEach((n) => { n.readAt = new Date(); });
    else if (body.id) {
      const notification = localData.notifications.find((n) => n.id === String(body.id));
      if (notification) notification.readAt = new Date();
    }
    return Response.json({ rows: await getNotifications() });
  }
  if (body.all) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(isNull(notifications.readAt));
  } else if (body.id) {
    await db.execute(sql`update notifications set read_at = now() where id = ${String(body.id)} and read_at is null`);
  }
  return Response.json({ rows: await getNotifications() });
}
