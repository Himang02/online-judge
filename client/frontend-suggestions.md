I'm building AlgoArena — an online judge platform (like LeetCode).
Scaffold a full React frontend using Vite + React + React Router DOM + Axios.
Do NOT use Tailwind. Use plain CSS with CSS variables for theming.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN SYSTEM — apply globally
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Theme: Deep navy. Define in src/index.css:

  --bg:              #0a1628
  --surface:         #0f1f3d
  --surface2:        #0d1b35
  --editor-bg:       #060f1e
  --accent:          #2563eb
  --accent-muted-bg: rgba(37,99,235,0.13)
  --accent-muted:    #60a5fa
  --text:            #e2e8f0
  --muted:           rgba(226,232,240,0.45)
  --border:          rgba(255,255,255,0.07)

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; }

Difficulty colors:
  Easy   → bg rgba(34,197,94,0.12)   color #4ade80
  Medium → bg rgba(251,146,60,0.12)  color #fb923c
  Hard   → bg rgba(239,68,68,0.12)   color #f87171

Verdict colors:
  Accepted      → #4ade80
  Wrong Answer  → #f87171
  TLE           → #fb923c
  Compile Error → #c084fc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGO — used everywhere
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Create src/components/Logo.jsx that accepts a `size` prop (default 26).
Render an inline SVG mark + wordmark side by side.

Mark — a dark square with the text <A/> in Courier New:
  - Box: fill #060f1e, border-radius proportional to size (≈18% of size)
  - "<" and "/>" in #2563eb
  - "A" in #60a5fa
  - Font sizes: brackets ≈ 55% of size, A ≈ 70% of size
  - Generous spacing between brackets and A

Wordmark — next to the mark:
  - "Algo" in #60a5fa, font-weight 800
  - "Arena" in #e2e8f0, font-weight 800
  - Font size ≈ 60% of size

Usage: <Logo size={26} /> in navbar, <Logo size={40} /> in landing hero/footer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLDER STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/
├── api/
│   ├── axios.js          # axios instance, baseURL from .env, JWT interceptor
│   ├── auth.js           # login(email,pass), register(name,email,pass)
│   ├── problems.js       # getProblems(filters), getProblemById(id)
│   ├── submissions.js    # submitCode(), runCode(), getMySubmissions(), getSubmissionsByProblem()
│   └── ai.js             # getAIReview(submissionId)
├── context/
│   └── AuthContext.jsx   # user, token, isAuthenticated, role, login(token), logout()
├── hooks/
│   ├── useAuth.js
│   └── useProblems.js
├── components/
│   ├── Logo.jsx
│   ├── Navbar.jsx
│   ├── DifficultyBadge.jsx
│   ├── TagChip.jsx
│   ├── ProtectedRoute.jsx
│   ├── RoleGuard.jsx
│   ├── LoginModal.jsx
│   └── RegisterModal.jsx
├── pages/
│   ├── Landing.jsx
│   ├── Problems.jsx
│   ├── ProblemDetail.jsx
│   ├── Submissions.jsx
│   └── SetProblem.jsx
├── App.jsx
└── main.jsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROUTING — App.jsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/                → Landing.jsx        (public)
/problems        → Problems.jsx       (public)
/problems/:id    → ProblemDetail.jsx  (public to view, login required to submit)
/submissions     → Submissions.jsx    (ProtectedRoute)
/set-problem     → SetProblem.jsx     (RoleGuard — PROBLEM_SETTER only)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTH CONTEXT — AuthContext.jsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Store JWT in localStorage under key 'aa_token'
- On mount: read token, decode with jwt-decode to get { userId, role }
- Provide: user, token, isAuthenticated, role, login(token), logout()
- logout() clears localStorage and resets state
- Axios interceptor in api/axios.js: attach Authorization: Bearer <token>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NAVBAR — Navbar.jsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Accept a `variant` prop: "main" | "problem"

