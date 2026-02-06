# Iron Secretary V2 — Comprehensive Audit Report

**Project:** Techy Miramar Command Center
**Date:** 2026-02-06
**Auditor:** Claude Opus 4.6
**Codebase Location:** `/home/user/Iron-Secretary-V2/techy-miramar-command-center/`

---

## 1. CODE QUALITY & ARCHITECTURE

**Grade: C+**

### Critical Issues

1. **Massive monolithic page files — NightShift.tsx is 803 lines, AIWorkspace.tsx is 528 lines.**
   `pages/NightShift.tsx:1-803` — This file contains types, templates, mock data, helper components, a full modal component (`AssignmentModal`), and the main page component all in one file. The `NIGHT_SHIFT_TEMPLATES` constant alone spans 145 lines. `AssignmentModal` (lines 330–514) is a complex form component that should be its own file.
   `pages/AIWorkspace.tsx:1-528` — Similarly bundles `WorkspaceTask` and `ActivityEntry` interfaces, mock data arrays, `StatusIcon`, `TaskCard`, `NewTaskModal`, and the main component in one file.

2. **Duplicated voice command logic between VoiceFAB.tsx and Voice.tsx.**
   `components/VoiceFAB.tsx:6-38` and `pages/Voice.tsx:6-103` — Both files independently define `VOICE_PATTERNS`/`VOICE_COMMANDS`, `MOCK_RESPONSES`, and `matchCommand()`. The patterns are nearly identical but with slight differences (Voice.tsx includes a `description` field and a `confidence` score in `matchCommand`). This is a maintenance hazard — updating one won't update the other.

3. **No `src/` directory structure.** All source files sit directly in the project root alongside config files (`types.ts`, `constants.ts`, `App.tsx`, `index.tsx`). This is non-standard for a Vite/React project and will cause confusion as the project grows.

4. **Types defined in `types.ts` are barely used.** The centralized types (`PlanPhase`, `PlanTask`, `RevenueTarget`, `MidasDeal`, `Lead`) are defined in `types.ts:1-63` but most pages define their own inline interfaces instead (e.g., `WorkspaceTask` in `AIWorkspace.tsx:19-33`, `NightShiftTask` in `NightShift.tsx:149-174`, `VoiceLog` in `Voice.tsx:53-59`). The `types.ts` exports are largely unused.

### Warnings

5. **Pervasive use of `any` type for Web Speech API.**
   `components/VoiceFAB.tsx:53` — `recognitionRef = useRef<any>(null)`
   `components/VoiceFAB.tsx:61` — `(window as any).SpeechRecognition`
   `components/VoiceFAB.tsx:73` — `recognition.onresult = (event: any)`
   `components/VoiceFAB.tsx:91` — `recognition.onerror = (event: any)`
   `pages/Voice.tsx:113` — same pattern repeated
   These should use proper `SpeechRecognition` types from `@types/dom-speech-recognition` or a custom type declaration.

6. **Mock data is mixed with component logic.** Every page file contains its mock data inline (e.g., `Dashboard.tsx:20-35`, `AIWorkspace.tsx:56-176`, `NightShift.tsx:178-299`, `Voice.tsx:40-83`, `Plan.tsx:18-69`, `Leads.tsx:6-9`, `Emilio.tsx:6-17`, `Midas.tsx:6-27`). These should be extracted to a `/mock/` or `/data/` directory.

7. **Stale closure bugs in VoiceFAB.tsx.**
   `components/VoiceFAB.tsx:97-99` — The `recognition.onend` callback references `state` and `transcript` from the closure, but these are stale since `startListening` has an empty dependency array (line 104). The state values will always be their initial values inside this callback.
   `components/VoiceFAB.tsx:104` — `startListening` has `[]` as dependencies, meaning it captures the initial `state` and `transcript` values forever.

