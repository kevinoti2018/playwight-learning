# Week 2 Study Notes — Configuration, Environments, Data Factories & Zod

*Combines what we've built hands-on so far with the full scope of this week's curriculum, including pieces still ahead.*

---

## Part 1 — `playwright.config.ts` Deep Dive

### Why this file is more than boilerplate
It's the single source of truth for: where tests run, against what environment, with what timing tolerances, and what gets reported. In interviews, being able to explain the *why* behind each setting (not just that it exists) is what signals real framework experience.

### Core sections

**`testDir`** — where Playwright looks for spec files.

**`fullyParallel`** — trade-off: speeds up CI significantly, but *requires* tests to be fully independent (no shared state, no assumptions about execution order). Setting this `true` without real test isolation just produces flaky results faster.

**`forbidOnly`** — typically `!!process.env.CI`. Fails the build if someone commits a `.only()` — protects CI from silently running a subset of the suite. Not needed locally, since you *want* `.only()` while developing.

**`retries`** — a real trade-off, not a free win. Too high masks genuine flakiness; too low means transient network blips fail your build unnecessarily. Common pattern: `2` in CI, `0` locally (so you see failures immediately while developing rather than watching a retry mask them).

**`workers`** — CI runners are often resource-constrained (shared CPU); capping workers there is deliberate. Locally, `undefined` lets Playwright use available cores.

**`use.baseURL`** — the value that makes `page.goto('/inventory.html')` work instead of hardcoding the full domain in every test. This is the field that gets swapped per environment.

**Timeouts — three distinct layers, a favorite interview question:**
| Timeout | Scope | Fires when |
|---|---|---|
| `actionTimeout` | a single action (click, fill, selectOption) | one interaction hangs |
| `navigationTimeout` | page loads / navigations | a `goto()` or redirect hangs |
| global `timeout` | the whole test | test runs long overall, regardless of which step |

Knowing which one fires for a given hang is a genuine debugging skill — e.g. today's `selectOption` timeout was an `actionTimeout` case specifically, not a navigation or whole-test timeout.

**As implemented, with the CI-vs-local trade-off:**
```ts
use: {
  actionTimeout: process.env.CI ? 15_000 : 10_000,
  navigationTimeout: process.env.CI ? 20_000 : 15_000,
},
timeout: process.env.CI ? 45_000 : 30_000,
```
The reasoning isn't "CI is untrustworthy, pad everything" — it's specifically that a *shared, resource-constrained runner hitting a live external site over the internet* has real, structural latency a local machine doesn't. Widening the budget there removes "the runner was just slow today" as a false-positive failure signal, while keeping the local budget tight so a genuinely slow interaction still fails fast while you're actively developing. If a test times out in CI even *with* the wider budget, that's much stronger evidence of a real bug, precisely because you've already ruled out "CI is inherently slower" as the explanation.

### `projects` — more than "browsers"
Most tutorials only show `projects` for cross-browser testing, but it really means "run this config variant." Two common uses:
- **Cross-browser**: one project per browser (`chromium`, `firefox`, `webkit`).
- **Environment-per-project**: an alternative to the env-var-driven pattern we built — define a project per environment, each with its own `baseURL`, select via `--project=staging`. We chose the env-var approach instead (`TEST_ENV` → loads `.env.$TEST_ENV`) because it composes independently with browser selection (`TEST_ENV=staging npx playwright test --project=firefox`), rather than needing a project per environment-×-browser combination.

### `dependencies` (projects) — relevant to today's auth-setup bug
A project can declare `dependencies: ['setup']`, meaning it only runs after the `setup` project succeeds — typically used for authenticate-once-reuse-everywhere patterns via `storageState`. If `setup` fails, dependent projects are **skipped**, not run-and-failed — which is why one broken login test can make an entire pipeline look like it "stopped," when really most of the suite was deliberately never attempted.

---

## Part 2 — `.env` Handling & the Bootstrap/Payload Split