variant="main":
  Height 46px, background var(--surface), border-bottom 1px solid var(--border)
  Left section (flex, align-items center):
    <Logo size={26} /> — links to /
    Vertical divider (1px, 18px tall, var(--border))
    Nav links: "Problems" → /problems
               "Submissions" → /submissions  (only if isAuthenticated)
               "Set Problem" → /set-problem  (only if role === PROBLEM_SETTER)
    Active link: color var(--text), font-weight 600,
                 border-bottom 2px solid var(--accent-muted)
  Right section (margin-left auto):
    If NOT authenticated:
      "Login" button (ghost style) → opens LoginModal
      "Register" button (accent bg) → opens RegisterModal
    If authenticated:
      Role badge if role === PROBLEM_SETTER:
        padding 3px 10px, border-radius 20px,
        background rgba(99,102,241,0.15), color #a5b4fc,
        border 1px solid rgba(165,180,252,0.2), text "PROBLEM_SETTER"
      Avatar circle: initials from user.name, 26px,
        background var(--accent-muted-bg), color var(--accent-muted)

variant="problem":
  Same height and background as main.
  Three equal flex columns (each flex:1):
    Left:   <Logo size={26} /> only (no nav links)
    Center: prev button (‹) + "id. Title" + next button (›)
            Each button: 26×26px, border-radius 5px,
            border 1px solid var(--border), background transparent
    Right:  "← Problems" text link to /problems + avatar circle

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTH MODALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LoginModal.jsx and RegisterModal.jsx:
  - Full screen overlay: background rgba(0,0,0,0.6)
  - Centered card: background var(--surface), border-radius 12px,
    padding 32px, width 400px, border 1px solid var(--border)
  - Close on overlay click or Escape key
  - Fields: email + password (login); name + email + password (register)
  - Submit calls api/auth.js → on success: AuthContext.login(token), close modal
  - Show inline error messages from API response
  - "Don't have an account? Register" link switches between modals

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE: Landing.jsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. <Navbar variant="main" />

2. Hero section (text-align center, padding 60px 28px 52px):
   - Pill tag: "✦ Practice · Submit · Improve"
     bg var(--accent-muted-bg), color var(--accent-muted),
     border 1px solid rgba(96,165,250,0.2), border-radius 20px
   - H1: "Your Arena for" + line break + "Competitive Coding"
     "Competitive Coding" in color var(--accent-muted)
     font-size 40px, font-weight 800, letter-spacing -1.5px
   - Subtitle: font-size 15px, color var(--muted), max-width 420px, margin auto
   - Single CTA: "Explore Problems →" → navigate to /problems
     padding 11px 28px, background var(--accent), color white,
     border-radius 8px, font-weight 700

3. Feature cards (3-column grid, padding 0 28px 44px, gap 12px):
   Each card: background var(--surface), border 1px solid var(--border),
   border-radius 10px, padding 20px
   - ⚙️ Multi-language Support — JS, Python, C++, Java
   - 🤖 AI Code Review — feedback on logic, complexity, style
   - 📊 Track Progress — submission history, solved count

4. Featured Problems (padding 0 28px 40px):
   Header: "Featured Problems" (left) + "View all →" link to /problems (right)
   Show first 4 problems from GET /api/problems or hardcoded fallback.
   Each row: background var(--surface), border var(--border), border-radius 8px,
   padding 10px 14px, flex row with DifficultyBadge + name + TagChip
   Clickable → /problems/:id

5. Footer: background var(--surface), border-top 1px solid var(--border),
   padding 18px 28px, flex row:
   Left: <Logo size={22} />
   Right: "Built for coders, by coders." in var(--muted)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE: Problems.jsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<Navbar variant="main" /> with "Problems" active.

Layout: sidebar (185px) + content area, full height below navbar.

Sidebar (background var(--surface), border-right var(--border)):
  Section "Difficulty": All / Easy / Medium / Hard
    each item: label + count pill, clicking filters the table
    active item: background var(--accent-muted-bg), color var(--accent-muted)
  Section "Topics": Array / String / Dynamic Prog. / Trees / Graphs / Binary Search
    with counts, same active style

