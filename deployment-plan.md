# Deployment Plan — Online Judge

**Target:** Backend (server + Redis + execution-service) on a single AWS **t3.micro** EC2; frontend on **Vercel**; Postgres on **Neon** (managed); reverse-proxy + TLS via **Caddy**.

**Status:** This is the planning + runbook document. The companion [state.md](state.md) tracks per-task progress.

> **Authorship note:** Per the project's mentor contract ([CLAUDE.md](CLAUDE.md)), this doc gives you **patterns and starter snippets**, not finished drop-in files. You will write the actual Dockerfiles, compose file, Caddyfile, and CORS/helmet/rate-limit patches yourself. Every snippet here is annotated so you understand what each line does before you type it.

---

## 1. Architecture

```
┌──────────────────┐         HTTPS          ┌─────────────────────────────────┐
│  Vercel (CDN)    │ ─────────────────────▶ │  EC2 t3.micro (Ubuntu 22.04)    │
│  React SPA       │   api.yourdomain.com   │                                 │
│                  │                        │  Caddy :443 / :80               │
└──────────────────┘                        │      │  (auto Let's Encrypt)    │
                                            │      ▼                          │
                                            │  Node server :4000              │
                                            │      ▲          ▲               │
                                            │      │ BullMQ   │               │
                                            │  Redis :6379    │               │
                                            │      ▲          │               │
                                            │      │          │               │
                                            │  Exec-service ──┘               │
                                            │      │ /var/run/docker.sock     │
                                            │      ▼                          │
                                            │  Host Docker daemon             │
                                            │      │                          │
                                            │      ▼                          │
                                            │  Ephemeral user-code containers │
                                            │  (--network none, mem-limited)  │
                                            └─────────────────────────────────┘
                                                            │
                                                            ▼ (TCP 5432, TLS)
                                            ┌─────────────────────────────────┐
                                            │  Neon Postgres (managed)        │
                                            │  Free tier, auto-backup         │
                                            └─────────────────────────────────┘
```

### Network flow
- **User's browser → Vercel:** static HTML/JS/CSS served from Vercel's CDN. No backend involved.
- **User's browser → backend:** every API call goes from the browser directly to `https://api.yourdomain.com`. Vercel never proxies API traffic.
- **Browser → SSE:** the verdict stream is a regular HTTPS GET to `/api/submissions/:id/events` with the connection held open. Caddy passes it through to the Node server.
- **Server ↔ Redis ↔ Exec-service:** all internal traffic stays on the docker-compose bridge network. Never exposed.
- **Exec-service → user-code containers:** exec-service shells out to `docker run` over the bind-mounted socket. The user-code container is a *sibling* of exec-service (both children of the host Docker daemon), not a child container.

---

## 2. Decisions and rationale

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Postgres host | **Neon (managed)** | t3.micro is 1 vCPU / 1 GiB. Postgres alone wants 200–400 MB at rest. Stacking it with Node + Redis + exec-service + user containers = guaranteed OOM. Neon free tier (0.5 GB, scale-to-zero) is enough for this stage and gives you automated backups. Connection string drops straight into `DATABASE_URL`; Prisma needs no other change. |
| 2 | Redis host | **On the box (docker compose)** | ~30 MB resident, queue drains fast, no persistence requirement (the [catchup reconciler](server/src/shared/configs/catchup.js) handles in-flight submissions across restarts). Adding ElastiCache/Upstash would be overkill at this scale. |
| 3 | Reverse proxy + TLS | **Caddy** | Three-line config auto-provisions and renews Let's Encrypt certs. Nginx + Certbot works but needs cron timers, renewal hooks, and a separate config file. Caddy is the minimum-toil choice for a solo project. |
| 4 | Process orchestration | **`docker compose`** | Three long-running services on one box. Compose gives `restart: unless-stopped`, named bridge network for service-to-service DNS (server can reach Redis at `redis:6379`), and a single `docker compose up -d` to restore everything after reboot. |
| 5 | Execution service deployment | **Containerized, Docker-out-of-Docker (DooD)** | See §6. DooD via socket bind-mount: exec-service shares the host's Docker daemon and image cache. DinD would need `--privileged` and duplicate the image cache — unworkable on 1 GiB. |
| 6 | Frontend host | **Vercel (hobby tier)** | Static SPA, free, auto-HTTPS, env-var-driven API URL. Zero reason not to. |
| 7 | Domain | **Apex domain + `api.` subdomain** | Frontend on `yourdomain.com` (Vercel-managed), backend on `api.yourdomain.com` (EC2-managed). Clean separation, no path-based routing weirdness. |

