import { getAnalytics } from "@/lib/queries";
import { AnalyticsClient } from "@/components/analytics/analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalytics();
  return <AnalyticsClient data={data} />;
}
