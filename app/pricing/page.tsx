import Link from "next/link";
export const metadata = { title: "Pricing | SALT" };

// Beta pricing: tiers and prices are placeholders until the beta period ends.
const TALENT = [
  { name: "Starter", price: "$89", per: "/year", items: [
    "Public SALT profile", "8 photos and 1 video reel", "Up to 10 job submissions a month",
    "Online contracts and payments"] },
  { name: "Pro", price: "$149", per: "/year", featured: true, items: [
    "Everything in Starter", "20 photos and 5 video reels", "Unlimited job submissions",
    "Self-tape uploads", "Priority placement in search"] },
  { name: "Elite", price: "$249", per: "/year", items: [
    "Everything in Pro", "Featured on the SALT home page", "Early access to new jobs",
    "Profile review by the SALT team"] },
];

export default function Pricing() {
  return (
    <section>
      <p className="eyebrow">Pricing</p>
      <h1>Simple, fair pricing</h1>
      <p className="lede">Brands join and post jobs for free. Talent choose a yearly membership and pay a 12% service fee on booked work, well below the 20% industry standard.</p>

      <h2>Talent memberships</h2>
      <div className="plans">
        {TALENT.map((p) => (
          <div key={p.name} className={`plan${p.featured ? " featured" : ""}`}>
            <h3>{p.name}</h3>
            <p className="price">{p.price}<span>{p.per}</span></p>
            <ul>{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
            <Link href="/register" className={`btn${p.featured ? " primary" : ""}`}>Join SALT</Link>
          </div>
        ))}
      </div>
      <p className="fine">Beta pricing. Final membership prices will be set after the beta period.</p>

      <h2>Booking fee</h2>
      <div className="fee-explainer">
        <div><span className="num">12%</span><p>SALT service fee on each booking, deducted from the talent&apos;s rate. Traditional agencies typically take 20%.</p></div>
        <div className="example">
          <p className="eyebrow">Example</p>
          <dl>
            <div><dt>Booking rate</dt><dd>$1,000</dd></div>
            <div><dt>SALT service fee (12%)</dt><dd>−$120</dd></div>
            <div className="total"><dt>Talent receives</dt><dd>$880</dd></div>
          </dl>
        </div>
      </div>

      <h2>Brands and clients</h2>
      <div className="plans">
        <div className="plan featured">
          <h3>Free for brands</h3>
          <p className="price">$0</p>
          <ul>
            <li>Free account for your whole team</li>
            <li>Post unlimited jobs</li>
            <li>Search and filter all talent</li>
            <li>Review submissions, reels and self-tapes</li>
            <li>Book and sign contracts online</li>
          </ul>
          <Link href="/register" className="btn primary">Create a brand account</Link>
        </div>
      </div>
    </section>
  );
}
