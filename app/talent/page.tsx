import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";
import { OPTIONS, fmtHeight } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";

const PAGE = 24;
type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;
const int = (v: string | string[] | undefined) => { const n = Number(one(v)); return one(v) && Number.isFinite(n) ? n : null; };

// Talent search. All filtering runs in Postgres (search_talent), indexed and paginated,
// so it stays fast at 60K+ profiles.
export default async function TalentSearch({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, int(sp.page) ?? 1);
  const sb = await supabaseServer();

  // Radius search: geocode the ZIP from our zip_codes table
  let near: { lat: number; lng: number } | null = null;
  if (one(sp.zip)) {
    const { data } = await sb.from("zip_codes").select("lat,lng").eq("zip", one(sp.zip)!.slice(0, 5)).maybeSingle();
    near = data;
  }
  const eth = ([] as string[]).concat(sp.ethnicity ?? []).filter(Boolean);

  const { data, error } = await sb.rpc("search_talent", {
    q: one(sp.q), sport_f: one(sp.sport), gig_f: one(sp.gig), ethnicity_f: eth.length ? eth : null,
    gender_f: one(sp.gender),
    min_height: int(sp.hmin), max_height: int(sp.hmax),
    min_weight: int(sp.wmin), max_weight: int(sp.wmax),
    min_shoe: int(sp.smin), max_shoe: int(sp.smax),
    hair_color_f: one(sp.hair), hair_length_f: one(sp.hairlen), eye_color_f: one(sp.eyes),
    skill_f: one(sp.skill), min_age: int(sp.amin), max_age: int(sp.amax),
    near_lat: near?.lat ?? null, near_lng: near?.lng ?? null, radius_mi: near ? int(sp.radius) ?? 50 : null,
    page_size: PAGE, page_offset: (page - 1) * PAGE,
  });

  const total = Number(data?.[0]?.total ?? 0);
  const pages = Math.ceil(total / PAGE);
  const qs = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => ([] as string[]).concat(v ?? []).forEach((x) => k !== "page" && u.append(k, x)));
    u.set("page", String(p)); return `?${u}`;
  };
  const sel = (name: string, label: string, opts: string[]) => (
    <label>{label}<select id={name} name={name} defaultValue={one(sp[name]) ?? ""}>
      <option value="">Any</option>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
  );
  const range = (a: string, b: string, label: string, ph: [string, string]) => (
    <fieldset className="range"><legend>{label}</legend>
      <input id={a} name={a} type="number" placeholder={ph[0]} defaultValue={one(sp[a]) ?? ""} aria-label={`${label} min`} />
      <span>to</span>
      <input id={b} name={b} type="number" placeholder={ph[1]} defaultValue={one(sp[b]) ?? ""} aria-label={`${label} max`} />
    </fieldset>
  );

  return (
    <section className="search-layout">
      <form className="filter-panel">
        <h2>Search talent</h2>
        <label>Keyword<input id="q" name="q" defaultValue={one(sp.q) ?? ""} placeholder="Name, school, position" /></label>
        <label>Sport<input id="sport" name="sport" defaultValue={one(sp.sport) ?? ""} placeholder="e.g. Soccer" /></label>
        <label>Skill<input id="skill" name="skill" defaultValue={one(sp.skill) ?? ""} placeholder="e.g. Bilingual, stunts" /></label>
        {sel("gig", "Gig type", OPTIONS.gig)}
        <fieldset><legend>Location radius</legend>
          <input id="zip" name="zip" placeholder="ZIP" maxLength={5} defaultValue={one(sp.zip) ?? ""} aria-label="ZIP code" />
          <select id="radius" name="radius" defaultValue={one(sp.radius) ?? "50"} aria-label="Radius">
            {[10, 25, 50, 100, 250].map((r) => <option key={r} value={r}>{r} mi</option>)}
          </select>
        </fieldset>
        {range("amin", "amax", "Age range", ["18", "35"])}
        {sel("gender", "Gender", OPTIONS.gender)}
        <fieldset><legend>Ethnicity</legend>
          <div className="checks">{OPTIONS.ethnicity.map((e) => (
            <label key={e} className="check"><input type="checkbox" name="ethnicity" value={e} defaultChecked={eth.includes(e)} /> {e}</label>
          ))}</div>
        </fieldset>
        {range("hmin", "hmax", "Height (inches)", ["60", "78"])}
        {range("wmin", "wmax", "Weight (lb)", ["110", "220"])}
        {range("smin", "smax", "Shoe size (US)", ["6", "13"])}
        {sel("hair", "Hair color", OPTIONS.hairColor)}
        {sel("hairlen", "Hair length", OPTIONS.hairLength)}
        {sel("eyes", "Eye color", OPTIONS.eyeColor)}
        <div className="row"><button className="btn primary">Search</button><Link href="/talent">Clear</Link></div>
      </form>

      <div className="results">
        <p className="hint">{error ? `Search failed: ${error.message}` : `${total.toLocaleString()} athletes`}
          {one(sp.zip) && !near && " · ZIP not found, showing all locations"}</p>
        <div className="grid">
          {data?.map((p: any) => (
            <Link key={p.slug} href={`/talent/${p.slug}`} className="card">
              <div className="shot" style={p.headshot_path ? { backgroundImage: `url(${mediaUrl(p.headshot_path)})` } : undefined}>
                <span className="tag">{[p.sport, p.level].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="body">
                <h3>{p.display_name}</h3>
                <p className="hint">{[p.city, p.state].filter(Boolean).join(", ")}{p.miles != null && ` · ${p.miles} mi`}</p>
                <p className="meta"><span>{fmtHeight(p.height_in)}</span>{p.day_rate && <span className="mono">${p.day_rate.toLocaleString()}/day</span>}</p>
              </div>
            </Link>
          ))}
        </div>
        {!error && total === 0 && <div className="empty">No athletes match these filters. Widen a range or remove a filter.</div>}
        {pages > 1 && (
          <div className="row pager">
            {page > 1 && <Link href={qs(page - 1)}>← Previous</Link>}
            <span>Page {page} of {pages.toLocaleString()}</span>
            {page < pages && <Link href={qs(page + 1)}>Next →</Link>}
          </div>
        )}
      </div>
    </section>
  );
}
