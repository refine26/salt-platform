import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { reviewAccount, reviewCompany, reviewJob, moderateMedia, saveSetting } from "@/lib/actions";

type SP = Promise<{ tab?: string; q?: string }>;
const TABS = ["approvals", "jobs", "users", "media", "settings"];

function Decide({ action, id, approve = "Approve", reject = "Reject" }: { action: any; id: string; approve?: string; reject?: string }) {
  return (
    <div className="row">
      <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="approved" />
        <button className="btn primary sm">{approve}</button></form>
      <form action={action} className="row"><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="rejected" />
        <input name="note" placeholder="Reason (optional)" aria-label="Reason" /><button className="btn sm">{reject}</button></form>
    </div>
  );
}

export default async function Admin({ searchParams }: { searchParams: SP }) {
  await requireRole("admin");
  const sp = await searchParams;
  const tab = TABS.includes(sp.tab ?? "") ? sp.tab! : "approvals";
  const sb = await supabaseServer();
  const count = (t: string, f: (q: any) => any) => f(sb.from(t).select("*", { count: "exact", head: true }));

  const [pT, pC, pJ, fM, tot] = await Promise.all([
    count("accounts", (q) => q.eq("role", "talent").eq("status", "pending")),
    count("companies", (q) => q.eq("status", "pending")),
    count("jobs", (q) => q.eq("status", "pending_review")),
    count("media", (q) => q.eq("flagged", true).neq("status", "removed")),
    count("accounts", (q) => q),
  ]);
  const stats: [string, number | null][] = [
    ["Talent awaiting approval", pT.count], ["Clients awaiting verification", pC.count],
    ["Jobs awaiting review", pJ.count], ["Flagged media", fM.count], ["Total accounts", tot.count],
  ];

  return (
    <section className="dash">
      <p className="eyebrow">Admin</p><h1>Platform console</h1>
      <div className="stats">{stats.map(([k, v]) => <div key={k}><span className="num">{(v ?? 0).toLocaleString()}</span><span className="hint">{k}</span></div>)}</div>
      <nav className="tabs">{TABS.map((t) => <Link key={t} href={`?tab=${t}`} className={t === tab ? "on" : ""}>{t}</Link>)}</nav>

      {tab === "approvals" && <Approvals sb={sb} />}
      {tab === "jobs" && <JobsQueue sb={sb} />}
      {tab === "users" && <Users sb={sb} q={sp.q} />}
      {tab === "media" && <Media sb={sb} />}
      {tab === "settings" && <Settings sb={sb} />}
    </section>
  );
}

async function Approvals({ sb }: { sb: any }) {
  const [{ data: talent }, { data: cos }] = await Promise.all([
    sb.from("accounts").select("id, full_name, email, created_at, talent_profiles(slug, sport, level, school)").eq("role", "talent").eq("status", "pending").order("created_at").limit(50),
    sb.from("companies").select("id, name, website, created_at, company_members(accounts(full_name, email))").eq("status", "pending").order("created_at").limit(50),
  ]);
  return <>
    <h2>Talent</h2>
    {talent?.length ? <table className="tbl"><thead><tr><th>Name</th><th>Sport</th><th>Joined</th><th>Decision</th></tr></thead>
      <tbody>{talent.map((t: any) => <tr key={t.id}>
        <td><Link href={`/talent/${t.talent_profiles?.slug}`}>{t.full_name}</Link><br /><span className="hint">{t.email}</span></td>
        <td>{[t.talent_profiles?.sport, t.talent_profiles?.level, t.talent_profiles?.school].filter(Boolean).join(" · ") || "—"}</td>
        <td>{new Date(t.created_at).toLocaleDateString()}</td><td><Decide action={reviewAccount} id={t.id} /></td></tr>)}</tbody>
    </table> : <p className="hint">No talent waiting.</p>}
    <h2>Clients</h2>
    {cos?.length ? <table className="tbl"><thead><tr><th>Company</th><th>Contact</th><th>Decision</th></tr></thead>
      <tbody>{cos.map((c: any) => <tr key={c.id}>
        <td>{c.name}<br /><span className="hint">{c.website}</span></td>
        <td>{c.company_members?.map((m: any) => m.accounts?.email).join(", ")}</td>
        <td><Decide action={reviewCompany} id={c.id} approve="Verify" /></td></tr>)}</tbody>
    </table> : <p className="hint">No clients waiting.</p>}
  </>;
}

