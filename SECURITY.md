# SECURITY.md — UniWay security posture

> Local-only file. Never committed to the repo.
> Documents all security decisions, their rationale, and what's deferred.

## Active security controls

### 1. Dependabot (npm dependency scanning)

- **What**: Weekly scan of all npm dependencies for known CVEs
- **Schedule**: Every Monday at 09:00 UTC
- **Mechanism**: Opens a PR with the fix. You review and merge.
- **Why**: Catches supply-chain vulnerabilities before they reach production
- **Config**: `.github/dependabot.yml`

### 2. HTTP security headers

Set in `next.config.ts`, applied to all routes:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking — site can't be loaded in iframe on another domain |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self), interest-cohort=()` | Blocks data collection, only geolocation (needed for maps) |

### 3. Secrets protection

- `.env`, `.env.local`, `.env.development.local`, `.env.production.local` — all gitignored
- `.env.example` committed with placeholder values as a reference
- Real secrets (Neon DATABASE_URL, R2 keys) are set in Vercel environment variables, never in the repo

### 4. Input validation (Zod)

- Installed, not yet wired (no API routes exist)
- When API routes are built, every input must be validated through a Zod schema at the boundary
- This is the primary defense against injection attacks

### 5. No authentication in V1

- All API routes are public — no auth, no sessions, no tokens
- **Rationale**: Campus maps are public information. Adding auth would increase scope with zero product benefit in V1.
- **What about abuse?**: Rate limiting will be added when API routes ship. The only user-controlled data is obstruction reports.
- **User data**: User location never leaves the client — all geolocation is in-browser.

### 6. Branch protection

- `main` is protected: PR required, CI must pass, linear history, enforced on admins
- Prevents accidental pushes, force-pushes, and deletions
- Not a security control per se, but prevents operational mistakes that could introduce vulnerabilities

## Deferred security controls

| Control | When | Why deferred |
|---|---|---|
| **Content-Security-Policy (CSP) header** | When R2 tile URL + MapLibre sources are finalized | CSP needs explicit allowlists for tile sources, MapLibre CDN, etc. Setting it now would block map tiles |
| **Rate limiting** | When API routes ship | No API endpoints currently exist. Will use Vercel's built-in rate limiting or a lightweight middleware |
| **Sentry** | Before production launch | Sentry is production error monitoring. Not useful during development |
| **MSW (Mock Service Worker)** | When writing first API-dependent test | MSW intercepts network requests in tests. Only needed when API routes exist |
| **AWS WAF / web application firewall** | At scale (>500 DAU) | Overkill for V1. Vercel's edge network provides basic DDoS protection by default |
| **Penetration testing** | Before public launch | Too early — no production surface to test against |

## Threat model (V1)

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dependency with known CVE | Medium | High | Dependabot → automated PRs |
| SQL injection via API | Medium | Critical | Zod validation at API boundary |
| XSS via obstruction report content | Low | Medium | Zod + React auto-escaping |
| Clickjacking | Low | Low | X-Frame-Options: DENY |
| Supply chain attack (npm) | Low | Critical | Dependabot + lockfile + npm audit |
| Mass scraping of campus data | Low | Low | Rate limiting (deferred) |
| Abuse of route API (DoS) | Low | Low | Rate limiting (deferred) |
| Leaked environment secrets | Low | Critical | .env gitignored, Vercel env vars |

## Environment variable reference

| Variable | Where to set | Sensitivity |
|---|---|---|
| `DATABASE_URL` | Vercel env | 🔴 Critical — Neon connection string with credentials |
| `R2_ACCOUNT_ID` | Vercel env | 🟡 Sensitive — Cloudflare account identifier |
| `R2_ACCESS_KEY_ID` | Vercel env | 🟡 Sensitive — S3-compatible access key |
| `R2_SECRET_ACCESS_KEY` | Vercel env | 🔴 Critical — secret key for R2 |*
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Vercel env | 🟢 Public — public bucket URL |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel env | 🟢 Public — Sentry DSN is designed to be public |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Not used | N/A — using MapLibre, not Mapbox |

## Security checklists

### Before merging a PR
- [ ] CI passes (lint, typecheck, test, coverage, build)
- [ ] Dependabot alerts checked
- [ ] No `.env` files in the diff
- [ ] No hardcoded secrets in the diff
- [ ] If adding an API route: is input validated with Zod?
- [ ] If adding a dependency: does Dependabot have a matching alert?

### Before production launch
- [ ] CSP header configured with all external sources
- [ ] Rate limiting enabled on all API routes
- [ ] Sentry configured and tested
- [ ] `.env.example` is current
- [ ] Dependabot alerts resolved
- [ ] npm audit — no high/critical vulns

---

*Last updated: 2026-06-04*
