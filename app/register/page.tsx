import Link from "next/link";
import { RegisterForm } from "@/components/AuthForm";
export default function Register() {
  return (
    <section className="narrow">
      <h1>Join SALT</h1>
      <RegisterForm />
      <p className="hint">Already have an account? <Link href="/login">Sign in</Link></p>
    </section>
  );
}
