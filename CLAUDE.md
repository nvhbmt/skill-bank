# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Skill Bank (SkillBank) — a Vietnamese skill/project marketplace where users post projects, list the
skills those projects need, and apply to join. Astro 5 in SSR mode on Vercel, with Supabase for auth,
Postgres, and file storage. Repo: `github.com:nvhbmt/skill-bank.git`, default branch `master`.

## Commands

```bash
npm run dev            # astro dev on :4321
npm run build          # astro build (SSR output for the Vercel adapter)
npm run preview
npm run format         # prettier --write .
npm run format:check
npx astro check        # the only type-check available (no `typecheck` script)
```

There is **no test framework and no ESLint config** in this repo despite `.vscode/extensions.json`
recommending the ESLint extension. `astro check` is the whole gate (it needs `@astrojs/check` +
`typescript`, which are not in `package.json` — install them with `npm i --no-save` when you need it).

**Do not run `npm run format` on the whole repo.** Most files were never Prettier-formatted, so a
repo-wide run rewrites ~140 files. Format only files you actually touched.

### Local Supabase (dev)

The repo ships a full local stack — see `supabase/README.md` for accounts and seed contents:

```bash
npm run db:start     # Docker: Postgres + GoTrue + PostgREST + Storage + Studio
npm run db:reset     # rebuild schema + reload mock data
npm run dev
npm run db:types     # regenerate src/types/database.types.ts from the local schema
```

`.env` points at `http://127.0.0.1:54321`. Mock accounts all use password `Password123` and sign in
by **username** (`admin`, `viethoang`, `thimai`, `minhduc`, `ngoclan`). Studio is on :54323, Mailpit
(for OTP emails) on :54324.

`supabase/migrations/` was **reconstructed from `src/types/database.types.ts`**, not dumped from
production, and its RLS policies are deliberately loose (read open, write requires a session). Treat
it as a dev fixture, not a source of truth for the production schema.

`package-lock.json` is the maintained lockfile (`pnpm-lock.yaml` is stale — last touched two days
earlier). Use npm.

### Environment

No `.env.example` is committed. `src/env.d.ts` is the source of truth:

| Var | Required | Used by |
|---|---|---|
| `SUPABASE_URL` | yes | every client |
| `SUPABASE_ANON_KEY` | yes | every client |
| `SUPABASE_SERVICE_ROLE_KEY` | practically | `createServiceRoleClient()` — **silently falls back to the anon key**, so notification inserts fail under RLS without it |

### Database types

`src/types/database.types.ts` is the one every file imports. `src/types/supabase.ts` is an
unimported second snapshot — confusingly it is *newer* (2025-11-23 vs 2025-11-20) and carries
`project_skills.description`, but it is missing `contracts` and `deliveries`. Neither file alone
matched the code: `database.types.ts` lacked `project_skills.description` even though
`api/projects/create.ts` inserts it, which broke `astro check`. That column has been added by hand.

Regenerate from the local stack with `npm run db:types`, or from the hosted project with
`npx supabase gen types typescript --project-id <id> > src/types/database.types.ts`.

## Request lifecycle

`src/middleware.ts` runs on every request: it reads the `sb-access-token` / `sb-refresh-token`
cookies, calls `supabase.auth.setSession()` to revive the session, and puts it on
`Astro.locals.session` (typed in `src/env.d.ts`). Everything downstream reads `locals.session`.

Middleware now strips the locale segment before matching `protectedRoutes`
(`/admin`, `/dashboard`, `/create-project`, `/my-project`, `/edit-profile`) and redirects to
`/{lang}/sign-in`. Before that fix it compared bare paths like `/admin` against real ones like
`/vi/admin`, so it never fired and redirected to a non-existent `/login`.

Middleware is defence in depth only — **pages and API routes still carry their own guards**, and new
protected surfaces must add theirs rather than relying on the middleware list:

