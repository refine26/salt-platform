"use client";
import { useActionState, useState } from "react";
import { register, login } from "@/lib/actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, null as any);
  const [role, setRole] = useState("talent");
  return (
    <form action={action} className="form single">
      <div className="seg" role="radiogroup">
        {["talent", "client"].map((r) => (
          <label key={r} className={role === r ? "on" : ""}>
            <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
            {r === "talent" ? "I'm talent" : "I'm hiring"}
          </label>
        ))}
      </div>
      <label>Full name<input id="full_name" name="full_name" required autoComplete="name" /></label>
      <label>Email<input id="email" name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
      {role === "client" && <>
        <label>Company name<input id="company" name="company" required /></label>
        <label>Company website<input id="website" name="website" type="url" placeholder="https://" /></label>
      </>}
      <button className="btn primary" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      {state?.error && <p className="msg err">{state.error}</p>}
      {state?.ok && <p className="msg">{state.ok}</p>}
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null as any);
  return (
    <form action={action} className="form single">
      <label>Email<input id="email" name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input id="password" name="password" type="password" required autoComplete="current-password" /></label>
      <button className="btn primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      {state?.error && <p className="msg err">{state.error}</p>}
    </form>
  );
}
