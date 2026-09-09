import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/Users/moon/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-x64/chrome-headless-shell',args:['--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:900,height:680}});
try{
 await p.goto('http://localhost:4173/?test');await p.waitForFunction(()=>window.__town?.state().assetsReady);
 await p.locator('#settings').click();console.log('first',await p.locator('#daytime').innerHTML());await p.selectOption('#daytime','1320');await p.locator('#back').click();
 await p.locator('#settings').click();console.log('second',await p.locator('#daytime').innerHTML());await p.selectOption('#daytime',{label:'Morning'}, {timeout:3000});console.log('selected',await p.locator('#daytime').inputValue());
}finally{await b.close();}