```astro
const session = Astro.locals.session;
if (!session?.user) return Astro.redirect(l('/sign-in'));
```

Admin gating is a `user_info.role === 'admin'` lookup, duplicated in both the page frontmatter
(`src/pages/[lang]/admin/index.astro`) and each `src/pages/api/admin/*` handler. There is no shared
helper — if you add an admin surface you must write both checks.

### Auth is hand-rolled cookies, not `@supabase/ssr`

`@supabase/ssr` is in `package.json` but unused. `src/pages/api/auth/sign-in.ts` sets `sb-access-token`
(7d) and `sb-refresh-token` (30d) as `httpOnly; secure; sameSite=lax` cookies itself. Sign-in is by
**username**: the route looks up `user_info.email` by username first, then calls
`signInWithPassword`. OAuth (Google/Facebook) returns tokens in the URL hash, and
`src/assets/script/sign-in.js` POSTs them to `/api/auth/oauth-callback` to set the same cookies.

## The three Supabase clients (`src/lib/supabase.ts`)

Picking the wrong one is the most common source of silent RLS failures:

- **`supabase`** — module-level anon client, no user context. Used by all of `src/services/*` and by
  read-only API routes. Only sees rows exposed by anon RLS policies.
- **`createAuthenticatedClient(session)`** — anon key + the user's session. **Required for every
  write** (project create/update/delete, applications, profile updates, admin actions) so RLS sees
  `auth.uid()`.
- **`createServiceRoleClient()`** — bypasses RLS. Used in exactly one place, `src/services/notifications.ts`,
  because a user must be able to insert a notification row addressed to someone else.

Note that services use the anon client while the API routes wrapping them use the authenticated one —
so a service function called from a page frontmatter and the same data fetched through its API route
can see different rows.

## Layers

- **`src/pages/[lang]/**.astro`** — SSR pages. Data comes either from a `src/services/*` call in the
  frontmatter (dashboard, admin, profile, project detail) or from a client-side `fetch` to
  `/api/*` (explore, search, notifications). Both patterns are in use; follow whichever the
  neighbouring page uses.
- **`src/pages/api/**.ts`** — JSON endpoints. Not locale-prefixed.
- **`src/services/*.ts`** — all Supabase queries, grouped by feature, each exporting its own row types
  derived from `Tables<'...'>`. Pages and API routes should not query Supabase inline (several still
  do; prefer adding to a service).
- **`src/schemas/*.ts`** — Zod schemas with Vietnamese error messages.
- **`src/utils/`** — `response.ts`, `normalizeZodError.ts`, `notification-renderer.ts`.

### API route conventions

Every route file starts with `export const prerender = false;` **above the imports**, then:

```ts
const validated = someSchema.safeParse(Object.fromEntries(await request.formData()));
if (!validated.success)
    return httpResponse.fail('Thông tin không hợp lệ', 400, normalizeZodError(validated));
...
return httpResponse.ok(data, 'Thành công', 200);
```

`httpResponse` (default export of `src/utils/response.ts`) emits `{success, message, data?, error?}`.
`normalizeZodError` flattens Zod issues to `{field: message}` for the client to paint onto inputs.
Handlers wrap everything in try/catch and return `httpResponse.fail(..., 500)`. **User-facing messages
are Vietnamese**, even in code with English comments.

Forms post `multipart/form-data` (`request.formData()`), not JSON, wherever a file upload is involved.
`create-project` parses repeated `skill-<n>` / `skill-<n>-description` / `milestone-<n>` field names
out of the FormData by prefix; cover images go to the `project-covers` storage bucket under
`<userId>/<timestamp>.<ext>`.

## i18n

Locale is a route segment: everything lives under `src/pages/[lang]/`, and `src/pages/index.astro`
redirects `/` → `/vi`. `src/i18n/{vi,en}.json` hold the strings, `vi` is the fallback for missing keys.

