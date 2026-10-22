import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { chatGPTSignOutPath } from "../chatgpt-auth";
import { getAdminUser } from "./auth";
import { AdminDashboard } from "./AdminDashboard";
import "./admin.css";
export const metadata: Metadata = { title: "Admin Console", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return <AdminDashboard displayName={user.displayName} email={user.email} signOutPath={user.provider === "password" ? "/api/admin/logout" : chatGPTSignOutPath("/admin/login")} />;
}
