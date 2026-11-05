import Link from "next/link";
import { LoginForm } from "@/components/AuthForm";
import { getAccount, dashboardFor } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const acc = await getAccount();
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  return (
    <section className="narrow">
      <h1>Sign in</h1>
      {acc && <p className="msg">You&apos;re signed in as {acc.email} ({acc.role}). <Link href={dashboardFor(acc.role)}>Go to your dashboard</Link></p>}
      {!acc && user && <p className="msg err">You&apos;re signed in as {user.email}, but this login has no SALT account yet. Ask an admin to set it up, or register a new account.</p>}
      {sp.error === "no-account" && !user && <p className="msg err">This login has no SALT account. Register first.</p>}
      <LoginForm />
      <p className="hint">New to SALT? <Link href="/register">Create an account</Link></p>
    </section>
  );
}