Pages read the locale straight off `Astro.params.lang` in SSR, so no `getStaticPaths` is involved:

```astro
import { useTranslate } from '@/i18n';
const { lang, t, l } = useTranslate(Astro);
```

30 files used to re-export `getStaticPaths` from `@/i18n`; Astro **ignores it in `output: 'server'`**
and logged a warning per file on every request and build. Those re-exports have been removed. The
`getStaticPaths` function still exists in `src/i18n/index.ts` but nothing uses it — only bring it
back on a page you also mark `export const prerender = true`.

`t('some.nested.key')` is type-checked against `vi.json`'s shape (`TranslationKey`). `l('/explore')`
prefixes the current locale — **always build internal hrefs with `l()`**, never a bare path, or the
user drops out of their locale. The language `<select>` in `Header.astro` is handled by
`src/assets/script/header.js`, which swaps the first path segment and reloads.

Notifications are stored as a type plus a JSON payload, then rendered per-locale at display time by
`src/utils/notification-renderer.ts` (`{{var}}` substitution against `notifications.*` translations).
Never store a formatted notification string.

## Client-side JavaScript

No framework, no islands — plain ES5-ish `.js` files in `src/assets/script/`, one per page, loaded at
the bottom of the page with `<script src="@/assets/script/explore.js"></script>` and wrapped in
`DOMContentLoaded`. Two globals they rely on:

- **JustValidate** is loaded from a CDN `<script>` in `DefaultLayout.astro`, so it is `window.JustValidate`
  (the npm `just-validate` dep is unused; `src/types/just-validate.d.ts` is a stub).
- **`window.showToast({title, message, type})`** from `ToastDialog.astro`, which `DefaultLayout` renders
  once. Types in `src/types/toast.d.ts`.

Translated strings reach these scripts through a `define:vars` bridge in the page, since the script
files are outside Astro's compilation:

```astro
<script define:vars={{ validationMessages: JSON.stringify({...t(...)}) }}>
    window.loginValidationMessages = JSON.parse(validationMessages);
</script>
<script src="@/assets/script/sign-in.js"></script>
```

Client code building HTML from API data must run it through the local `escapeHtml` helper —
`innerHTML` is the norm in these files.

## Layouts, components, CSS

`DefaultLayout` is the html shell (`global.css`, Google Fonts + Font Awesome + Ionicons +
JustValidate from CDNs, `ToastDialog`) and all 21 pages go through it, placing `Header`/`Footer`
themselves. `AuthPageLayout` wraps it with prop-driven password-recovery chrome and a named `form`
slot (used by `forgot-password`, `enter-code`, `set-new-password`). `MainLayout` is dead code — no
page imports it.

Styling is plain CSS, **one file per page** in `src/assets/css/`, imported from the page frontmatter
(`import '@/assets/css/explore.css';`). Components use Astro scoped `<style>` blocks. `404.astro` is the
one page with inline styles instead of a CSS file. Shared bits live in `global.css` and
`shared-utilities.css`; the dark purple theme (`#0f0f1a`, `#7c3aed`) plus the `.grid-overlay` /
`.blob` decorations are repeated per page rather than centralised.

Dialogs (`ConfirmDialog`, `NotificationDialog`, `ProjectHandoverDialog`, `SkillDetailDialog`, …) each
expose `window.open<Id>Dialog(...)` functions derived from their element id — `header.js` calls
`window.openNotificationDialog` with a `setTimeout` retry because component scripts may not have
initialised yet.

## Data model notes

Tables: `user_info`, `user_profiles`, `user_skills`, `user_reputation`, `skills`, `projects`,
`project_members`, `project_skills`, `project_milestones`, `applications`, `contracts`, `deliveries`,
`disputes`, `messages`, `reviews`, `notifications`, `password_resets`.

- **Soft deletes everywhere** — filter `.is('deleted_at', null)` on every query; membership also
  needs `.is('left_at', null)`.
