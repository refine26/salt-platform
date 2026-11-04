import { redirect } from "next/navigation";
import { getAccount, dashboardFor } from "@/lib/auth";
export default async function Dashboard() {
  const acc = await getAccount();
  redirect(acc ? dashboardFor(acc.role) : "/login");
}
