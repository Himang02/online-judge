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
