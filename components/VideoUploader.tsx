"use client";
import MuxUploader from "@mux/mux-uploader-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VideoUploader() {
  const [title, setTitle] = useState("Highlight reel");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const endpoint = async () => {
    const res = await fetch("/api/uploads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const json = await res.json();
    if (!res.ok) { setMsg(json.error); throw new Error(json.error); }
    return json.url as string;
  };

  return (
    <div className="uploader">
      <label>Video title<input id="video-title" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <MuxUploader endpoint={endpoint}
        onSuccess={() => { setMsg("Uploaded. Processing takes about a minute."); router.refresh(); }}
        onUploadError={() => setMsg("Upload failed. Check your connection and try again.")} />
      <p className="hint">MP4 or MOV, up to 3 minutes. 5 videos per profile.</p>
      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
