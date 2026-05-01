# Online Judge — Project Reference

A comprehensive reference of all concepts, decisions, and patterns covered during development.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Architecture](#architecture)
4. [Git Workflow](#git-workflow)
5. [Backend Setup](#backend-setup)
6. [Database](#database)
7. [Auth Module](#auth-module)
8. [Execution Engine](#execution-engine)
9. [Concepts Glossary](#concepts-glossary)

---

## Project Overview

Building a production-grade Online Judge (like LeetCode / Codeforces) from scratch.

**Planned features:**
- User auth & profiles
- Problem management
- Code submission & execution engine (sandboxed)
- Real-time verdicts
- Admin panel
- End-to-end deployment

**Tech stack:**
- Backend: Node.js + Express
- Database: PostgreSQL (hosted on Neon)
- ORM: Prisma 5
- Auth: JWT + bcryptjs

---

## Repository Structure

### Monorepo

Both frontend and backend live in the same repository:

```
Online Judge/          ← repo root
  server/              ← backend (Node/Express)
  client/              ← frontend (future)
  LEARNING.md          ← session-by-session learning journal
  project.md           ← this file (concept reference)
  CLAUDE.md            ← mentor configuration
```

**Why monorepo:** Chosen for convenience at this stage. Single repo to clone, one place to look.

**Clear boundaries enforced:**
- `server/` and `client/` each have their own `package.json` — never share dependencies
- No code imports across `server/` and `client/` — they communicate only via API
- Each has its own scripts, configs, and `.gitignore`
- When deployment comes, they deploy independently even though they live together

### Server Folder Structure

```
server/
  src/
    routes/        → URL endpoint definitions
    controllers/   → Request/response handling
    services/      → Business logic (no HTTP here)
    models/        → DB schemas/models
    middlewares/   → Auth checks, error handling, etc.
    configs/       → DB config, env config
    utils/         → Shared helper functions
    generated/     → Auto-generated Prisma client (gitignored)
  prisma/
    schema.prisma  → DB model definitions
    migrations/    → SQL migration history
  server.js        → Entry point, starts HTTP server
  package.json
  .gitignore
  .env             → Secret config (gitignored)
  .env.example     → Template showing required env vars (committed)
```

---

## Architecture

### Layered Architecture (not pure MVC)

Classic MVC has a View layer — REST APIs return JSON, not HTML. So no View layer.

The pattern used here:

```
Request → Route → Controller → Service → Model → DB
```

| Layer | Responsibility |
|-------|---------------|
| Route | Maps URL + HTTP method to a controller function |
| Controller | Handles HTTP (req, res). Validates input, calls service, sends response |
| Service | Pure business logic. No knowledge of HTTP or req/res |
| Model | Defines data shape, talks to the DB |

**Key rule:** Each layer only talks to the layer directly below it.
- A route must never touch the DB directly
- A service must never know about `req` or `res`
- A controller must never contain business logic

### `app.js` vs `server.js` Separation

| File | Responsibility |
|------|---------------|
| `app.js` | Creates and configures Express app — middleware, routes, error handlers. No knowledge of ports. |
| `server.js` | Imports `app.js` and starts the HTTP server (`app.listen`). |

**Why separate:**
- Tests can import `app.js` directly without binding to a port
- Easier to support HTTPS, clustering, or multiple environments later
- Clean separation of "what the app does" vs "how it runs"

---

## Git Workflow

### Branching Strategy

```
master         ← stable, always deployable
  └── develop  ← integration branch
        └── feat/auth        ← feature branches
        └── feat/problems
        └── fix/some-bug
        └── chore/some-setup
```

**Branch naming:** `type/short-description`
- `feat/` — new feature
- `fix/` — bug fix
- `chore/` — setup, config, tooling
- `docs/` — documentation only

### Conventional Commits

Format:
```
type: short description
```

| Type | When to use |
|------|-------------|
| `feat` | User-facing new feature |
| `fix` | Bug fix |
| `chore` | Setup, config, tooling — no production logic |
| `docs` | Documentation only |
| `refactor` | Code restructure, no behavior change |

### Rules
- Each commit = one logical unit of work
- Commit order should tell a logical narrative
- Never commit `.env` — it contains secrets
- Always commit `package-lock.json` — locks exact dependency versions
- Use `git add <specific files>` over `git add .` — forces you to think about what's staged
- Empty directories can't be tracked — use `.gitkeep` placeholder files
- Merge via Pull Requests, even when working solo — keeps clean history

---

## Backend Setup

### Key Files

**`server.js`:**
```js
require('dotenv').config(); // load env vars first, before anything else
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
```

**`src/app.js`:**
```js
const express = require('express');
const app = express();

app.use(express.json()); // parse JSON request bodies

app.get('/ping', (req, res) => res.json({ message: 'pong' })); // health check

module.exports = app;
```

### Key Packages

| Package | Type | Purpose |
|---------|------|---------|
| `express` | dependency | Web framework |
| `dotenv` | dependency | Loads `.env` into `process.env` |
| `@prisma/client` | dependency | Prisma query client (runtime) |
| `bcryptjs` | dependency | Password hashing |
| `jsonwebtoken` | dependency | JWT generation and verification |
| `nodemon` | devDependency | Auto-restarts server on file changes |
| `prisma` | devDependency | Prisma CLI (migrations, schema, codegen) |

### Why `dotenv` loads in `server.js`

The entry point is the right place to load environment config — before anything else runs. Loading it inside a module (like `db.js`) is fragile and order-dependent. If something imports `db.js` before dotenv loads, `process.env.DATABASE_URL` will be undefined.

---

## Database

### Why PostgreSQL

| Factor | Decision |
|--------|----------|
| Data shape | Clearly relational — users, submissions, problems, contests all have relationships |
| Queries | Leaderboards and rankings need joins and aggregations — SQL is natural here |
| Reliability | ACID compliance matters when recording verdicts |
| vs MongoDB | MongoDB's flexible schema adds no value when the data structure is well-defined |

### Why Neon

- Free hosted PostgreSQL
- No auto-pausing (Supabase free tier auto-pauses after 1 week of inactivity)
- Plan: use local PostgreSQL or Railway for production deployment later

### Why Prisma (ORM)

Without ORM:
```sql
INSERT INTO users (username, email, password) VALUES ($1, $2, $3);
```

With Prisma:
```js
await prisma.user.create({ data: { username, email, password } });
```

Prisma also:
- Defines schema in a readable `schema.prisma` file
- Manages migrations (versioned DB changes)
- Auto-generates a query client from your schema

**Note:** Using Prisma 5 (not 7). Prisma 7 has breaking changes incompatible with plain JavaScript — requires TypeScript and driver adapters.

### Prisma Setup Steps

| Step | Command | What it does |
|------|---------|--------------|
| Install CLI | `npm install --save-dev prisma@5` | Prisma dev tooling |
| Install client | `npm install @prisma/client@5` | Runtime query library |
| Initialize | `npx prisma init` | Creates `schema.prisma` and `.env` template |
| Define models | Edit `schema.prisma` | Write your data models |
| Migrate | `npx prisma migrate dev --name <name>` | Generates SQL and applies it to DB |
| Generate client | `npx prisma generate` | Generates JS client from schema |

### Migrations

A migration is a versioned SQL change applied to the DB. Stored in `prisma/migrations/`. Always commit migrations — they are the source of truth for how your DB schema evolved over time.

### Single Prisma Client Instance (`src/configs/db.js`)

```js
const { PrismaClient } = require('../generated/prisma');
const prismaClient = new PrismaClient();
module.exports = prismaClient;
```

**Why single instance:** Creating a new `PrismaClient` per request opens a new connection pool each time, exhausting DB connections. One shared instance = one connection pool for the entire app.

### User Schema

```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  name      String
  role      Role     @default(USER)
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
```

**Design decisions:**
- `id` is UUID not integer — avoids exposing user count, prevents sequential scraping
- `role` added for future admin panel — ADMIN can manage problems and test cases
- No `salt` field — `bcryptjs` embeds salt inside the hash string
- `updatedAt` uses `@updatedAt` — Prisma updates it automatically on every change

**Making someone ADMIN (early stage):** Run SQL directly in Neon:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

---

## Auth Module

### What "Auth Implemented" Means

Three things working:
1. `POST /api/auth/register` — creates a user, returns JWT
2. `POST /api/auth/login` — verifies credentials, returns JWT
3. **Auth middleware** — verifies JWT on protected routes, attaches user to `req.user`

### API Contract

**`POST /api/auth/register`**

| | Detail |
|-|--------|
| Body | `name, username, email, password` |
| Success | `201 + { token, user: { id, username, email } }` |
| Invalid input | `400` |
| Username/email taken | `409` |
| Server error | `500` |

**`POST /api/auth/login`**

| | Detail |
|-|--------|
| Body | `email, password` |
| Success | `200 + { token, user: { id, username, email } }` |
| Invalid input | `400` |
| Wrong email or password | `401` |
| Server error | `500` |

### Security: Why Login Returns Same Error for Wrong Email or Wrong Password

Returning different errors reveals whether an email exists in the system. An attacker can try emails until they get "wrong password" instead of "email not found" — confirming a valid account. This is called a **user enumeration attack**. Always return a generic "invalid credentials" for both cases.

### Password Hashing with bcryptjs

bcryptjs output:
```
$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVImJ2zdC
```

This single string contains:
- `$2b$` — bcrypt algorithm version
- `10$` — cost factor (hashing rounds)
- Next 22 chars — the **salt**
- Remaining chars — the **hash**

When verifying: bcrypt extracts the salt from the stored hash, re-hashes the input, and compares. No separate salt storage needed.

### JWT Flow

```
Register/Login → Service creates/verifies user → Controller generates JWT → Returns token to client
```

- Token generation happens in the **controller** (or a utility), not the service
- The service's job is user creation/verification only
- Protected routes use **auth middleware** to verify the token before reaching the controller

### Auth Service Responsibilities

**Register service:**
1. Check if username or email already exists → throw `409` if so
2. Hash the password with bcryptjs
3. Save user to DB
4. Return created user (without password field)

**Login service:**
1. Find user by email → throw `401` if not found
2. Compare submitted password against stored hash
3. Return user (without password field) if valid → throw `401` if not

**Note:** Input validation (are fields present? valid email format?) is separate — done in middleware before the service is called. Business logic validation (is email taken?) stays in the service because it requires a DB query.

### Auth Milestone Tracker

| Milestone | Status |
|-----------|--------|
| Set up DB connection (Prisma + Neon) | ✅ Done |
| Design User schema/model | ✅ Done |
| Auth service (register + login logic, password hashing) | ✅ Done |
| Auth controllers | ✅ Done |
| Auth router | ✅ Done |
| Auth middleware (JWT verification for protected routes) | ✅ Done |
| Test all endpoints | ✅ Done |

---

## Execution Engine

### Overview

The execution engine is an isolated service that runs user-submitted code safely and returns a verdict. It is separate from the main app and communicates via a message queue.

### Repository Structure

```
Online Judge/
  server/              ← main app (API, DB, WebSocket)
  execution-service/   ← code runner (queue worker, Docker executor)
  client/              ← frontend (future)
  [Redis]              ← external queue + pub/sub (not in repo)
```

### Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Queue | BullMQ + Redis | Async, resilient, Node.js native |
| Sandboxing | Docker per submission | Isolation, resource limits, disposable |
| Languages | C, C++, Java, Python | Common competitive programming languages |
| Test cases | Text in DB, bundled in queue job | No shared filesystem needed |
| Resource limits | Per-problem | Different problems need different limits |
| DB writes | Main app only | Execution service stays stateless |

### Complete Flow

```
1.  POST /api/submissions → main app
2.  Submission created in DB (verdict: PENDING)
3.  Job pushed to Redis queue via BullMQ
    { submissionId, code, language, testCases, timeLimit, memoryLimit }
4.  202 Accepted returned to client immediately
5.  Execution worker picks job from queue
6.  Code written to temp file
7.  Docker container started (no network, memory/time limits enforced)
8.  Code compiled + run against each test case
9.  Actual output compared to expected output
10. Verdict determined
11. Verdict published to Redis pub/sub
12. Main app receives verdict via pub/sub
13. Main app updates Submission in DB
14. Main app pushes verdict to client via WebSocket
15. Browser updates in real-time
```

### Why Execution Service Doesn't Write to DB

Single responsibility — the execution service only runs code and returns results. DB access would couple it to the schema and violate clean service boundaries. Main app is the single writer to DB.

### Verdict Types

| Verdict | Meaning |
|---------|---------|
| PENDING | In queue, not yet processed |
| AC | Accepted — all test cases passed |
| WA | Wrong Answer — output mismatch |
| TLE | Time Limit Exceeded |
| MLE | Memory Limit Exceeded |
| RTE | Runtime Error — crash during execution |
| CE | Compilation Error |
| IE | Internal Error — judge-side failure |

### Docker Safety Flags

| Flag | What it prevents |
|------|-----------------|
| `--network none` | Network access |
| `--memory` | Memory limit |
| `--pids-limit` | Process spawning |
| `--stop-timeout` + kill | Infinite loops (TLE) |
| Read-only mount | Filesystem writes |

### Redis — Two Roles

| Role | Used for |
|------|---------|
| BullMQ queue | Job delivery from main app to execution worker |
| Pub/sub channel | Verdict delivery from execution worker to main app |

### Execution Service Milestone Tracker

| Milestone | Status |
|-----------|--------|
| Install Docker | ⬜ Pending |
| Set up Redis locally | ⬜ Pending |
| Initialize execution-service/ project | ⬜ Pending |
| Problem + TestCase schema in DB | ⬜ Pending |
| Submission API (POST /api/submissions) | ⬜ Pending |
| BullMQ producer in main app | ⬜ Pending |
| BullMQ worker in execution service | ⬜ Pending |
| Docker executor per language | ⬜ Pending |
| Verdict comparison logic | ⬜ Pending |
| Redis pub/sub verdict publisher | ⬜ Pending |
| Main app pub/sub subscriber + DB update | ⬜ Pending |
| WebSocket real-time verdict to client | ⬜ Pending |

---

## Concepts Glossary

| Concept | What it means |
|---------|--------------|
| Monorepo | Single repository containing multiple sub-projects (server + client) |
| Scaffold | Setting up the skeleton/structure before writing real logic |
| Layered architecture | Separating code into Route → Controller → Service → Model layers |
| ORM | Translates JavaScript into SQL — you write JS objects, it talks to the DB |
| Migration | Versioned SQL change applied to the DB, tracked in `prisma/migrations/` |
| Connection pool | A set of reusable DB connections managed automatically by Prisma |
| Middleware | Functions that run between receiving a request and sending a response |
| `express.json()` | Middleware that parses JSON request bodies — without it, `req.body` is undefined |
| `package-lock.json` | Auto-generated file that locks exact dependency versions |
| `.gitkeep` | Empty placeholder file to force git to track an empty directory |
| `.env.example` | Committed template showing required env variables without actual values |
| Health-check route | A simple `/ping` endpoint to verify the server is alive |
| UUID | Universally Unique Identifier — random string ID, safer than sequential integers |
| JWT | JSON Web Token — signed token used to authenticate requests after login |
| bcryptjs | Library that hashes passwords and embeds the salt inside the hash |
| User enumeration | Security attack where different error messages reveal whether an email exists |
| ACID | Database property: Atomicity, Consistency, Isolation, Durability — guarantees reliable transactions |
| Bearer token | Standard format for sending JWT: `Authorization: Bearer <token>` |
| `next(err)` | Passes error to Express global error handler, skipping all regular middleware |
| Error handler middleware | Four-parameter `(err, req, res, next)` — Express identifies it by signature |
| Timing attack | Attack where response time differences reveal which error branch was hit |
| `express-validator` | Library for declarative input validation as Express middleware |
| `.bail()` | Stops validation chain on first failure — prevents duplicate error messages |
| JWT secret rotation | Changing the secret immediately invalidates all existing tokens |
| Modular monolith | Monolith organized by feature modules with clean boundaries |
| Message queue | Buffer between producer and consumer — decouples timing |
| BullMQ | Node.js job queue library built on Redis |
| Redis pub/sub | Publish/subscribe messaging — one publisher, many subscribers |
| WebSocket | Persistent browser-server connection for real-time updates |
| Sandbox | Isolated environment that prevents code from affecting the host |
| Stateless service | Service with no DB/filesystem — only processes what's in the job |
| 202 Accepted | HTTP status — request received, processing will happen asynchronously |
| Event-driven architecture | System where components communicate via events/messages, not direct calls |