- **`projects.status`**: `pending` on create → `approved` (admin) / `rejected`. Public listings
  (explore, search, featured) filter to `approved`.
- **`applications.status`**: `pending` → `approved` / `rejected` by the project owner; approval also
  inserts a `project_members` row. The project owner is inserted as a `project_members` row with
  `role: 'owner'` at creation time.
- **Progress is not stored** — `src/services/projects.ts` computes it as
  `min(milestone_count * 20, 100)`.
- Skills are deduplicated case-insensitively (`.ilike('name', …)`) and created on demand, with the
  per-project description stored on `project_skills`, not `skills`.

## Style

Prettier: 4-space indent, single quotes, semicolons, 80 columns, `trailingComma: es5`, with
`prettier-plugin-astro`. `.prettierrc` now pins `"useTabs": false` — without it Prettier picked up
`indent_style = tab` from `.editorconfig` and converted the entire codebase from spaces to tabs on
any `npm run format`. `@` aliases to `./src` in both
`tsconfig.json` and `astro.config.mjs` (both must be kept in sync). TypeScript extends
`astro/tsconfigs/strict`.

Code comments and all user-visible text are Vietnamese; match that when editing existing files.

## Project handover

The newest feature, completed in `supabase/migrations/20250101000002_handover_and_cv.sql`.
`project_handovers` holds one row per (project, member) — `notes`, `status`
(`pending` → `approved`/`rejected`), `review_note`, and who reviewed it.

- A member submits from the project page (`ProjectHandoverDialog`) or from
  `/project-handover-collaborator`, which lists every project they joined with its handover state.
  Resubmitting upserts the row back to `pending`.
- `POST /api/projects/[projectId]/handover` verifies active membership and refuses the project
  owner; `POST /api/projects/[projectId]/handover/review` accepts `approve`/`reject` from the owner
  only. Both notify the other party (`handover_submitted` / `handover_approved` /
  `handover_rejected`).
- The owner reviews at `/project-handover-manager/[projectId]`. `getProjectMembers()` now joins the
  handover row onto each member instead of returning `handover_note: null`.

`ProjectHandoverDialog` is generic: its Send button dispatches a `handover-send` CustomEvent with
`{notes, setBusy, close}` and the host page decides where to post. Its setup function is called
three times (DOMContentLoaded + two fallback timeouts), so it guards on
`dataset.handlersReady` — without that guard every click fired multiple requests.

## Known gaps

- **Production needs migrations 2 and 3 applied.** `project_skills.description` already existed in
  production, but `applications.cv_url` and the `project_handovers` table were added here and only
  exist in the local stack so far.
- `api/auth/forgot-password.ts` answers "Email không tồn tại trong hệ thống" for unknown addresses,
  which lets anyone enumerate registered emails. Left as-is because changing it changes the UX.
- `src/templates/README.md` documents an OTP email template whose `@/utils/email-template.ts` and
  `email-otp-reset.html` were never committed. The accompanying `example-usage.ts` imported that
  missing module and has been deleted; the live flow uses Supabase Dashboard templates via
  `signInWithOtp`.
- `src/utils/notification-renderer.ts` is server-side and currently unused — the dropdown renders
  notifications client-side with a near-duplicate of the same logic inside `NotificationDialog.astro`.
  Keep both in sync or collapse them.
- `personal-profile.astro`, `user-manage.astro` and `project/[projectId]/project-handover-manager.astro`
  were static mockups holding fake data. They now redirect to the real pages
  (`/profile/{username}`, `/admin`, `/project-handover-manager/{projectId}`) — delete them once no
  bookmarks point there.
- `MainLayout.astro` is dead code. `README.md` describes the original starter layout
  (`about.astro`, `contact.astro`) and is out of date.
- `/about-us` never existed; its dropdown entry was removed. `header.aboutUs` is still in the i18n
  files for whenever that page gets written.