8. **`failedCount` is hardcoded to 0.**
   `pages/AIWorkspace.tsx:383` — `const failedCount = 0;` is computed from nothing. This should derive from actual data or be removed.

9. **No error handling anywhere.** No try/catch blocks around Speech API calls, no error boundaries for React components, no fallback UI for failed API connections. The `SpeechRecognition.start()` call at `VoiceFAB.tsx:103` can throw if permissions are denied.

10. **`experimentalDecorators` and `useDefineForClassFields` in tsconfig.json are unnecessary.** The project uses only functional components. `tsconfig.json:5-6` enables decorator support that isn't used anywhere.

### Suggestions

11. **No custom hooks extracted.** The speech recognition logic (~50 lines) is duplicated and could be a `useSpeechRecognition()` hook. Timer/polling patterns could similarly be extracted.

12. **No code splitting / lazy loading.** All 8 pages are eagerly imported in `App.tsx:7-14`. With `React.lazy()` and dynamic imports, only the active page would be bundled.

13. **Inconsistent component patterns.** Some components use `React.FC<Props>` typing (`Sidebar.tsx:25`, `StatCard.tsx:14`), which is fine, but the pattern isn't documented or enforced. No ESLint or Prettier configuration exists.

14. **`CheckCircle` vs `CheckCircle2` icon inconsistency.** `Leads.tsx:2` imports `CheckCircle` while every other file uses `CheckCircle2` from lucide-react. These are different icons.

15. **Dead import: `Settings` icon in Sidebar.** The Settings button at `Sidebar.tsx:108-111` and AI Configuration button at `Sidebar.tsx:112-115` render but don't navigate anywhere — they have no `onClick` handler.

---

## 2. SECURITY AUDIT

**Grade: D**

### Critical Issues

