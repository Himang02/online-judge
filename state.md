# Deployment State Tracker

> Living checklist for the deployment work described in [deployment-plan.md](deployment-plan.md). Update inline as you finish things. Use ✅ done · ⏳ in progress · ⚠️ blocked · ⏭️ deferred · ❌ won't do.

**Last updated:** 2026-05-24

---

## Pre-flight cleanup (local repo work)

| Status | Task | Notes |
|---|---|---|
| ✅ | Delete `express.static('../..')` in [server/src/app.js:17](server/src/app.js#L17) | Commit `45b6a1b` (snapshot). |
| ✅ | Gitignore `client/.env`, `git rm --cached`, add `client/.env.example` | Commit `cb13854`. Also `34bd028` extended exec-service `.gitignore` for `.env.*`. |
| ✅ | CORS allowlist — rename `FRONTEND_URL` → `FRONTEND_URLS`, accept CSV | Commit `45b6a1b`. Function-form `origin` callback. |
| ✅ | Add `helmet` to server | Commit `45b6a1b`. Placed before CORS. |
| ✅ | Auth rate-limit on `/login` + `/register` (per IP) | Commit `55c5456`. 5/15min login, 3/hr register. Also set `trust proxy: 1` for Caddy. |
| ⏭️ | Warn-on-fallback for AI rate limiter when Redis down | Polish. Skipped to focus on deploy path. |
| ✅ | Write `server/Dockerfile` (multi-stage, non-root) | Commit `9a9f31f`. Plus `d565625` fixed Prisma+Alpine OpenSSL 3.x compat (binaryTargets + apk add openssl). |
| ✅ | Write `execution-service/Dockerfile` (alpine + docker-cli) | Commit `59ed0b6`. Runs as root for socket access; security trade-off documented. |
| ✅ | Write `docker-compose.yml` (redis + server + exec-service) | Commit `f8df1a0`. DooD socket mount on exec-service. |
| ✅ | Local end-to-end test: `docker compose up` + register/submit/AC | Verified 2026-05-24. Full pipeline: register → login → submit Python "sum of two numbers" → AC verdict received. DooD container spawning confirmed in exec-service logs. |

## Phase A — Backend on EC2, HTTP, local frontend
| Status | Task | Notes |
|---|---|---|
| ✅ | Launch t3.micro + elastic IP + security group | Region: **ap-south-1 (Mumbai)**, AMI: Amazon Linux 2023. EIP: `13.202.181.71`. SG opens 22 (My IP), 4000 (Phase A only), 80, 443. |
| ✅ | Install Docker + compose plugin on box | Docker 25.0.14, Compose v2.29.0. `ec2-user` added to docker group. |
| ✅ | Provision Neon project, capture pooled DATABASE_URL | Region: ap-southeast-1 (Singapore). Cross-region adds ~80ms per query — acceptable for now. |
| ✅ | `git clone`, write `.env.production` files, `docker compose up -d` | SCP'd both `.env.production` files (not in git). |
| ✅ | `prisma migrate deploy` + `seedTags.js` against Neon | No-op: DB already current from local test (same Neon branch). |
| ✅ | Local frontend test against `http://13.202.181.71:4000` | Verified via curl: full register/login/submit/AC roundtrip in <2s. Per-container time on native Linux is ~sub-second vs ~15s on Docker Desktop Windows. |

## Phase B — Domain + TLS
| Status | Task | Notes |
|---|---|---|
| ✅ | Domain — DuckDNS subdomain `algoarena.duckdns.org` → `13.202.181.71` | Free DDNS; works fine for Let's Encrypt HTTP-01 challenge. |
| ✅ | Add Caddy service + `Caddyfile` to compose, persist `caddy_data` volume | Commit `ef75bf1`. Caddy 2-alpine, named volumes for cert persistence. |
| ⏭️ | Update `FRONTEND_URLS`, restart server | No change needed for Phase B — laptop test still uses `http://localhost:5173`. Will add Vercel URL in Phase C. |
| ⚠️ | Close port 4000 in AWS security group | Optional. Compose no longer publishes :4000 so there's no listener, but the SG rule is unused. Clean up via AWS console: EC2 → Security Groups → online-judge-sg → remove the Custom TCP 4000 inbound rule. |
| ✅ | `curl https://algoarena.duckdns.org/ping` returns `pong` with valid cert | Cert obtained in ~11s on first request. SSL handshake + ping under 1s end-to-end. Full submission roundtrip AC verified. |

## Phase C — Frontend on Vercel
| Status | Task | Notes |
|---|---|---|
| ⏳ | `vercel link` to `client/`, set `VITE_API_BASE_URL` env var | §4.C.1 |
| ⏳ | `vercel --prod` | §4.C.2 |
| ⏳ | Add Vercel URL to `FRONTEND_URLS` on EC2, restart | §4.C.3 |
| ⏳ | Full register → publish → submit → AC roundtrip from Vercel | §4.C.4 |

---

## Code health — already done (baseline)
| Status | Item |
|---|---|
| ✅ | Auth module wired (register, login, JWT, bcrypt, timing-safe login) |
| ✅ | Problems module wired (CRUD, draft/publish, role-gated, ownership checks) |
| ✅ | Tags module wired (M2M with problems) |
| ✅ | Submissions module wired (create, list, by-problem, by-id) |
| ✅ | AI review module wired (Gemini, prompt-injection-resistant, rate-limited) |
| ✅ | BullMQ queue + execution-service worker integration |
| ✅ | Execution service supports C, C++, Java, Python via Docker |
| ✅ | Sandbox flags: `--network none`, `--memory`, `--pids-limit`, `--init`, `--rm` |
| ✅ | Inner + outer timeout enforcement (TLE detection) |
| ✅ | Catchup reconciler on server startup ([catchup.js](server/src/shared/configs/catchup.js)) |
| ✅ | SSE verdict streaming with race-condition guard ([submissionController.js:68-82](server/src/modules/submissions/submissionController.js#L68-L82)) |
| ✅ | Global Express error handler + custom AppError |
| ✅ | All routes input-validated with express-validator |
| ✅ | Prisma schema + 7 migrations clean |
| ✅ | `server/.env` and `execution-service/.env` properly gitignored |

## Discovered during local testing

| Status | Item | Notes |
|---|---|---|
| ⚠️ | Per-container startup ~15s on Docker Desktop (Windows) | WSL2 file system overhead. **Expected to be <1s on native Linux (EC2).** Not a code bug. |
| ⚠️ | `runtime` and `memory` fields stay `null` on AC verdicts | Exec-service doesn't populate these despite schema having them. Cosmetic for now. |

## Deferred — not blockers for deploy
| Status | Item | Why deferred |
|---|---|---|
| ⏭️ | Real-time verdict push end-to-end verification | SSE code looks correct; just verify it after deploy. If broken, fall back to polling. |
| ⏭️ | "▶ Run" button handler in [ProblemDetail.jsx:161-163](client/src/pages/ProblemDetail.jsx#L161-L163) | Dead UI element. Either wire to a "compile-only" backend endpoint or hide the button. |
| ⏭️ | Search bar on [Problems.jsx:64-72](client/src/pages/Problems.jsx#L64-L72) | Commented out as "temporarily disabled". Re-enable once backend `search` query param is verified. |
| ⏭️ | CE vs RTE detection brittleness ([executor.js:121-123](execution-service/src/executor.js#L121-L123)) | Has a TODO already. Use an `OJ_EXEC_START` stderr marker pattern. |
| ⏭️ | Test cases sent inside BullMQ payload | Fine at current scale. Switch to "fetch from DB by submission ID" if Redis memory becomes an issue. |
| ⏭️ | Convert `seedTags.js` to Prisma `prisma/seed.ts` | Cosmetic; current script works. |
| ⏭️ | Add tests (unit + integration) | Out of scope for deploy. Add gradually as features land. |
| ⏭️ | TypeScript migration | Big-bang refactor; not blocking. |
| ⏭️ | Cleanup: `client/index.html` title still `vite-temp`, empty `App.css` | One-line fixes; do whenever. |
| ⏭️ | CloudWatch alarms, Sentry, log aggregation | Set up after first week of running. |
| ⏭️ | CI/CD pipeline (GitHub Actions) | After deploy works manually. |
| ⏭️ | Staging environment | When prod gets enough traffic that breaking it costs you something. |

## Known limitations of the planned deploy
| Item | Mitigation |
|---|---|
| Single t3.micro, no multi-AZ | Acceptable for learning project. Document recovery time (~10 min to relaunch). |
| Single Redis with no persistence | [catchup.js](server/src/shared/configs/catchup.js) reconciles after restart. Data loss limited to in-flight submissions. |
| DooD = exec-service has host docker socket | Acceptable trade-off. Production would use dedicated exec host. Documented in [deployment-plan.md §6](deployment-plan.md). |
| No DDoS protection (L7) | Add Cloudflare in front of elastic IP if needed. |
| No automated DB backups beyond Neon's defaults | Neon free tier has point-in-time recovery for 7 days. Acceptable for now. |

---

## How to update this file
- Change `⏳` → `✅` when a task is done. Add a one-line note if anything surprised you (commit hash, gotcha, link to LEARNING.md entry).
- If something blocks you, change to `⚠️` and add the blocker in the Notes column.
- New issues discovered during deploy → add a row under the relevant phase.
- Keep this file in sync with [deployment-plan.md](deployment-plan.md); if the plan changes, update both.
