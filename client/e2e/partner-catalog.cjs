const {chromium, expect} = require('@playwright/test');
const catalog = require('../src/partner_catalog.json');
const fs = require('node:fs');
(async () => {
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:5174';
 fs.mkdirSync('../.run-logs/catalog-2026-10-15',{recursive:true});
 try {
  const universities=await (await page.request.get(base+'/api/universities')).json();
  expect(universities.data.map(u=>u.abbr).sort()).toEqual(catalog.universities.map(u=>u.abbr).sort());
  const programs=await (await page.request.get(base+'/api/programs')).json();
  expect(programs.data.length).toBe(catalog.programs.length);
  for (const width of [1440,768,390,320]) {
   await page.setViewportSize({width,height:1000});
   await page.goto(base+'/explore');
   await expect(page.locator('.student-results article')).toHaveCount(12);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`../.run-logs/catalog-2026-10-15/programs-${width}.png`});
   await page.getByRole('combobox',{name:'الجامعة',exact:true}).selectOption('10');
   await page.getByRole('combobox',{name:'المرحلة الدراسية',exact:true}).selectOption('bachelor');
   await page.getByRole('combobox',{name:'المجال الدراسي',exact:true}).selectOption('Computer Science & IT');
   await page.getByRole('combobox',{name:'التخصص أو الجامعة أو المعهد',exact:true}).fill('الأمن السيبراني');
   await expect(page.locator('.student-results article').first()).toContainText(/Cyber/i);
   await expect(page.locator('.student-results article').first()).toContainText('APU');
   await page.getByRole('link',{name:'عرض التفاصيل',exact:true}).first().click();
   await expect(page.locator('main')).not.toContainText(/YourUni|your-uni|NeoGoals/i);
   const externalLinks = await page.locator('main a[href]').evaluateAll(links => links.map(a => a.href).filter(href => /^https?:/.test(href) && !href.startsWith(location.origin) && !href.startsWith('https://wa.me/')));
   expect(externalLinks).toEqual([]);
   await page.getByRole('link',{name:'ابدأ طلب التقديم',exact:true}).click();
   await expect(page.locator('[name=program]')).toHaveValue(/Cyber/i);
   await page.goto(base+'/explore?category=universities&shown=24');
   await expect(page.locator('.student-results article')).toHaveCount(22);
   await page.screenshot({path:`../.run-logs/catalog-2026-10-15/universities-${width}.png`,fullPage:true});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
  console.log('PASS: exact 22-partner scope, complete snapshot API parity, Arabic subject + university + level + field filters, sourced details, application context, 4 sizes without overflow or JS errors.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