### The core problem
Any environment-driven config has a chicken-and-egg problem: you need to know *which* environment before you can load *its* config, but the "which environment" value itself often comes from the same `process.env` source.

### The two categories of value
- **Bootstrap value** (`TEST_ENV`) — decides which `.env` file to load. Read raw, unvalidated, before anything else happens.
- **Payload values** (`BASE_URL`, `TEST_USER`, `TEST_PWD`) — only exist in `process.env` *after* `dotenv.config()` has run. Validated by Zod afterward.

### The import-hoisting hazard
ES module `import` statements are hoisted — they run before any plain top-level statement in the same file, regardless of where they're textually written. If bootstrap logic (`dotenv.config()`) lives in one file and the schema is `import`ed from another, the import can execute *before* the bootstrap code — Zod ends up validating an empty `process.env`.

**Fix:** collapse bootstrap + validation into a single module (`env.schema.ts`), so there's one deterministic top-to-bottom execution path and nothing to hoist around.

```ts
const rawEnv = process.env.TEST_ENV || 'qa';    // 1. bootstrap
dotenv.config({ path: `.env.${rawEnv}` });        // 2. load
const envSchema = z.object({ ... });              // 3. define schema
export const ENV = envSchema.parse(process.env);  // 4. validate
```

### Behavioral quirks worth knowing cold
- `dotenv.config()` does **not** overwrite an existing `process.env` value — a CLI-set `TEST_ENV` always beats whatever's in the `.env` file. This is what makes CI injection and local file-loading work through the *same* code path with no branching.
- A missing `.env` file doesn't throw — it fails silently. A path typo (`.env,qa` vs `.env.qa`) surfaces later as a confusing Zod error nowhere near the actual mistake — a real bug we hit today.
- `TEST_ENV` doesn't strictly need to be duplicated inside its own `.env` file (the CLI/default already covers it) — but doing so anyway is good self-documentation.

---

## Part 3 — Zod for Environment Validation

### Why validate at all
Config errors are one of the most common causes of confusing, hard-to-debug runtime failures. Validating at startup converts a mysterious "why is `undefined` showing up three files deep" bug into an immediate, readable error the moment the process starts.

### Core pattern
```ts
const envSchema = z.object({
  BASE_URL: z.string().nonempty(),
  TEST_USER: z.string().nonempty(),
  TEST_PWD: z.string().nonempty(),
  TEST_ENV: z.enum(['qa', 'staging']).default('qa'),
});
export const ENV = envSchema.parse(process.env);
```
- `.parse()` throws immediately with a structured `ZodError` listing every problem field — not just the first one.
- `z.infer<typeof envSchema>` gives you the TypeScript type for free — autocomplete on `ENV.X` everywhere it's used.
- `.default(...)` lets you make some vars optional with sane fallbacks (like `TEST_ENV`) while others stay strictly required.

### Beyond what we've built — still worth knowing
- **`z.coerce`**: env vars are always strings; `z.coerce.number()` or `z.coerce.boolean()` converts `"3000"` → `3000` during validation, since raw `process.env` values are never actually typed as numbers/booleans.
- **`.transform()`**: for values needing real processing beyond type coercion — e.g. turning a comma-separated string into an array.
- **`z.enum([...])` for closed sets**: exactly what fits `TEST_USER` if you constrain it to Sauce Demo's known accounts (`standard_user`, `locked_out_user`, `problem_user`, `performance_glitch_user`) — catches a typo'd username at startup instead of a mysterious login failure later.

---

## Part 4 — Secrets & Log Masking

### The real question: does this value reduce an attacker's search space?
Not everything credential-*shaped* is actually sensitive.
- Sauce Demo's `standard_user`/`locked_out_user` — public, documented test fixtures. Secreting them is theater.
- A real production username (admin, service account) — genuinely sensitive; knowing it halves a credential-stuffing attacker's work.
- Passwords — always sensitive, regardless of context.