1. **No Row Level Security (RLS) policies on any database table.**
   All 3 migration files (`20260206000001_create_voice_logs.sql`, `20260206000002_create_workspace_tables.sql`, `20260206000003_create_night_shift_tables.sql`) create tables without any `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements. This means **any authenticated Supabase user (or anonymous user, if anon access is enabled) can read, insert, update, and delete all data across all tables**. This is a **critical production blocker**.

2. **API key exposed in client-side bundle via Vite config.**
   `vite.config.ts:12-13`:
   ```js
   'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
   'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
   ```
   This injects the Gemini API key as a string literal directly into the client JavaScript bundle. Anyone viewing the page source or the built JS files can extract this key. API keys should be proxied through a backend or edge function, never embedded in client code.

3. **No input validation or sanitization on any form.**
   - `AIWorkspace.tsx:320-326` — Task title input: no length limit, no sanitization.
   - `AIWorkspace.tsx:331-337` — Task description textarea: no length limit.
   - `NightShift.tsx:388-393` — Title input: no validation.
   - `NightShift.tsx:399-406` — Prompt textarea: no length limit. A user could paste megabytes of text.
   - `components/AIAssistant.tsx:88-95` — Chat input: no length limit.
   None of these inputs are validated before being used (currently they're only used in local state, but when connected to Supabase, raw input will be sent to the database).

4. **No Content Security Policy (CSP) headers defined.**
   `index.html` loads scripts from `cdn.tailwindcss.com` and `esm.sh` with no CSP meta tag or headers. This leaves the app open to XSS via CDN compromise.

### Warnings

5. **Tailwind CSS loaded via CDN in production.**
   `index.html:8` — `<script src="https://cdn.tailwindcss.com"></script>` — The Tailwind CDN script is explicitly warned against for production use by the Tailwind team. It evaluates the full Tailwind config in the browser and can be a vector for supply-chain attacks.

6. **Import maps load all dependencies from esm.sh.**
   `index.html:94-103` — Dependencies are loaded from `esm.sh` at runtime. If `esm.sh` is compromised or goes down, the entire app breaks. For production, dependencies should be bundled locally.

7. **No CORS configuration.** There is no server-side configuration visible. When Supabase is connected, CORS must be configured properly on the Supabase project to restrict origins.

8. **Speech transcripts are stored in component state and logged to the UI.**
   `pages/Voice.tsx:186-192` — Voice transcripts are added to the `logs` state array and displayed in the UI. When connected to Supabase (`voice_logs` table), these transcripts will be persisted. If the user dictates sensitive information (customer PII, payment details), this data will be stored in plaintext without any PII filtering.

9. **No authentication system.** There is no login, no user session, no auth context. The app is completely open. All Supabase operations will run as anonymous unless auth is added.

### Suggestions

10. **Add `.env.local` to `.gitignore`.** The `.gitignore` does list `.env.local`, which is good. However, there's no `.env.example` file documenting required environment variables.

11. **Consider subresource integrity (SRI) for CDN scripts.** If CDN usage continues, add `integrity` attributes to external script tags.

---

## 3. UI REVIEW

**Grade: B+**

### Critical Issues

_None — the visual design is well-executed._

### Warnings

1. **Two different card styles used inconsistently.**
   - `glass-card` (defined in `index.html:57-65`): Used in Dashboard, AIWorkspace, NightShift, Voice, Plan for most cards.
   - `bg-gray-900 border border-gray-800`: Used in Leads.tsx (lines 29, 54, 92), Emilio.tsx (lines 34, 56, 87), Midas.tsx (lines 91, 58), and StatCard.tsx (line 34).
   There's no clear rule about when to use which style. The "Operations" pages (Leads, Emilio, Midas) use the opaque `bg-gray-900` style while "Focus" pages use the glass style, but this isn't documented or enforced.

2. **Responsive breakpoints may cause layout issues on mobile.**
   - `App.tsx:58` — `lg:ml-[260px]` creates a left margin equal to the sidebar width, but only on large screens. On tablet (768px), the sidebar is hidden but the margin is still 0, which is correct. However, the content `max-w-[1600px]` at `App.tsx:58` combined with `p-4 md:p-8 lg:p-10` provides varied padding.
   - `Leads.tsx:32-33` — The pipeline visual uses `flex justify-between` with 5 items. On very narrow screens (<375px), the circles and labels will overlap.
   - `NightShift.tsx:456-497` — The priority and schedule button groups are in a `flex gap-6` container that will overflow on mobile.

3. **No empty states for most lists.**
   - `Dashboard.tsx` — All cards show hardcoded data. With zero data, the chart would render with no data points (empty axis), and the cadence list would be blank.
   - `AIWorkspace.tsx:464-476` — Only "Claude's Tasks" has an empty state. "My Tasks" at line 446 has no empty state.
   - `NightShift.tsx:600-636` — Queue section has no empty state design.
   - `Leads.tsx`, `Emilio.tsx`, `Midas.tsx` — No empty states at all.

4. **No loading states anywhere.**
   No skeleton loaders, no loading spinners for page content, no suspense boundaries. When connected to Supabase, pages will flash from empty to populated.

### Suggestions

5. **The glassmorphism `backdrop-filter: blur()` can cause rendering performance issues on low-end mobile devices.** Consider adding a fallback for `@supports not (backdrop-filter: blur())` or disabling it on mobile via media query.

6. **Color system is well-implemented but undocumented.** The color mapping (blue=primary, emerald=success, amber=warning, rose=critical, purple=AI) is consistently applied across most pages. Document this in a style guide.

7. **Typography is consistent.** Page titles use `text-4xl font-bold` (Dashboard, AIWorkspace, NightShift, Voice) or `text-3xl font-bold` (Leads, Emilio, Midas, Plan). The inconsistency between 4xl and 3xl should be standardized.

8. **Overflow handling is good in most places.** `AIWorkspace.tsx:211` uses `truncate` on task descriptions. `Emilio.tsx:99` uses `truncate max-w-md` on reply messages. However, `NightShift.tsx:610-611` renders task titles with no truncation, and prompts are rendered in a `<pre>` tag that could overflow with very long lines.

---

## 4. UX REVIEW

**Grade: B**

### Critical Issues

1. **Two floating action buttons (FABs) stacked in bottom-right — confusing hierarchy.**
   `App.tsx:67-79` — The "Open Copilot" button is positioned at `bottom-24 right-8` (z-40).
   `App.tsx:82` — The Voice FAB (`VoiceFAB.tsx:163-172`) is at `bottom-8 right-8` (z-40).
   On mobile devices, these two buttons are very close together (separated by ~48px). There is no visual hierarchy to distinguish them — one is gray with a Bot icon, the other is a purple gradient with a Mic icon. Users may accidentally tap the wrong one. On screens <375px width, both buttons and their tooltips may overlap with content.

### Warnings

2. **Modals cannot be closed by pressing Escape.**
   `AIWorkspace.tsx:247-373` (NewTaskModal) — No `onKeyDown` handler for Escape key.
   `NightShift.tsx:330-514` (AssignmentModal) — Same issue.
   `components/VoiceFAB.tsx:175-264` — Same issue.
   Only the backdrop click is a dismiss method (via the close button). No keyboard support.

3. **Modals cannot be closed by clicking the backdrop.**
   `AIWorkspace.tsx:257` — The backdrop `div` has `bg-black/70 backdrop-blur-sm` but no `onClick` handler.
   `NightShift.tsx:352` — Same issue.
   Users expect to click outside a modal to close it.

4. **"Create Task" and "Add to Queue" buttons don't actually persist data.**
   `AIWorkspace.tsx:363-366` — The "Create Task" button just calls `onClose()` without adding the task to any list.
   `NightShift.tsx:504-508` — Same: "Add to Queue" calls `onClose()` without modifying the queue.
   This means the modals are purely cosmetic — filling them out and clicking submit does nothing.

5. **Settings and AI Configuration buttons in sidebar are non-functional.**
   `Sidebar.tsx:108-115` — Two buttons at the bottom of the sidebar ("Settings" and "AI Configuration") have no `onClick` handlers and navigate nowhere.

6. **"ReviewGuard" page is a placeholder.**
   `App.tsx:17` — `const ReviewGuard = () => <div className="..."">ReviewGuard Module Loading...</div>` — This is an inline placeholder component. A user navigating to it sees only "ReviewGuard Module Loading..." with no indication that the page isn't built yet.

