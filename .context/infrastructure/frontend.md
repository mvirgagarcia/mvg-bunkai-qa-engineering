# Frontend Infrastructure

> Product: Bunkai TMS
> Phase: 3 — Frontend Discovery
> Generated: 2026-05-31
> Source of truth: `next.config.ts`, `tailwind.config.ts`, `components.json`, `app/layout.tsx`, `middleware.ts`, `lib/supabase/client.ts`

---

## 1. Build Configuration

| Property | Value | Source |
|----------|-------|--------|
| Framework | Next.js ^15 | `package.json` |
| Router | App Router (no `pages/` directory detected) | `app/` directory layout |
| React version | ^19 | `package.json` |
| Bundler | Webpack (default) — Turbopack not enabled | `package.json` scripts.dev = `next dev` (no `--turbo`) |
| TypeScript | Strict mode (`"strict": true`) | `tsconfig.json:20` |
| Typed routes | `true` (experimental `typedRoutes`) | `next.config.ts:7` |
| Output mode | Default (serverless — Vercel builds and serves) | `next.config.ts` — no `output: 'standalone'` or `export` |
| `reactStrictMode` | `true` | `next.config.ts:5` |
| `outputFileTracingRoot` | Repo root | `next.config.ts:6` |
| JSX | `preserve` (handled by Next.js SWC transform) | `tsconfig.json:6` |
| Module target | ES2022 | `tsconfig.json:5` |
| CSS framework | Tailwind CSS ^3.4 | `package.json` devDependencies |
| PostCSS | Configured via `postcss.config.js` | `postcss.config.js` present at root |

---

## 2. Framework Config Snippet

```typescript
// next.config.ts
import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  typedRoutes: true,       // compile-time type-safe hrefs
  images: {
    remotePatterns: [],    // no external image domains configured
  },
};
```

Key notes:
- No `headers()` → no CSP, HSTS, or X-Frame-Options configured (security gap)
- No `redirects()` or `rewrites()` configured
- No `webpack()` custom override
- No `experimental` flags beyond `typedRoutes`
- `images.remotePatterns: []` — `next/image` is configured but no remote sources are allowed

---

## 3. Client Environment Variables

All `NEXT_PUBLIC_*` vars are inlined at build time. Source: `lib/env.ts`, `middleware.ts`, `lib/supabase/client.ts`

| Variable | Purpose | Build-time or Runtime | Source |
|----------|---------|----------------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL — used in browser Supabase client | Build-time (statically inlined) | `lib/supabase/client.ts:8`, `middleware.ts:5` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key — browser client auth | Build-time (statically inlined) | `lib/supabase/client.ts:9`, `middleware.ts:6` |
| `NEXT_PUBLIC_APP_URL` | Base URL for auth redirects and magic-link callbacks | Build-time (default: `http://localhost:3000`) | `lib/env.ts:31` |

> **Security check**: No secret-looking values in `NEXT_PUBLIC_*` prefix. All three are browser-safe by design. `SUPABASE_SERVICE_ROLE_KEY` is strictly server-only and never in any `NEXT_PUBLIC_` prefix. Clean.

> **Static access rule** (`lib/supabase/client.ts:7–9`): Next.js inlines `NEXT_PUBLIC_*` only via static member access (e.g., `process.env.NEXT_PUBLIC_SUPABASE_URL`). Dynamic access via `process.env[name]` resolves to `undefined` in the browser bundle. The codebase follows this correctly.

---

## 4. Environment-Specific Values

| Variable | Development | Staging | Production |
|----------|-------------|---------|-----------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://staging-upexbunkai.vercel.app` | `https://upexbunkai.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<local-ref>.supabase.co` | `https://<staging-ref>.supabase.co` | `https://<prod-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (local project anon key) | (staging project anon key) | (prod project anon key) |
| `VERCEL_ENV` | (absent — defaults to `local`) | `preview` | `production` |

Source: `lib/urls.ts` (URL constants), `lib/env.ts` (Zod default for APP_URL)

> `VERCEL_ENV` is a Vercel system variable — injected automatically by the platform, never set in `.env`. The app uses it to select the correct base URL in `lib/urls.ts`.

---

## 5. Static Assets

```
public/
└── openapi.json    # Generated OpenAPI spec — served at /api/openapi (cached 5 min)
```

Source: `ls public/` command output

No favicon, robots.txt, sitemap.xml, OG images, or font files detected in `public/`. See Discovery Gaps §12.

| Asset | Path | Purpose | Source |
|-------|------|---------|--------|
| OpenAPI spec | `public/openapi.json` | Static JSON served by `GET /api/openapi` | `app/api/openapi/route.ts`, `bun run openapi:gen` |

### Image Handling

| Property | Status | Source |
|----------|--------|--------|
| `next/image` usage | `remotePatterns: []` configured — no remote images allowed | `next.config.ts:8–10` |
| Image optimization | Available via Next.js built-in optimizer | Platform behavior |
| Remote domains | None configured | `next.config.ts` |
| CDN / assetPrefix | Not configured | `next.config.ts` |

