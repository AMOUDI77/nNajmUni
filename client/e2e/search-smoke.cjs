const { chromium, expect } = require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {
  for(const width of [1440,768,390,320]) {
   await page.setViewportSize({width,height:1000});
   await page.goto('http://127.0.0.1:5174/explore?category=universities');
   await expect(page.locator('.institution-identity').first()).toBeVisible();
   const input=page.getByRole('combobox',{name:'التخصص أو الجامعة أو المعهد'});
   await input.fill('تا');
   await expect(page.getByRole('option').first()).toContainText("Taylor");
   await expect(page.locator('.student-results article').first()).toContainText('Taylor');
   await input.fill('تايلر');
   await expect(page.getByRole('option').first()).toContainText('Taylor');
   await page.screenshot({path:`../.run-logs/product-2026-10-14/live-search-${width}.png`});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await input.press('ArrowDown');await input.press('Enter');
   await expect(input).toHaveValue("TAYLOR'S");await expect(input).toHaveAttribute('aria-expanded','false');
   await expect(page.locator('.student-results article')).toHaveCount(1);
   await input.fill('صنواي');await expect(page.getByRole('option').first()).toContainText('Sunway');
   await input.press('Escape');await expect(input).toHaveAttribute('aria-expanded','false');
   await input.fill('اي بي يو');await page.getByRole('option').first().click();
   await expect(input).toHaveValue('APU');
   await page.reload();await expect(input).toHaveValue('APU');
   await page.getByRole('button',{name:'مسح البحث',exact:true}).click();await expect(input).toHaveValue('');
   await input.fill('zzzzzzzzz');await expect(page.getByText('ما لقينا اسمًا قريبًا. جرّب الاختصار أو حروفًا أقل.')).toBeVisible();
  }
  expect(errors).toEqual([]);console.log('PASS: Arabic prefixes, Arabic/English aliases, typos, live ranked results, keyboard selection, pointer selection, Escape, clear, URL restore, empty state, 4 widths, no overflow or JS errors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
