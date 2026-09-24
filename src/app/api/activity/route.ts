import { getSessionUser } from "@/lib/auth";
import { getAuditTrail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const rows = await getAuditTrail(
    p.get("limit") ? Number(p.get("limit")) : 120,
    p.get("category") || undefined,
    p.get("q") || undefined,
  );
  return Response.json({ rows });
}