7. **No keyboard navigation support (a11y).**
   No `aria-label` attributes on icon-only buttons throughout the app. Examples:
   - `Sidebar.tsx:43-49` — Hamburger menu button has no aria-label.
   - `components/AIAssistant.tsx:44` — Close button has no aria-label.
   - `Dashboard.tsx:83-85` — CheckCircle button has no aria-label.
   - `Leads.tsx:117-119` — MessageCircle button has no aria-label.
   No `role="dialog"` or `aria-modal="true"` on any modal.
   No focus trapping inside modals.

8. **Voice UX has no "retry" option.** After a command is processed (done state), the user can only "Close" or "View Details" (`VoiceFAB.tsx:226-244`). There's no "Try Again" button to re-enter voice input.

### Suggestions

9. **Daily cadence time is hardcoded.** `Dashboard.tsx:43` shows "Tuesday, February 24" — this is a hardcoded string, not a dynamic date. Users will see the wrong date.

10. **Morning review flow is buried.** The Night Shift report card on the Dashboard (`Dashboard.tsx:172-196`) shows results, but clicking "Review All" doesn't navigate to the Night Shift page. The button has no onClick handler.

11. **Quick commands (Voice page) are useful defaults** that cover the main business operations. The 8 commands at `Voice.tsx:40-49` are relevant and discoverable.

12. **Activity log (AIWorkspace) is well-designed.** The differentiation between "you" and "ai" actors with different icons and colors (`AIWorkspace.tsx:500-517`) makes it scannable.

