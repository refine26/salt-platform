/** Photo URL: site-hosted paths ("/demo/x.svg") and full URLs pass through; others live in Supabase Storage. */
export function mediaUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("/") || path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}
