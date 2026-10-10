import { expect, test, type Page } from "@playwright/test";

const apiBase = "http://127.0.0.1:5091";
test.beforeEach(async ({ page }) => {
  // Vite proxies real Flask routes to the disposable test database.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.abort(),
  );
});
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
});
async function open(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
}
async function fillContact(page: Page, phone: string) {
  await page.getByLabel("اسمك", { exact: true }).fill("Public QA student");
  await page
    .getByLabel("رقم التواصل مع رمز الدولة", { exact: true })
    .fill(phone);
  await page.getByRole("checkbox").check();
}
test("Arabic-first home, mobile navigation, keyboard escape and English", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("link", { name: "اكتشف خياراتي الدراسية" }),
  ).toHaveAttribute("href", "/study-plan/questions");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  await expect(
    page.getByRole("navigation", { name: "قائمة الجوال" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "فتح القائمة" })).toBeFocused();
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  await page
    .getByRole("navigation", { name: "قائمة الجوال" })
    .getByRole("link", { name: "التخصصات" })
    .click();
  await expect(page).toHaveURL(/\/programs$/);
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "What would you like to study?",
  );
});
test("four-step exploration, grading validation, result before contact and persisted context", async ({
  page,
  request,
}) => {
  await open(page, "/study-plan/questions");
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("combobox", { name: "المؤهل", exact: true })
    .selectOption("high-school");
  await page
    .getByLabel("بلد الحصول على الشهادة أو النظام التعليمي")
    .fill("Egypt");
  await page
    .getByText("إضافة المعدل للمراجعة (اختياري)", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "نظام المعدل", exact: true })
    .selectOption("gpa4");
  await page.getByLabel("المعدل", { exact: true }).fill("5");
  await page.getByRole("button", { name: "التالي" }).click();
  await expect(page.getByRole("alert")).toContainText("بين 0 و4");
  await page.getByLabel("المعدل", { exact: true }).fill("3.2");
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByRole("button", { name: "التقنية" }).click();
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByRole("button", { name: "لم أحدد بعد" }).click();
  await page.getByRole("button", { name: "التالي" }).click();
  await page.getByRole("button", { name: "مرن / غير متأكد" }).click();
  await page.getByRole("button", { name: "اعرض خياراتي" }).click();
  await expect(page).toHaveURL(/result$/);
  await expect(page.locator(".nu-program-row").first()).toBeVisible();
  await expect(page.locator("input[type=tel]")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("1 فبراير 2027");
  await page.screenshot({
    path: "../.run-logs/plan-result-desktop.png",
    fullPage: true,
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "الصورة أصبحت أوضح." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "راجع خطتي مع مستشار" }).click();
  await fillContact(page, "+60123456001");
  await page.getByRole("button", { name: "أرسل طلب المراجعة" }).click();
  await expect(page.getByRole("heading", { name: "وصل طلبك." })).toBeVisible();
  const saved = await (
    await request.get(apiBase + "/api/admin/leads", {
      headers: { "X-Admin-Key": "public-qa-local" },
    })
  ).json();
  const lead = (Array.isArray(saved) ? saved : saved.data).find(
    (l: { phone: string }) => l.phone === "+60123456001",
  );
  expect(lead.qualification).toBe("high-school");
  expect(lead.grade).toBe("3.2 (gpa4)");
  expect(lead.nationality).toContain("Egypt");
  expect(lead.specialization).toBe("Technology");
  expect(lead.preferred_start).toBe("flexible");
  await open(page, "/study-plan/result");
  await page
    .locator(".nu-program-row")
    .first()
    .getByRole("link", { name: "تفاصيل البرنامج" })
    .click();
  await page.getByRole("link", { name: "اطلب مراجعة هذا البرنامج" }).click();
  await expect(page).toHaveURL(/source=study-plan/);
  await expect(page.locator(".nu-context")).toContainText("تفضيلات خطتك");
});
test("program and university context reaches real lead storage; form failures stay errors", async ({
  page,
  request,
}) => {
  await open(page, "/programs?field=Technology");
  await expect(page.locator(".nu-program-row").first()).toBeVisible();
  await page
    .locator(".nu-program-row")
    .first()
    .getByRole("link", { name: "تفاصيل البرنامج" })
    .click();
  const program = await page.getByRole("heading", { level: 1 }).innerText();
  await expect(page.getByText("شروط القبول الأكاديمية")).toBeVisible();
  await page.getByRole("link", { name: "اطلب مراجعة هذا البرنامج" }).click();
  await expect(page.locator(".nu-context")).toContainText(program);
  await fillContact(page, "123");
  await page.getByRole("button", { name: "أرسل طلب المراجعة" }).click();
  await expect(page.getByRole("alert")).toContainText("دوليًا");
  await page.getByLabel("رقم التواصل مع رمز الدولة").fill("+60123456002");
  await page.route("**/api/leads", (route) =>
    route.fulfill({ status: 503, json: { error: "QA outage" } }),
  );
  await page.getByRole("button", { name: "أرسل طلب المراجعة" }).click();
  await expect(page.getByRole("alert")).toContainText("لم نتمكن");
  await expect(page.getByLabel("اسمك", { exact: true })).toHaveValue(
    "Public QA student",
  );
  await page.unroute("**/api/leads");
  await page.getByRole("button", { name: "أرسل طلب المراجعة" }).click();
  await expect(page.getByRole("heading", { name: "وصل طلبك." })).toBeVisible();
  const response = await request.get(apiBase + "/api/admin/leads", {
    headers: { "X-Admin-Key": "public-qa-local" },
  });
  const saved = await response.json();
  const lead = (Array.isArray(saved) ? saved : saved.data).find(
    (l: { phone: string }) => l.phone === "+60123456002",
  );
  expect(lead.specialization).toContain(program);
  expect(lead.preferred_university).toContain("[id:");
});
test("directory filtering, useful comparison, budget arithmetic and contextual handoff", async ({
  page,
}) => {
  await open(page, "/universities");
  await expect(page.locator(".nu-university").first()).toBeVisible();
  await page.getByLabel("ابحث عن جامعة أو مدينة").fill("APU");
  await expect(page.locator(".nu-university")).toHaveCount(1);
  await page.getByLabel("ابحث عن جامعة أو مدينة").fill("");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await expect(page.getByRole("table")).toContainText("الرسوم السنوية");
  await open(page, "/budget");
  await page.getByLabel("الرسوم الدراسية / سنة (RM)").fill("30000");
  await expect(page.locator("output")).toHaveText("RM 54,000");
  await page.getByRole("link", { name: "راجع ميزانيتي مع مستشار" }).click();
  await expect(page.locator(".nu-context")).toContainText("subtotal RM 54000");
  await expect(page.locator(".nu-context")).toContainText("excludes visa");
});
test("ready-to-apply route, policies, unknown routes and catalog outage", async ({
  page,
}) => {
  await open(page, "/apply");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "طلب المساعدة",
  );
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await open(page, "/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "بيان الخصوصية",
  );
  await open(page, "/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "شروط استخدام الموقع",
  );
  await open(page, "/unknown-route");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "هذه الصفحة غير موجودة",
  );
  await page.route("**/api/universities*", (route) => route.abort());
  await open(page, "/universities");
  await expect(
    page.getByText("نعرض نسخة الدليل المحفوظة لعدم توفر الاتصال بالخدمة."),
  ).toBeVisible();
  await expect(page.locator(".nu-university").first()).toBeVisible();
});
for (const width of [1440, 768, 390, 320])
  test("responsive Arabic public journeys at " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const path of [
      "/",
      "/universities",
      "/universities/10",
      "/programs",
      "/programs/1",
      "/budget",
      "/study-plan/questions",
      "/consultation",
      "/apply",
      "/institutes",
    ]) {
      await open(page, path);
      await page.waitForTimeout(120);
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll("main *")]
          .filter((e) => {
            const r = e.getBoundingClientRect();
            const style = getComputedStyle(e);
            return (
              r.width > 0 &&
              style.position !== "absolute" &&
              (r.right > innerWidth + 1 || r.left < -1)
            );
          })
          .map((e) => e.className),
      );
      expect(overflow, path).toEqual([]);
      if (
        ["/", "/programs/1", "/consultation", "/study-plan/questions"].includes(
          path,
        )
      )
        await page.screenshot({
          path:
            "../.run-logs/qa-" +
            (path === "/" ? "home" : path.replaceAll("/", "-")) +
            "-" +
            width +
            ".png",
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
  });