---

## 6. Code Splitting Strategy

| Pattern | Where | Detail | Source |
|---------|-------|--------|--------|
| `next/dynamic` with `ssr: false` | `components/atcs/AtcEditor.tsx:16` | Monaco editor (`StepEditor`) lazy-loaded — prevents SSR for the heavy `@monaco-editor/react` bundle | `components/atcs/AtcEditor.tsx:16–26` |
| `force-dynamic` | `app/api/v1/me/route.ts:19`, `app/api/v1/health/route.ts:4` | Forces dynamic rendering — prevents stale cache on auth-dependent routes | route files |
| `force-static` | `app/api/openapi/route.ts:14` | OpenAPI JSON served statically — cached 5 minutes | `app/api/openapi/route.ts` |
| React Server Components | All `app/(app)/` page components | Data fetching server-side; no client round-trip for initial data | `app/(app)/projects/[projectSlug]/page.tsx` |
| Client components | `'use client'` — `AtcEditor.tsx`, `AtcTable.tsx`, auth context | Interactive editing components and auth state | `components/atcs/AtcEditor.tsx:1` |

**Summary**: The code splitting strategy is minimal and intentional — Monaco (the heaviest dependency, `@monaco-editor/react ^4.7.0`) is the only client-side lazy-loaded component. Everything else uses React Server Components for data fetching.

---

## 7. Bundle Size Notes

| Check | Status |
|-------|--------|
| Bundle analyzer | Not installed (`@next/bundle-analyzer` absent from `package.json`) |
| `web-vitals` package | Not installed |
| Lighthouse CI | Not configured (no CI) |

**Discovery Gap**: No bundle size measurement tooling exists. The heaviest known dependency is `@monaco-editor/react ^4.7.0` — already lazy-loaded via `next/dynamic`. Other significant client dependencies: `@tanstack/react-table ^8.21.3`, `@scalar/api-reference-react ^0.9.38`.

---

## 8. Performance Configuration

| Aspect | Implementation | Source |
|--------|---------------|--------|
| Font optimization | `next/font/google` with `display: 'swap'` — Inter (sans), JetBrains Mono (mono), Noto Serif JP (jp, weights 600/700) | `app/layout.tsx:3–23` |
| Font CSS variables | `--font-inter`, `--font-jetbrains-mono`, `--font-noto-serif-jp` → aliased in Tailwind as `font-sans`, `font-mono`, `font-jp` | `tailwind.config.ts:98–102`, `app/layout.tsx` |
| Image optimization | `next/image` available; `remotePatterns: []` (no external images) | `next.config.ts` |
| OpenAPI spec caching | `Cache-Control: max-age=300` on `GET /api/openapi` | `app/api/openapi/route.ts:22` |
| GIN full-text search | `atcs.tsv` tsvector with GIN index — fast ATC search at DB layer | `supabase/migrations/0004_atcs.sql` |
| Monaco lazy-load | `next/dynamic` with `ssr: false` — Monaco not in initial bundle | `components/atcs/AtcEditor.tsx:16` |
| RSC data fetching | Projects/modules/ATCs data fetched server-side — zero client waterfalls | `app/(app)/projects/[projectSlug]/page.tsx` |
| `force-dynamic` on `/api/v1/me` | Prevents stale cache on auth route | `app/api/v1/me/route.ts:19` |
| Rate limiting | NOT implemented — Supabase passthrough only | magic-link route comment: "Phase F" |

---

## 9. SEO Configuration

| Aspect | Status | Source |
|--------|--------|--------|
| Next.js Metadata API | Used in `app/layout.tsx` — `title`, `description`, `metadataBase` | `app/layout.tsx:25–30` |
| `title` | `'Bunkai — Test Management System'` | `app/layout.tsx:26` |
| `description` | Long-form product description | `app/layout.tsx:27–30` |
| `metadataBase` | `http://localhost:3000` (hardcoded — not updated per environment) | `app/layout.tsx:29` — **Discovery Gap** |
| OG tags | Not configured (no `openGraph` object in metadata) | `app/layout.tsx` |
| Twitter card | Not configured | `app/layout.tsx` |
| `robots.txt` | Not found in `public/` | `ls public/` output |
| `sitemap.xml` | Not found in `public/` | `ls public/` output |
| `generateMetadata` | Not used on inner pages (no per-route metadata) | code review |

---

## 10. Browser Support

| Property | Status | Source |
|----------|--------|--------|
| Browserslist config | Not found (no `.browserslistrc`, no `browserslist` in `package.json`) | root directory listing |
| Polyfills | None configured — relies on Next.js defaults (ES2022 baseline) | `tsconfig.json:5` target ES2022 |
| Dark mode | Forced dark (`dark` class on `<html>`) | `app/layout.tsx:40` `className="... dark"` |
| `lang` attribute | `lang="en"` | `app/layout.tsx:39` |

---

