import Link from "next/link";
import { LoginForm } from "@/components/AuthForm";
export default function Login() {
  return (
    <section className="narrow">
      <h1>Sign in</h1>
      <LoginForm />
      <p className="hint">New to SALT? <Link href="/register">Create an account</Link></p>
    </section>
  );
}