### Cost (rough, monthly)
- EC2 t3.micro: $0 for 12 months on a new AWS account, ~$8 after.
- Elastic IP: $0 while attached to a running instance.
- EBS gp3 8 GB: ~$0.65.
- Neon free tier: $0.
- Vercel hobby: $0.
- Domain (Namecheap/Cloudflare): ~$10/yr.

---

## 3. Pre-flight cleanup (do all of these before touching EC2)

Each item below is a concrete change in the local repo. Commit each as its own conventional commit so the deploy history reads cleanly.

### 3.1. Delete the static-file info disclosure
**File:** [server/src/app.js](server/src/app.js) **line 17.**

```js
app.use(express.static(path.join(__dirname, '../..')));
```

This serves the *entire project root* as static files. Anyone hitting `https://yourapi.com/server/.env` or `/prisma/schema.prisma` gets a file dump.

**Action:** delete that line. Also remove the now-unused `const path = require('path');` import on line 5 if nothing else uses it.

**Commit:** `fix(server): remove repo-root static file serving (info disclosure)`

### 3.2. Gitignore client `.env`, add `.env.example` files
**Why:** `client/.env` is currently tracked. It only contains `VITE_API_BASE_URL=http://localhost:4000` (not a secret — `VITE_*` ships to the browser regardless), but if you push a `.env.production` later it could leak the wrong API URL to a prod build.

**Actions:**
1. Append `.env` and `.env.*` to [client/.gitignore](client/.gitignore), with `!.env.example` carve-out.
2. `git rm --cached client/.env` (removes from index, keeps on disk).
3. Create `client/.env.example`:
   ```
   VITE_API_BASE_URL=http://localhost:4000
   ```
4. Same `.env.example` pattern for [server/.env.example](server/.env.example) and [execution-service/.env.example](execution-service/.env.example) — verify they already exist (they do per `git ls-files`) and document every var they need.

**Commit:** `chore: gitignore client/.env and document required env vars`

### 3.3. CORS allowlist
**File:** [server/src/app.js](server/src/app.js) lines 12–15.

**Current:**
```js
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
```

**Pattern to apply (sketch — adapt and type yourself):**
```js
const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Requests with no origin (curl, mobile apps, server-to-server) are allowed
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
}));
```

**Reasoning:**
- Comma-separated env var is the simplest format that survives systemd/docker-compose without YAML parsing.
- Function-form `origin` callback runs per request, letting you allow multiple origins simultaneously. Required for the Phase A → Phase C transition where both `http://localhost:5173` and `https://yourapp.vercel.app` need to work.
- The "no origin allowed" branch lets `curl` and Postman through for debugging. Remove it if you're paranoid.
- **Rename the env var** from `FRONTEND_URL` (singular) to `FRONTEND_URLS` (plural) so it's obvious it accepts a list. Update `.env.example`.

**Commit:** `refactor(server): CORS allowlist with comma-separated origins`

### 3.4. Add helmet
**File:** [server/src/app.js](server/src/app.js).

```bash
cd server && npm install helmet
```

```js
const helmet = require('helmet');
app.use(helmet()); // place BEFORE cors() — helmet's headers should be on every response
```

