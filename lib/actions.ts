"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase";
import { getAccount, requireRole, slugify, dashboardFor } from "@/lib/auth";

const str = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v || null; };
const num = (f: FormData, k: string) => { const v = Number(f.get(k)); return Number.isFinite(v) && f.get(k) !== "" ? v : null; };
const list = (f: FormData, k: string) => String(f.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);

// ───────── Auth ─────────
export async function register(_: unknown, f: FormData) {
  const role = f.get("role") === "client" ? "client" : "talent";
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const password = String(f.get("password") ?? "");
  const full_name = String(f.get("full_name") ?? "").trim();
  if (!email || password.length < 8 || !full_name) return { error: "Enter your name, email and a password of 8+ characters." };

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });
  if (error || !data.user) return { error: error?.message ?? "Sign-up failed." };

  const admin = supabaseAdmin();
  await admin.from("accounts").insert({ id: data.user.id, role, email, full_name, status: "pending" });

  if (role === "client") {
    const company = String(f.get("company") ?? "").trim() || `${full_name}'s company`;
    const { data: co } = await admin.from("companies").insert({ name: company, website: str(f, "website") }).select("id").single();
    if (co) await admin.from("company_members").insert({ company_id: co.id, account_id: data.user.id, member_role: "owner" });
  } else {
    await admin.from("talent_profiles").insert({
      id: data.user.id, display_name: full_name, slug: `${slugify(full_name)}-${data.user.id.slice(0, 6)}`,
    });
  }
  return { ok: "Account created. Confirm your email, then sign in. An admin will review your account before it goes live." };
}

export async function login(_: unknown, f: FormData) {
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({
    email: String(f.get("email") ?? ""), password: String(f.get("password") ?? ""),
  });
  if (error) return { error: "Email or password is incorrect." };
  const acc = await getAccount();
  redirect(acc ? dashboardFor(acc.role) : "/");
}

export async function logout() {
  await (await supabaseServer()).auth.signOut();
  redirect("/");
}