---

## 5. PERFORMANCE

**Grade: C**

### Critical Issues

1. **Tailwind CSS loaded as a full runtime from CDN (~300KB+).**
   `index.html:8` — `<script src="https://cdn.tailwindcss.com"></script>` loads the entire Tailwind JIT compiler into the browser. This is the **single largest performance bottleneck**. It adds ~300KB of JavaScript and processes styles at runtime. In production, Tailwind should be compiled via PostCSS with tree-shaking — the actual CSS used by this app would be ~15-30KB gzipped instead of ~300KB.

2. **All dependencies loaded from esm.sh at runtime.**
   `index.html:94-103` — React, ReactDOM, Recharts, Lucide-React, and date-fns are all loaded from `esm.sh` as ES modules at runtime. This means:
   - No tree-shaking (the full Recharts and Lucide-React libraries are loaded)
   - No bundling (each module triggers separate HTTP requests)
   - No preload hints
   - Network waterfalls as modules discover their dependencies
   Recharts alone is ~200KB+ unbundled. Lucide-React loads all icons even though only ~30 are used.

### Warnings

3. **No `React.memo`, `useMemo`, or `useCallback` optimization.** This is generally fine for the current mock data size, but:
   - `Dashboard.tsx:134-151` — The Recharts `AreaChart` re-renders on every parent render even though `chartData` is static.
   - `NightShift.tsx:518-800` — The entire page re-renders when any modal state changes.
   - `AIWorkspace.tsx:377-524` — Re-renders the entire task board when the modal opens/closes.

4. **No image optimization.** There are no images currently, but the README references an image from GitHub. No lazy loading or optimization strategy is in place.

5. **Date-fns imported but seemingly unused.** `package.json` lists `date-fns@2.30.0` as a dependency, and it's in the importmap, but no file imports from it. Search across all files shows zero imports of `date-fns`. This is dead weight.

### Suggestions

6. **Code splitting would significantly help.** The 8 pages are all imported eagerly in `App.tsx:7-14`. Using `React.lazy()`:
   ```ts
   const NightShift = React.lazy(() => import('./pages/NightShift'));
   ```
   This would cut initial load by ~60% since most users only view 1-2 pages at a time.

7. **When connecting to Supabase, ensure proper indexing.** The existing indexes (`idx_voice_logs_created_at`, `idx_workspace_tasks_status`, etc.) are appropriate for the expected query patterns. The `night_shift_tasks` table has indexes on `status` and `schedule_date`, which will support the main queue view efficiently.

---

## 6. SUPABASE / DATABASE REVIEW

**Grade: B-**

### Critical Issues

1. **No Row Level Security (RLS) — repeated from Security section due to severity.**
   `supabase/migrations/20260206000001_create_voice_logs.sql` — No RLS
   `supabase/migrations/20260206000002_create_workspace_tables.sql` — No RLS
   `supabase/migrations/20260206000003_create_night_shift_tables.sql` — No RLS
   Every table is publicly readable/writable. This is the #1 database issue.

2. **No `user_id` column on any table.**
   None of the tables have a `user_id` or `owner_id` column. Even for a single-user app, this is needed for RLS policies (`auth.uid() = user_id`). Without it, RLS policies can only allow/deny all users uniformly, not per-user.

### Warnings

3. **`updated_at` columns have no auto-update trigger.**
   `workspace_tasks.updated_at` (`20260206000002:18`) and `night_shift_tasks.updated_at` (`20260206000003:31`) have `DEFAULT now()` but no trigger to auto-update on row modifications. This means `updated_at` will only reflect the creation time unless the application explicitly sets it on every update.

4. **`priority` column types are inconsistent.**
   - `workspace_tasks.priority` (`20260206000002:7`) is `TEXT DEFAULT 'medium'` (string values: critical/high/medium/low)
   - `night_shift_tasks.priority` (`20260206000003:10`) is `INT DEFAULT 1` (numeric: 1/2/3)
   These represent the same concept but use different types. This will cause confusion when querying across tables.

