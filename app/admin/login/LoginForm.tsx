"use client";
import { useState, type FormEvent } from "react";
export function LoginForm() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try { const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error); window.location.assign("/admin"); }
    catch (err) { setError(err instanceof Error ? err.message : "Sign-in failed"); setBusy(false); }
  }
  return <form action="/api/admin/login" method="post" className="admin-password-form" onSubmit={event => void submit(event)}>{error && <p role="alert" className="login-error">{error}</p>}<label>Email<input name="email" type="email" required autoComplete="username" maxLength={320} /></label><div className="login-password-field"><label htmlFor="admin-password">Password</label><div className="login-password-control"><input id="admin-password" name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" maxLength={256} /><button type="button" className="login-password-toggle" aria-controls="admin-password" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button></div></div><button className="admin-login-button" disabled={busy}>{busy ? "Signing in…" : "Sign in to dashboard"}<span>→</span></button></form>;
}
