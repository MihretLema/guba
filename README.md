# GUBA Engineering Investment Group

React 19 / TypeScript, Next.js App Router conventions through Vinext/Vite, Cloudflare Workers and PostgreSQL. The ETAT-style admin dashboard and public website share the same database.

## Run locally

Requirements: Node.js >=22.13.0 and PostgreSQL.

```powershell
npm install
# Configure DATABASE_URL for an existing dedicated GUBA database, or
# PG_ADMIN_URL for a local connection allowed to create guba_admin.
npm run db:setup:postgres
npm run dev
```

Open `/admin/login`. First setup creates an administrator and saves initial email/password credentials in **`.env.admin.local`**, which is ignored by Git. Reset the password through **Access → Reset password**; this signs out the account's existing sessions. Setup preserves existing accounts and records. Set `ADMIN_INITIAL_EMAIL` and optionally `ADMIN_INITIAL_PASSWORD` before first setup to customize the initial account.

The local installation uses its own `guba_admin` database. ETAT's application and database are unchanged.

## Contact page

Open `/contact`. Manage page copy, office/branch names, public email, phone and WhatsApp numbers, address, opening hours, visitor notes and social links in **Admin → Contact information**. Edit the initial main record for the page heading and primary contact details; add more published records for branch offices. Blank details are omitted without inventing business information.

An address or latitude/longitude pair creates a map and directions link. Alternatively, supply an approved Google Maps or OpenStreetMap embed URL (the URL only, not iframe HTML). Contact form messages, including optional phone, company and enquiry topic, arrive in **Contact messages**. The quotation tab saves to **RFQ requests**. Published edits refresh the contact page automatically.

## Admin to website behavior

New public content defaults to **Published**, so saving it makes it visible. Choose **Draft** while preparing content or **Archived** to withdraw it. Edits and deletions update the website too. Deleting the final record does not restore hardcoded samples.

- **Homepage:** placement `hero` controls the hero, `about` controls the about introduction, and blank placement or `section` adds a homepage announcement. Hero fields include subtitle, image and proof metrics.
- **Services, projects, insights, training, events, jobs, products, partners, clients, testimonials, media and newsletter posts:** published records appear on the homepage and have public detail pages. The media library renders image/file URLs; it does not upload binary files.
- **AI knowledge:** published question/answer matches feed the website assistant. The assistant also reads current services, projects and training programs.
- **SEO manager:** publish a title/description for a page path, such as `/` or a content detail URL. Published records also feed the sitemap. Set `SITE_URL` for a custom production domain.
- **Settings:** site name and contact email update the website; maintenance mode shows visitors a maintenance page while keeping the admin accessible.
- **Visitor forms:** contact messages, RFQs, job applications, event/training registrations and newsletter subscriptions save directly to their private admin inboxes. Job deadlines and event capacity are checked on the server. CVs use HTTPS document/portfolio URLs.
- **Access, activity and backup:** these manage private administrator data and never become public website content.

Open website tabs check for updates every five seconds and on focus. Saving in the admin broadcasts an update immediately to other tabs in the same browser. Admin inboxes refresh automatically when no editor/settings form is open. Fresh page requests always read current published content.

Existing marketing content is migrated into editable records once by `npm run db:setup:postgres`. It preserves sections that already have records and does not recreate records after deletion. Existing drafts stay private until published.

Subscriber records remain private even if accidentally marked Published. Public newsletter posts are separate records without subscriber emails. Subscriptions are stored for the team; no outbound mailing service is configured.

## Persistence and backups

All administrators share one workspace. Saves use transactions and revision checks, preventing a stale editor from overwriting another administrator or a new visitor submission. Reload on a conflict before retrying. A failed save is never presented as a success.

**Backup & restore** exports JSON/CSV, restores shared content/settings and imports legacy browser records. JSON restore preserves server audit history and does not change accounts or sessions. Keep backups separately; the JSON export is not a full PostgreSQL disaster-recovery backup. Legacy browser copies remain intact. Older backups with nonempty “Users & roles” records require review rather than silently granting access.

## Authentication

Local accounts use salted scrypt password hashes and random, hashed session tokens with an eight-hour expiry. Cookies are HttpOnly/SameSite and Secure on HTTPS. Sign-in attempts are throttled. Administrators can add accounts, reset passwords and disable other accounts; you cannot disable your own account.

ChatGPT sign-in is optional. Enable `TRUST_CHATGPT_AUTH_HEADERS=true` only behind a trusted hosting gateway that removes client-supplied identity headers and injects authenticated identity. It is disabled for direct Node/local hosting by default. `ADMIN_EMAILS` controls the ChatGPT allowlist, not local accounts. Dispatch owns the sign-in/sign-out/callback paths when enabled.

## Database and verification

`db/postgres-schema.sql` creates shared settings/revisions, section/id-keyed JSONB records, server audit history, administrator accounts, hashed sessions, login/submission throttling and migration tracking. Public submissions and admin saves lock the same revision row so they cannot silently overwrite each other. Optional D1/Drizzle starter files remain separate.

```powershell
npm run typecheck
npm run lint
npm test
npm run start -- --port 3001
```

Integration tests build production code and run in an isolated temporary PostgreSQL schema. They cover authentication, asset loading, persistence, validation, edit conflicts, every public collection's publish/edit/archive/delete lifecycle, detail pages, metadata, settings, maintenance, visitor forms, subscriber privacy, capacity limits, backup restore and logout. Test schemas are removed afterward.

The Node start wrapper normalizes Vinext 0.0.50's Windows asset-cache keys without editing dependencies. It binds to `127.0.0.1`; configure `HOST`/`PORT` for deployment. Configure the database connection in the hosting environment before deployment. This work updates the local installation.

Service and project images: In Admin → Services or Projects, drag and drop a local image or choose Upload service/project image (JPG, PNG or WebP, up to 5 MB), then save as Published. Uploads are converted to WebP and stored in PostgreSQL in guba_images; database backups must include this table. Workspace JSON exports contain image references, not the binary assets.
