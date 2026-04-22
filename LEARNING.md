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
| Auth service (register + login logic, password hashing) | ✅ Done |
| Auth controllers | ✅ Done |
| Auth router | ✅ Done |
| Auth middleware (JWT verification for protected routes) | ✅ Done |
| Test all endpoints | ✅ Done |

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

---

## Session 3 — Auth Module Implementation

### What Was Built
- Auth service (`registerUser`, `loginUser`) with bcryptjs password hashing
- Auth controllers wiring HTTP layer to service layer
- Input validation middleware using `express-validator`
- JWT utility (`generateToken`, `verifyToken`) in `src/utils/jwtUtil.js`
- Auth router mounting `POST /api/auth/register` and `POST /api/auth/login`
- Auth middleware verifying Bearer tokens on protected routes
- Global error handler in `app.js`

---

### Architecture — How a Request Flows Through Auth

```
Request
  → express.json() (parse body)
  → validation middleware (express-validator)
  → controller (extract fields, call service, generate token)
  → service (business logic, DB queries)
  → response
```

For protected routes:
```
Request → authMiddleware (verify JWT) → controller → service → response
```

---

### Design Decision — Error Handling Pattern

**Problem:** Services throw errors (AppError or Prisma errors). Controllers shouldn't format different errors differently — that leads to inconsistency.

**Solution:** 
- Controllers call `next(err)` in catch blocks
- Global error handler in `app.js` handles all errors consistently
- `AppError` (has `statusCode`) → shows the message
- Everything else → shows "Internal server error"

```js
// controller
catch (err) {
    next(err);
}

// app.js global error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;
    let message;
    if (err.type === 'entity.parse.failed') message = 'Invalid JSON in request body';
    else if (err.statusCode) message = err.message;
    else message = 'Internal server error';
    res.status(statusCode).json({ error: message });
});
```

**Why this matters:** Raw Prisma errors, stack traces, and file paths must never reach the client — they expose internal system details to attackers.

---

### Design Decision — Validation Middleware Separation

Validation rules live in `src/middlewares/validators/authValidators.js`, not in controllers.

**Why:** Controllers should only handle HTTP — extracting fields, calling services, sending responses. Validation is a separate concern that runs before the controller.

**Register vs Login validation are separate** — login validation is more lenient on password (no min length) because users registered before the rule existed could get locked out.

**`.bail()`** — stops validation chain on first failure for a field. Prevents duplicate error messages (e.g. "required" AND "too short" for an empty field).

---

### Security — Timing Attack Prevention

If "email not found" returns in 5ms and "wrong password" returns in 50ms, an attacker can measure response times to determine which case they hit — even with identical error messages.

**Fix:** Always run bcrypt compare regardless of whether the user exists:
```js
if (!user) {
    await bcrypt.compare(password, '$2b$10$fakehashfakehashfakehashfakehash');
    throw new AppError('Invalid email or password', 401);
}
```

Both code paths now take ~50ms. Implemented in `loginUser` service.

---

### Auth Middleware Pattern

```js
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization; // "Bearer <token>"
    const token = authHeader.split(' ')[1];
    const decoded = jwtUtil.verifyToken(token);
    req.user = decoded; // attach user to request for downstream handlers
    next();
}
```

- Token sent in `Authorization: Bearer <token>` header
- Decoded payload attached to `req.user` — available in all subsequent middleware/controllers
- `401` for missing/invalid token, `403` for valid token but insufficient permissions (future role check)

---

### Key Concepts Added

| Concept | What it means |
|---------|--------------|
| Bearer token | Standard format for sending JWT in HTTP headers: `Authorization: Bearer <token>` |
| `next(err)` | Passes error to Express global error handler, skipping all regular middleware |
| Error handler middleware | Four-parameter middleware `(err, req, res, next)` — Express identifies it by signature |
| Timing attack | Attack where response time differences reveal which error branch was hit |
| `express-validator` | Library for declarative input validation as middleware |
| `.bail()` | Stops validation chain on first failure — prevents duplicate error messages |
| JWT secret rotation | Changing the secret immediately invalidates all existing tokens |
