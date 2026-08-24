Markdown
# Playwright SDET Revision Notes — Fixtures, POM, Locators, Auto-Waiting, Hooks, Assertions & Advanced Patterns

---

## 1. Fixtures & Dependency Injection

### What Is a Fixture?
A fixture is a Playwright mechanism for providing a prepared dependency to a test. Instead of manually instantiating and configuring objects inside tests, fixtures create and inject them on demand.

```typescript
test('adds item', async ({ inventoryPage }) => {
  await inventoryPage.goto();
  await inventoryPage.addItemToCart('Sauce Labs Backpack');
});
The Built-In page Fixture
Playwright automatically provides fundamental fixtures out of the box, such as page, context, browser, and request.

Playwright Engine ──► Browser ──► Browser Context ──► Page ──► Test
Custom Fixtures (test.extend)
Extend Playwright’s base test to register custom Page Objects or services:

TypeScript
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';

type PageObjects = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
};

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
});
The use() Function & Teardown Lifecycle
use() hands the initialized resource to the test. Execution halts at await use(...) while the test runs. Once the test finishes, code placed after use() executes as teardown.

TypeScript
dbFixture: async ({}, use) => {
  const db = await connectToDatabase();
  
  await use(db); // Test executes here

  await db.disconnect(); // Runs after test finishes (Teardown)
}
FIXTURE SETUP ──► await use(resource) ──► TEST RUNS (Pass/Fail) ──► FIXTURE TEARDOWN
Failure Resilience: Teardown code always executes inside an implicit try...finally block. Even if an assertion inside the test fails, post-use() code still runs.

Fixture Scopes
Test-Scoped (Default): Created freshly for each individual test. Use for page, page objects, and test-specific data.

Worker-Scoped: Instantiated once per worker process and shared across test files running in that worker thread. Ideal for expensive setup like database connections or authentication tokens.

TypeScript
// Worker-scoped fixture example
export const test = base.extend<{ workerDb: Database }, { workerDb: Database }>({
  workerDb: [async ({}, use) => {
    const db = await connectToDatabase();
    await use(db);
    await db.disconnect();
  }, { scope: 'worker' }],
});
2. Page Object Model (POM) Architecture
What Is POM?
POM is an abstraction layer that represents page structure and user interactions as class properties and methods.

TEST ("Add Backpack") ──► PAGE OBJECT (addItemToCart) ──► LOCATORS ──► DOM
TypeScript
export class InventoryPage {
  readonly page: Page;
  readonly inventoryItems: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inventoryItems = page.locator('.inventory_item');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
  }

  async addItemToCart(itemName: string) {
    await this.inventoryItems
      .filter({ hasText: itemName })
      .getByRole('button', { name: /add to cart/i })
      .click();
  }
}
Keeping Assertions Out of Page Objects
Page Objects specify how to interact with the UI (addItemToCart()).

Tests specify what should happen (await expect(cartBadge).toHaveText('1')).

Exceptions: Complex multi-step flows (like verifying an entire checkout pipeline confirmation message) can encapsulate a domain assertion if reused across many specs, but keeping standard assertions in test files remains the primary best practice.

3. Locators & Dynamic Selectors
Locators Are Lazy Descriptions
A Locator is not a captured DOM element; it is a stored set of instructions on how to find an element when an action occurs.

TypeScript
// No DOM query happens here
const button = page.getByRole('button', { name: 'Login' }); 

// DOM query and actionability checks execute HERE
await button.click(); 
Locator Chaining & Action-Time Resolution
Chaining narrows the search criteria. Playwright evaluates the path at the exact moment of execution:

TypeScript
this.inventoryItems
  .filter({ hasText: 'Sauce Labs Backpack' })
  .getByRole('button', { name: /add to cart/i })
Locator Strictness & Handling Ambiguity
By default, actions like .click() enforce strictness—if a locator matches multiple elements, Playwright throws a strictness error.

Resolving Ambiguity:

Refine container: Use .filter({ has: page.getByRole(...) }) or .filter({ hasText: '...' }).

Explicit index (Use sparingly): .first(), .last(), or .nth(index).

TypeScript
// Specific filtering (Preferred)
const card = page.locator('.inventory_item').filter({ has: page.getByText('Backpack') });

// Nth index selector
const firstItem = page.locator('.inventory_item').nth(0);
Selector Preference Hierarchy
User-facing roles: page.getByRole('button', { name: 'Submit' })

Form labels / text: page.getByLabel('Username'), page.getByText('Welcome')

Explicit test IDs: page.locator('[data-test="submit-button"]')

CSS Selectors / Classes: page.locator('.btn-primary') (Avoid for unstable UI styling)

XPath: Reserve strictly for complex visual DOM traversals when no test attributes or roles exist.

4. Auto-Waiting & Actionability Engine
Playwright automatically waits for elements to pass actionability checks before performing actions.

Action Called (.click())
        │
        ▼
Resolve Locator ──► Visible? ──► Stable (No animation)? ──► Receives Events? ──► Enabled? ──► EXECUTE
Present vs. Visible vs. Enabled vs. Actionable
Present: Exists in the DOM tree (display: none elements are present).

Visible: Non-zero box size, not display: none or visibility: hidden.

Enabled: Lacks disabled attribute.

Actionable: Meets all required checks for that specific action.

Anti-Pattern: waitForTimeout()
Bad: await page.waitForTimeout(5000); (Flaky, adds arbitrary delays).

Good: Rely on automatic actionability waiting or explicit state assertions (await expect(page).toHaveURL(...)).

Bypassing Checks (force: true)
Passing { force: true } skips actionability checks (e.g., clicking a checkbox obscured by an invisible overlay). Use strictly as a last resort, as it bypasses realistic user behavior.

TypeScript
await page.getByRole('checkbox').click({ force: true });
5. Advanced Assertions & Visual Testing
Web-First Retry Assertions vs. Standard Assertions
Web-first assertions retry until the condition is met or timeout is reached. Standard assertions evaluate once synchronously.

TypeScript
// Retries for up to assertion timeout (e.g., 5000ms)
await expect(page.locator('.badge')).toHaveText('1');

// Checks value ONCE instantly (Will cause race conditions)
expect(await page.locator('.badge').textContent()).toBe('1');
Soft Assertions (expect.soft)
Soft assertions log failure details without aborting test execution immediately, allowing the test to continue and compile all errors at the end.

TypeScript
test('check dashboard layout', async ({ page }) => {
  await expect.soft(page.locator('.header')).toBeVisible();
  await expect.soft(page.locator('.footer')).toBeVisible();
  await expect.soft(page.locator('.sidebar')).toHaveCount(1);
});
Visual Regression Testing (toHaveScreenshot)
Captures pixel snapshots and compares them against baseline images stored in source control.

TypeScript
// Page-level snapshot
await expect(page).toHaveScreenshot('landing-page.png');

// Component-level snapshot
await expect(inventoryPage.cartBadge).toHaveScreenshot('badge-icon.png');
6. API Integration & Network Mocking
Network Interception & Mocking (page.route)
Intercept and fulfill API calls directly inside tests to simulate edge cases (e.g., 500 errors or specific data loads) without modifying backend state.

TypeScript
test('displays error banner on API failure', async ({ page }) => {
  await page.route('**/api/v1/inventory', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Internal Server Error' }),
    });
  });

  await page.goto('/inventory.html');
  await expect(page.locator('.error-message')).toBeVisible();
});
Hybrid API Data Seeding (request Fixture)
Combine API calls with UI tests to bypass slow UI login/setup routines. Seed database or cart state via API prior to page navigation.

TypeScript
// Fixture seeding cart state via API before handing page to test
cartWithItem: async ({ request, page }, use) => {
  await request.post('/api/cart/items', {
    data: { productId: 'sauce-backpack', quantity: 1 },
  });
  await use(page);
}
7. Hooks vs. Fixtures
Dimension	Hook (beforeEach, afterEach)	Fixture (test.extend)
Primary Purpose	Execute lifecycle actions before/after tests	Inject reusable resources/dependencies
Declaration	Explicitly declared inside test files	Modular, declared centrally and injected via signature
Invocation	Runs automatically for all tests in scope	Evaluated lazily only when requested by a test parameter
Cleanup	Placed inside afterEach	Handled naturally after await use() inside fixture scope
Decision Matrix
Use a Fixture when: Providing objects (Page Objects, API clients, DB connections) or creating isolated contexts.

Use a Hook when: Applying blanket global lifecycle steps across a describe block (e.g., navigating to baseURL before every spec in a file).

8. Test Execution, Parallelism & Debugging
Parallelism & Isolation
By default, Playwright runs test files in parallel across worker processes.

Tests within a single file run sequentially in the same worker process by default.

To run tests inside a single file in parallel:

TypeScript
test.describe.configure({ mode: 'parallel' });
Debugging Locator Timeouts
When an action times out on a locator, follow this diagnostic checklist:

URL Check: Did the page redirect back to /login due to missing storageState?

DOM Existence: Does the targeted selector match any element on the rendered DOM?

Visibility State: Is the element rendered with display: none or hidden behind an overlay?

Actionability Blockers: Is an animation running, or is the element disabled?

Trace Viewer Configuration
Enable tracing in playwright.config.ts to capture execution timelines, DOM snapshots, network calls, and action logs upon failure.

TypeScript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'retain-on-failure', // Records trace and saves artifact only when a test fails
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
View saved traces using the Playwright CLI:

Bash
npx playwright show-trace test-results/your-test-folder/trace.zip
9. Comprehensive System Architecture
                                  playwright.config.ts
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
             Setup Project                                  Test Project
         (auth.setup.ts: UI Login)                   (e2e/*.spec.ts: Chromium)
                    │                                             │
                    ▼                                             ▼
          Save storageState()                        Inject storageState: user.json
                    │                                             │
                    └───────────────► user.json ──────────────────┘
                                                                  │
                                                                  ▼
                                                          Custom Fixture
                                                    (fixtures/page-fixtures.ts)
                                                                  │
                                                      ┌───────────┴───────────┐
                                                      ▼                       ▼
                                                 LoginPage              InventoryPage
                                                      │                       │
                                                      └───────────┬───────────┘
                                                                  ▼
                                                             Test Body
                                                                  │
                                                                  ▼
                                                               Locators
                                                                  │
                                                                  ▼
                                                      Auto-Waiting Engine
                                                (Visible, Enabled, Stable, Pointer)
                                                                  │
                                                                  ▼
                                                            Execute Action
                                                                  │
                                                                  ▼
                                                      Web-First Assertion Retry
10. Core Rule Summary
Fixtures manage dependency injection and setup/teardown lifecycles.

await use(resource) divides fixture setup from fixture cleanup. Teardown runs even on test failure.

Page Objects encapsulate UI mechanics. Assertions belong in spec files.

Locators are lazy descriptions evaluated at action time. They retry automatically.

Auto-waiting verifies visibility, stability, enablement, and pointer events before acting.

Web-first assertions (expect(locator)...) automatically retry until conditions are satisfied or timeout occurs.
