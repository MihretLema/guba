import { readFile, writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { seedPublicContent, seedContactPage } from "./public-seed.mjs";
import { randomBytes, scryptSync } from "node:crypto";
try { process.loadEnvFile(".env.local"); } catch { /* Shell environment is also supported. */ }
const adminUrl = process.env.PG_ADMIN_URL;
const databaseUrl = process.env.DATABASE_URL;
if (!adminUrl && !databaseUrl) {
  console.error("Set DATABASE_URL for an existing GUBA database or PG_ADMIN_URL to create a dedicated guba_admin database.");
  process.exitCode = 1;
} else {
  let target = databaseUrl;
  if (!target && adminUrl) {
    const admin = new Pool({ connectionString: adminUrl, max: 1, connectionTimeoutMillis: 5000 });
    try {
      const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", ["guba_admin"]);
      if (!exists.rowCount) await admin.query("CREATE DATABASE guba_admin");
      const url = new URL(adminUrl); url.pathname = "/guba_admin"; target = url.toString();
    } finally { await admin.end(); }
  }
  const database = new Pool({ connectionString: target, max: 1, connectionTimeoutMillis: 5000 });
  try {
    await database.query(await readFile(new URL("../db/postgres-schema.sql", import.meta.url), "utf8"));
    await seedPublicContent(database);
    await seedContactPage(database);
    const email = process.env.ADMIN_INITIAL_EMAIL || "mihretlemabelete@gmail.com";
    const existing = await database.query("SELECT 1 FROM guba_admin_users WHERE email = $1", [email]);
    if (!existing.rowCount) {
      const password = process.env.ADMIN_INITIAL_PASSWORD || randomBytes(18).toString("base64url");
      const salt = randomBytes(16).toString("hex");
      const hash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
      await database.query("INSERT INTO guba_admin_users(email, name, password_hash) VALUES ($1, $2, $3)", [email, "GUBA Admin", hash]);
      await writeFile(".env.admin.local", "# Initial GUBA admin credentials. Keep private.\nADMIN_INITIAL_EMAIL=" + JSON.stringify(email) + "\nADMIN_INITIAL_PASSWORD=" + JSON.stringify(password) + "\n");
      console.log("Initial admin created. Credentials are in .env.admin.local (ignored by Git).");
    }
    if (!databaseUrl) {
      let env = "";
      try { env = await readFile(".env.local", "utf8"); } catch { /* First setup. */ }
      await writeFile(".env.local", env + `\nDATABASE_URL=${JSON.stringify(target)}\n`);
    }
    console.log("GUBA database ready: workspace, records, activity. DATABASE_URL is configured.");
  } finally { await database.end(); }
}
