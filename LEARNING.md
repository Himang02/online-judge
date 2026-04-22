# Learning Journal — Online Judge

## Session 1 — Project Bootstrap & Express Setup

### What Was Built
- Initialized Node.js/Express backend inside `server/`
- Set up folder structure following layered architecture
- Created `app.js` and `server.js` as the entry points
- Added `/ping` health-check route
- Connected `nodemon` for dev auto-reload

---

### Architecture Decision — Layered Architecture (not pure MVC)

Classic MVC has a View layer — but in a REST API, there's no View. We return JSON, not HTML.

So the pattern used here is **layered architecture**:

```
Request → Route → Controller → Service → Model → DB
```

| Layer | Responsibility |
|-------|---------------|
| Route | Maps URL + HTTP method to a controller function |
| Controller | Handles HTTP (req, res). Validates input, calls service, sends response |
| Service | Pure business logic. No knowledge of HTTP or req/res |
| Model | Defines data shape, talks to the DB |

**Key rule:** Each layer only talks to the layer directly below it. A route must never touch the DB. A service must never know about `req` or `res`.

---

### Design Decision — `app.js` vs `server.js` Separation

These two files have different responsibilities:

- **`app.js`** — creates and configures the Express app (middleware, routes, error handlers). No knowledge of ports or how it's served.
- **`server.js`** — imports `app.js` and starts the HTTP server (`app.listen`).

**Why this matters:**
- Tests can import `app.js` directly without binding to a port
- Easier to support HTTPS, clustering, or multiple environments later
- Clean separation of "what the app does" vs "how it runs"

---

### Design Decision — Monorepo Structure with clear boundaries

Both frontend and backend live in the same repository:

```
Online Judge/        ← repo root
  server/            ← backend (Node/Express)
  client/            ← frontend (future)
```
Chosen for convenience at this stage, but with clear boundaries enforced to keep server/ and client/ independently deployable as the project grows.

- server/ and client/ each have their own package.json — never share dependencies
- No code imports across server/ and client/ — they communicate only via API
- Each has its own scripts, configs, and .gitignore
- When deployment comes, they deploy independently even though they live together


---

### Design Decision — Database: PostgreSQL via Neon

**Why PostgreSQL over MongoDB:**
- Data in an Online Judge is clearly relational — users have submissions, submissions belong to problems, problems belong to contests
- Complex joins and aggregations (leaderboards, rankings) are natural in SQL
- ACID compliance matters when recording verdicts
- MongoDB's flexible document model doesn't add value here — the schema is well-defined

**Why Neon (for now):**
- Free hosted PostgreSQL, no local installation needed
- No auto-pausing (unlike Supabase free tier)
- Will move to a more robust setup when deploying

**ORM choice: Prisma**
- Schema defined in a single readable `schema.prisma` file
- Auto-generates a type-safe query client
- Straightforward migrations

---

### Folder Structure

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
  server.js        → Entry point, starts HTTP server
  package.json
  .gitignore
