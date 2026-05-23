# Online Judge — Project Snapshot (May 2026)

> **Purpose:** Share this with Claude to give full context on what's built, how it works, and what's next.

---

## What This Is

A production-grade Online Judge (think LeetCode / Codeforces) built from scratch as a learning project. The execution engine is real — it runs user code in Docker containers, enforces time/memory limits, and judges verdicts asynchronously.

**Stack:** Node.js + Express 5, PostgreSQL + Prisma ORM, Redis + BullMQ, Docker  
**Author:** Himang Dongre (learning project, ~20+ commits)

---

## Repository Layout

```
online-judge/
├── server/                     # Main API server (Express + Prisma)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Register, login, JWT
│   │   │   ├── problems/       # Problem CRUD, tags, test cases
│   │   │   └── submissions/    # Submit code, get results
│   │   ├── shared/
│   │   │   ├── configs/        # DB client, BullMQ queue, bootstrap
│   │   │   ├── middlewares/    # JWT auth, role guard, validation
│   │   │   └── utils/          # AppError, jwt helper, SSE manager (stub)
│   │   └── app.js              # Express setup + global error handler
│   ├── prisma/
│   │   ├── schema.prisma       # DB schema (6 migrations so far)
│   │   └── migrations/
│   └── server.js               # Entry point
│
├── execution-service/          # Standalone code executor
│   ├── src/
│   │   ├── worker.js           # BullMQ consumer (concurrency: 3)
│   │   ├── executor.js         # Docker runner per language
│   │   └── verdict.js          # Output comparison logic
│   └── index.js
│
├── client.html                 # Self-contained API test UI (dark theme)
├── LEARNING.md                 # 4-session dev journal
├── project.md                  # Concept reference doc
└── CLAUDE.md                   # Mentor config for Claude
```

Each module has its own `routes.js → controller.js → service.js` layering. Prisma client is a single shared instance.

---

## Database Schema

```
User
  id (UUID), username (unique), email (unique), password (bcrypt)
  role: USER | PROBLEM_SETTER
  → Problems[], Submissions[]

Problem
  id (UUID), title (unique), description
  difficulty: EASY | MEDIUM | HARD
  status: DRAFT | PUBLISHED
  timeLimit (ms), memoryLimit (MB)
  creatorId → User
  → TestCases[], Tags (M2M), Submissions[]

TestCase
  id, input, expectedOutput, isSample (bool)
  problemId → Problem (cascade delete)

Tag
  id, name (unique)
  ↔ Problem (many-to-many via junction table)

Submission
  id, userId, problemId, code, language
  language: C | CPP | JAVA | PYTHON
  verdict: PENDING | AC | WA | TLE | MLE | RTE | CE | IE
  createdAt
```

---

## API Surface

### Auth  `/api/auth`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/register` | — | Returns JWT |
| POST | `/login` | — | Timing-safe (no user enumeration) |

### Problems  `/api/problems`
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | — | Only PUBLISHED; filter by `?tag=` |
| GET | `/:id` | — | Sample test cases only |
| POST | `/` | PROBLEM_SETTER | Creates in DRAFT |
| PUT | `/:id` | PROBLEM_SETTER (creator) | |
| DELETE | `/:id` | PROBLEM_SETTER (creator) | |
| PATCH | `/:id/publish` | PROBLEM_SETTER (creator) | Requires ≥1 test case |

### Tags  `/api/tags`
| Method | Path | Auth |
|--------|------|------|
| GET | `/` | — |
| POST | `/` | PROBLEM_SETTER |
| DELETE | `/:id` | PROBLEM_SETTER |

### Test Cases  `/api/problems/:problemId/testcases`
| Method | Path | Auth |
|--------|------|------|
| POST | `/` | PROBLEM_SETTER (creator) |
| PUT | `/testcases/:id` | PROBLEM_SETTER (creator) |
| DELETE | `/testcases/:id` | PROBLEM_SETTER (creator) |

### Submissions  `/api/submissions`  (all require auth)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/` | Returns 202 immediately; async verdict |
| GET | `/` | User's own submissions |
| GET | `/:id` | Owner only |
| GET | `/problem/:problemId` | User's submissions for a problem |

---

## Submission & Execution Flow

