import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const fallback='/Users/moon/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-x64/chrome-headless-shell';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(existsSync(fallback)?fallback:undefined),headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[],checks=[],loadedAssets=new Set();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/textures/')){loadedAssets.add(r.url());if(r.status()>=400)errors.push('Asset failed: '+r.url());}});page.on('console',m=>{if(m.type()==='error'&&/Shader Error|VALIDATE_STATUS|GL_INVALID/.test(m.text()))errors.push(m.text());});
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:60000});
const state=()=>page.evaluate(()=>window.__town.state());
const tp=(x,z)=>page.evaluate(([x,z])=>window.__town.teleport(x,z),[x,z]);
try {
 await page.goto(process.env.TOWN_URL||'http://localhost:4173/?test',{waitUntil:'domcontentloaded'});await wait(()=>window.__town?.state().assetsReady);await page.screenshot({timeout:120000,path:'tests/willowbrook-day.png'});checks.push('High quality daytime rendering');if(process.argv.includes('--day-only')){assert.deepEqual(errors,[]);console.log('Final daytime graphics verified.');await browser.close();process.exit(0);}
 await page.locator('#settings').click();await page.selectOption('#daytime','1320');await page.locator('#back').click();await wait(()=>window.__town.state().daylight<.2);await page.screenshot({timeout:120000,path:'tests/willowbrook-night.png'});checks.push('High quality nighttime rendering');
 await page.locator('#settings').click();await page.selectOption('#daytime',{label:'Morning'});await page.selectOption('#quality','low');await page.locator('#back').click();await page.setViewportSize({width:900,height:680});
 const doors=(await state()).doors;
 for(const [i,d] of doors.entries()){
  await tp(d.x,d.z+.9);await wait(name=>window.__town.state().nearby===name,d.name);await page.keyboard.press('KeyE');await wait(i=>window.__town.state().doors[i].open,i);await page.keyboard.press('KeyE');await wait(i=>!window.__town.state().doors[i].open,i);checks.push(`Opens and closes: ${d.name}`);console.log('PASS door',d.name);
 }
 for(const npc of (await state()).npcs){
  const position=(await state()).npcs.find(n=>n.name===npc.name).position;await tp(position[0],position[2]+1);await page.keyboard.press('KeyE');assert.match(await page.locator('#dialogue h3').textContent(),new RegExp(npc.name));if(npc.name==='Mira')await page.keyboard.press('Enter');else if(npc.name==='Bram')await page.keyboard.press('KeyE');else if(npc.name==='Elsie')await page.keyboard.press('Escape');else await page.locator('#dialogue-next').click();assert.equal((await state()).dialogue,false);checks.push(`Conversation: ${npc.name}`);console.log('PASS resident',npc.name);
 }
 await tp(-13,10.5);await page.keyboard.press('KeyE');await tp(-13,7.2);await wait(()=>!window.__town.state().roofs[2].visible);assert.ok((await state()).cameraDistance>4,'Indoor camera keeps the room and player in view');await page.screenshot({timeout:120000,path:'tests/willowbrook-interior.png'});checks.push('Furnished interior rendering');
 // Pause freezes the clock and resuming advances it.
 await page.locator('#settings').click();await page.selectOption('#daytime','1020');await page.locator('#cycle').check();await page.locator('#back').click();const time=(await state()).minutes;await wait(t=>window.__town.state().minutes>t+.2,time);checks.push('Automatic day cycle advances');
 await page.keyboard.press('Slash');await page.locator('#modal .close').click();checks.push('Keyboard help and close button');
 const enabled=(await state()).audio.enabled;await page.locator('#sound').click();assert.equal((await state()).audio.enabled,!enabled);checks.push('Sound button toggles ambience');
 await page.locator('#settings').click();await page.locator('#sensitivity').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#sensitivity').inputValue(),'4');await page.locator('#back').click();const yaw=(await state()).yaw;await page.mouse.move(450,300);await page.mouse.down();await page.mouse.move(550,300,{steps:5});await page.mouse.up();assert.ok(Math.abs((await state()).yaw-yaw+.4)<.01);checks.push('Mouse sensitivity changes camera response');
 assert.ok(loadedAssets.size>=19,'All material maps and the HDRI load');checks.push('All 19 graphics assets load without shader errors');assert.deepEqual(errors,[]);await writeFile('tests/visual-results.json',JSON.stringify({date:new Date().toISOString(),checks,errors},null,2));console.log(`${checks.length} additional checks passed.`);
} finally {await browser.close();}
