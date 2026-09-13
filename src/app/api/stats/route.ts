import { getSessionUser } from "@/lib/auth";
import { getAnalytics, getDashboardStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  if (url.searchParams.get("view") === "analytics") {
    return Response.json(await getAnalytics());
  }
  return Response.json(await getDashboardStats());
}