Content area (padding 18px 20px):
  If isAuthenticated: Progress card
    background var(--surface), border-radius 8px, flex row
    Left: big solved count number in var(--accent-muted)
    Right: per-difficulty progress bars (Easy #4ade80, Medium #fb923c, Hard #f87171)
    each bar: height 5px, border-radius 3px, background rgba(255,255,255,0.08)

  Topbar (flex row, gap 10px, margin-bottom 16px):
    Search input (flex:1) with 🔍 icon, left-padded
    Topics select dropdown

  Problems table:
    Columns: # | Title | Tags | Difficulty | Acceptance Rate
    No status column.
    Row hover: background rgba(255,255,255,0.025)
    Clicking row → /problems/:id
    Empty state if no results

  Pagination: centered row of page buttons

API: GET /api/problems?difficulty=&topic=&search=&page=

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE: ProblemDetail.jsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<Navbar variant="problem" /> passing id, title, prevId, nextId.

Body: flex row, height = 100vh - 46px (navbar height)

Left panel (width 42%, border-right var(--border), flex column):
  Tabs: "Description" | "My Submissions"

  Description tab (scrollable):
    Problem number (muted), title (18px 800), DifficultyBadge, TagChips
    Problem statement (font-size 13px, line-height 1.7)
    Examples: each in a dark box (background var(--editor-bg)),
      monospace font, labeled "EXAMPLE 1" etc.
    Constraints: monospace list

  My Submissions tab:
    Table: Status | Language | Runtime | Time ago
    Only submissions for this problem by current user
    If not authenticated: prompt to login

Right panel (flex:1, flex column):
  Editor toolbar (height 44px, background var(--surface),
    border-bottom var(--border), padding 0 14px):
    Left: language <select> — Python / JavaScript / C++ / Java
    Right: "▶ Run" button + "Submit" button
    ALL THREE controls (select, run btn, submit btn):
      height 32px, font-size 12.5px, font-weight 600,
      border-radius 6px — MUST be identical height
    Run: border 1px solid rgba(96,165,250,0.35), transparent bg, color var(--accent-muted)
    Submit: background var(--accent), color white, no border

  Code editor area (flex:1):
    Use @monaco-editor/react
    theme="vs-dark", options={{ fontSize:13, minimap:{enabled:false},
    lineNumbers:'on', scrollBeyondLastLine:false }}
    Store code per language in a useState map
    Default starter code per language (empty function stub)

  Bottom panel (height 175px, border-top var(--border), flex column):
    Tabs: "Test Cases" | "Output" | "AI Review"

    Test Cases tab:
      Row of case buttons (Case 1, Case 2, + Add)
      Selected case shows input fields below

    Output tab (populated after Run or Submit):
      After Run:
        Show pass/fail per test case with input/expected/got
      After Submit (show verdict):
        Accepted → color #4ade80, show runtime + memory + cases passed
                   + "See AI Review →" link
        Wrong Answer → color #f87171, show failing test case
        TLE → color #fb923c
        Compile Error → color #c084fc, show error message

    AI Review tab:
      Score pills: Correctness / Complexity / Style
      Approach block + Suggestion block
      Populated by GET /api/submissions/:id/ai-review
      Show "Run your code first" if no submission yet

  If NOT authenticated and Submit clicked:
    Show inline message in Output tab:
    "Login required to submit."
    with a Login button that opens LoginModal

API:
  GET  /api/problems/:id
  POST /api/submissions/run    { problemId, language, code, testCases }
  POST /api/submissions/submit { problemId, language, code }
  GET  /api/submissions/:id/ai-review
  GET  /api/submissions/problem/:id  (for My Submissions tab)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE: Submissions.jsx  (ProtectedRoute)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<Navbar variant="main" /> with "Submissions" active.

Summary cards row (4 cards, grid 4-col, gap 10px):
  Total | Accepted | Wrong Answer | TLE/Other
  Each: background var(--surface), border var(--border), border-radius 8px
  Number (22px 800) + label (11px uppercase muted)

Filters row (flex, gap 10px):
  Search input (flex:1) — filter by problem name
  Language select

Status filter pills (flex row, gap 6px, flex-wrap):
  All | ✓ Accepted | ✗ Wrong Answer | ⏱ Time Limit | ⚠ Compile Error
  Active pill: colored bg matching verdict color

Submissions table:
  Columns: Problem | Difficulty | Verdict | Language | Runtime | Submitted
  Problem cell → links to /problems/:id
  Verdict colored per verdict color tokens above
  Clicking a row toggles an inline code drawer below that row
    Drawer shows submitted code in a dark monospace block
    with a close (✕) button

Pagination

API: GET /api/submissions/my?verdict=&language=&search=&page=

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE: SetProblem.jsx  (RoleGuard: PROBLEM_SETTER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<Navbar variant="main" /> with "Set Problem" active.

Layout: step sidebar (170px, background var(--surface)) +
        content area (flex:1, scrollable) +
        bottom action bar (fixed to bottom of page)

Step sidebar:
  Title "STEPS" (10px uppercase muted)
  4 items: Problem Info / Examples / Test Cases / Preview
  Each: step number circle + label
  Active:  background var(--accent-muted-bg), color var(--accent-muted),
           step circle filled var(--accent)
  Done:    step circle background rgba(74,222,128,0.15),
           color #4ade80, border rgba(74,222,128,0.3)

━━━ Step 1 — Problem Info:
  Title input (full width)
  Difficulty selector: 3 toggle buttons Easy / Medium / Hard
    Active Easy: bg rgba(34,197,94,0.1), border rgba(74,222,128,0.5), color #4ade80
    Active Medium: bg rgba(251,146,60,0.1), border rgba(251,146,60,0.5), color #fb923c
    Active Hard: bg rgba(239,68,68,0.1), border rgba(248,113,113,0.5), color #f87171

  Tags multi-select dropdown:
    A tags box (flex-wrap, min-height 40px, background var(--surface),
    border var(--border), border-radius 7px, padding 7px 10px)
    Selected tags show as chips with × remove button
    Clicking / typing opens a dropdown panel:
      background var(--surface2), border rgba(96,165,250,0.25),
      border-radius 8px, max-height 200px scrollable
      Topics grouped by category with category headers:
        Data Structures: Array, String, Linked List, Stack, Queue,
          Hash Map, Set, Tree, Graph, Heap, Trie, Matrix
        Algorithms: Sorting, Binary Search, Sliding Window,
          Two Pointers, Recursion, Backtracking, Divide & Conquer
        Techniques: Dynamic Programming, Greedy, Memoization,
          Bit Manipulation, Math, Prefix Sum
        Graph: DFS, BFS, Topological Sort, Union Find, Shortest Path
      Type to filter list in real time
      Selected tags removed from dropdown, shown as chips in box
      Click outside to close

  Problem statement textarea (min-height 90px)
  Input format + Output format side by side (2-col grid)
  Constraints textarea
  Time limit (default 2s) + Memory limit (default 256MB) side by side

━━━ Step 2 — Examples:
  Example cards (Input textarea + Output textarea + Explanation input)
  Remove button per card
  "+ Add Example" dashed button

━━━ Step 3 — Test Cases:
  Test case cards: Input + Expected Output side by side (monospace textareas)
  × remove button per card
  "+ Add Test Case" dashed button

━━━ Step 4 — Preview:
  Read-only rendered view matching ProblemDetail left panel appearance
  Shows: title, difficulty badge, tags, statement, first example, constraints

Bottom action bar (padding 14px 24px, background var(--surface),
  border-top var(--border), flex row, justify-content space-between):
  Left:   "Save Draft" ghost button
  Center: Progress dots — done=green, active=wide blue pill, upcoming=dim
  Right:  Steps 1–3: "Next →" accent button
          Step 4: "✓ Publish Problem" green button (#4ade80 bg, dark text)

API:
  POST /api/problems        (publish)
  POST /api/problems/draft  (save draft)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACKAGES TO INSTALL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
react-router-dom
axios
jwt-decode
@monaco-editor/react

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENV FILE — .env
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_API_BASE_URL=http://localhost:5000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AFTER SCAFFOLDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run: npm install && npm run dev
Confirm dev server starts on http://localhost:5173 with no errors.
All pages should render without crashing even if the backend
is not running yet (use empty arrays / loading states as fallback).