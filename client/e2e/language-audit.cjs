const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:5173';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('najmuni_language','en');
  localStorage.setItem('najmuni_study_plan_draft',JSON.stringify({country:'SA',program:'software-engineering',qualification:'high-school',grade:80,english:{type:'ielts',score:6},budget:'over-60',preferredStart:'nearest',preferences:['lower-cost']}));
 });
 const report=[];
 for(const route of ['/','/explore','/explore?category=universities','/explore?category=institutes','/universities/10','/programs/243484946','/programs/257929589','/apply','/visa','/costs','/compare','/institutes','/study-plan','/study-plan/questions','/study-plan/summary','/study-plan/result']) {
  await page.goto(base+route);await page.locator('footer').waitFor();await page.waitForTimeout(700);
  const leaks=await page.evaluate(()=>{
   const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),out=[];let n;
   while(n=w.nextNode()){const s=n.textContent.trim();if(/[\u0600-\u06ff]/.test(s)&&s!=='العربية'&&!n.parentElement.closest('script,style')&&n.parentElement.getClientRects().length)out.push(s);}
   document.querySelectorAll('[placeholder],[aria-label]').forEach(el=>{for(const a of ['placeholder','aria-label']){const s=el.getAttribute(a);if(s&&/[\u0600-\u06ff]/.test(s)&&s!=='العربية')out.push(a+': '+s);}});
   return [...new Set(out)];
  });report.push({route,leaks});console.log(route,JSON.stringify(leaks));
 }
 fs.mkdirSync('.run-logs/language-audit',{recursive:true});
 fs.writeFileSync('.run-logs/language-audit/report.json',JSON.stringify({report,errors},null,2));
 expect(errors).toEqual([]);
 expect(report.flatMap(r=>r.leaks)).toEqual([]);
 const switching=await browser.newPage();switching.on('pageerror',e=>errors.push(e.message));
 async function toggle(name){
  let button=switching.getByRole('button',{name,exact:true});
  if(!await button.isVisible()){
   await switching.getByRole('button',{name:/Open menu|فتح القائمة/}).click();
   button=switching.getByRole('button',{name,exact:true});
  }
  await button.click();
  const close=switching.getByRole('button',{name:/Close menu|إغلاق القائمة/});
  if(await close.isVisible())await close.click();
 }
 for(const width of [1440,390]) {
  await switching.setViewportSize({width,height:950});
  await switching.goto(base+'/explore?category=programs&field=Computer+Science+%26+IT&level=bachelor');
  await expect(switching.locator('.study-program-card').first()).toBeVisible();
  if(await switching.locator('html').getAttribute('lang')==='en')await toggle('العربية');
  await expect(switching.locator('html')).toHaveAttribute('dir','rtl');
  await expect(switching.locator('.discovery-hero h1')).toContainText('تخصص تفهمه');
  const originalUrl=switching.url();
  await toggle('English');
  await expect(switching.locator('html')).toHaveAttribute('dir','ltr');
  expect(switching.url()).toBe(originalUrl);
  await expect(switching.locator('.discovery-hero h1')).toContainText('Understand your programme');
  expect(await switching.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await switching.screenshot({path:`.run-logs/language-audit/explore-en-${width}.png`,fullPage:true});
  await switching.reload();await expect(switching.locator('html')).toHaveAttribute('lang','en');
  await expect(switching.locator('footer')).toContainText('NajmUni. All rights reserved.');
  await expect(switching.locator('footer')).not.toContainText(/sdn\s*bhd/i);
  await toggle('العربية');
  await expect(switching.locator('footer')).toContainText('نجم يوني. جميع الحقوق محفوظة.');
  expect(await switching.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await switching.screenshot({path:`.run-logs/language-audit/explore-ar-${width}.png`,fullPage:true});
 }
 await switching.setViewportSize({width:1440,height:950});
 await switching.goto(base+'/apply?university=APU&program=Software+Engineering');
 await switching.locator('input[name=name]').fill('Sara');
 await switching.locator('input[name=phone]').fill('12');
 await switching.locator('select[name=qualification]').selectOption('ثانوية');
 await toggle('English');
 await expect(switching.locator('input[name=name]')).toHaveValue('Sara');
 await expect(switching.locator('select[name=qualification]')).toHaveValue('ثانوية');
 await expect(switching.locator('input[name=university]')).toHaveValue('APU');
 await switching.locator('input[type=checkbox]').check();
 await switching.getByRole('button',{name:'Send your request via WhatsApp',exact:true}).click();
 await expect(switching.getByRole('alert')).toContainText('Enter a valid number including the country code.');
 await toggle('العربية');
 await expect(switching.getByRole('alert')).toContainText('أدخل رقمًا صحيحًا مع رمز الدولة.');
 expect(errors).toEqual([]);
 console.log('PASS: 16 English routes, Arabic/English switching and persistence, preserved filters and form values, localized validation, footer branding, desktop/mobile layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
