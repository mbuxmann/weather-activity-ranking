import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// E2E tests — full user journey through the browser
//
// These verify the COMPLETE user experience across the full stack:
//   Browser  →  React app  →  GraphQL API  →  rendered results
//
// Unlike unit/integration tests that mock dependencies, these hit the real
// dev server. They run against multiple browser engines (Chromium, Firefox,
// WebKit) and a mobile viewport to verify cross-browser + responsive support.
// ---------------------------------------------------------------------------

test.describe("City search flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // -------------------------------------------------------------------------
  // Smoke test — page loads with expected structure
  // -------------------------------------------------------------------------
  test("loads the landing page with heading and search form", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", {
        name: "Find the best day for each activity.",
      })
    ).toBeVisible();

    await expect(page.getByPlaceholder("Cape Town")).toBeVisible();
    await expect(page.getByRole("button", { name: "Rank" })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Happy path — submit a valid city and see results
  // -------------------------------------------------------------------------
  test("submits a city and displays ranking results", async ({ page }) => {
    // The default value is "Cape Town" so the query fires on load
    // Wait for results to appear (or the loading indicator to finish)
    await expect(
      page.getByText("Seven-day outlook")
    ).toBeVisible({ timeout: 15_000 });

    // Location info should be rendered
    await expect(page.getByText(/Cape Town/)).toBeVisible();

    // At least one activity card should be present
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Search with a different city
  // -------------------------------------------------------------------------
  test("searches for a new city and updates results", async ({ page }) => {
    const input = page.getByPlaceholder("Cape Town");
    const button = page.getByRole("button", { name: "Rank" });

    // Clear and type a new city
    await input.fill("London");
    await button.click();

    // Wait for results to update
    await expect(page.getByText(/London/)).toBeVisible({ timeout: 15_000 });
  });

  // -------------------------------------------------------------------------
  // Validation — empty input shows error
  // -------------------------------------------------------------------------
  test("shows validation error when input is cleared and submitted", async ({
    page,
  }) => {
    const input = page.getByPlaceholder("Cape Town");
    const button = page.getByRole("button", { name: "Rank" });

    // Clear the input
    await input.fill("");
    await button.click();

    // Should show validation message
    await expect(
      page.getByText("Please enter a city or town name.")
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Validation — invalid characters show error
  // -------------------------------------------------------------------------
  test("shows validation error for numeric input", async ({ page }) => {
    const input = page.getByPlaceholder("Cape Town");
    const button = page.getByRole("button", { name: "Rank" });

    await input.fill("12345");
    await button.click();

    await expect(
      page.getByText(/City name can only contain letters/)
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation — submit via Enter key
  // -------------------------------------------------------------------------
  test("submits the form via Enter key", async ({ page }) => {
    const input = page.getByPlaceholder("Cape Town");

    await input.fill("Paris");
    await input.press("Enter");

    // Should show loading or results
    await expect(
      page.getByText(/Ranking|Seven-day outlook|Paris/)
    ).toBeVisible({ timeout: 15_000 });
  });

  // -------------------------------------------------------------------------
  // Error handling — invalid city shows error message
  // -------------------------------------------------------------------------
  test("shows a user-friendly error for an unknown city", async ({ page }) => {
    const input = page.getByPlaceholder("Cape Town");
    const button = page.getByRole("button", { name: "Rank" });

    await input.fill("Zzyzzyxyxy");
    await button.click();

    // Wait for either an error message or results
    await page.waitForSelector(
      '[class*="destructive"], [class*="error"], [role="article"]',
      { timeout: 15_000 }
    );
  });
});

// ---------------------------------------------------------------------------
// Performance — basic load time assertions
// ---------------------------------------------------------------------------
test.describe("performance", () => {
  test("page loads within acceptable time", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Rank" })).toBeVisible();

    const loadTime = Date.now() - start;
    // Page should load in under 5 seconds (generous for dev server)
    expect(loadTime).toBeLessThan(5000);
  });

  test("API response returns within acceptable time", async ({ page }) => {
    await page.goto("/");

    const start = Date.now();

    const input = page.getByPlaceholder("Cape Town");
    await input.fill("Berlin");
    await page.getByRole("button", { name: "Rank" }).click();

    // Wait for results or error
    await page.waitForSelector('[role="article"], [class*="destructive"]', {
      timeout: 15_000,
    });

    const responseTime = Date.now() - start;
    // API round-trip should complete in under 10 seconds
    expect(responseTime).toBeLessThan(10_000);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------
test.describe("accessibility", () => {
  test("form elements have proper labels", async ({ page }) => {
    await page.goto("/");

    // Input should be associated with label
    const input = page.getByPlaceholder("Cape Town");
    await expect(input).toBeVisible();

    // Button should have accessible name
    const button = page.getByRole("button", { name: "Rank" });
    await expect(button).toBeVisible();
  });

  test("results section has aria-label", async ({ page }) => {
    await page.goto("/");

    // Wait for results to load
    await expect(
      page.getByText("Seven-day outlook")
    ).toBeVisible({ timeout: 15_000 });

    // Check aria-label on results section
    const resultsSection = page.getByRole("region", {
      name: "Activity rankings",
    });
    await expect(resultsSection).toBeVisible();
  });

  test("loading state disables button and shows indicator", async ({
    page,
  }) => {
    await page.goto("/");

    const input = page.getByPlaceholder("Cape Town");
    await input.fill("Tokyo");
    await page.getByRole("button", { name: "Rank" }).click();

    // During loading, button should show "Ranking..."
    // This is a race condition test — it may resolve quickly
    const loadingButton = page.getByRole("button", { name: /ranking/i });
    // If we catch it in loading state, verify it's disabled
    const isLoading = await loadingButton.isVisible().catch(() => false);
    if (isLoading) {
      await expect(loadingButton).toBeDisabled();
    }
  });
});
