import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/lib/finance";
import { getCurrentMonthKey, isValidMonthKey } from "@/lib/months";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const params = await searchParams;
  const monthParam = Array.isArray(params.month) ? params.month[0] : params.month;
  const selectedMonth = isValidMonthKey(monthParam)
    ? monthParam
    : getCurrentMonthKey();
  const data = await getDashboardData(selectedMonth);

  return <Dashboard data={data} />;
}