Defaults are fine for an API server. `helmet()` with no options sets `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, and ~10 others. None of them break anything for a JSON API.

**Commit:** `feat(server): add helmet for default security headers`

### 3.5. Auth rate-limit
**File:** [server/src/modules/auth/authRoutes.js](server/src/modules/auth/authRoutes.js).

You already have `rate-limiter-flexible` in dependencies (used by the AI module). Reuse the same pattern: create `server/src/shared/middlewares/authRateLimit.js` modeled on [aiRateLimit.js](server/src/modules/ai/aiRateLimit.js), but keyed by `req.ip` instead of `req.user.id` (the user isn't authenticated yet at login time).

Suggested limits:
- `/login`: 5 attempts per IP per 15 minutes.
- `/register`: 3 attempts per IP per hour.

These are restrictive on purpose — real users almost never hit either limit, but a brute-forcer hits the wall instantly. If a legitimate user does hit it (e.g., shared corporate IP), the 429 response with `retryAfterSeconds` lets the UI surface a clear message.

**Commit:** `feat(server): rate-limit /auth/login and /auth/register by IP`

### 3.6. Warn-on-fallback for AI rate limiter
**File:** [server/src/modules/ai/aiRateLimit.js](server/src/modules/ai/aiRateLimit.js).

The `insuranceLimiter: new RateLimiterMemory(...)` activates silently when Redis is unreachable. In a single-process deploy this is mostly fine, but you'll never know Redis is down from logs.

**Pattern:** subscribe to the Redis client's `error` event ([server/src/shared/configs/redis.js](server/src/shared/configs/redis.js)) and `console.warn` once when the connection fails. Don't warn repeatedly — `ioredis` reconnects automatically and you'll spam the logs. Track a boolean.

This is a polish item. Skip if it slows you down.

**Commit:** `feat(server): warn when AI limiter falls back to in-memory`

### 3.7. Server Dockerfile
**File:** new at `server/Dockerfile`.

**Pattern (adapt and type yourself):**
```dockerfile
# Stage 1: build (Prisma generate)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY server.js ./

