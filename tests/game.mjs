import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const fallback='/Users/moon/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-x64/chrome-headless-shell';
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(existsSync(fallback)?fallback:undefined);
const browser=await chromium.launch({executablePath,headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'],timeout:20000});
const context=await browser.newContext({viewport:{width:800,height:600},deviceScaleFactor:0.5});
const page=await context.newPage();await page.addInitScript(()=>{window.__events=[];for(const type of ['blur','focus','keydown','keyup','visibilitychange'])window.addEventListener(type,e=>window.__events.push([type,e.code,document.hidden,performance.now()]));});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];const ok=(name)=>{results.push(name);console.log('PASS',name)};
const state=()=>page.evaluate(()=>window.__town.state());
const wait=async(fn,arg)=>page.waitForFunction(fn,arg,{timeout:60000});
const tp=async(x,z,yaw=0)=>{await page.evaluate(([x,z,yaw])=>{window.__town.teleport(x,z);window.__town.setCamera(yaw);},[x,z,yaw]);};
const hold=async(key,fn)=>{await page.bringToFront();await page.keyboard.down(key);try{await wait(fn);}finally{await page.keyboard.up(key);}};
try{
 await page.goto(process.env.TOWN_URL||'http://localhost:4173/?test',{waitUntil:'domcontentloaded'});await wait(()=>window.__town?.state().assetsReady);
 assert.equal((await state()).stage,0);assert.ok((await state()).render.triangles>10000);ok('3D world renders without a loading screen');
 await page.screenshot({timeout:120000,path:'tests/town-day.png'});
 await page.locator('#settings').click();await page.selectOption('#quality','low');await page.locator('#back').click();
 // Genuine keyboard input for every direction, running and jumping.
 await tp(0,20);await hold('KeyW',()=>window.__town.state().position[2]<18);ok('W moves forward');
 await tp(0,20);await hold('KeyS',()=>window.__town.state().position[2]>22);ok('S moves backward');
 await tp(0,20);await hold('KeyA',()=>window.__town.state().position[0]<-2);ok('A moves left');
 await tp(0,20);await hold('KeyD',()=>window.__town.state().position[0]>2);ok('D moves right');
 await tp(0,20);await hold('ArrowUp',()=>window.__town.state().position[2]<18);ok('Arrow keys provide alternate movement');
 await tp(0,20);let start=(await state()).minutes;await hold('KeyW',()=>window.__town.state().position[2]<16);const walkDuration=(await state()).minutes-start;
 await tp(0,20);start=(await state()).minutes;await page.keyboard.down('ShiftLeft');await hold('KeyW',()=>window.__town.state().position[2]<16);await page.keyboard.up('ShiftLeft');const runDuration=(await state()).minutes-start;assert.ok(runDuration<walkDuration*.8,`run ${runDuration} walk ${walkDuration}`);ok('Shift runs faster than walking');
 await tp(0,20);await page.keyboard.press('Space');await wait(()=>window.__town.state().position[1]>.6);await wait(()=>window.__town.state().grounded);assert.ok(Math.abs((await state()).position[1]-.13)<.01);ok('Space jumps and lands on the ground');
 // Orbit and zoom via mouse input.
 const previous=(await state()).yaw;await page.mouse.move(400,350);await page.mouse.down();await page.mouse.move(510,370,{steps:8});await page.mouse.up();assert.ok(Math.abs((await state()).yaw-previous)>.2);ok('Mouse drag smoothly orbits the camera');
 const beforeZoom=(await state()).distance;await page.mouse.wheel(0,220);await wait(d=>window.__town.state().distance>d,beforeZoom);ok('Scroll wheel zooms the camera');
 await page.mouse.click(420,350);await page.waitForFunction(()=>document.pointerLockElement!==null||document.querySelector('#toast').textContent.includes('Drag the mouse'),undefined,{timeout:10000,polling:100});const captured=await page.evaluate(()=>document.pointerLockElement!==null);await page.keyboard.press('Escape');await wait(()=>document.pointerLockElement===null);ok(captured?'Click captures mouse; Escape releases it':'Capture-denied fallback works; drag camera and Escape remain usable');
 // Walk into a closed door, open it, physically enter the room, exit, close it.
 await tp(-13,11);await page.keyboard.down('KeyW');await page.waitForTimeout(1200);await page.keyboard.up('KeyW');assert.ok((await state()).position[2]>=9.45);ok('Closed doors block movement');
 await page.keyboard.press('KeyE');await wait(()=>window.__town.state().doors[2].open);await hold('KeyW',()=>window.__town.state().position[2]<8);assert.equal((await state()).roofs[2].visible,false);ok('E opens door; player enters furnished room; roof hides');
 await hold('KeyS',()=>window.__town.state().position[2]>10.2);await page.keyboard.press('KeyE');await wait(()=>!window.__town.state().doors[2].open);ok('Door closes after leaving the room');
 await tp(-10,11);await page.keyboard.down('KeyW');await page.waitForTimeout(1000);await page.keyboard.up('KeyW');assert.ok((await state()).position[2]>=9.45);ok('Building walls block movement');
 await tp(0,-3.5);await page.keyboard.down('KeyW');await page.waitForTimeout(1000);await page.keyboard.up('KeyW');assert.ok((await state()).position[2]>=-4.35);ok('Fountain collision blocks passage');
 await tp(0,33);await page.keyboard.down('KeyS');await page.waitForTimeout(1000);await page.keyboard.up('KeyS');assert.ok((await state()).position[2]<=34);ok('Town boundaries prevent leaving the world');
 // Quest progression and all five collectibles, using visible E prompts and buttons.
 await tp(-4,13.4);await wait(()=>document.querySelector('#prompt').textContent.includes('Mira'));await page.keyboard.press('KeyE');await page.locator('#dialogue-next').click();assert.equal((await state()).stage,1);ok('Conversation accepts Mira’s quest');
 for(const [x,z] of [[-6,18],[7,-12],[-22,19],[21,18],[4,-28]]){await tp(x,z);await wait(()=>window.__town.state().nearby==='seed');await page.keyboard.press('KeyE');}
 assert.equal((await state()).seeds.length,5);assert.match(await page.locator('#quest-objective').textContent(),/Return to Mira/);ok('All five sunseeds collect once and update the quest');
 await page.keyboard.press('KeyE');assert.equal((await state()).seeds.length,5);ok('Collected items cannot be collected twice');
 await tp(-4,13.4);await page.keyboard.press('KeyE');await page.locator('#dialogue-next').click();assert.equal((await state()).stage,2);ok('Returning seeds unlocks the bakery chapter');
 await tp(-9,-9);await page.keyboard.press('KeyE');await page.locator('#dialogue-next').click();assert.equal((await state()).stage,3);ok('Bram gives the warm loaf');
 await page.keyboard.press('KeyJ');assert.match(await page.locator('#modal').textContent(),/1 warm loaf/);await page.keyboard.press('Escape');ok('Journal shows quest and satchel; Escape closes it');
 await tp(16,24.4);await page.keyboard.press('KeyE');await page.locator('#dialogue-next').click();assert.equal((await state()).stage,4);ok('Delivering bread completes all three quest chapters');
 await page.reload({waitUntil:'domcontentloaded'});await wait(()=>window.__town?.state().assetsReady);assert.equal((await state()).stage,4);assert.equal((await state()).seeds.length,5);ok('Quest and collectible progress survive reload');
 const oldNpc=(await state()).npcs.find(n=>n.name==='Elsie').position;await wait(old=>JSON.stringify(window.__town.state().npcs.find(n=>n.name==='Elsie').position)!==JSON.stringify(old),oldNpc);const newNpc=(await state()).npcs.find(n=>n.name==='Elsie').position;assert.notDeepEqual(oldNpc,newNpc);ok('Residents wander around town');
 await page.keyboard.press('KeyM');assert.equal((await state()).audio.enabled,false);await page.keyboard.press('KeyM');assert.equal((await state()).audio.enabled,true);assert.equal((await state()).audio.state,'running');ok('Ambient audio starts and mute toggles correctly');
 await page.locator('#settings').click();await page.selectOption('#daytime','1320');await page.locator('#back').click();await wait(()=>window.__town.state().daylight<.2);assert.match(await page.locator('#time').textContent(),/PM/);ok('Night setting updates lighting and the clock');await page.screenshot({timeout:120000,path:'tests/town-night.png'});
 await page.locator('#settings').click();await page.locator('#cycle').uncheck();await page.selectOption('#daytime',{label:'Morning'});await page.selectOption('#quality','low');await page.locator('#back').click();const frozen=(await state()).minutes;await page.waitForTimeout(600);assert.equal((await state()).minutes,frozen);ok('Day cycle can pause and low graphics setting works');
 await page.locator('#help').click();assert.match(await page.locator('#modal').textContent(),/Mouse/);const p1=(await state()).position;await page.keyboard.down('KeyW');await page.waitForTimeout(400);await page.keyboard.up('KeyW');assert.deepEqual((await state()).position,p1);await page.locator('#back').click();ok('Help lists controls and menus pause the game');
 await page.setViewportSize({width:690,height:800});await page.screenshot({timeout:120000,path:'tests/town-narrow.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);ok('Narrow viewport stays within the screen');
 assert.deepEqual(errors,[]);ok('No uncaught browser errors during the full playthrough');
 console.log(`\n${results.length} checks passed.`);
 await import('node:fs/promises').then(fs=>fs.writeFile('tests/results.json',JSON.stringify({date:new Date().toISOString(),checks:results,browserErrors:errors},null,2)));
}catch(error){console.log('FAIL',error);console.log('FAIL STATE',await state().catch(()=>null));throw error;}finally{await context.close();await browser.close();}
