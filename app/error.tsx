"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // After a new deploy, old pages can point at code that no longer exists. A full reload fixes it.
    if (/Server Action|Failed to fetch dynamically imported module|ChunkLoadError/i.test(error.message)) {
      window.location.reload();
    }
  }, [error]);
  return (
    <section className="narrow">
      <h1>Something went wrong</h1>
      <p className="lede">The page hit an error. Reloading usually fixes it.</p>
      <div className="row">
        <button className="btn primary" onClick={() => window.location.reload()}>Reload page</button>
        <button className="btn" onClick={() => reset()}>Try again</button>
      </div>
    </section>
  );
}
