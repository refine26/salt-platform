import Link from "next/link";
import { notFound } from "next/navigation";
import MuxPlayer from "@mux/mux-player-react";
import { requireRole, fmtHeight } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { setApplicationStatus, bookTalent } from "@/lib/actions";

export default async function ManageJob({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("client");
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: j } = await sb.from("jobs").select("*").eq("id", id).maybeSingle();
  if (!j) notFound();
  const { data: apps } = await sb.from("applications")
    .select("id, status, cover_note, created_at, media(mux_playback_id, title), talent_profiles(slug, display_name, sport, level, city, state, height_in, day_rate, is_ncaa_active, headshot_path)")
    .eq("job_id", id).neq("status", "withdrawn").order("created_at");
  const img = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`;
  const booked = apps?.filter((a) => a.status === "booked").length ?? 0;

  const statusBtn = (a: any, status: string, label: string) => (
    <form action={setApplicationStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="job_id" value={id} />
      <input type="hidden" name="status" value={status} /><button className="btn sm">{label}</button></form>
  );

  return (
    <section className="dash">
      <p className="eyebrow"><Link href="/dashboard/client">← Dashboard</Link></p>
      <h1>{j.title}</h1>
      <p><span className={`pill ${j.status}`}>{j.status.replace("_", " ")}</span> <span className="hint">{booked} of {j.openings} booked</span></p>
      {j.status === "pending_review" && <p className="msg">SALT is reviewing this job. Talent will see it once approved.</p>}
      {j.status === "rejected" && <p className="msg err">Not approved{j.review_note && `: ${j.review_note}`}</p>}

      <h2>Submissions ({apps?.length ?? 0})</h2>
      {!apps?.length && <p className="hint">No submissions yet.</p>}
      <div className="applicants">
        {apps?.map((a: any) => { const t = a.talent_profiles; return (
          <article key={a.id} className="applicant">
            <div className="thumb" style={t?.headshot_path ? { backgroundImage: `url(${img}${t.headshot_path})` } : undefined} />
            <div className="info">
              <h3><Link href={`/talent/${t?.slug}`}>{t?.display_name}</Link> <span className={`pill ${a.status}`}>{a.status}</span></h3>
              <p className="hint">{[t?.sport, t?.level, fmtHeight(t?.height_in), [t?.city, t?.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                {t?.day_rate && ` · $${t.day_rate}/day`}{t?.is_ncaa_active && " · NCAA"}</p>
              {a.cover_note && <p>{a.cover_note}</p>}
              {a.media?.mux_playback_id && <MuxPlayer playbackId={a.media.mux_playback_id} streamType="on-demand" style={{ maxWidth: 420 }} />}
              <div className="row">
                {a.status === "applied" && statusBtn(a, "shortlisted", "Shortlist")}
                {a.status !== "booked" && a.status !== "declined" && statusBtn(a, "declined", "Pass")}
                {a.status !== "booked" && a.status !== "declined" && (
                  <form action={bookTalent} className="book-form">
                    <input type="hidden" name="id" value={a.id} />
                    <input name="rate_usd" type="number" defaultValue={j.rate_usd ?? t?.day_rate ?? ""} aria-label="Rate" placeholder="Rate" />
                    <input name="shoot_date" type="date" defaultValue={j.shoot_start ?? ""} aria-label="Shoot date" />
                    <input name="call_time" placeholder="Call 7:00 AM" aria-label="Call time" />
                    <button className="btn primary sm">Book &amp; send contract</button>
                  </form>)}
              </div>
            </div>
          </article>); })}
      </div>
    </section>
  );
}
