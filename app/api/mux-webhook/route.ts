import { NextResponse } from "next/server";
import { mux, MAX_VIDEO_SECONDS } from "@/lib/mux";
import { supabaseAdmin } from "@/lib/supabase";

/** Mux tells us when uploads finish processing. Updates the video row. */
export async function POST(req: Request) {
  const body = await req.text();
  let event: any;
  try {
    event = mux.webhooks.unwrap(body, req.headers);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const data = event.data;

  switch (event.type) {
    case "video.upload.asset_created":
      await db.from("media")
        .update({ status: "processing", mux_asset_id: data.asset_id })
        .eq("mux_upload_id", data.id);
      break;

    case "video.asset.ready": {
      if (data.duration > MAX_VIDEO_SECONDS) {
        await mux.video.assets.delete(data.id);
        await db.from("media").update({ status: "errored" }).eq("mux_asset_id", data.id);
        break;
      }
      await db.from("media").update({
        status: "ready",
        mux_playback_id: data.playback_ids?.[0]?.id,
        duration_seconds: data.duration,
      }).eq("mux_asset_id", data.id);
      break;
    }

    case "video.asset.errored":
    case "video.upload.errored":
    case "video.upload.cancelled":
      await db.from("media").update({ status: "errored" })
        .or(`mux_asset_id.eq.${data.id},mux_upload_id.eq.${data.id}`);
      break;
  }
  return NextResponse.json({ ok: true });
}
