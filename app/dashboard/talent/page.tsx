import Link from "next/link";
import { requireRole, OPTIONS } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { saveTalentProfile, deleteMedia, setHeadshot, withdrawApplication } from "@/lib/actions";
import VideoUploader from "@/components/VideoUploader";
import PhotoUploader from "@/components/PhotoUploader";
import { mediaUrl } from "@/lib/media";

export default async function TalentDashboard() {
  const acc = await requireRole("talent");
  const sb = await supabaseServer();
  const [{ data: p }, { data: media }, { data: apps }, { data: bookings }] = await Promise.all([
    sb.from("talent_profiles").select("*").eq("id", acc.id).single(),
    sb.from("media").select("*").eq("owner_id", acc.id).neq("status", "removed").order("created_at", { ascending: false }),
    sb.from("applications").select("id, status, created_at, jobs(id, title, companies(name))").eq("talent_id", acc.id).order("created_at", { ascending: false }).limit(50),
    sb.from("bookings").select("id, shoot_date, call_time, location, rate_usd, status, ncaa_disclosed_at, jobs(title), contracts(id, talent_signed_at, client_signed_at)").eq("talent_id", acc.id).order("shoot_date"),
  ]);
  const v = (k: string) => p?.[k] ?? "";
  const sel = (name: string, label: string, opts: string[]) => (
    <label>{label}<select id={name} name={name} defaultValue={v(name)}>
      <option value="">Select</option>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>
  );

  return (
    <section className="dash">
      <div className="dash-head">
        <div><p className="eyebrow">Talent dashboard</p><h1>{p?.display_name}</h1></div>
        {p && <Link className="btn" href={`/talent/${p.slug}`}>View public profile</Link>}
      </div>

      <h2>Bookings</h2>
      {bookings?.length ? <table className="tbl"><thead><tr><th>Job</th><th>Date</th><th>Location</th><th>Rate</th><th>Contract</th></tr></thead>
        <tbody>{bookings.map((b: any) => {
          const c = Array.isArray(b.contracts) ? b.contracts[0] : b.contracts;
          return <tr key={b.id}><td>{b.jobs?.title}</td><td>{b.shoot_date ?? "TBD"} {b.call_time}</td><td>{b.location}</td>
            <td className="mono">${b.rate_usd?.toLocaleString()}</td>
            <td>{c ? <Link href={`/contracts/${c.id}`}>{c.talent_signed_at ? "View" : "Review & sign"}</Link> : "—"}</td></tr>;
        })}</tbody></table> : <p className="hint">No bookings yet. Submit to open jobs to get booked.</p>}

      <h2>Submissions</h2>
      {apps?.length ? <table className="tbl"><thead><tr><th>Job</th><th>Client</th><th>Status</th><th /></tr></thead>
        <tbody>{apps.map((a: any) => <tr key={a.id}><td><Link href={`/jobs/${a.jobs?.id}`}>{a.jobs?.title}</Link></td>
          <td>{a.jobs?.companies?.name}</td><td><span className={`pill ${a.status}`}>{a.status}</span></td>
          <td>{["applied", "shortlisted"].includes(a.status) &&
            <form action={withdrawApplication}><input type="hidden" name="id" value={a.id} /><button className="link-btn">Withdraw</button></form>}</td></tr>)}
        </tbody></table> : <p className="hint">No submissions yet. <Link href="/jobs">Browse open jobs</Link>.</p>}

      <h2>Profile</h2>
      <form action={saveTalentProfile} className="form">
        <h3 className="full">Basics</h3>
        <label>Display name<input id="display_name" name="display_name" defaultValue={v("display_name")} required /></label>
        <label>Headline<input id="headline" name="headline" defaultValue={v("headline")} placeholder="Former D1 sprinter, fitness model" /></label>
        <label className="full">Bio<textarea id="bio" name="bio" defaultValue={v("bio")} /></label>

        <h3 className="full">Location</h3>
        <label>City<input id="city" name="city" defaultValue={v("city")} /></label>
        <label>State<input id="state" name="state" maxLength={2} defaultValue={v("state")} /></label>
        <label>ZIP<input id="zip" name="zip" maxLength={5} defaultValue={v("zip")} /></label>
        <label>Will travel (miles)<input id="travel_radius_mi" name="travel_radius_mi" type="number" defaultValue={v("travel_radius_mi")} /></label>

        <h3 className="full">Athletics</h3>
        <label>Sport<input id="sport" name="sport" defaultValue={v("sport")} /></label>
        <label>Position / event<input id="position" name="position" defaultValue={v("position")} /></label>
        {sel("level", "Level", OPTIONS.level)}
        <label>School / team<input id="school" name="school" defaultValue={v("school")} /></label>

        <h3 className="full">Appearance & demographics</h3>
        <label>Birth year<input id="birth_year" name="birth_year" type="number" min={1940} max={2015} defaultValue={v("birth_year")} /></label>
        {sel("gender", "Gender", OPTIONS.gender)}
        <label>Height<span className="pair">
          <input id="height_ft" name="height_ft" type="number" min={4} max={7} placeholder="ft" defaultValue={p?.height_in ? Math.floor(p.height_in / 12) : ""} />
          <input id="height_inch" name="height_inch" type="number" min={0} max={11} placeholder="in" defaultValue={p?.height_in ? p.height_in % 12 : ""} /></span></label>
        <label>Weight (lb)<input id="weight_lb" name="weight_lb" type="number" defaultValue={v("weight_lb")} /></label>
        <label>Shoe size (US)<input id="shoe_size" name="shoe_size" type="number" step="0.5" defaultValue={v("shoe_size")} /></label>
        {sel("hair_color", "Hair color", OPTIONS.hairColor)}
        {sel("hair_length", "Hair length", OPTIONS.hairLength)}
        {sel("eye_color", "Eye color", OPTIONS.eyeColor)}
        <label>Shirt size<input id="shirt" name="shirt" defaultValue={p?.sizes?.shirt ?? ""} /></label>
        <label>Pant size<input id="pant" name="pant" defaultValue={p?.sizes?.pant ?? ""} /></label>
        <fieldset className="full"><legend>Ethnicity (optional, used only for casting searches)</legend>
          <div className="checks">{OPTIONS.ethnicity.map((e) => <label key={e} className="check">
            <input type="checkbox" name="ethnicity" value={e} defaultChecked={p?.ethnicity?.includes(e)} /> {e}</label>)}</div></fieldset>

        <h3 className="full">Work</h3>
        <fieldset className="full"><legend>Gig types</legend><div className="checks">{OPTIONS.gig.map((g) => <label key={g} className="check">
          <input type="checkbox" name="gig_types" value={g} defaultChecked={p?.gig_types?.includes(g)} /> {g}</label>)}</div></fieldset>
        <label>Skills (comma separated)<input id="skills" name="skills" defaultValue={(p?.skills ?? []).join(", ")} placeholder="Juggling, Spanish, stunt driving" /></label>
        <label>Day rate (USD)<input id="day_rate" name="day_rate" type="number" defaultValue={v("day_rate")} /></label>
        <label className="check"><input type="checkbox" name="has_agent" defaultChecked={p?.has_agent} /> I have an agent</label>

        <h3 className="full">NCAA compliance</h3>
        <label className="check full"><input type="checkbox" name="is_ncaa_active" defaultChecked={p?.is_ncaa_active} /> I am a current NCAA student-athlete</label>
        <label>School compliance email<input id="ncaa_email" name="ncaa_email" type="email" defaultValue={v("ncaa_school_compliance_email")} /></label>
        <label className="check full"><input type="checkbox" name="ncaa_ack" defaultChecked={!!p?.ncaa_ack_at} /> I understand I must disclose NIL deals to my school and follow my state&apos;s NIL law and my school&apos;s policies.</label>

        <button className="btn primary full">Save profile</button>
      </form>

      <h2>Photos</h2>
      <PhotoUploader userId={acc.id} />
      <div className="photos">{media?.filter((m) => m.kind === "photo").map((m) => (
        <figure key={m.id}>
          <img src={mediaUrl(m.storage_path)} alt="" loading="lazy" />
          <figcaption className="row">
            {p?.headshot_path === m.storage_path ? <span className="pill ready">Headshot</span> :
              <form action={setHeadshot}><input type="hidden" name="path" value={m.storage_path} /><button className="link-btn">Make headshot</button></form>}
            <form action={deleteMedia}><input type="hidden" name="id" value={m.id} /><button className="link-btn">Delete</button></form>
          </figcaption>
        </figure>))}</div>

      <h2>Videos</h2>
      <VideoUploader />
      <ul className="vlist">{media?.filter((m) => m.kind === "video").map((m) => (
        <li key={m.id}><span>{m.title}</span><span className="row"><span className={`pill ${m.status}`}>{m.status}</span>
          <form action={deleteMedia}><input type="hidden" name="id" value={m.id} /><button className="link-btn">Delete</button></form></span></li>))}</ul>
    </section>
  );
}
