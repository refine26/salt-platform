"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    let t: string | null = null;
    try { t = localStorage.getItem("salt-theme"); } catch {}
    const initial = (t as "light" | "dark") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("salt-theme", next); } catch {}
  };
  return <button className="icon-btn" onClick={flip} aria-label="Toggle dark mode">{theme === "dark" ? "☀" : "☾"}</button>;
}
