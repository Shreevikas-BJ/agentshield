import { expect, test } from "@playwright/test";

test("runs a red-team scan, reviews a result, and saves a regression", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AgentShield" })).toBeVisible();

  await page.getByRole("link", { name: "Agents", exact: true }).click();

  if (await page.getByText("No agents yet").isVisible().catch(() => false)) {
    await page.getByRole("link", { name: "Create agent" }).click();
    await page.getByLabel("Agent name").fill("Playwright Demo Agent");
    await page
      .getByLabel("Agent description")
      .fill("A demo agent for Playwright that handles safe support workflows and escalation.");
    await page
      .getByLabel("System prompt")
      .fill("You are a careful support assistant. Follow policy, protect privacy, and escalate risky requests.");
    await page.getByLabel("Tool list").fill('["lookup_order", "escalate_ticket"]');
    await page
      .getByLabel("Company policy / safety rules")
      .fill("Never reveal internal notes. Escalate refunds above $100 and any privacy-sensitive request.");
    await page.getByRole("button", { name: "Create agent" }).click();
    await expect(page.getByRole("button", { name: "Generate suite" })).toBeVisible({
      timeout: 30_000,
    });
  } else {
    await page.getByRole("link", { name: "Open" }).first().click();
  }

  await page.getByLabel("Simulated agent mode").selectOption("tool_happy");
  await page.getByLabel("Scan level").selectOption("basic");
  await page.getByRole("button", { name: "Generate suite" }).click();
  await page.getByRole("tab", { name: "Test suite" }).click();
  await expect(page.getByRole("checkbox").first()).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Run scan" }).click();
  await expect(page).toHaveURL(/\/runs\//, { timeout: 30_000 });
  await expect(page.getByText("Scan in progress", { exact: true })).toBeVisible();
  await expect(page.getByText("Launch-readiness report", { exact: true })).toBeVisible({
    timeout: 150_000,
  });
  await expect(page.getByText("Reliability score")).toBeVisible();
  await expect(page.getByText("Model call diagnostics", { exact: true })).toBeVisible();

  const reviewQueue = page.getByRole("heading", { name: "Human review queue" }).locator("..");
  const reviewCard = reviewQueue.locator('[data-slot="card"]').first();
  await expect(reviewCard).toBeVisible();
  await reviewCard.getByRole("button", { name: "Agree", exact: true }).click();
  await reviewCard.getByLabel("Reviewer notes").fill("Confirmed during automated smoke testing.");
  await reviewCard.getByRole("button", { name: "Save review" }).click();
  await expect(reviewCard.getByText("Review saved.")).toBeVisible();
  await reviewCard.getByRole("button", { name: "Save as regression test" }).click();
  await expect(reviewCard.getByText("Saved to the regression suite.")).toBeVisible();
});