```
User POSTs code
  → DB: Submission created (verdict: PENDING)
  → BullMQ: Job pushed to "submissions" queue
  → API: 202 Accepted returned immediately

Execution Service (separate process):
  → Worker picks job (concurrency: 3)
  → executor.js:
      1. Base64-encode code (prevents shell injection)
      2. Spin up Docker container (per language image)
         Flags: --network none, --memory limit, --pids-limit 50, --rm
      3. Write + compile (C/C++/Java) or interpret (Python)
      4. Run against each test case with inner `timeout` command
      5. Outer Node timer kills container if inner timeout is ignored
      6. Compare stdout to expectedOutput (trimmed)
  → verdict.js: AC / WA / TLE / MLE / RTE / CE / IE
  → Job resolves with { submissionId, verdict }

Back in main server:
  → QueueEvents listener catches 'completed'
  → DB: Submission.verdict updated

Real-time notification to user: NOT YET IMPLEMENTED
  (SSE manager stubbed in shared/utils/sseManager.js)
```

**Verdict logic:**
- Exit 124 or 143 → TLE
- Exit 137 + timedOut flag → TLE (SIGTERM ignored)
- Exit 137 alone → MLE (OOM kill)
- non-zero + "error:" in stderr → CE
- non-zero → RTE
- Output mismatch → WA
- All pass → AC
- Unexpected exception → IE

---

## Key Design Decisions

| Decision | What was chosen | Why |
|----------|----------------|-----|
| ORM | Prisma | Type safety, migrations, readable queries |
| Queue | BullMQ + Redis | Reliable async jobs, retry support |
| Execution sandbox | Docker | Language-agnostic, resource-limited |
| Auth | Stateless JWT (1h expiry) | Simple, no session store needed |
| Problem visibility | DRAFT/PUBLISHED flag | Prevents half-baked problems going live |
| Error handling | Custom AppError + global Express handler | Consistent JSON errors, no leaking stack traces |
| API response on submit | 202 Accepted (async) | Execution can take seconds — don't block |

---

## What's Working

- [x] User registration & login (JWT, bcrypt, role-based)
- [x] Problem CRUD with DRAFT/PUBLISHED workflow
- [x] Tag system (M2M)
- [x] Test case management (hidden vs sample)
- [x] Submit code → async queue → Docker execution → verdict written to DB
- [x] TLE / MLE / RTE / CE / WA / AC verdict detection on Windows Docker
- [x] Self-contained API test client (`client.html`)
- [x] LEARNING.md journal (4 sessions)

---

## What's NOT Done Yet

- [ ] Real-time verdict delivery to the client (SSE/WebSocket — stub exists)
- [ ] Frontend (no React/Vue app yet — only `client.html` for testing)
- [ ] User profile page
- [ ] Submission history pagination
- [ ] Admin panel
- [ ] Leaderboard / rankings
- [ ] Contest / problem set management
- [ ] Rate limiting / abuse prevention on submissions
- [ ] CI/CD pipeline
- [ ] Production deployment (PostgreSQL on Railway, Redis on Upstash, etc.)
- [ ] More languages beyond C / C++ / Java / Python

---

## Current Concerns (things to discuss)

1. **Real-time verdicts:** SSE is stubbed. Options: SSE, WebSocket (socket.io), polling. Which fits best here?
2. **Execution service coupling:** It reads test cases from the job payload. As test cases grow large, this could bloat queue messages. Should the executor fetch them from DB directly?
3. **Output comparison:** Currently trims whitespace and does exact match. Need to decide on newline normalization, floating-point tolerance, etc.
4. **Security surface of executor:** Code runs in Docker but the executor itself has no resource accounting or per-user isolation at the queue level. Malicious users could spam submissions.
5. **Frontend:** No decision made yet — raw HTML/JS, React, Next.js? Should it be a separate repo/package?
6. **Database scaling:** Currently no indexes beyond PKs and unique constraints. No full-text search for problems yet.
7. **Error visibility:** Compilation errors return CE verdict but the compiler output isn't surfaced to the user yet. Where does that belong?

---

## Environment Variables

**Server:**
```
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Execution Service:**
```
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Git Conventions Used

- `feat:` new feature
- `fix:` bug fix
- `refactor:` internal restructure
- Feature branches merged via PRs (e.g., `feat/submission-module`, `feat/execution-service`)

---

*Generated: 2026-05-19*
