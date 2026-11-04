import Link from "next/link";
export const metadata = { title: "Pricing | SALT" };

const TALENT = [
  { name: "Starter", price: "Free", per: "", items: ["Profile with 6 photos and 1 reel", "Submit to 5 jobs per month", "Online contracts"] },
  { name: "Pro", price: "$12", per: "/month", items: ["20 photos and 5 reels", "Unlimited submissions", "Priority placement in search", "Self-tape uploads"], featured: true },
];
const CLIENTS = [
  { name: "Per job", price: "$99", per: "/posting", items: ["1 breakdown, open 30 days", "Full talent search", "Unlimited applicants"] },
  { name: "Team", price: "$299", per: "/month", items: ["Unlimited breakdowns", "Up to 10 users and divisions", "Shortlists and booking history"], featured: true },
  { name: "Enterprise", price: "Custom", per: "", items: ["Unlimited users", "Dedicated casting support", "Invoicing and custom contracts"] },
];

function Plans({ plans }: { plans: typeof CLIENTS }) {
  return (
    <div className="plans">
      {plans.map((p: any) => (
        <div key={p.name} className={`plan${p.featured ? " featured" : ""}`}>
          <h3>{p.name}</h3>
          <p className="price">{p.price}<span>{p.per}</span></p>
          <ul>{p.items.map((i: string) => <li key={i}>{i}</li>)}</ul>
          <Link href="/register" className={`btn${p.featured ? " primary" : ""}`}>Get started</Link>
        </div>
      ))}
    </div>
  );
}

export default function Pricing() {
  return (
    <section>
      <p className="eyebrow">Pricing</p>
      <h1>Simple pricing on both sides</h1>
      <p className="lede">Talent keeps 100% of their quoted rate. SALT adds a 10% service fee to the client on each booking.</p>
      <h2>Talent</h2><Plans plans={TALENT as any} />
      <h2>Clients</h2><Plans plans={CLIENTS} />
    </section>
  );
}