```

---

### Git Practices Learned

**Conventional commits format:**
```
type: short description
```
Common types: `feat`, `fix`, `chore`, `docs`, `refactor`

- `feat` = user-facing feature
- `chore` = setup, config, tooling (no production logic)

**Commit as logical units** — each commit should represent one coherent unit of work. Someone reading git history should follow what happened and why.

**Commit order matters** — tells a logical narrative:
1. Scaffold structure first
2. Add `.gitignore` before installing packages (so `node_modules` is never staged)
3. Install dependencies
4. Write code

**`package-lock.json` should always be committed** — it locks exact dependency versions so all machines/teammates get identical installs.

**Empty directories can't be tracked by git** — use a `.gitkeep` placeholder file to force git to track empty folders.

---

### Key Concepts

| Concept | What it means |
|---------|--------------|
| Scaffold | Setting up the skeleton/structure before writing real logic |
| ORM | Translates JavaScript into SQL — you write JS objects, it talks to the DB |
| Middleware | Functions that run between receiving a request and sending a response |
| `express.json()` | Middleware that parses JSON request bodies — without it, `req.body` is undefined |
| `package-lock.json` | Auto-generated file that locks exact dependency versions |
| `.gitkeep` | Empty placeholder file to force git to track an empty directory |
| Health-check route | A simple `/ping` endpoint to verify the server is alive |

---

## Session 2 — Auth Module Planning & Prisma Setup

### Progress Tracker — Auth Module

| Milestone | Status |
|-----------|--------|
| Set up DB connection (Prisma + Neon) | ✅ Done |
| Design User schema/model | ✅ Done |
| Auth service (register + login logic, password hashing) | ⬜ Pending |
| Auth controllers | ⬜ Pending |
| Auth router | ⬜ Pending |
| Auth middleware (JWT verification for protected routes) | ⬜ Pending |
| Test all endpoints | ⬜ Pending |

---

### API Contract — Auth Endpoints

**`POST /api/auth/register`**
- Body: `name, username, email, password`
- Success: `201 + { token, user: { id, username, email } }`
- Failures: `400` (invalid input), `409` (username/email taken), `500` (server error)

**`POST /api/auth/login`**
- Body: `email, password`
- Success: `200 + { token, user: { id, username, email } }`
- Failures: `400` (invalid input), `401` (invalid credentials), `500` (server error)

**Security note:** Login returns the same `401` whether the email doesn't exist or the password is wrong. This prevents attackers from enumerating valid emails (user enumeration attack).

---

### Design Decision — User Schema

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

**Key decisions:**
- `id` uses UUID instead of auto-increment integer — avoids exposing user count, prevents sequential scraping
- `role` added proactively — ADMIN will be able to manage problems and test cases
- No separate `salt` field — `bcryptjs` embeds the salt inside the hash string itself
- Password hashing handled by `bcryptjs` in the service layer, never stored as plain text
- Making someone ADMIN at this stage: done manually via SQL directly in the DB

---

### Prisma Setup — What Each Step Did

| Step | Command | What it did |
|------|---------|-------------|
| 1 | `npm install @prisma/client` | Installed Prisma client (runtime query library) |
| 2 | `npm install prisma --save-dev` | Installed Prisma CLI (dev tool for migrations, schema) |
| 3 | `npx prisma init` | Created `schema.prisma` and `.env` template |
| 4 | Updated `.env` | Added Neon connection string as `DATABASE_URL` |
| 5 | `npx prisma db pull` | Confirmed DB connection worked (DB was empty) |
| 6 | Defined `User` model | Wrote schema with fields, types, constraints |
| 7 | `npx prisma migrate dev` | Generated SQL, ran it on Neon (created `User` table) |
| 8 | `npx prisma generate` | Generated JS Prisma Client from schema for use in code |

**Note:** Started with Prisma 7 but downgraded to Prisma 5 — Prisma 7 has breaking changes incompatible with plain JavaScript projects (requires TypeScript and driver adapters).

---

### Design Decision — Single Prisma Client Instance

Created `src/configs/db.js` that instantiates and exports a single `PrismaClient` instance shared across the app.

**Why a single instance:** Creating a new `PrismaClient` per request would open a new DB connection pool each time, exhausting DB connections quickly. One shared instance = one connection pool for the entire app.

**Why `dotenv` loads in `server.js` not `db.js`:** The entry point is the right place to load environment config — before anything else runs. Loading it inside a module is fragile and order-dependent.

---

### Key Concepts Added

| Concept | What it means |
|---------|--------------|
| UUID | Universally Unique Identifier — random string ID, safer than sequential integers |
| Migration | A versioned SQL change applied to the DB — tracked in `prisma/migrations/` |
| Connection pool | A set of reusable DB connections managed automatically by Prisma |
| User enumeration | Security attack where different error messages reveal whether an email exists |
| `.env.example` | Committed template showing required env variables without actual values |
