import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { saveCompany, addDivision, inviteTeammate } from "@/lib/actions";

export default async function ClientDashboard() {
  const acc = await requireRole("client");
  const sb = await supabaseServer();
  const { data: mem } = await sb.from("company_members").select("company_id, member_role").eq("account_id", acc.id).single();
  const cid = mem?.company_id;
  const [{ data: co }, { data: divs }, { data: team }, { data: jobs }, { data: bookings }] = await Promise.all([
    sb.from("companies").select("*").eq("id", cid).single(),
    sb.from("divisions").select("*").eq("company_id", cid).order("name"),
    sb.from("company_members").select("member_role, accounts(full_name, email), divisions(name)").eq("company_id", cid),
    sb.from("jobs").select("id, title, status, created_at, applications(count)").eq("company_id", cid).order("created_at", { ascending: false }),
    sb.from("bookings").select("id, shoot_date, rate_usd, talent_profiles(display_name), jobs(title), contracts(id, client_signed_at)").eq("company_id", cid).order("shoot_date"),
  ]);
  const owner = mem?.member_role !== "member";

  return (
    <section className="dash">
      <div className="dash-head">
        <div><p className="eyebrow">Client dashboard</p><h1>{co?.name}</h1>
          <span className={`pill ${co?.status}`}>{co?.status === "approved" ? "Verified client" : `Verification ${co?.status}`}</span></div>
        <div className="row"><Link className="btn" href="/talent">Search talent</Link>
          <Link className="btn primary" href="/dashboard/client/jobs/new">Post a job</Link></div>
      </div>

      <h2>Jobs</h2>
      {jobs?.length ? <table className="tbl"><thead><tr><th>Title</th><th>Status</th><th>Applicants</th><th /></tr></thead>
        <tbody>{jobs.map((j: any) => <tr key={j.id}><td>{j.title}</td><td><span className={`pill ${j.status}`}>{j.status.replace("_", " ")}</span></td>
          <td className="mono">{j.applications?.[0]?.count ?? 0}</td><td><Link href={`/dashboard/client/jobs/${j.id}`}>Manage</Link></td></tr>)}</tbody>
      </table> : <p className="hint">No jobs yet. Post your first breakdown; SALT reviews it before it goes live.</p>}

      <h2>Bookings</h2>
      {bookings?.length ? <table className="tbl"><thead><tr><th>Talent</th><th>Job</th><th>Date</th><th>Rate</th><th>Contract</th></tr></thead>
        <tbody>{bookings.map((b: any) => { const c = Array.isArray(b.contracts) ? b.contracts[0] : b.contracts;
          return <tr key={b.id}><td>{b.talent_profiles?.display_name}</td><td>{b.jobs?.title}</td><td>{b.shoot_date ?? "TBD"}</td>
            <td className="mono">${b.rate_usd?.toLocaleString()}</td>
            <td>{c && <Link href={`/contracts/${c.id}`}>{c.client_signed_at ? "View" : "Review & sign"}</Link>}</td></tr>; })}</tbody>
      </table> : <p className="hint">No bookings yet.</p>}

      {owner && <>
        <h2>Company</h2>
        <form action={saveCompany} className="form">
          <label>Company name<input id="name" name="name" defaultValue={co?.name ?? ""} required /></label>
          <label>Website<input id="website" name="website" defaultValue={co?.website ?? ""} /></label>
          <label>Industry<input id="industry" name="industry" defaultValue={co?.industry ?? ""} placeholder="Footwear, agency, production…" /></label>
          <button className="btn primary">Save</button>
        </form>

        <div className="two">
          <div><h2>Divisions</h2>
            <ul className="vlist">{divs?.map((d) => <li key={d.id}>{d.name}</li>)}</ul>
            <form action={addDivision} className="row"><input id="division" name="division" placeholder="e.g. Running, Kids" aria-label="Division name" />
              <button className="btn">Add division</button></form></div>
          <div><h2>Team</h2>
            <ul className="vlist">{team?.map((t: any, i) => <li key={i}><span>{t.accounts?.full_name} <span className="hint">{t.accounts?.email}</span></span>
              <span className="hint">{t.member_role}{t.divisions?.name && ` · ${t.divisions.name}`}</span></li>)}</ul>
            <form action={inviteTeammate} className="form single">
              <label>Name<input id="tm-name" name="name" /></label>
              <label>Email<input id="tm-email" name="email" type="email" required /></label>
              <label>Division<select id="tm-div" name="division_id"><option value="">All</option>
                {divs?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
              <button className="btn">Send invite</button></form></div>
        </div>
      </>}
    </section>
  );
}
