import "./globals.css";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { getAccount, dashboardFor } from "@/lib/auth";

export const metadata = {
  title: "SALT | Sports and Active Lifestyle Talent",
  description: "Book real athletes for print, commercial, social and appearance work.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const acc = await getAccount();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;700&display=swap" />
      </head>
      <body>
        <header className="nav">
          <Link href="/" className="logo" aria-label="SALT home"><img src="/salt-logo.png" alt="SALT: Sports Active Lifestyle Talent" width="955" height="365" /></Link>
          <nav className="links">
            <Link href="/talent">Talent</Link>
            <Link href="/jobs">Jobs</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <ThemeToggle />
            {acc ? <>
              {acc.role === "admin" && <Link href="/admin" className="admin-link">Admin</Link>}
              <Link href={dashboardFor(acc.role)} className="btn">Dashboard</Link>
              <form action="/auth/signout" method="post"><button className="link-btn">Sign out</button></form>
            </> : <>
              <Link href="/login">Sign in</Link>
              <Link href="/register" className="btn primary">Join</Link>
            </>}
          </nav>
        </header>
        {acc && acc.status !== "approved" && acc.role !== "admin" && (
          <div className="banner">Your account is {acc.status}. The SALT team reviews new accounts, usually within 1 business day.</div>
        )}
        <main>{children}</main>
        <footer className="foot">
          <span>© {new Date().getFullYear()} SALT · Sports and Active Lifestyle Talent</span>
          <span><Link href="/about">About</Link> · <Link href="/pricing">Pricing</Link> · <Link href="/register">Join</Link></span>
        </footer>
      </body>
    </html>
  );
}