5. **No foreign key from `night_shift_recurring` to `night_shift_tasks`.** The recurring tasks table (`20260206000003:41-53`) creates template rows that should generate `night_shift_tasks` entries, but there's no `source_recurring_id` column on `night_shift_tasks` to track which recurring template generated a task.

6. **No enum/check constraints on status columns.**
   `workspace_tasks.status` accepts any text string. There's no `CHECK (status IN ('pending', 'in_progress', 'done', 'failed'))` constraint.
   `night_shift_tasks.status` similarly has no constraint.
   `workspace_tasks.assigned_to` has `DEFAULT 'you'` but no CHECK constraint.

7. **`voice_logs` table lacks a `user_id` and `command_type` is nullable.**
   `20260206000001:4` — `command_type TEXT` allows NULL, meaning unrecognized commands will have NULL type, making filtering harder. Consider defaulting to `'unknown'`.

### Suggestions

8. **Schema is otherwise well-designed.** Table structures match the application's data needs. Column types are generally appropriate. The use of `JSONB` for flexible fields (`input_data`, `output_files`) is appropriate.

9. **Partial index on `night_shift_recurring.active` is good practice.**
   `20260206000003:57` — `CREATE INDEX ... WHERE active = true` — This is a smart optimization that only indexes active recurring tasks.

10. **Consider adding `ON DELETE CASCADE` to `workspace_activity.task_id`.**
    `20260206000002:25` — Currently uses `ON DELETE SET NULL`. If a task is deleted, the activity entries become orphaned with NULL task_id. CASCADE would clean up activity entries when tasks are deleted.

---

## 7. INTEGRATION READINESS

**Grade: C-**

### Critical Issues

1. **No Supabase client library installed or configured.**
   `package.json` has no `@supabase/supabase-js` dependency. There is no Supabase client initialization file, no environment variable for `SUPABASE_URL` or `SUPABASE_ANON_KEY`. The entire data layer is mock data only.

2. **Mock data shapes don't perfectly match migration schemas.**
   - `AIWorkspace.tsx:23` — `WorkspaceTask` has `assigned_to: 'you' | 'ai'` but the migration uses the same strings, so this matches.
   - `NightShift.tsx:165` — `output_files: { path: string; size: string; description: string }[]` — The migration stores this as `JSONB DEFAULT '[]'`, which is compatible, but the shape isn't validated by a shared type.
   - `Voice.tsx:53-59` — `VoiceLog` interface has `response` field, but the migration table `voice_logs` has separate `response`, `action_taken`, and `command_type` columns. The mock interface is simpler than the DB schema.
   When connecting to Supabase, the type interfaces will need updating to match the actual DB columns.

3. **No data fetching layer / API abstraction.**
   There is no `services/`, `api/`, `hooks/`, or `lib/` directory. Every page consumes mock data directly from module-level constants. There's no abstraction layer to swap between mock and real data. Connecting to Supabase will require touching every page file.

### Warnings

4. **Night Shift execution has no backend infrastructure.**
   The Night Shift feature shows a queue of tasks for "Claude to work on overnight," but there is no:
   - Edge function / serverless function to execute tasks
   - Cron job configuration (Supabase pg_cron or external scheduler)
   - Queue processing logic
   - Status update mechanism
   The entire Night Shift feature is a UI shell without any execution capability.

5. **No webhook / n8n integration scaffolding.**
   The voice module mock responses mention "Telegram alert sent" (`VoiceFAB.tsx:19`), and the Plan page mentions "n8n (VPS)" as infrastructure (`Plan.tsx:153`), but there is no webhook URL, no n8n integration code, no Telegram bot configuration anywhere in the codebase.

