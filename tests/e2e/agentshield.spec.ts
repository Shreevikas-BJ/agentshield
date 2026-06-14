import { expect, test } from "@playwright/test";

test("creates or opens an agent, generates a suite, runs evaluation, and shows score", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AgentShield" })).toBeVisible();

  await page.getByRole("link", { name: "Agents" }).click();

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
    await expect(page.getByRole("button", { name: "Generate Test Suite" })).toBeVisible({
      timeout: 30_000,
    });
  } else {
    await page.getByRole("link", { name: "Open" }).first().click();
  }

  await page.getByRole("button", { name: "Generate Test Suite" }).click();
  await expect(page.getByText(/TC-1/)).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Run Evaluation" }).click();
  await expect(page).toHaveURL(/\/runs\//, { timeout: 90_000 });
  await expect(page.getByText("Reliability score")).toBeVisible();
});
