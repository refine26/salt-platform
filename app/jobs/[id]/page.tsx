import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { getAccount } from "@/lib/auth";
import { applyToJob } from "@/lib/actions";

export default async function Job({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const { id } = await params; const sp = await searchParams;
  const sb = await supabaseServer();
  const { data: j } = await sb.from("jobs").select("*, companies(name), divisions(name)").eq("id", id).maybeSingle();
  if (!j) notFound();
  const acc = await getAccount();

  let mine: any = null, tapes: any[] = [], ncaa = false;
  if (acc?.role === "talent") {
    ({ data: mine } = await sb.from("applications").select("status").eq("job_id", id).eq("talent_id", acc.id).maybeSingle());
    ({ data: tapes = [] } = await sb.from("media").select("id,title").eq("owner_id", acc.id).eq("kind", "video").eq("status", "ready") as any);
    const { data: tp } = await sb.from("talent_profiles").select("is_ncaa_active").eq("id", acc.id).single();
    ncaa = !!tp?.is_ncaa_active;
  }

  return (
    <section className="prose">
      <p className="eyebrow">{j.gig_type} · {j.companies?.name}{j.divisions?.name && ` · ${j.divisions.name}`}</p>
      <h1>{j.title}</h1>
      <dl className="comp-card">
        <div><dt>Location</dt><dd>{[j.city, j.state].filter(Boolean).join(", ") || "TBD"}</dd></div>
        <div><dt>Dates</dt><dd>{j.shoot_start ?? "TBD"}{j.shoot_end && j.shoot_end !== j.shoot_start && ` to ${j.shoot_end}`}</dd></div>
        <div><dt>Rate</dt><dd>{j.rate_usd ? `$${j.rate_usd.toLocaleString()}` : "TBD"}</dd></div>
        <div><dt>Openings</dt><dd>{j.openings}</dd></div>
        {j.sports?.length > 0 && <div><dt>Sports</dt><dd>{j.sports.join(", ")}</dd></div>}
      </dl>
      {j.status !== "open" && <p className="msg">Status: {j.status.replace("_", " ")}</p>}
      <h2>Breakdown</h2><p style={{ whiteSpace: "pre-wrap" }}>{j.description}</p>
      {j.usage_terms && <><h2>Usage</h2><p>{j.usage_terms}</p></>}

      {sp.error && <p className="msg err">{sp.error}</p>}
      {sp.submitted && <p className="msg">Submitted. Track it from your dashboard.</p>}

      {!acc && <p><Link className="btn primary" href="/register">Join SALT to submit</Link></p>}
      {acc?.role === "talent" && j.status === "open" && (mine ? <p className="msg">Your submission: {mine.status}</p> :
        ncaa && !j.ncaa_eligible ? <p className="msg err">This job isn&apos;t open to current NCAA athletes.</p> :
        <form action={applyToJob} className="form single">
          <input type="hidden" name="job_id" value={j.id} />
          <label>Note to the client<textarea id="cover_note" name="cover_note" maxLength={1000}
            placeholder="Why you're a fit: relevant sport skills, availability, past work." /></label>
          <label>Attach a reel or self-tape (optional)<select id="self_tape_id" name="self_tape_id">
            <option value="">None</option>{tapes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
          {ncaa && <p className="hint">You&apos;re a current NCAA athlete. If booked, you&apos;ll need to disclose this deal to your school&apos;s compliance office.</p>}
          <button className="btn primary">Submit for this job</button>
        </form>)}
    </section>
  );
}