# Stage 2: runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
USER node
EXPOSE 4000
CMD ["node", "server.js"]
```

**Why each piece:**
- Multi-stage build keeps the final image small (no devDependencies in the runtime image).
- `npm ci --omit=dev` is faster and more deterministic than `npm install`.
- `npx prisma generate` must run inside the image because the Prisma client is platform-specific (Alpine = musl libc, not glibc).
- `USER node` drops root privileges. Container can't compromise host even if exploited.
- Don't `COPY .env` — env vars come from `docker compose` at runtime.

**Companion:** `server/.dockerignore`
```
node_modules
.env
.env.*
*.log
.git
prisma/migrations/*/migration.sql.bak
```

### 3.8. Execution-service Dockerfile
**File:** new at `execution-service/Dockerfile`.

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY index.js ./
# Note: NOT running as 'node' user — needs docker socket access.
# The socket's group (docker on host) won't match inside container.
# Acceptable trade-off given the security analysis in §6.
EXPOSE 0
CMD ["node", "index.js"]
```

**Why each piece:**
- `apk add docker-cli` gives the container the `docker` binary that [executor.js:37](execution-service/src/executor.js#L37) shells out to.
- No `EXPOSE` of a real port — the exec-service is a Redis consumer, not an HTTP server.
- Stays as root inside the container because the docker socket is owned by `root:docker` on the host. Mapping group IDs across host/container is fragile; just accept root here. (The host *daemon* runs as root anyway — root inside a container with no docker socket is no more dangerous than `node` user.)

**Companion:** `execution-service/.dockerignore` (same pattern as server).

### 3.9. Top-level docker-compose.yml
**File:** new at `docker-compose.yml` (repo root).

**Pattern:**
```yaml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    # No port exposure — only reachable inside the compose network.

  server:
    build: ./server
    restart: unless-stopped
    env_file: ./server/.env.production
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - redis
    ports:
      - "4000:4000"   # Caddy will proxy here in Phase B; remove this once Caddy is in.

  execution-service:
    build: ./execution-service
    restart: unless-stopped
    env_file: ./execution-service/.env.production
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - redis
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

**Why each piece:**
- `services` are on the same default bridge network → server can resolve `redis:6379` by DNS.
- `restart: unless-stopped` survives reboots and crashes but stops if you manually `docker compose down`.
- `env_file` keeps secrets out of the compose file (which you commit). The `.env.production` files live only on the EC2 box.
- `environment:` overrides force `REDIS_HOST=redis` regardless of what's in the env file — this is the service-name DNS, not localhost.
- The socket mount on `execution-service` is the DooD escape hatch. Read §6.

### 3.10. Caddyfile (Phase B addition)
**File:** new at `Caddyfile` (repo root). Don't commit until Phase B.

```
api.yourdomain.com {
    reverse_proxy server:4000
}
```

That's it. Caddy auto-fetches a Let's Encrypt cert on startup, renews it ~30 days before expiry, and proxies HTTPS → the server container. Add this service to compose in Phase B (see §4.B).

### 3.11. Local end-to-end test
After 3.1–3.9 are committed:

```bash
# On Windows with Docker Desktop running
cd d:\Learning\OJ\execution\online-judge
# Create server/.env.production and execution-service/.env.production locally for the test.
# server's DATABASE_URL points to a local Postgres or a temporary Neon database.
docker compose up -d --build
docker compose exec server npx prisma migrate deploy
docker compose exec server node scripts/seedTags.js

# Start the frontend pointing at the dockerized backend
cd client
$env:VITE_API_BASE_URL = "http://localhost:4000"
npm run dev
```

Open `http://localhost:5173`, register, publish a problem, submit a Python "print hello" — should land on AC.

Watch `docker ps` in another terminal during submission: you should see ephemeral `oj-<submissionId>-tc0` containers spawn and disappear.

If that works locally, EC2 is just "the same compose stack on a different host with a real Postgres."

---

## 4. Deployment runbook

### Phase A — Backend on EC2, plain HTTP, local frontend
Goal: prove the full stack works on real hardware before adding TLS / Vercel.

#### A.1. AWS infrastructure
1. Launch EC2 t3.micro, Ubuntu 22.04 LTS, 8 GB gp3 EBS, in a region close to you.
2. Allocate an **Elastic IP**, associate it with the instance. (Free while attached. Saves you from the IP changing on reboot.)
3. Security group inbound rules:
   - `22/tcp` from your IP only (SSH).
   - `4000/tcp` from `0.0.0.0/0` (temporary, Phase A only).
   - `80/tcp` and `443/tcp` from `0.0.0.0/0` (open now, used in Phase B).
4. Download the key pair. Test SSH: `ssh -i key.pem ubuntu@<elastic-ip>`.

#### A.2. Install Docker + compose on the box
```bash
# On the EC2 box, as ubuntu user
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
# Log out and back in so the group takes effect
exit
```

After reconnecting: `docker compose version` should print a version.

#### A.3. Provision Neon Postgres
1. Sign up at [neon.tech](https://neon.tech).
2. Create a new project — pick the region closest to your EC2 (latency on every DB query).
3. Copy the **pooled** connection string (it has `pooler` in the hostname). The pooler is critical for serverless-style scale-to-zero.
4. Test from your laptop: `psql "<connection-string>" -c "select 1;"`.

#### A.4. Deploy the code
```bash
# On EC2
git clone https://github.com/<you>/online-judge.git
cd online-judge

# Create server/.env.production (use vim/nano — don't paste into history)
# Required keys:
#   DATABASE_URL=<neon pooled connection string>
#   JWT_SECRET=<generate fresh: openssl rand -hex 32>
#   GEMINI_API_KEY=<your key>
#   PORT=4000
#   FRONTEND_URLS=http://localhost:5173
#   REDIS_HOST=redis     (overridden by compose anyway; included for parity with .env.example)
#   REDIS_PORT=6379

# Create execution-service/.env.production
#   REDIS_HOST=redis
#   REDIS_PORT=6379

# Build and start
docker compose up -d --build

# Run migrations against Neon
docker compose exec server npx prisma migrate deploy

# Seed tags (one-time)
docker compose exec server node scripts/seedTags.js

# Verify
curl http://localhost:4000/ping
# Should print: {"message":"pong"}
```

#### A.5. Test from your laptop
```powershell
# On your Windows laptop, in the client/ directory
cd d:\Learning\OJ\execution\online-judge\client
$env:VITE_API_BASE_URL = "http://<elastic-ip>:4000"
npm run dev
```

Open `http://localhost:5173`. Register, publish a problem, submit code. The CORS header on the EC2 server says `Access-Control-Allow-Origin: http://localhost:5173` (because that's in your `FRONTEND_URLS`), so your laptop browser is happy.

**Sanity-check verdict streaming:** the SSE endpoint `/api/submissions/:id/events` is held open by Caddy/server during execution. If verdicts show up live in the UI without page refresh, the SSE path is working end-to-end.

**Done with Phase A** when: full register → submit → AC roundtrip works from your laptop against the EC2 backend.

---

### Phase B — Domain + Caddy + TLS
Goal: make the backend reachable at `https://api.yourdomain.com` so Vercel can call it.

#### B.1. DNS
At your registrar, create an A record:
- Name: `api` (or whatever subdomain you want).
- Type: `A`.
- Value: your EC2 elastic IP.
- TTL: 300 (5 minutes — gives you fast iteration if you mistype).

Verify: `nslookup api.yourdomain.com` → should return your elastic IP within a few minutes.

#### B.2. Add Caddy to compose
On the EC2 box, append to `docker-compose.yml`:
```yaml
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - server

volumes:
  caddy_data:
  caddy_config:
```

The `caddy_data` named volume is **critical** — it persists the Let's Encrypt cert. Without it, every `docker compose down/up` re-fetches a cert, and Let's Encrypt rate-limits at 5/week per domain.

Remove the `ports: ["4000:4000"]` block from the `server` service. The Node server is now only reachable inside the compose network — Caddy is the only public-facing service.

#### B.3. Update CORS env, restart
```bash
# Edit server/.env.production:
# FRONTEND_URLS=http://localhost:5173,https://api.yourdomain.com
# (We'll add the Vercel URL in Phase C.)

docker compose up -d --build
docker logs caddy
# Should see: "certificate obtained successfully"

# Verify
curl https://api.yourdomain.com/ping
# {"message":"pong"} — and with a valid cert (no -k flag needed)
```

#### B.4. Tighten security group
In AWS console, remove the `4000/tcp 0.0.0.0/0` rule. The server is no longer reachable on port 4000 from the internet — only through Caddy on 443.

**Done with Phase B** when: `https://api.yourdomain.com/ping` returns `pong` with a valid cert and `4000` is closed at the security group.

---

### Phase C — Frontend on Vercel
Goal: production frontend served from Vercel CDN, calling the EC2 backend over HTTPS.

#### C.1. Vercel setup
```bash
# Locally
cd d:\Learning\OJ\execution\online-judge\client
npx vercel login
npx vercel link
# Select: create new project, root directory = client/, framework = Vite
```

In the Vercel dashboard → Project Settings → Environment Variables:
- `VITE_API_BASE_URL` = `https://api.yourdomain.com` — for **Production**, **Preview**, and **Development** scopes.

#### C.2. Deploy
```bash
npx vercel --prod
```

Vercel returns a URL like `https://your-app-xyz.vercel.app`. Optionally bind your apex domain (`yourdomain.com`) via Vercel's DNS instructions.

#### C.3. Update CORS for Vercel
```bash
# On EC2, edit server/.env.production:
# FRONTEND_URLS=https://yourdomain.com,https://your-app-xyz.vercel.app
# (drop http://localhost:5173 from production unless you actively test against prod backend)

docker compose up -d
```

#### C.4. End-to-end test
From the Vercel URL:
1. Register a new user.
2. Log in.
3. As a PROBLEM_SETTER role: create a problem, add test cases, publish it.
4. As a regular USER: open the problem, submit a Python solution, watch the verdict stream in live.
5. On EC2: `docker ps` during step 4 should show a transient `oj-<id>-tc0` container.

**Done with Phase C** when: full roundtrip works from Vercel, and `htop` on EC2 during a submission shows RAM peaking below ~700 MB (leaving headroom for the OS).

---

## 5. Rollback playbook

### Bad code deploy
```bash
# On EC2
git log --oneline -n 5   # find the last-good commit
git checkout <sha>
docker compose up -d --build
```
The Docker layer cache makes most rollback rebuilds fast.

### Bad migration
Prisma migrations are forward-only by default. If a migration breaks prod:
1. Don't `prisma migrate reset` — it nukes data.
2. Write a new "fix-up" migration that undoes the damage.
3. Apply it: `docker compose exec server npx prisma migrate deploy`.

Neon has point-in-time recovery on the paid tier; on free, the last automated snapshot is your floor.

### Bad CORS / can't reach backend
SSH in, edit `server/.env.production`, `docker compose up -d server` (no rebuild needed, env_file is re-read on container start).

### EC2 box dies
Because state lives in Neon (DB), the EC2 box is cattle. Launch a new t3.micro, install Docker, `git clone`, copy `.env.production` files (from your password manager — do NOT keep them in git), `docker compose up -d`. ~10 minutes end to end.

---

## 6. Why DooD over DinD (containerizing the execution-service)

The exec-service needs to launch user-code containers. Two options:

### Docker-out-of-Docker (DooD) — the chosen approach
The exec-service container bind-mounts the host's docker socket: `/var/run/docker.sock:/var/run/docker.sock`. When [executor.js](execution-service/src/executor.js) calls `spawn('docker', ['run', ...])`, that CLI inside the container talks to the **host's** Docker daemon over the socket. The resulting user-code container is a *sibling* of the exec-service container — both are direct children of the host daemon.

**Pros:**
- Shares the host's image cache. `warmup.js` pre-pulls `python:3.11-alpine`, `gcc:latest`, `eclipse-temurin:17-alpine` *once* on the host, and every user container reuses those layers.
- No nested daemon, no `--privileged`, no overhead.
- Trivial to debug from the host: `docker ps` on the box shows everything (exec-service + user containers) in one list.

**Cons:**
- The exec-service container has root access to the host's Docker daemon. If user code escapes its sandbox *and* compromises the exec-service process, the attacker can `docker run --privileged --pid=host -v /:/host` and own the host. For a learning project this is acceptable; in production you'd put the exec-service on a dedicated host with no other services.

### Docker-in-Docker (DinD) — not chosen
The exec-service container runs its own nested Docker daemon (`docker:dind` image). User containers are grandchildren of the host daemon.

**Why not for this project:**
- Needs `--privileged` on the outer container — a meaningful security regression.
- Duplicate image cache: the nested daemon must re-pull every base image inside its own storage. On a 1 GiB t3.micro with 8 GB EBS, this is fatal.
- Performance penalty from the nested networking and storage layers.

DinD is the right tool when running on Kubernetes (where the worker pod is ephemeral) or in CI (where you want to isolate the build's Docker daemon). On a single-VM deploy, DooD wins on every axis.

### Resource math for t3.micro
1 GiB RAM, divided roughly:
- OS + Docker daemon: ~250 MB.
- Redis: ~30 MB.
- Server Node process: ~120 MB.
- Exec-service Node process: ~80 MB.
- Caddy: ~20 MB.
- **Headroom for user containers: ~500 MB.**

Exec-service `concurrency: 3` ([worker.js](execution-service/src/worker.js)) means up to 3 concurrent user containers. At 128 MB memory limit per submission (the typical problem default), that's 384 MB — fits with margin.

Watch `htop` during real load. If RAM hits >90% consistently, drop concurrency to 2 or upgrade to t3.small.

---

## 7. Known risks this deploy does NOT address

These are deliberate scope cuts. Track them in [state.md](state.md) under "Deferred".

1. **No multi-AZ / no autoscaling.** Single t3.micro = single point of failure. Acceptable for a learning project; not acceptable if you ever take real traffic.
2. **No monitoring beyond Vercel/Neon dashboards.** No CloudWatch alarms, no Sentry for errors, no log aggregation. First sign of a problem will be the box becoming unreachable.
3. **No log rotation on Docker.** `/var/lib/docker/containers/*-json.log` grows unbounded by default. Add `daemon.json` log driver limits after a week if disk fills.
4. **No DDoS protection.** AWS shields against L3/L4 attacks for free, but L7 (HTTP flood) will take you down. Cloudflare proxy in front of the EC2 elastic IP is the standard mitigation. Add later.
5. **DooD security trade-off.** Documented in §6.
6. **No automated backups beyond Neon's.** The box itself has no state worth backing up (code is in git, secrets in your password manager).
7. **No CI/CD.** Deploys are SSH + `git pull + docker compose up`. Fine for now; GitHub Actions later.
8. **No staging environment.** Test on your laptop, deploy straight to prod. Get a separate EC2 + Neon project when this hurts.

---

## 8. Quick reference — every URL after deploy

| URL | What it is |
|---|---|
| `https://yourdomain.com` | Frontend (Vercel) |
| `https://api.yourdomain.com` | Backend API (EC2 + Caddy) |
| `https://api.yourdomain.com/ping` | Liveness check |
| `<neon-pooled-host>:5432` | Postgres (no public web UI; query via psql/Neon dashboard) |
| `https://console.neon.tech` | DB management |
| `https://vercel.com/dashboard` | Frontend deploys, env vars, logs |
| AWS Console → EC2 | Instance management, security groups |

---

*Plan written: 2026-05-23. Update [state.md](state.md) as you work through it.*
