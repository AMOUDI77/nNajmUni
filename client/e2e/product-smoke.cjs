// Run explicitly with node; uses only the isolated public_preview.py fixture.
const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const page = await browser.newPage();
  const errors = [];
  const checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  const base = "http://127.0.0.1:5174";
  const out = "../.run-logs/product-2026-10-14";
  try {
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [name, path] of [
        ["home", "/"],
        ["explorer", "/explore"],
        ["program", "/programs/246062654"],
        ["apply", "/apply"],
      ]) {
        await page.goto(base + path);
        await expect(page.locator("h1")).toBeVisible();
        if (name === "explorer")
          await expect(
            page.locator(".student-results article").first(),
          ).toBeVisible();
        await page.waitForTimeout(250);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(await page.locator("main").innerText()).not.toMatch(/\?{3}/);
        if (name === "home") {
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 600) {
              window.scrollTo({ top: y, behavior: "instant" });
              await new Promise((r) => setTimeout(r, 100));
            }
            window.scrollTo({ top: 0, behavior: "instant" });
          });
          await page.waitForTimeout(800);
        }
        await page.screenshot({
          path: `${out}/after-${name}-${width}.png`,
          fullPage: true,
        });
        checks.push(`${name} ${width}: no overflow, no damaged Arabic`);
      }
    }
    await page.goto(base + "/explore");
    await page
      .getByLabel("التخصص أو الجامعة أو المعهد")
      .fill("هندسة البرمجيات");
    await expect(
      page.locator(".student-results article").first(),
    ).toContainText("Software Engineering");
    await page
      .getByRole("link", { name: "عرض التفاصيل", exact: true })
      .first()
      .click();
    await expect(page.locator("h1")).toContainText("Software Engineering");
    const inquiryHref = await page.getByRole('link', {name:'استفسر عن هذا التخصص',exact:true}).getAttribute('href');
    expect(new URL(inquiryHref).pathname).toBe('/601137327607');
    expect(new URL(inquiryHref).searchParams.get('text')).toContain('Software Engineering');
    await page.getByRole('link', {name:'ابدأ طلب التقديم',exact:true}).click();
    await expect(page.locator("[name=program]")).toHaveValue(
      /Software Engineering/,
    );
    await page.goBack();
    await page.getByRole("link", { name: "← العودة لنتائج البحث" }).click();
    await expect(page.getByLabel("التخصص أو الجامعة أو المعهد")).toHaveValue(
      "هندسة البرمجيات",
    );
    await page.getByLabel("التخصص أو الجامعة أو المعهد").fill("APU");
    await page.getByRole("button", { name: "جامعات", exact: true }).click();
    await expect(page.locator(".student-results article")).toHaveCount(1);
    await page.getByLabel("التخصص أو الجامعة أو المعهد").fill("معهد لغة");
    await page.getByRole("button", { name: "معاهد لغة", exact: true }).click();
    await expect(
      page.locator(".student-results article").first(),
    ).toBeVisible();
    expect(await page.getByLabel("المرحلة الدراسية").count()).toBe(0);
    await page
      .getByLabel("التخصص أو الجامعة أو المعهد")
      .fill("no-such-program-xyz");
    await expect(page.getByText("لم نجد نتائج مطابقة")).toBeVisible();
    checks.push(
      "Arabic subject, university, institute, empty results, preserved return query and inquiry context",
    );
    await page.goto(
      base +
        "/apply?university=APU&program=Software+Engineering&level=bachelor",
    );
    await page.locator("[name=name]").fill("Browser fixture student");
    await page.locator("[name=phone]").fill("+15555550188");
    await page.getByRole("checkbox").check();
    await page.route("**/api/leads", (r) =>
      r.fulfill({ status: 503, body: "unavailable" }),
    );
    await page.getByRole("button", { name: "أرسل طلبك عبر واتساب" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator("[name=name]")).toHaveValue(
      "Browser fixture student",
    );
    await page.unroute("**/api/leads");
    // Intercept the handoff so QA never contacts WhatsApp or sends a message.
    await page.route('https://wa.me/**', r => r.fulfill({status:200,contentType:'text/html',body:'<h1>WhatsApp handoff intercepted for QA</h1>'}));
    await page.getByRole("button", { name: "أرسل طلبك عبر واتساب" }).click();
    await page.waitForURL('https://wa.me/**');
    const handoffUrl = new URL(page.url());
    expect(handoffUrl.pathname).toBe('/601137327607');
    for (const field of ['Browser fixture student','+15555550188','APU','Software Engineering','بكالوريوس']) expect(handoffUrl.searchParams.get('text')).toContain(field);
    const saved = await (
      await page.request.get(base + "/api/admin/leads", {
        headers: { "X-Admin-Key": "preview-local-only" },
      })
    ).json();
    const lead = saved.data.find((l) => l.phone === "+15555550188");
    expect(lead.specialization).toBe("Software Engineering");
    expect(lead.preferred_university).toBe("APU");
    await page.request.post(base + "/api/leads", {
      data: {
        phone: "+15555550188",
        name: "Browser fixture student",
        specialization: "Software Engineering",
        preferred_university: "APU",
      },
    });
    const repeated = await (
      await page.request.get(base + "/api/admin/leads", {
        headers: { "X-Admin-Key": "preview-local-only" },
      })
    ).json();
    expect(
      repeated.data.filter((l) => l.phone === "+15555550188"),
    ).toHaveLength(1);
    checks.push(
      "real isolated API form save, context persistence, duplicate upsert, failed submission retains input",
    );
    await page.route("**/api/programs", (r) =>
      r.fulfill({ status: 503, body: "unavailable" }),
    );
    await page.goto(base + "/explore");
    await expect(page.getByText(/تعذر تحديث الدليل/)).toBeVisible();
    await expect(
      page.locator(".student-results article").first(),
    ).toBeVisible();
    await page.unroute("**/api/programs");
    await page.goto(base + "/");
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    await expect(page.locator(".mobile-drawer")).toBeVisible();
    await page.locator('.mobile-drawer a[href="/explore"]').click();
    await expect(page).toHaveURL(/explore/);
    for (const route of [
      "/universities/10",
      "/institutes",
      "/costs",
      "/compare",
      "/study-plan",
      "/consultation",
    ]) {
      await page.goto(base + route);
      await expect(page.locator("h1,h2").first()).toBeVisible();
    }
    checks.push(
      "catalog failure fallback, mobile navigation, original tools and routes",
    );
    expect(errors).toEqual([]);
    fs.writeFileSync(
      `${out}/browser-results.json`,
      JSON.stringify({ checks, errors }, null, 2),
    );
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
