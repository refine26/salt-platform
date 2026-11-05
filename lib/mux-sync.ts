import { mux, MAX_VIDEO_SECONDS } from "@/lib/mux";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Backup for the Mux webhook: asks Mux directly about videos still uploading or processing
 * and updates them. Runs when a talent dashboard loads, so videos reach "ready" even if
 * the webhook is missing or delayed.
 */
export async function syncPendingVideos(ownerId: string) {
  const db = supabaseAdmin();
  const { data: pending } = await db.from("media")
    .select("id, mux_upload_id, mux_asset_id")
    .eq("owner_id", ownerId).eq("kind", "video").in("status", ["uploading", "processing"]);
  if (!pending?.length) return;

  await Promise.all(pending.map(async (m) => {
    try {
      let assetId = m.mux_asset_id as string | null;
      if (!assetId && m.mux_upload_id) {
        const up = await mux.video.uploads.retrieve(m.mux_upload_id);
        if (up.status === "errored" || up.status === "cancelled" || up.status === "timed_out") {
          await db.from("media").update({ status: "errored" }).eq("id", m.id);
          return;
        }
        assetId = up.asset_id ?? null;
        if (assetId) await db.from("media").update({ status: "processing", mux_asset_id: assetId }).eq("id", m.id);
      }
      if (!assetId) return;
      const asset = await mux.video.assets.retrieve(assetId);
      if (asset.status === "ready") {
        if ((asset.duration ?? 0) > MAX_VIDEO_SECONDS) {
          await mux.video.assets.delete(assetId);
          await db.from("media").update({ status: "errored" }).eq("id", m.id);
          return;
        }
        await db.from("media").update({
          status: "ready", mux_playback_id: asset.playback_ids?.[0]?.id, duration_seconds: asset.duration,
        }).eq("id", m.id);
      } else if (asset.status === "errored") {
        await db.from("media").update({ status: "errored" }).eq("id", m.id);
      }
    } catch { /* Mux unreachable or bad keys: leave as is */ }
  }));
}