## 11. Routing + State + Auth Integration Points

This section is the primary input for `/adapt-framework`.

### Router

| Property | Value | Source |
|----------|-------|--------|
| Router type | Next.js App Router | `app/` directory structure |
| Route groups | `(app)` (authenticated), `(auth)` (unauthenticated) | `app/` directory layout |
| Protected routes | `/projects`, `/onboarding` (checked in middleware) | `middleware.ts:8` |
| Public routes | `/login`, `/auth/*`, `/api/auth/*` | `middleware.ts:9` |
| API routes | `app/api/v1/*` (REST) | `app/api/` directory |
| Typed routes | Enabled — `route()` helper provides type-safe hrefs | `next.config.ts:7` |
| Middleware | `middleware.ts` — session check + redirect for protected routes | `middleware.ts:57–58` matcher |

### State Management

| Concern | Implementation | Source |
|---------|---------------|--------|
| Global state library | None — no Zustand, Jotai, Redux | `package.json` — absent |
| UI state | `useState` / `useReducer` in client components | `components/atcs/AtcEditor.tsx`, `AtcTable.tsx` |
| Auth state | `components/providers/auth-context.tsx` (Context API) | Architecture doc |
| Server data | React Server Components — no client-side fetch for initial data | `app/(app)/` pages |
| Workspace context | `bk_active_ws` cookie — workspace switcher reads/writes this | `lib/api/workspace-cookie.ts`, `GET /api/v1/me` |

### Data Fetching

| Pattern | Where | Library |
|---------|-------|---------|
| RSC data fetching | `app/(app)/projects/[projectSlug]/page.tsx` | Native `async` Server Components |
| API mutations | Client components → server actions / route handlers | Next.js built-in (no SWR/TanStack Query) |
| No SWR / TanStack Query | Absent from `package.json` | No client-side data caching library |
| Supabase JS | Server: `lib/supabase/server.ts`; Client: `lib/supabase/client.ts` | `@supabase/supabase-js ^2.106.0` |

### Auth Client (Supabase)

| Context | Client | Import Path |
|---------|--------|-------------|
| Browser / client component | `createBrowserClient()` — per-tab singleton | `lib/supabase/client.ts` |
| Server Component / Route Handler | `createServerClient()` — reads/writes SSR cookies | `lib/supabase/server.ts` |
| Edge Middleware | `createServerClient()` — same as server | `middleware.ts:22` |
| Admin operations (server-only) | `createAdminClient()` — service-role, bypasses RLS | `lib/supabase/admin.ts` |

Auth state flow:
1. Middleware checks `supabase.auth.getUser()` on every request to protected prefixes
2. No session → redirect to `/login?next=<original-path>`
3. Session → pass through; RSC reads session cookie for server-side queries
4. Session refresh is handled by middleware (SSR cookie rotation)

### Test IDs Strategy

| Status | Evidence |
|--------|----------|
| No `data-testid` found in `components/` | `grep -r data-testid components/` — empty |
| `data-testid` present ONLY in `app/qa/_components/` | QA developer guide page only (not production UI) |
| No `data-cy` found | grep result |

**Impact for E2E testing**: No test IDs on production UI components. Playwright selectors must use:
- Semantic HTML (`role`, `name`)
- Text content (`getByText`, `getByRole`)
- ARIA attributes
- CSS classes (fragile — Tailwind class names may change)

This is a **Discovery Gap** — recommend adding `data-testid` attributes to key interactive elements (login form, ATC editor, workspace switcher, table rows).

---

## 12. Discovery Gaps

| Gap | Impact | Suggested Action |
|-----|--------|-----------------|
| **No `data-testid` on production UI** | Playwright selectors must rely on text/role/ARIA — brittle against copy changes | Add `data-testid` to: login form, magic-link submit button, ATC editor save button, workspace switcher, ATC table rows |
| **`metadataBase` hardcoded to `localhost`** | OG/social preview URLs broken in staging and production | Change to `new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')` |
| **No OG / Twitter card metadata** | Social shares show no preview image or description | Add `openGraph` and `twitter` objects to root layout metadata |
| **No `robots.txt` or `sitemap.xml`** | App not indexable; minimal SEO posture | Add `app/robots.ts` and `app/sitemap.ts` (Next.js 13+ conventions) or static files |
| **No bundle analyzer** | Cannot measure JS bundle size or identify heavy imports | Add `@next/bundle-analyzer` to devDependencies |
| **No browserslist config** | Browser support floor is implicit (Next.js default) | Add `.browserslistrc` or `browserslist` in `package.json` |
| **Turbopack not enabled** | Dev server uses Webpack — slower HMR than Turbopack | Add `--turbo` flag to `dev` script (test for compatibility first) |
| **No error boundary in root layout** | Uncaught client errors render blank white screen | Add `app/error.tsx` and `app/global-error.tsx` |
| **Dark mode hardcoded** | No theme toggle — `dark` class always present on `<html>` | Not a bug but limits future light-mode users |