6. **Gemini API key management is partially set up.**
   `vite.config.ts:12-13` sets up `GEMINI_API_KEY` via env vars. However, as noted in Security, this embeds the key in client JS. The app has no actual Gemini/AI API calls implemented anywhere — the AI Copilot (`AIAssistant.tsx:21-23`) uses hardcoded setTimeout responses.

### Suggestions

7. **Recommended integration pattern:** Create a `lib/supabase.ts` client, then `hooks/useWorkspaceTasks.ts`, `hooks/useNightShiftQueue.ts`, `hooks/useVoiceLogs.ts` custom hooks that wrap Supabase queries. Pages would then use hooks instead of mock data.

8. **For Night Shift execution, consider:** Supabase Edge Functions triggered by pg_cron to poll the `night_shift_tasks` table for `status = 'queued'` tasks on a schedule (e.g., 2 AM nightly). The edge function would call the Anthropic API, write output back to the DB, and update status.

---

## 8. BUGS & ISSUES

**Grade: C**

### Critical Issues

1. **Stale closure in VoiceFAB causes broken `onend` behavior.**
   `components/VoiceFAB.tsx:96-100`:
   ```tsx
   recognition.onend = () => {
     if (state === 'listening' && !transcript) {
       setState('idle');
     }
   };
   ```
   `state` and `transcript` are captured in the closure from the render when `startListening` was created. Since `startListening` has `useCallback([], [])` (empty deps at line 104), these will **always** be the initial values (`'idle'` and `''`). This means `onend` will always call `setState('idle')`, even when the user has already received a response.

2. **`processCommand` in VoiceFAB has empty dependency array.**
   `components/VoiceFAB.tsx:128` — `processCommand` is wrapped in `useCallback([], [])` but references no external state. This is actually fine for the current implementation, but the function is called from within `onresult` which has the stale closure issue.

3. **Create Task / Add to Queue buttons do nothing.**
   `AIWorkspace.tsx:363-366` — "Create Task" calls `onClose()` without creating a task.
   `NightShift.tsx:504-508` — "Add to Queue" calls `onClose()` without queuing anything.
   The form state (`title`, `description`, `priority`, etc.) is collected but discarded. This is a functional bug — users will fill out the form, click submit, and nothing happens.

### Warnings

4. **Hardcoded date in Dashboard.**
   `Dashboard.tsx:46` — `"Tuesday, February 24 • Daily Cadence Active."` is a static string. It will always show Tuesday, February 24 regardless of the actual date.

5. **Plan page says "Master Plan 2025" but the app dates are 2026.**
   `Plan.tsx:81` — `"Master Plan 2025"` — All mock data uses 2026 dates, but the plan header says 2025.
   `Plan.tsx:208` — `"Target (Q4 2025)"` — Same inconsistency.

6. **Web Speech API browser compatibility is limited.**
   The Web Speech API (`SpeechRecognition`) is only supported in:
   - Chrome (desktop & Android) — full support
   - Safari 14.1+ — partial (via `webkitSpeechRecognition`)
   - Edge — full support (Chromium-based)
   - Firefox — **not supported**
   - iOS Safari — **not supported** for continuous recognition
   Both `VoiceFAB.tsx:62` and `Voice.tsx:117` check for `webkitSpeechRecognition` as a fallback, which handles Safari on desktop, but there's no fallback for Firefox or iOS.

7. **`AssignmentModal` doesn't reset state when reopened with a different template.**
   `NightShift.tsx:330-342` — The modal's `useState` initializers use `template?.title || ''` etc., but `useState` initializers only run on mount. If the modal is opened with template A, closed, then opened with template B, it will still show template A's data because the component isn't unmounted between opens (React will reuse the component instance if it stays in the tree).

8. **Import statement inconsistency: `CheckCircle` vs `CheckCircle2`.**
   `Leads.tsx:2` — imports `CheckCircle`
   Every other file uses `CheckCircle2`
   These are visually different icons (filled vs outlined).

