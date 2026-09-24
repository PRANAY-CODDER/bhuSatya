import { getDashboardStats } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, user] = await Promise.all([getDashboardStats(), getSessionUser()]);
  return <DashboardClient stats={stats} firstName={(user?.name ?? "Officer").split(" ")[0]} />;
}