// ───────── Talent ─────────
export async function saveTalentProfile(f: FormData) {
  const acc = await requireRole("talent");
  const sb = await supabaseServer();
  const ncaa = f.get("is_ncaa_active") === "on";
  const { error } = await sb.from("talent_profiles").update({
    display_name: str(f, "display_name") ?? acc.full_name,
    headline: str(f, "headline"), bio: str(f, "bio"),
    city: str(f, "city"), state: str(f, "state")?.toUpperCase(), zip: str(f, "zip"),
    travel_radius_mi: num(f, "travel_radius_mi"),
    sport: str(f, "sport"), position: str(f, "position"), level: str(f, "level"), school: str(f, "school"),
    birth_year: num(f, "birth_year"), gender: str(f, "gender"),
    ethnicity: f.getAll("ethnicity").map(String),
    height_in: (num(f, "height_ft") ?? 0) * 12 + (num(f, "height_inch") ?? 0) || null,
    weight_lb: num(f, "weight_lb"), shoe_size: num(f, "shoe_size"),
    hair_color: str(f, "hair_color"), hair_length: str(f, "hair_length"), eye_color: str(f, "eye_color"),
    sizes: { shirt: str(f, "shirt"), pant: str(f, "pant") },
    gig_types: f.getAll("gig_types").map(String), skills: list(f, "skills"),
    day_rate: num(f, "day_rate"), has_agent: f.get("has_agent") === "on",
    is_ncaa_active: ncaa,
    ncaa_school_compliance_email: ncaa ? str(f, "ncaa_email") : null,
    ncaa_ack_at: ncaa && f.get("ncaa_ack") === "on" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", acc.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/talent");
}

export async function addPhoto(path: string) {
  const acc = await requireRole("talent");
  if (!path.startsWith(`${acc.id}/`)) throw new Error("Invalid path");
  const db = supabaseAdmin();
  await db.from("media").insert({ owner_id: acc.id, kind: "photo", status: "ready", storage_path: path });
  const { data: p } = await db.from("talent_profiles").select("headshot_path").eq("id", acc.id).single();
  if (!p?.headshot_path) await db.from("talent_profiles").update({ headshot_path: path }).eq("id", acc.id);
  revalidatePath("/dashboard/talent");
}

export async function setHeadshot(f: FormData) {
  const acc = await requireRole("talent");
  await (await supabaseServer()).from("talent_profiles").update({ headshot_path: str(f, "path") }).eq("id", acc.id);
  revalidatePath("/dashboard/talent");
}

export async function deleteMedia(f: FormData) {
  await requireRole("talent");
  await (await supabaseServer()).from("media").delete().eq("id", String(f.get("id")));
  revalidatePath("/dashboard/talent");
}

export async function applyToJob(f: FormData) {
  const acc = await requireRole("talent");
  const jobId = String(f.get("job_id"));
  const { error } = await (await supabaseServer()).from("applications").insert({
    job_id: jobId, talent_id: acc.id, cover_note: str(f, "cover_note"), self_tape_id: str(f, "self_tape_id"),
  });
  if (error) redirect(`/jobs/${jobId}?error=${encodeURIComponent(
    error.code === "23505" ? "You already submitted for this job." : "Your account must be approved before you can submit.")}`);
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}?submitted=1`);
}

export async function withdrawApplication(f: FormData) {
  await requireRole("talent");
  await (await supabaseServer()).from("applications").update({ status: "withdrawn" }).eq("id", String(f.get("id")));
  revalidatePath("/dashboard/talent");
}

// ───────── Clients ─────────
async function myCompanyId(accId: string) {
  const { data } = await (await supabaseServer()).from("company_members").select("company_id").eq("account_id", accId).limit(1).single();
  return data?.company_id as string | undefined;
}

export async function saveCompany(f: FormData) {
  const acc = await requireRole("client");
  const id = await myCompanyId(acc.id);
  await (await supabaseServer()).from("companies").update({
    name: str(f, "name"), website: str(f, "website"), industry: str(f, "industry"),
  }).eq("id", id);
  revalidatePath("/dashboard/client");
}

export async function addDivision(f: FormData) {
  const acc = await requireRole("client");
  const name = str(f, "division");
  if (name) await (await supabaseServer()).from("divisions").insert({ company_id: await myCompanyId(acc.id), name });
  revalidatePath("/dashboard/client");
}

export async function inviteTeammate(f: FormData) {
  const acc = await requireRole("client");
  const email = str(f, "email")?.toLowerCase();
  if (!email) return;
  const admin = supabaseAdmin();
  const { data: inv, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });
  if (error || !inv.user) throw new Error(error?.message ?? "Invite failed");
  await admin.from("accounts").upsert({ id: inv.user.id, role: "client", email, full_name: str(f, "name") ?? email, status: "approved" });
  await admin.from("company_members").upsert({
    company_id: await myCompanyId(acc.id), account_id: inv.user.id, division_id: str(f, "division_id"), member_role: "member",
  });
  revalidatePath("/dashboard/client");
}

export async function createJob(f: FormData) {
  const acc = await requireRole("client");
  const company_id = await myCompanyId(acc.id);
  const { data, error } = await (await supabaseServer()).from("jobs").insert({
    company_id, created_by: acc.id, division_id: str(f, "division_id"),
    title: str(f, "title"), description: str(f, "description"),
    gig_type: str(f, "gig_type"), sports: list(f, "sports"),
    city: str(f, "city"), state: str(f, "state")?.toUpperCase(),
    shoot_start: str(f, "shoot_start"), shoot_end: str(f, "shoot_end"),
    rate_usd: num(f, "rate_usd"), usage_terms: str(f, "usage_terms"),
    openings: num(f, "openings") ?? 1, ncaa_eligible: f.get("ncaa_eligible") === "on",
    status: "pending_review",
  }).select("id").single();
  if (error) redirect(`/dashboard/client/jobs/new?error=${encodeURIComponent(
    "Your company must be verified by SALT before you can post jobs.")}`);
  redirect(`/dashboard/client/jobs/${data!.id}`);
}

export async function setApplicationStatus(f: FormData) {
  await requireRole("client");
  const id = String(f.get("id"));
  await (await supabaseServer()).from("applications").update({ status: String(f.get("status")) }).eq("id", id);
  revalidatePath(`/dashboard/client/jobs/${f.get("job_id")}`);
}

/** Book a talent: creates the booking and a contract both sides can view and sign. */
export async function bookTalent(f: FormData) {
  const acc = await requireRole("client");
  const sb = await supabaseServer();
  const appId = String(f.get("id"));
  const { data: app } = await sb.from("applications")
    .select("id, talent_id, job:jobs(id, title, company_id, rate_usd, shoot_start, city, state, usage_terms, companies(name)), talent:talent_profiles(display_name, is_ncaa_active)")
    .eq("id", appId).single();
  if (!app) throw new Error("Application not found");
  const job: any = app.job; const talent: any = app.talent;

  await sb.from("applications").update({ status: "booked" }).eq("id", appId);
  const { data: bk, error } = await sb.from("bookings").insert({
    application_id: appId, job_id: job.id, talent_id: app.talent_id, company_id: job.company_id,
    rate_usd: num(f, "rate_usd") ?? job.rate_usd, shoot_date: str(f, "shoot_date") ?? job.shoot_start,
    call_time: str(f, "call_time"), location: str(f, "location") ?? [job.city, job.state].filter(Boolean).join(", "),
  }).select("*").single();
  if (error || !bk) throw new Error(error?.message ?? "Booking failed");

  await sb.from("contracts").insert({
    booking_id: bk.id,
    title: `Talent Agreement: ${job.title}`,
    body: contractText({
      company: job.companies?.name, talent: talent.display_name, job: job.title,
      date: bk.shoot_date, call: bk.call_time, location: bk.location, rate: bk.rate_usd,
      usage: job.usage_terms, ncaa: talent.is_ncaa_active, signer: acc.full_name,
    }),
  });
  revalidatePath(`/dashboard/client/jobs/${job.id}`);
}

function contractText(d: Record<string, any>) {
  return `TALENT SERVICES AGREEMENT

Client: ${d.company}
Talent: ${d.talent}
Project: ${d.job}
Shoot date: ${d.date ?? "To be confirmed"}${d.call ? `   Call time: ${d.call}` : ""}
Location: ${d.location ?? "To be confirmed"}
Fee: $${(d.rate ?? 0).toLocaleString()} USD, paid within 30 days of the shoot.

1. Services. Talent will appear in the project above and follow reasonable direction from Client's production team.
2. Usage. ${d.usage ?? "Client may use the recorded material for the project's campaign for 12 months from first use, in the United States, across digital and print media."}
3. Release. Talent grants Client the right to use Talent's name, image and likeness solely as described in Section 2.
4. Independent contractor. Talent is not an employee of Client or SALT and is responsible for their own taxes.
5. Cancellation. If Client cancels within 48 hours of the shoot, Client pays 50% of the fee.
${d.ncaa ? "6. NCAA / NIL. Talent is a current college athlete. Talent will disclose this agreement to their school's compliance office as required. No payment is contingent on athletic performance or enrollment.\n" : ""}
This agreement is facilitated by SALT (Sports and Active Lifestyle Talent). Signed electronically by both parties.`;
}

export async function signContract(f: FormData) {
  const acc = await getAccount();
  if (!acc) redirect("/login");
  const sig = str(f, "signature");
  if (!sig) return;
  const now = new Date().toISOString();
  const patch = acc.role === "talent"
    ? { talent_signature: sig, talent_signed_at: now }
    : { client_signature: sig, client_signed_at: now };
  await (await supabaseServer()).from("contracts").update(patch).eq("id", String(f.get("id")));
  revalidatePath(`/contracts/${f.get("id")}`);
}

// ───────── Admin ─────────
async function audit(target: string, action: string, note?: string | null) {
  const acc = await requireRole("admin");
  await (await supabaseServer()).from("admin_actions").insert({ admin_id: acc.id, target, action, note });
}

export async function reviewAccount(f: FormData) {
  await requireRole("admin");
  const id = String(f.get("id")), status = String(f.get("status"));
  await (await supabaseServer()).from("accounts").update({ status }).eq("id", id);
  await audit(`account:${id}`, status, str(f, "note"));
  revalidatePath("/admin");
}

export async function reviewCompany(f: FormData) {
  await requireRole("admin");
  const id = String(f.get("id")), status = String(f.get("status"));
  const sb = await supabaseServer();
  await sb.from("companies").update({ status, verified_at: status === "approved" ? new Date().toISOString() : null }).eq("id", id);
  if (status === "approved") {
    const { data: m } = await sb.from("company_members").select("account_id").eq("company_id", id);
    if (m?.length) await sb.from("accounts").update({ status: "approved" }).in("id", m.map((x) => x.account_id));
  }
  await audit(`company:${id}`, status, str(f, "note"));
  revalidatePath("/admin");
}

export async function reviewJob(f: FormData) {
  const acc = await requireRole("admin");
  const id = String(f.get("id")), status = String(f.get("status"));
  await (await supabaseServer()).from("jobs").update({ status, reviewed_by: acc.id, review_note: str(f, "note") }).eq("id", id);
  await audit(`job:${id}`, status, str(f, "note"));
  revalidatePath("/admin");
}

export async function moderateMedia(f: FormData) {
  await requireRole("admin");
  const id = String(f.get("id")), action = String(f.get("action"));
  await (await supabaseServer()).from("media")
    .update(action === "remove" ? { status: "removed", flagged: true } : { flagged: false }).eq("id", id);
  await audit(`media:${id}`, action);
  revalidatePath("/admin");
}

export async function saveSetting(f: FormData) {
  await requireRole("admin");
  const key = String(f.get("key"));
  await (await supabaseServer()).from("settings").update({ value: JSON.parse(String(f.get("value"))) }).eq("key", key);
  await audit(`setting:${key}`, "update", String(f.get("value")));
  revalidatePath("/admin");
}
