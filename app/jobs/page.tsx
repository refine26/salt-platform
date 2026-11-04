import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { OPTIONS } from "@/lib/auth";

type SP = Promise<{ gig?: string; state?: string; page?: string }>;

export default async function Jobs({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let q = (await supabaseServer()).from("jobs")
    .select("id, title, gig_type, city, state, shoot_start, rate_usd, ncaa_eligible, companies(name)", { count: "estimated" })
    .eq("status", "open").order("created_at", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
  if (sp.gig) q = q.eq("gig_type", sp.gig);
  if (sp.state) q = q.eq("state", sp.state.toUpperCase());
  const { data, count } = await q;

  return (
    <section>
      <h1>Open jobs</h1>
      <form className="filters">
        <select id="gig" name="gig" defaultValue={sp.gig ?? ""} aria-label="Gig type">
          <option value="">All gig types</option>{OPTIONS.gig.map((g) => <option key={g}>{g}</option>)}
        </select>
        <input id="state" name="state" maxLength={2} placeholder="State" defaultValue={sp.state ?? ""} aria-label="State" />
        <button className="btn primary">Filter</button>
      </form>
      <p className="hint">{(count ?? 0).toLocaleString()} open breakdowns</p>
      <div className="job-list">
        {data?.map((j: any) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="job">
            <div><span className="pill">{j.gig_type}</span><h3>{j.title}</h3>
              <p className="hint">{j.companies?.name} · {[j.city, j.state].filter(Boolean).join(", ")}{j.shoot_start && ` · ${j.shoot_start}`}</p></div>
            {j.rate_usd && <span className="mono">${j.rate_usd.toLocaleString()}</span>}
          </Link>
        ))}
        {!data?.length && <div className="empty">No open jobs match. Check back soon.</div>}
      </div>
      <div className="row pager">
        {page > 1 && <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as any)}`}>← Previous</Link>}
        {(count ?? 0) > page * 20 && <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as any)}`}>Next →</Link>}
      </div>
    </section>
  );
}
