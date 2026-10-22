import { DeveloperCredit } from "../../DeveloperCredit";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { chatGPTSignInPath } from "../../chatgpt-auth";
import { getAdminUser } from "../auth";
import { LoginForm } from "./LoginForm";
import "../admin.css";
export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect("/admin");
  return <main className="admin-login"><div className="admin-login-art" aria-hidden="true"><Image unoptimized className="admin-login-hero-image" src="/guba-hero-3d.png" alt="" fill sizes="(max-width: 760px) 100vw, 46vw" priority /><div className="admin-login-hero-shade" /><p>GUBA<br /><strong>ADMIN WORKSPACE</strong></p><div className="admin-login-caption"><h2>Engineering progress.<br /><em>Empowering growth.</em></h2><span>Your content, people, and progress. One connected workspace.</span></div></div><section className="admin-login-content"><Link href="/" className="admin-login-home">← Back to website</Link><div className="admin-login-card"><div className="admin-login-mark">G</div><span className="admin-login-eyebrow">GUBA ADMINISTRATION</span><h1>Welcome back.</h1><p>Sign in to manage your website and shared records.</p><LoginForm /><div className="admin-login-divider" />{process.env.TRUST_CHATGPT_AUTH_HEADERS === "true" ? <><a className="login-chatgpt" href={chatGPTSignInPath("/admin")}>Continue with ChatGPT ↗</a><small>Use an approved workspace account.</small></> : <small>Access is limited to approved GUBA administrators.</small>}</div><div className="admin-login-foot">© 2026 GUBA Engineering Investment Group<DeveloperCredit /></div></section></main>;
}
