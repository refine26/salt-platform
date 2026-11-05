import { notFound } from "next/navigation";
import Reel from "@/components/Reel";
import { mediaUrl } from "@/lib/media";
import { supabaseServer } from "@/lib/supabase";
import { fmtHeight } from "@/lib/auth";

export default async function TalentProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = await supabaseServer();
  const { data: p } = await sb.from("talent_profiles").select("*").eq("slug", slug).maybeSingle();
  if (!p) notFound();
  const { data: media } = await sb.from("media")
    .select("id, kind, title, storage_path, mux_playback_id")
    .eq("owner_id", p.id).eq("status", "ready").order("sort_order");

  const photos = media?.filter((m) => m.kind === "photo") ?? [];
  const videos = media?.filter((m) => m.kind === "video") ?? [];
  const age = p.birth_year ? new Date().getFullYear() - p.birth_year : null;
  const stats: [string, any][] = [
    ["Height", fmtHeight(p.height_in)], ["Weight", p.weight_lb && `${p.weight_lb} lb`],
    ["Shoe", p.shoe_size], ["Hair", [p.hair_color, p.hair_length].filter(Boolean).join(", ")],
    ["Eyes", p.eye_color], ["Age", age], ["Shirt", p.sizes?.shirt], ["Pant", p.sizes?.pant],
  ];

  return (
    <section className="profile">
      <div className="profile-head">
        <div className="headshot" style={p.headshot_path ? { backgroundImage: `url(${mediaUrl(p.headshot_path)})` } : undefined} />
        <div>
          <p className="eyebrow">{[p.sport, p.position, p.level].filter(Boolean).join(" · ")}</p>
          <h1>{p.display_name}</h1>
          <p className="hint">{[p.city, p.state].filter(Boolean).join(", ")}{p.school && ` · ${p.school}`}
            {p.travel_radius_mi && ` · travels ${p.travel_radius_mi} mi`}</p>
          {p.headline && <p className="lede">{p.headline}</p>}
          {p.day_rate && <p className="mono">${p.day_rate.toLocaleString()} / day</p>}
          {p.is_ncaa_active && <p className="pill">Current NCAA athlete · NIL rules apply</p>}
        </div>
      </div>

      <dl className="comp-card">
        {stats.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>

      {p.bio && <p className="prose">{p.bio}</p>}
      <div className="chips">
        {(p.gig_types ?? []).map((g: string) => <span key={g} className="chip-gig">{g}</span>)}
        {(p.skills ?? []).map((s: string) => <span key={s}>{s}</span>)}
      </div>

      {videos.length > 0 && <><h2>Reels</h2>
        <div className="videos">{videos.map((v) => (
          <figure key={v.id}><Reel playbackId={v.mux_playback_id} src={v.storage_path} title={v.title} />
            <figcaption>{v.title}</figcaption></figure>))}
        </div></>}

      {photos.length > 0 && <><h2>Photos</h2>
        <div className="photos">{photos.map((m) => <img key={m.id} src={mediaUrl(m.storage_path)} alt={`${p.display_name}`} loading="lazy" />)}</div></>}
    </section>
  );
}
