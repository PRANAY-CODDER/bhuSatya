import { getSessionUser } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  return <SettingsClient user={user!} />;
}
