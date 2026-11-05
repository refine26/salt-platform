"use client";
import MuxPlayer from "@mux/mux-player-react";
import { mediaUrl } from "@/lib/media";

/** Plays a Mux video when there is a playback ID, otherwise a plain MP4 (demo placeholders). */
export default function Reel({ playbackId, src, title, style }: {
  playbackId?: string | null; src?: string | null; title?: string | null; style?: React.CSSProperties;
}) {
  if (playbackId) return <MuxPlayer playbackId={playbackId} streamType="on-demand" metadata={{ video_title: title ?? "" }} style={style as any} />;
  if (!src) return null;
  return <video src={mediaUrl(src)} controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 10, background: "#000", ...style }} />;
}
