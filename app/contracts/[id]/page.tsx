import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAccount, dashboardFor } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { signContract } from "@/lib/actions";

// Both parties view the agreement here. RLS only returns it to the talent, the client team, or admins.
export default async function Contract({ params }: { params: Promise<{ id: string }> }) {
  const acc = await getAccount();
  if (!acc) redirect("/login");
  const { id } = await params;
  const { data: c } = await (await supabaseServer()).from("contracts").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const mySig = acc.role === "talent" ? c.talent_signed_at : c.client_signed_at;

  return (
    <section className="prose">
      <p className="eyebrow"><Link href={dashboardFor(acc.role)}>← Dashboard</Link></p>
      <h1>{c.title}</h1>
      <pre className="contract">{c.body}</pre>
      <div className="sigs">
        <div><dt>Client</dt><dd>{c.client_signed_at ? <>{c.client_signature}<br /><span className="hint">{new Date(c.client_signed_at).toLocaleString()}</span></> : "Not signed"}</dd></div>
        <div><dt>Talent</dt><dd>{c.talent_signed_at ? <>{c.talent_signature}<br /><span className="hint">{new Date(c.talent_signed_at).toLocaleString()}</span></> : "Not signed"}</dd></div>
      </div>
      {acc.role !== "admin" && !mySig && (
        <form action={signContract} className="form single">
          <input type="hidden" name="id" value={c.id} />
          <label>Type your full legal name to sign<input id="signature" name="signature" required defaultValue="" /></label>
          <label className="check"><input type="checkbox" required /> I have read and agree to this agreement.</label>
          <button className="btn primary">Sign agreement</button>
        </form>)}
    </section>
  );
}
