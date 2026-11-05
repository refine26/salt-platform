"use client";
export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "48px 16px", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>Reloading usually fixes it.</p>
        <button onClick={() => window.location.reload()} style={{ padding: "10px 18px", borderRadius: 999, cursor: "pointer" }}>Reload page</button>
      </body>
    </html>
  );
}
