import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";

export type Role = "talent" | "client" | "admin";
export type Account = { id: string; role: Role; email: string; full_name: string; status: string };

/** Signed-in account or null. */
export async function getAccount(): Promise<Account | null> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("accounts").select("*").eq("id", user.id).maybeSingle();
  return data as Account | null;
}

/** Protect a route by role. Redirects to login or the right dashboard. */
export async function requireRole(role: Role): Promise<Account> {
  const acc = await getAccount();
  if (!acc) redirect("/login");
  if (acc.role !== role) redirect(dashboardFor(acc.role));
  return acc;
}

export const dashboardFor = (r: Role) =>
  r === "admin" ? "/admin" : r === "client" ? "/dashboard/client" : "/dashboard/talent";

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

export const fmtHeight = (inches?: number | null) =>
  inches ? `${Math.floor(inches / 12)}'${inches % 12}"` : "—";

export const OPTIONS = {
  gig: ["print", "commercial", "social", "appearance"],
  ethnicity: ["Asian", "Black / African American", "Hispanic / Latino", "Middle Eastern / North African",
    "Native American / Alaska Native", "Native Hawaiian / Pacific Islander", "South Asian", "White", "Multiracial", "Other"],
  gender: ["Female", "Male", "Non-binary"],
  hairColor: ["Black", "Brown", "Blonde", "Red", "Gray", "Other"],
  hairLength: ["bald", "buzz", "short", "medium", "long"],
  eyeColor: ["Brown", "Blue", "Green", "Hazel", "Gray", "Other"],
  level: ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "JUCO", "Professional", "Olympic", "Club / Amateur"],
};
