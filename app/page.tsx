import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { mediaUrl } from "@/lib/media";
import { fmtHeight } from "@/lib/auth";

const USES = [
  ["Product & e-commerce", "Footwear, apparel and gear shot on people who actually train in it."],
  ["Commercials", "TV, streaming and pre-roll with real athletic action on cue."],
  ["UGC & social", "Creator content from athletes with engaged, credible audiences."],
  ["Events & activations", "Store openings, clinics, trade shows and meet-and-greets."],
];

const COMPARE: [string, string, string, string][] = [
  ["Athletic ability verified", "Yes, every athlete", "Sometimes", "No"],
  ["Cost to brands", "10% service fee", "10–40% commission", "Subscription or per-post fee"],
  ["Cost to athletes", "Free to join", "Commission on earnings", "Often $12–$30/month to apply"],
  ["Search by sport, level and skill", "Yes", "Rarely", "No"],
  ["Contracts and NIL disclosure built in", "Yes", "Handled offline", "No"],
  ["Time to first shortlist", "Same day", "Days", "Days"],
];

const FAQ: [string, string][] = [
  ["Who can join as talent?", "Current and former NCAA, NAIA, JUCO, professional and Olympic athletes, plus serious club competitors. Every profile is reviewed by the SALT team before it goes live."],
  ["How does a brand book someone?", "Post a breakdown or search the roster directly, shortlist athletes, and click Book. SALT generates the agreement with your rate, dates and usage terms, and both sides sign online."],
  ["Can current college athletes work through SALT?", "Yes. Athletes flag their NCAA status and school compliance contact, brands can mark jobs as closed to current athletes, and every agreement includes an NIL disclosure clause."],
  ["What does it cost?", "Athletes join free. Brands pay per job post or a monthly team plan, plus a 10% service fee on bookings. Athletes keep 100% of their quoted rate."],
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
          <p className="kicker"><span className="dot" /> The casting platform for athletic talent</p>
          <h1>Hire real athletes for photo, video and brand campaigns.</h1>
          <p className="lede">Search verified college, pro and Olympic athletes by sport, look and location. Post a breakdown, review reels, and book with the contract handled for you.</p>
          <div className="row">
            <Link className="btn primary lg" href="/talent">Browse athletes</Link>
            <Link className="btn lg" href="/register">Post a job</Link>
          </div>
          <p className="fine">Athletes join free. <Link href="/register">Create a profile →</Link></p>
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
        <div><span className="num">{(talentCount ?? 0).toLocaleString()}</span><span>Verified athletes</span></div>
        <div><span className="num">{(jobCount ?? 0).toLocaleString()}</span><span>Open jobs</span></div>
        <div><span className="num">10%</span><span>Flat brand fee</span></div>
        <div><span className="num">$0</span><span>For athletes to join</span></div>
      </div>


      <section>
        <div className="section-head">
          <div><p className="eyebrow">Use cases</p><h2>What brands hire athletes for</h2></div>
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
            <div><p className="eyebrow">The roster</p><h2>Featured athletes</h2></div>
            <Link href="/talent" className="link-arrow">View all athletes →</Link>
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
          <li><h3>Post a breakdown</h3><p>Describe the role, sport, look, dates, rate and usage. SALT reviews every job before athletes see it.</p></li>
          <li><h3>Shortlist</h3><p>Filter by sport, level, height, age, skills and distance. Watch reels and self-tapes in each submission.</p></li>
          <li><h3>Book and sign</h3><p>Click Book. The agreement is generated with your terms, and both parties sign online.</p></li>
          <li><h3>Shoot</h3><p>Call times, location and contract live on both dashboards. NIL disclosure is flagged for college athletes.</p></li>
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
        <div><h3>Verified athletes</h3><p>Every profile is reviewed against the athlete&apos;s school, team or federation history before it goes live.</p></div>
        <div><h3>Approved jobs only</h3><p>Every brand is verified and every breakdown is reviewed, so athletes never see spam or unpaid &quot;exposure&quot; gigs.</p></div>
        <div><h3>Contracts on every booking</h3><p>Rate, dates, usage and release terms are captured in a signed agreement, stored on both dashboards.</p></div>
      </section>

      <section className="faq">
        <div className="section-head"><div><p className="eyebrow">FAQ</p><h2>Common questions</h2></div></div>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>

      <section className="cta-band">
        <h2>Cast athletes who can actually play.</h2>
        <p>Post your first job today. Most brands have a shortlist the same day.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn dark-btn lg" href="/register">Post a job</Link>
          <Link className="btn lg" href="/talent">Browse athletes</Link>
        </div>
      </section>
    </>
  );
}
