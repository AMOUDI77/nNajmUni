import { test, expect } from "@playwright/test";

test("counselor replies, adds context and builds an automation", async ({
  page,
}) => {
  await page.goto("/crm/login");
  await page.getByLabel("Work email").fill("demo@najmuni.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-browser-test-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
  await page.locator(".crm-conversation-row").first().click();
  const beforeSavedReply = await page.locator(".crm-message.outbound").count();
  await page.getByLabel("Reply message").fill("/visa");
  await expect(
    page.getByRole("option", { name: /visa process/i }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/saved-replies-menu.png",
    fullPage: true,
  });
  await page.getByRole("option", { name: /visa process/i }).click();
  await expect(page.getByLabel("Reply message")).toContainText(
    "student visa process",
  );
  expect(await page.locator(".crm-message.outbound").count()).toBe(
    beforeSavedReply,
  );
  await page
    .getByLabel("Reply message")
    .fill("أهلاً بك! يسعدنا مساعدتك في اختيار تخصصك.");
  await page.getByRole("button", { name: "Send reply ↗" }).click();
  await expect(page.locator(".crm-message.outbound").last()).toContainText(
    "sent",
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: "Private note", exact: true }).click();
  await page
    .getByLabel("Private note", { exact: true })
    .fill("Follow up about September intake.");
  await page.getByRole("button", { name: "Save note" }).click();
  await page
    .getByLabel("Assigned counselor")
    .selectOption({ label: "Demo Counselor" });
  await page.screenshot({
    path: "test-results/inbox-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Open CRM profile" }).click();
  await expect(page.locator(".crm-note").last()).toContainText(
    "Follow up about September intake.",
  );
  await page.getByRole("button", { name: "Create lead from contact" }).click();
  await expect(
    page.getByRole("button", { name: "Unlink lead", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Automations", exact: true }).click();
  await page.getByRole("link", { name: "+ Create automation" }).click();
  await page.getByLabel("Automation name").fill("Browser acceptance flow");
  await page.getByLabel("Keywords", { exact: false }).fill("ماليزيا, Malaysia");
  await page.getByLabel("Message", { exact: true }).fill("أهلاً بك في نجم");
  await page.getByRole("button", { name: "+ Add step" }).click();
  await page.getByLabel("Step 2 action").selectOption("ASK_QUESTION");
  await page
    .getByLabel("Message", { exact: true })
    .last()
    .fill("ما المرحلة الدراسية؟");
  await page.getByLabel("Save the next reply to").selectOption("degree_level");
  await page.getByRole("button", { name: "Save automation" }).click();
  await expect(page).toHaveURL(/\/crm\/automations\/\d+/);
  await page.screenshot({
    path: "test-results/automation-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Inbox", exact: true }).click();
  await page.locator(".crm-conversation-row").first().click();
  await expect(page.getByLabel("Reply message")).toBeVisible();
  await expect(page.locator(".crm-conversation-list")).not.toBeVisible();
  await page.screenshot({
    path: "test-results/inbox-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("copilot stays a draft and Arabic shell remains usable", async ({
  page,
}) => {
  await page.goto("/crm/login");
  await page.getByLabel("Work email").fill("demo@najmuni.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-browser-test-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.locator(".crm-conversation-row").first().click();
  await expect(page.locator(".crm-message.inbound").first()).toBeVisible();
  const before = await page.locator(".crm-message.outbound").count();
  await page.getByRole("button", { name: "✦ AI" }).click();
  await page.getByRole("button", { name: "Suggest a reply" }).click();
  await expect(page.getByRole("button", { name: "Use draft" })).toBeVisible({
    timeout: 20000,
  });
  expect(await page.locator(".crm-message.outbound").count()).toBe(before);
  await page.getByRole("button", { name: "Use draft" }).click();
  await expect(page.getByLabel("Reply message")).toHaveValue(
    "أهلاً بك! ما المرحلة الدراسية التي ترغب بها؟",
  );
  await page.getByRole("link", { name: "Open CRM profile" }).click();
  await page.getByRole("button", { name: "Verify fact" }).first().click();
  await page.getByTitle("Change language").click();
  await expect(page.locator(".crm-shell")).toHaveAttribute("dir", "rtl");
  await page.screenshot({
    path: "test-results/inbox-arabic.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
