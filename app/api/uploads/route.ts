import { NextResponse } from "next/server";
import { mux } from "@/lib/mux";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase";

/**
 * Creates a Mux direct-upload URL. The browser sends the file straight to Mux,
 * so large videos never pass through our servers. This is what lets 60K users upload.
 */
export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });

  const { data: acc } = await sb.from("accounts").select("role").eq("id", user.id).single();
  if (acc?.role !== "talent") return NextResponse.json({ error: "Only talent accounts can upload video." }, { status: 403 });

  const { title = "Reel" } = await req.json().catch(() => ({}));
  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_SITE_URL ?? "*",
    new_asset_settings: {
      playback_policy: ["public"],
      encoding_tier: "baseline",         // lowest-cost encoding tier
      max_resolution_tier: "1080p",
      passthrough: user.id,
    },
  });

  const { error } = await supabaseAdmin().from("media").insert({
    owner_id: user.id, kind: "video", title: String(title).slice(0, 120),
    status: "uploading", mux_upload_id: upload.id,
  });
  if (error) {
    await mux.video.uploads.cancel(upload.id).catch(() => {});
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ url: upload.url });
}
