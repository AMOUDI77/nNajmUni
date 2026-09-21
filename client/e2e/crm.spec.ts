import { test, expect, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/crm/login");
  await page.getByLabel("Work email").fill("demo@najmuni.test");
  await page.getByLabel("Password", { exact: true }).fill("local-browser-test-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Inbox", exact: true })).toBeVisible();
}

test("counselor completes the Inbox-first daily workflow", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unread", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mine", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unassigned", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reminders", exact: true })).toBeVisible();

  await page.locator(".crm-conversation-row").first().click();
  await expect(page.getByText("Started from an Instagram Reel")).toBeVisible();
  await expect(page.getByText(/Study in Malaysia/)).toBeVisible();
  await expect(page.getByText("Conversation assigned to Demo Counselor")).toBeVisible();
  await expect(page.getByText("Student snapshot")).toBeVisible();

  const composer = page.getByLabel("Reply message");
  const before = await page.locator(".crm-message.outbound").count();
  await composer.fill("/visa");
  await expect(page.getByRole("option", { name: /visa process/i })).toBeVisible();
  await page.getByRole("option", { name: /visa process/i }).click();
  await expect(composer).toContainText("student visa process");
  expect(await page.locator(".crm-message.outbound").count()).toBe(before);
  await composer.fill((await composer.inputValue()) + " I will also send the exact checklist.");
  await page.getByLabel("More send options").click();
  await page.getByRole("button", { name: "Send & Close" }).click();
  await expect(page.locator(".crm-message.outbound").last()).toContainText("sent", { timeout: 20000 });
  await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible({ timeout: 20000 });

  await page.getByRole("link", { name: "Inbox", exact: true }).click();
  await page.locator(".crm-conversation-row").nth(1).click();
  await page.getByRole("button", { name: "Internal Note" }).click();
  await page.getByLabel("Private note").fill("Follow up on the document checklist.");
  await page.getByRole("button", { name: "Save internal note" }).click();
  await expect(page.getByText("Follow up on the document checklist.")).toBeVisible();
  const reminderMenu = page.locator("details.crm-action-menu").filter({ hasText: "Reminder" });
  await reminderMenu.locator("summary").click();
  await reminderMenu.getByRole("button", { name: "Tomorrow" }).click();
  await expect(page.locator(".crm-active-reminder")).toBeVisible();
  await page.getByLabel("Assigned counselor").selectOption({ label: "Demo Counselor" });

  await page.getByRole("button", { name: "Reply" }).click();
  await page.getByLabel("Open AI tools").click();
  await page.getByRole("button", { name: "Suggest reply" }).click();
  await expect(page.getByRole("button", { name: "Use draft" })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Use draft" }).click();
  await expect(composer).not.toHaveValue("");

  await page.screenshot({ path: "test-results/inbox-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(composer).toBeVisible();
  await expect(page.locator(".crm-conversation-list")).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
