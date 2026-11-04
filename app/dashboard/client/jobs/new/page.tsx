import { requireRole, OPTIONS } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { createJob } from "@/lib/actions";

export default async function NewJob({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const acc = await requireRole("client");
  const sp = await searchParams;
  const sb = await supabaseServer();
  const { data: mem } = await sb.from("company_members").select("company_id").eq("account_id", acc.id).single();
  const { data: divs } = await sb.from("divisions").select("id,name").eq("company_id", mem?.company_id);

  return (
    <section className="dash">
      <p className="eyebrow">New breakdown</p><h1>Post a job</h1>
      <p className="hint">SALT reviews every job before talent can see it, usually within 1 business day.</p>
      {sp.error && <p className="msg err">{sp.error}</p>}
      <form action={createJob} className="form">
        <label className="full">Job title<input id="title" name="title" required placeholder="Sprinter for spring footwear spot" /></label>
        <label>Gig type<select id="gig_type" name="gig_type" required>{OPTIONS.gig.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label>Division<select id="division_id" name="division_id"><option value="">None</option>
          {divs?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label className="full">Breakdown<textarea id="description" name="description" required rows={8}
          placeholder={"Role, look and skills needed.\nExample: Female sprinter, 20 to 30, any ethnicity, 5'6\" to 5'10\". Must perform block starts on camera."} /></label>
        <label>Sports (comma separated)<input id="sports" name="sports" placeholder="Track & Field" /></label>
        <label>Openings<input id="openings" name="openings" type="number" min={1} defaultValue={1} /></label>
        <label>City<input id="city" name="city" /></label>
        <label>State<input id="state" name="state" maxLength={2} /></label>
        <label>Shoot start<input id="shoot_start" name="shoot_start" type="date" /></label>
        <label>Shoot end<input id="shoot_end" name="shoot_end" type="date" /></label>
        <label>Rate per talent (USD)<input id="rate_usd" name="rate_usd" type="number" /></label>
        <label className="check"><input type="checkbox" name="ncaa_eligible" defaultChecked /> Open to current NCAA athletes</label>
        <label className="full">Usage terms<textarea id="usage_terms" name="usage_terms" placeholder="Digital and social, US only, 12 months from first air date." /></label>
        <button className="btn primary full">Submit for review</button>
      </form>
    </section>
  );
}