### GitHub Actions specifics
- **Repository secrets** (Settings → Secrets and variables → Actions → Secrets tab) — encrypted at rest, auto-masked in logs. This is what `secrets.TEST_PWD` in a workflow resolves against.
- **Variables** (same page, different tab) — plain text, for non-sensitive config. A value stored here is invisible to a `secrets.*` reference — separate namespace entirely.
- **Environment secrets** — only relevant if the workflow job explicitly declares `environment: qa`. Confusingly named next to our unrelated `matrix.environment` (just a variable name we chose, nothing to do with GitHub's formal Environments feature).
- GitHub auto-masks any value sourced from `secrets.*` anywhere it appears in log output — a free layer of masking on top of anything your own code does, but it only covers values that flowed through a `secrets.*` reference in the first place.

### `process.env.CI` — where it actually comes from
Worth knowing cold, because it looks like something you'd configure and isn't: every major CI platform (GitHub Actions, GitLab CI, CircleCI, Jenkins with the right plugin, etc.) injects `CI=true` into `process.env` automatically, for every job, as an unwritten industry convention — not something declared in your workflow YAML or your `.env` files. Locally it's simply absent unless you set it yourself. This is exactly what makes `process.env.CI ? x : y` work identically everywhere with zero setup: nothing to remember to configure per-environment, nothing to add to secrets or variables, on either side.

The same "no explicit wiring needed" logic applies to any one-off debug flag you invent yourself and gate behind an `if` — e.g. a `DEBUG_ENV` flag used only to print a masked config dump for troubleshooting. Because it's not part of the Zod schema and has no required default tied to it, it simply doesn't exist most of the time (the gated code just never runs), and you only ever set it manually, temporarily, for one local invocation (`DEBUG_ENV=1 npx playwright test`) — it never needs an entry in `.env.qa`, `.env.staging`, or GitHub Secrets/Variables at all. The general principle: not every env var that *could* exist needs to be provisioned everywhere — only the ones your schema actually requires need a home in every environment; ad-hoc developer flags can stay entirely local and undeclared.

### Masking your own logs/reports — implementation
CI's built-in masking only covers what GitHub itself prints, from values sourced via `secrets.*`. It says nothing about what *your own code* prints — a stray `console.log(ENV)` in a helper, a reporter that dumps its arguments on failure, or a page object that logs its constructor inputs for debugging all bypass GitHub's masking entirely, because from GitHub's perspective that's just ordinary text in your job's output, not a `secrets.*` reference.

```ts
// config/mask.ts

// Trade-off: an explicit allow-list of secret keys, rather than pattern-
// matching "anything that looks like a password." Explicit is safer — a
// regex-based guess can miss a secret, or redact something harmless.
const SECRET_KEYS = ['TEST_PWD'] as const;

export function maskSecrets<T extends Record<string, unknown>>(obj: T): T {
  const masked = { ...obj };
  for (const key of SECRET_KEYS) {
    if (key in masked) {
      (masked as Record<string, unknown>)[key] = '***';
    }
  }
  return masked;
}
```

```ts
// inside env.schema.ts, after ENV is defined
if (process.env.DEBUG_ENV) {
  console.log('Loaded config:', maskSecrets(ENV));
}
```

**Why bother masking at all, if the real fix is "just don't log the secret"?** The honest answer is *defense in depth* — masking protects against mistakes you don't know you're making, not the ones you'd deliberately avoid:
- **Code you don't control the future of.** As a framework grows, other tests and helpers will import `ENV` too. You can't audit every future debug line a teammate — or future-you, months later, mid-troubleshooting — might add and forget to remove.
- **Indirect leaks, not just direct `console.log`s.** An unhandled error whose stack trace includes a function's full argument list, or a reporter that serializes its inputs on failure, can leak `ENV.TEST_PWD` through a path that was never a deliberate logging statement at all.
- **CI logs persist and are broadly visible.** A stray local console line disappears when you close the terminal. The same mistake in a CI log sits in GitHub's UI, readable by anyone with repo access, for the full retention window — a much longer and wider exposure for an identical slip.
- **It converts a rule into a default.** The value isn't "this one line is now safe" — it's that `maskSecrets()` becomes the *only* sanctioned way to display config anywhere in the codebase, so the safe path is also the path of least resistance, and a careless future addition doesn't depend on anyone remembering a policy.

For a solo portfolio project, the practical risk today is genuinely low — but this is exactly the kind of habit that's cheap to build in now and expensive to retrofit onto a real, multi-contributor production codebase later. That gap (cheap now, expensive later) is itself a strong interview answer for "why did you bother with this."
- GitHub auto-masks any value sourced from `secrets.*` anywhere it appears in log output — this is a free layer of masking on top of whatever your own code does.

### Masking in your own code/logs — the piece still ahead
Beyond CI's built-in masking, the KPI also calls for masking secrets in *your own* console output/reports (relevant if you ever log the full `ENV` object for debugging). Approaches worth knowing:
- A custom logger wrapper that redacts known secret keys before printing (`{ ...ENV, TEST_PWD: '***' }`).
- Never `console.log(ENV)` wholesale in shared code paths — log an explicitly allow-listed subset instead.

---

## Part 5 — GitHub Actions CI, Matrix Strategy

### Object matrix for multi-environment config
```yaml
strategy:
  fail-fast: false
  matrix:
    environment:
      - name: qa
        base_url: https://www.saucedemo.com/
        test_user: standard_user
      - name: staging
        base_url: https://www.saucedemo.com/
        test_user: locked_out_user
```
An **object** matrix (not a flat string list) lets each entry bundle its own related config together — no separate if/else needed to map environment name → user/URL.

### `fail-fast` — the setting that caused real confusion today
Defaults to `true`: the instant *one* matrix entry fails, GitHub cancels every other still-running entry rather than letting them finish. The cancelled sibling's log shows `"Error: The operation was canceled"` — easy to mistake for *the* failure when it's actually a side effect of a different job failing. `fail-fast: false` lets every environment run to completion independently, which is what you actually want for visibility into which environments are healthy.

### `npm ci` vs `npm install`
`npm ci` (used in CI, and for good reason) installs *exactly* what's locked in `package-lock.json` and fails outright if that file is missing or out of sync — it won't silently pull in a dependency that only exists in your local `node_modules`. A "works locally, missing module in CI" bug is a strong signal the lockfile was never committed.

### Artifact naming under a matrix
Every parallel matrix job producing an artifact needs a **unique** name (`playwright-report-${{ matrix.environment.name }}`), or parallel uploads collide trying to write to the same artifact name.

---

## Part 6 — Test Data Factories, Builder Pattern (upcoming — Wed/Thu)

*Not yet built hands-on — flagged here so the curriculum stays visible as one document.*

### The problem factories solve
Hardcoded test data (`'Sauce Labs Backpack'` typed directly into every test) is brittle — a UI copy change breaks every test that references it, and there's no single place to adjust "what a typical user/order/item looks like" for the whole suite.

### Builder pattern shape (TypeScript)
```ts
class UserBuilder {
  private user = { username: 'default_user', role: 'standard' };

  withUsername(name: string) {
    this.user.username = name;
    return this;
  }

  withRole(role: string) {
    this.user.role = role;
    return this;
  }

  build() {
    return { ...this.user };
  }
}

// usage: new UserBuilder().withUsername('qa_tester').withRole('admin').build();
```
Each method returns `this`, enabling the fluent chain (`.withX().withY().build()`). `build()` returns a fresh object — critical so multiple builder instances / calls don't share mutable state.

### Why "deterministic" matters (per this week's KPI)
Random/fuzzed test data is good for exploratory testing but bad for repeatable CI — a test that fails only 1-in-20 runs due to randomly generated data is a debugging nightmare. A factory with sensible, deterministic defaults (overridable per-test where needed) gives you repeatability *and* flexibility in the same tool.

---

## Debugging Methodology (the transferable skill from today's session)

1. **Isolate** — run the single failing test alone (`-g "test name"`). Immediately splits any bug into "real bug in this test" vs. "state leaking from another test."
2. **Read the error type precisely** — "element not found" (timeout waiting for the *locator*) and "element found but not interactable" (timeout waiting for *visible/enabled*) are different failure classes with different likely causes.
3. **Diff against a structurally similar passing case** — today, comparing a failing cart test against passing ones in the same file directly revealed a missing `inventoryPage.goto()` call.
4. **Use artifacts already being generated** — HTML report, trace, screenshots exist specifically so you don't have to guess DOM state after the fact.
5. **Eliminate theories cheapest-first** — read the code and compare to a passing test before reaching for headed/debug mode or deep DOM inspection.

### Real bugs found and fixed this session
- **Typo:** `` `.env,${rawEnv}` `` (comma) instead of `` `.env.${rawEnv}` `` (dot) — a `dotenv` failure that surfaced as a confusing Zod error far from the actual mistake.
- **`locked_out_user` wired into a shared auth-setup project** — a global login-and-save-state step can't use an account designed to fail login; fixed by choosing a `staging` user that authenticates successfully.
- **Cross-page coupling in a Page Object:** `CartPage.addToCart()` internally relies on inventory-page markup, but a test navigated to `/cart.html` first, so the button it waits for never exists on that page.

---

# Interview Questions

### Config & environments
1. Walk me through your `playwright.config.ts` — why is it structured the way it is?
2. How does your framework support running the same suite against multiple environments with a single command?
3. Explain the difference between `actionTimeout`, `navigationTimeout`, and the global test `timeout` — when does each fire?
4. What does `fullyParallel: true` require to be true of your tests, and what happens if that assumption is wrong?
5. What's the trade-off in setting `retries` too high vs. too low?
6. When would you use `projects` for environments instead of an env-var-driven `.env` loading pattern — what does each approach cost you?

### Zod / config validation
7. Why validate environment variables at all instead of using `process.env.X` directly everywhere?
8. Explain the "bootstrap vs. payload" split in your env loading — why can't everything be validated in one pass?
9. What happens if config validation runs before `dotenv` has loaded the right file — and how would you notice?
10. Why does `dotenv.config()` not throw when the target file doesn't exist, and what problem can that cause?
11. How would you validate that a numeric or boolean env var is actually the right type, given `process.env` values are always strings?

### Secrets & CI security
12. How do you decide what belongs in CI secrets versus plain config?
13. What's the difference between GitHub's "Secrets," "Variables," and "Environment secrets"?
14. How would you verify secret masking is actually working end-to-end, not just assumed?
15. Beyond CI's built-in masking, how would you prevent a secret from leaking through your own application logs?
16. Where does `process.env.CI` come from — do you have to set it yourself anywhere?
17. If masking a secret is easy, why bother — why not just make sure nobody writes `console.log(ENV)` in the first place?
18. What's the difference between a value GitHub masks automatically and one your own code needs to mask?

### CI/CD pipeline design
19. Why use a matrix strategy instead of separate duplicate jobs per environment?
20. What does `fail-fast: false` change, and why does it matter when you have a multi-environment matrix?
21. What's the practical difference between `npm install` and `npm ci`, and why does CI typically use the latter?
22. What would happen if two parallel jobs tried to upload artifacts with the same name?

### Debugging & test design
23. Tell me about a flaky or failing test you debugged — walk me through your process, step by step.
24. How do you distinguish "this test has a real bug" from "this test is being polluted by another test's leftover state"?
25. What's wrong with a Page Object method that silently assumes a specific starting page? How would you guard against that?
26. Why might a global `setup` project (used for pre-authentication) be a poor fit for a test account that's designed to fail login?
27. What isolation guarantees does Playwright give you by default, and what's one common way a team can accidentally lose them (e.g. fixture scope, shared `beforeAll` state)?

### Test data factories (upcoming topic)
28. Why use a builder pattern for test data instead of hardcoding values directly in tests?
29. How do you balance deterministic test data (needed for reliable CI) against realistic variability?
30. What does "fluent interface" mean, and how does returning `this` from each builder method enable it?
