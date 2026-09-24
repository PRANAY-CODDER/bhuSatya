import { queryRecords } from "@/lib/queries";
import { ValidationQueueClient } from "@/components/validation/validation-queue-client";

export const dynamic = "force-dynamic";

export default async function ValidationPage() {
  const result = await queryRecords({ status: ["pending", "processing", "review"], pageSize: 100, sort: "confidence", order: "asc" });
  return <ValidationQueueClient records={result.rows} total={result.total} />;
}