9. **`<select>` in Dashboard chart has only one option.**
   `Dashboard.tsx:129-131` — `<select>` with a single `<option>Last 7 Days</option>`. This renders a dropdown that can't actually change anything.

10. **Sidebar badge numbers are hardcoded.**
    `Sidebar.tsx:34-36` — Emilio shows badge `'3'`, Midas shows `'1'`, Leads shows `'2'`. These should be dynamic.

### Edge Cases

11. **Empty string voice input.** If the SpeechRecognition API returns an empty string as a final result, `processCommand('')` at `VoiceFAB.tsx:87` will be called. `matchCommand('')` at `VoiceFAB.tsx:31-37` will correctly return `null`, but the response will be `"I heard: "" but I'm not sure what to do."` — a confusing message.

12. **Special characters in voice transcripts.** Voice transcripts are rendered directly in JSX (`Voice.tsx:320`, `VoiceFAB.tsx:197`). React auto-escapes by default, so this isn't an XSS risk, but characters like `<`, `>`, `&` in transcripts will display correctly.

13. **Very long task prompts in Night Shift.** The `<pre>` tag at `NightShift.tsx:611` renders prompts with `whitespace-pre-wrap`, but extremely long single-word strings (like URLs) could overflow the card container since there's no `word-break: break-all` or `overflow-wrap: break-word`.

---

## Executive Summary

| Area | Grade | Critical | Warnings | Suggestions |
|------|-------|----------|----------|-------------|
| Code Quality | C+ | 4 | 6 | 5 |
| Security | D | 4 | 5 | 2 |
| UI | B+ | 0 | 4 | 4 |
| UX | B | 1 | 8 | 4 |
| Performance | C | 2 | 3 | 2 |
| Database | B- | 2 | 5 | 3 |
| Integration | C- | 3 | 3 | 2 |
| Bugs | C | 3 | 7 | 3 |
| **Total** | **C+** | **19** | **41** | **25** |

---

## Top 10 Action Items (Prioritized)

| # | Action Item | Section | Effort | Impact |
|---|------------|---------|--------|--------|
| 1 | **Add RLS policies to all Supabase tables + add `user_id` columns** | Security/DB | M | Blocks production. Without this, all data is publicly accessible. |
| 2 | **Remove Gemini API key from client bundle; proxy through edge function** | Security | S | API key is extractable from built JS. Immediate credential exposure risk. |
| 3 | **Replace Tailwind CDN with PostCSS build pipeline** | Performance/Security | M | Eliminates ~300KB runtime overhead and CDN supply-chain risk. Bundle locally. |
| 4 | **Bundle dependencies locally instead of esm.sh import maps** | Performance/Security | M | Enables tree-shaking, eliminates runtime network dependency, reduces load time by >50%. |
| 5 | **Extract duplicated voice logic into shared module** | Code Quality | S | `VoiceFAB.tsx` and `Voice.tsx` share ~100 lines of near-identical code. Single source of truth. |
| 6 | **Fix stale closure bug in VoiceFAB.tsx `startListening`** | Bugs | S | Causes incorrect state transitions. Use refs or fix dependency arrays. |
| 7 | **Wire up modal form submissions (Create Task / Add to Queue)** | Bugs | M | Currently forms discard all input on submit. Core functionality is broken. |
| 8 | **Add Escape key + backdrop click to close all modals** | UX | S | Standard modal UX pattern missing from all 3 modals. |
| 9 | **Install `@supabase/supabase-js` and create data-fetching hooks** | Integration | L | Required to move from mock data to real backend. Create `lib/supabase.ts` + hooks. |
| 10 | **Add input validation (length limits, required fields) on all forms** | Security | S | Prevents garbage data from entering the database when Supabase is connected. |

**Effort Key:** S = Small (< 1 hour), M = Medium (1–4 hours), L = Large (4+ hours)

---

*End of audit report.*
