import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { mediaUrl } from "@/lib/media";
import { fmtHeight } from "@/lib/auth";

const SPORTS = ["Soccer", "Track & Field", "Basketball", "Swimming", "Volleyball", "Tennis", "Football",
  "Baseball", "Gymnastics", "CrossFit", "Lacrosse", "Softball", "Surf", "Golf"];

const GIGS = [
  ["Print & e-com", "Apparel, footwear and gear shoots where real athletic form sells the product."],
  ["Commercial", "TV spots, streaming and pre-roll, including high-skill action on cue."],
  ["Social", "Sponsored posts, reels and UGC from athletes with engaged audiences."],
  ["Appearances", "Activations, clinics, store openings and meet-and-greets."],
];

export default async function Home() {
  const sb = await supabaseServer();
  const [{ data: featured }, { count: talentCount }, { count: jobCount }] = await Promise.all([
    sb.rpc("search_talent", { page_size: 8, page_offset: 0 }),
    sb.from("talent_profiles").select("id", { count: "estimated", head: true }),
    sb.from("jobs").select("id", { count: "estimated", head: true }).eq("status", "open"),
  ]);
  const stack = (featured ?? []).slice(0, 3);

  return (
    <>
      <section className="hero2">
        <div className="hero2-copy">
          <p className="eyebrow">Sports and Active Lifestyle Talent</p>
          <h1>Cast real <em>athletes.</em></h1>
          <p className="lede">SALT connects current and former NCAA, Olympic and pro athletes with brands casting print, commercial and social work. Search by sport, look and location. Post a breakdown. Book direct.</p>
          <div className="row">
            <Link className="btn primary lg" href="/talent">Find talent</Link>
            <Link className="btn lg" href="/register">Join as an athlete</Link>
          </div>
          <dl className="hero-stats">
            <div><dt>Athletes</dt><dd>{(talentCount ?? 0).toLocaleString()}</dd></div>
            <div><dt>Open jobs</dt><dd>{(jobCount ?? 0).toLocaleString()}</dd></div>
            <div><dt>Agency markup</dt><dd>0%</dd></div>
          </dl>
        </div>
        <div className="card-stack" aria-hidden={stack.length === 0}>
          {stack.map((p: any, i: number) => (
            <Link key={p.slug} href={`/talent/${p.slug}`} className={`tcard tilt-${i}`}>
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

      <div className="ticker" aria-label="Sports on SALT">
        <div className="ticker-track">
          {[...SPORTS, ...SPORTS].map((s, i) => <span key={i}>{s}<b>✦</b></span>)}
        </div>
      </div>

      {featured && featured.length > 0 && (
        <section>
          <div className="section-head">
            <div><p className="eyebrow">On the roster</p><h2>Featured athletes</h2></div>
            <Link href="/talent" className="btn">Browse all →</Link>
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

      <section>
        <p className="eyebrow">What brands book</p>
        <div className="gigs">
          {GIGS.map(([t, d]) => <div key={t} className="gig"><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </section>

      <section className="two">
        <div className="path">
          <p className="eyebrow">For athletes</p>
          <h2>Get paid for what you already do</h2>
          <ol className="steps">
            <li><b>Build your comp card.</b> Photos, reels, measurements and sport history.</li>
            <li><b>Get verified.</b> SALT approves every athlete before they go live.</li>
            <li><b>Submit to jobs.</b> Apply to breakdowns that fit your sport and look.</li>
            <li><b>Book and sign.</b> Review and sign your contract online.</li>
          </ol>
          <Link className="btn primary" href="/register">Create your profile</Link>
        </div>
        <div className="path dark">
          <p className="eyebrow">For brands</p>
          <h2>Cast athletes who can actually play</h2>
          <ol className="steps">
            <li><b>Verify your company.</b> Add divisions and teammates.</li>
            <li><b>Post a breakdown.</b> SALT reviews it before it goes live.</li>
            <li><b>Search and shortlist.</b> Height, look, skill, age and radius filters.</li>
            <li><b>Book in one click.</b> The contract is generated for you.</li>
          </ol>
          <Link className="btn pop" href="/register">Post a job</Link>
        </div>
      </section>

      <section className="cta-band">
        <h2>Real form sells.</h2>
        <p>Viewers can tell when a model has never sprinted. Cast the ones who have.</p>
        <Link className="btn dark-btn lg" href="/talent">Start casting</Link>
      </section>
    </>
  );
}
