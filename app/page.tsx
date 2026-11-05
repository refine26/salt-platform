import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { mediaUrl } from "@/lib/media";
import { fmtHeight } from "@/lib/auth";

const USES = [
  ["Product & e-commerce", "Footwear, apparel and gear shot on people who actually train in it."],
  ["Commercials", "TV, streaming and pre-roll with real athletic action on cue."],
  ["UGC & social", "Creator content from active people with engaged, credible audiences."],
  ["Events & activations", "Store openings, clinics, trade shows and meet-and-greets."],
];

const COMPARE: [string, string, string, string][] = [
  ["Talent reviewed before going live", "Yes, every profile", "Yes", "Rarely"],
  ["Cost to brands", "Free to join and post jobs", "Agency fees on top of talent rates", "Subscription or per-post fee"],
  ["Cost to talent", "Yearly membership + 12% service fee", "Typically 20% commission", "Often $12–$30/month to apply"],
  ["Search by sport, level and skill", "Yes", "Rarely", "No"],
  ["Contracts and NIL disclosure built in", "Yes", "Handled offline", "No"],
  ["Time to first shortlist", "Same day", "Days", "Days"],
];

const FAQ: [string, string][] = [
  ["Who can join as talent?", "Anyone who lives an active lifestyle: current and former college, pro and Olympic athletes, coaches, trainers, yoga and fitness instructors, runners, surfers, climbers, weekend warriors and everyday active people of every age, size and background. Every profile is reviewed by the SALT team before it goes live."],
  ["How does a brand book someone?", "Post a breakdown or search the roster directly, shortlist talent, and click Book. SALT generates the agreement with your rate, dates and usage terms, and both sides sign online."],
  ["Can current college athletes work through SALT?", "Yes. College athletes flag their NCAA status and school compliance contact, brands can mark jobs as closed to current athletes, and every agreement includes an NIL disclosure clause."],
  ["What does it cost?", "Brands join and post jobs for free. Talent choose a yearly membership tier and pay a 12% service fee on booked work, compared with the 20% typical at agencies."],
];

export default async function Home() {
  const sb = await supabaseServer();
  const [{ data: featured }, { count: talentCount }, { count: jobCount }] = await Promise.all([
    sb.rpc("search_talent", { page_size: 8, page_offset: 0 }),
    sb.from("talent_profiles").select("id", { count: "estimated", head: true }),
    sb.from("jobs").select("id", { count: "estimated", head: true }).eq("status", "open"),
  ]);
  const heroCards = (featured ?? []).slice(0, 3);

  return (
    <>
      <section className="p-hero">
        <div className="p-hero-copy">
          <p className="kicker"><span className="dot" /> Sports and active lifestyle talent</p>
          <h1>Real, active people for photo, video and brand campaigns.</h1>
          <p className="lede">From pro and college athletes to trainers, yoga teachers, runners and everyday active people. Search by sport, activity, look and location. Post a job, review reels, and book with the contract handled for you.</p>
          <div className="row">
            <Link className="btn primary lg" href="/talent">Browse talent</Link>
            <Link className="btn lg" href="/register">Post a job for free</Link>
          </div>
          <p className="fine">Free for brands. Talent memberships from $89 a year. <Link href="/pricing">See pricing →</Link></p>
        </div>
        <div className="p-hero-cards">
          {heroCards.map((p: any) => (
            <Link key={p.slug} href={`/talent/${p.slug}`} className="tcard">
              <div className="tcard-img" style={p.headshot_path ? { backgroundImage: `url(${mediaUrl(p.headshot_path)})` } : undefined} />
              <div className="tcard-overlay">
                <span className="tag">{p.sport}</span>
                <strong>{p.display_name}</strong>
                <span>{p.level}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="stats-bar">
        <div><span className="num">{(talentCount ?? 0).toLocaleString()}</span><span>Talent profiles</span></div>
        <div><span className="num">{(jobCount ?? 0).toLocaleString()}</span><span>Open jobs</span></div>
        <div><span className="num">$0</span><span>For brands to post</span></div>
        <div><span className="num">12%</span><span>Talent service fee</span></div>
      </div>


      <section>
        <div className="section-head">
          <div><p className="eyebrow">Use cases</p><h2>What brands book SALT talent for</h2></div>
        </div>
        <div className="uses">
          {USES.map(([t, d], i) => (
            <div key={t} className="use"><span className="use-n">0{i + 1}</span><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      {featured && featured.length > 0 && (
        <section>
          <div className="section-head">
            <div><p className="eyebrow">The roster</p><h2>Featured talent</h2></div>
            <Link href="/talent" className="link-arrow">View all talent →</Link>
          </div>
          <div className="grid">
            {featured.map((p: any) => (
              <Link key={p.slug} href={`/talent/${p.slug}`} className="tcard">
                <div className="tcard-img" style={p.headshot_path ? { backgroundImage: `url(${mediaUrl(p.headshot_path)})` } : undefined} />
                <div className="tcard-overlay">
                  <span className="tag">{p.sport}</span>
                  <strong>{p.display_name}</strong>
                  <span>{[p.level, fmtHeight(p.height_in), p.city].filter((x) => x && x !== "—").join(" · ")}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="how">
        <div className="section-head"><div><p className="eyebrow">How it works</p><h2>From brief to booked in a day</h2></div></div>
        <ol className="how-steps">
          <li><h3>Post a breakdown</h3><p>Describe the role, sport, look, dates, rate and usage. SALT reviews every job before talent see it.</p></li>
          <li><h3>Shortlist</h3><p>Filter by sport, level, height, age, skills and distance. Watch reels and self-tapes in each submission.</p></li>
          <li><h3>Book and sign</h3><p>Click Book. The agreement is generated with your terms, and both parties sign online.</p></li>
          <li><h3>Shoot</h3><p>Call times, location and contract live on both dashboards. NIL disclosure is flagged for college athletes, and payment runs through SALT.</p></li>
        </ol>
      </section>

      <section>
        <div className="section-head"><div><p className="eyebrow">Why SALT</p><h2>Built for athletic casting</h2></div></div>
        <div className="table-wrap">
          <table className="compare">
            <thead><tr><th /><th className="us">SALT</th><th>Traditional agency</th><th>General model marketplaces</th></tr></thead>
            <tbody>{COMPARE.map(([k, a, b, c]) => (
              <tr key={k}><th scope="row">{k}</th><td className="us">{a}</td><td>{b}</td><td>{c}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="fine">Comparison reflects typical industry terms; individual agencies and platforms vary.</p>
      </section>

      <section className="trust">
        <div><h3>Reviewed talent</h3><p>Every profile is reviewed by the SALT team before it goes live, from pro athletes to everyday active people.</p></div>
        <div><h3>Approved jobs only</h3><p>Every brand is verified and every breakdown is reviewed, so talent never see spam or unpaid &quot;exposure&quot; gigs.</p></div>
        <div><h3>Contracts on every booking</h3><p>Rate, dates, usage and release terms are captured in a signed agreement, stored on both dashboards.</p></div>
      </section>

      <section className="faq">
        <div className="section-head"><div><p className="eyebrow">FAQ</p><h2>Common questions</h2></div></div>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>

      <section className="cta-band">
        <h2>Cast people who actually live it.</h2>
        <p>Brands post jobs for free. Talent, join the beta and build your profile today.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn dark-btn lg" href="/register">Post a job</Link>
          <Link className="btn lg" href="/register">Join as talent</Link>
        </div>
      </section>
    </>
  );
}