async function JobsQueue({ sb }: { sb: any }) {
  const { data } = await sb.from("jobs").select("id, title, gig_type, description, rate_usd, city, state, usage_terms, companies(name)").eq("status", "pending_review").order("created_at").limit(50);
  return <>
    <h2>Jobs awaiting review</h2>
    {!data?.length && <p className="hint">No jobs waiting.</p>}
    {data?.map((j: any) => <article key={j.id} className="review">
      <h3>{j.title} <span className="pill">{j.gig_type}</span></h3>
      <p className="hint">{j.companies?.name} · {[j.city, j.state].filter(Boolean).join(", ")} · {j.rate_usd ? `$${j.rate_usd}` : "rate TBD"}</p>
      <p style={{ whiteSpace: "pre-wrap" }}>{j.description}</p>
      {j.usage_terms && <p className="hint">Usage: {j.usage_terms}</p>}
      <form action={reviewJob} className="row"><input type="hidden" name="id" value={j.id} /><input type="hidden" name="status" value="open" />
        <button className="btn primary sm">Approve &amp; publish</button></form>
      <form action={reviewJob} className="row"><input type="hidden" name="id" value={j.id} /><input type="hidden" name="status" value="rejected" />
        <input name="note" placeholder="Reason sent to client" aria-label="Reason" /><button className="btn sm">Reject</button></form>
    </article>)}
  </>;
}

async function Users({ sb, q }: { sb: any; q?: string }) {
  let query = sb.from("accounts").select("id, full_name, email, role, status, created_at").order("created_at", { ascending: false }).limit(50);
  if (q) query = query.or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,full_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  return <>
    <form className="filters"><input type="hidden" name="tab" value="users" /><input id="uq" name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" /><button className="btn">Search</button></form>
    <table className="tbl"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{data?.map((u: any) => <tr key={u.id}><td>{u.full_name}<br /><span className="hint">{u.email}</span></td><td>{u.role}</td>
        <td><span className={`pill ${u.status}`}>{u.status}</span></td>
        <td>{u.role !== "admin" && <form action={reviewAccount}><input type="hidden" name="id" value={u.id} />
          <input type="hidden" name="status" value={u.status === "suspended" ? "approved" : "suspended"} />
          <button className="btn sm">{u.status === "suspended" ? "Reinstate" : "Suspend"}</button></form>}</td></tr>)}</tbody></table>
  </>;
}

async function Media({ sb }: { sb: any }) {
  const { data } = await sb.from("media").select("id, kind, title, storage_path, mux_playback_id, flagged, created_at, talent_profiles(display_name, slug)")
    .neq("status", "removed").eq("status", "ready").order("flagged", { ascending: false }).order("created_at", { ascending: false }).limit(48);
  const img = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`;
  return <>
    <h2>Recent uploads</h2><p className="hint">Flagged items appear first.</p>
    <div className="photos">{data?.map((m: any) => <figure key={m.id} className={m.flagged ? "flagged" : ""}>
      {m.kind === "photo" ? <img src={img + m.storage_path} alt="" loading="lazy" /> :
        <img src={`https://image.mux.com/${m.mux_playback_id}/thumbnail.jpg?width=400`} alt="" loading="lazy" />}
      <figcaption><Link href={`/talent/${m.talent_profiles?.slug}`}>{m.talent_profiles?.display_name}</Link>
        <div className="row">
          {m.flagged && <form action={moderateMedia}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="action" value="keep" /><button className="link-btn">Keep</button></form>}
          <form action={moderateMedia}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="action" value="remove" /><button className="link-btn">Remove</button></form>
        </div></figcaption></figure>)}</div>
  </>;
}

async function Settings({ sb }: { sb: any }) {
  const { data } = await sb.from("settings").select("*").order("key");
  return <>
    <h2>System configuration</h2>
    <table className="tbl"><tbody>{data?.map((s: any) => <tr key={s.key}><td className="mono">{s.key}</td><td>
      <form action={saveSetting} className="row"><input type="hidden" name="key" value={s.key} />
        <input name="value" defaultValue={JSON.stringify(s.value)} aria-label={s.key} /><button className="btn sm">Save</button></form></td></tr>)}</tbody></table>
  </>;
}
