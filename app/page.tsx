import Link from "next/link";

const GIGS = [
  ["Print & e-com", "Apparel, footwear and gear shoots where real athletic form sells the product."],
  ["Commercial", "TV spots, streaming and pre-roll ads, including high-skill athletic action."],
  ["Social", "Sponsored posts, reels and UGC from athletes with engaged audiences."],
  ["Appearances", "Activations, clinics, trade shows and meet-and-greets."],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Sports and Active Lifestyle Talent</p>
          <h1>Real athletes. <em>On camera.</em></h1>
          <p className="lede">SALT connects current and former NCAA, Olympic and pro athletes with brands, agencies and production companies casting print and commercial work. Search by look, sport and location. Post a breakdown. Book direct.</p>
          <div className="row">
            <Link className="btn primary" href="/register">Join as talent</Link>
            <Link className="btn" href="/register">Post a job</Link>
          </div>
        </div>
        <aside className="slate">
          <div className="stripes" />
          <dl>
            <dt>Breakdown</dt><dd>Spring running spot</dd>
            <dt>Role</dt><dd>Sprinter, 20s, hero runner</dd>
            <dt>Shoot</dt><dd>1 day · San Diego, CA</dd>
            <dt>Rate</dt><dd>$1,800 + usage</dd>
          </dl>
        </aside>
      </section>

      <section>
        <h2>What brands book</h2>
        <div className="cats">{GIGS.map(([t, d]) => <div key={t} className="cat"><h3>{t}</h3><p>{d}</p></div>)}</div>
      </section>

      <section className="two">
        <div>
          <h2>For talent</h2>
          <ol className="steps">
            <li><b>Build your profile.</b> Photos, reels, measurements, sport history.</li>
            <li><b>Get approved.</b> SALT verifies every athlete before they go live.</li>
            <li><b>Submit to breakdowns.</b> Apply to approved jobs that fit you.</li>
            <li><b>Get booked.</b> Review and sign your contract online.</li>
          </ol>
        </div>
        <div>
          <h2>For clients</h2>
          <ol className="steps">
            <li><b>Verify your company.</b> Add divisions and teammates.</li>
            <li><b>Post a breakdown.</b> SALT reviews it before it goes live.</li>
            <li><b>Search and shortlist.</b> Filter by height, look, skill, age and radius.</li>
            <li><b>Book and contract.</b> One click creates the agreement.</li>
          </ol>
        </div>
      </section>
    </>
  );
}
