import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { canUseDashboard, ip } from "@/libs/access";
import { stats } from "@/libs/counters";
import { getConfig } from "@/libs/site-config";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const requestHeaders = await headers();

  if (!canUseDashboard(requestHeaders)) {
    notFound();
  }

  const [config, analytics] = await Promise.all([getConfig(), stats("day")]);

  return (
    <Dashboard
      initialConfig={config}
      initialStats={analytics}
      ipAddress={ip(requestHeaders) || "local"}
    />
  );
}
