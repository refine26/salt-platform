"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { addPhoto } from "@/lib/actions";

/** Uploads straight from the browser to Supabase Storage, then records it. */
export default function PhotoUploader({ userId }: { userId: string }) {
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { setMsg(`${file.name} is over 10 MB.`); continue; }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      setMsg(`Uploading ${file.name}…`);
      const { error } = await supabaseBrowser().storage.from("photos").upload(path, file, { cacheControl: "31536000" });
      if (error) { setMsg(error.message); continue; }
      try { await addPhoto(path); } catch (err: any) { setMsg(err.message); continue; }
    }
    setMsg("Photos uploaded.");
    e.target.value = "";
    router.refresh();
  }

  return (
    <div className="uploader">
      <label>Add photos (headshots, full body, action)
        <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onChange} />
      </label>
      <p className="hint">JPG, PNG or WebP up to 10 MB. 20 photos per profile.</p>
      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
