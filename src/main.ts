import * as THREE from 'three';
import { createWorld, person, animatePerson, type Resident, type Door } from './world';
import { TownAudio } from './audio';
import './style.css';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { assetsReady, wind } from './realism';

const leaf=`<svg viewBox="0 0 40 44" fill="none"><path d="M20 39V18M20 28C7 29 6 19 6 13c10 0 16 5 14 15ZM20 22C32 23 35 14 34 7c-10 0-15 6-14 15Z" stroke="currentColor" stroke-width="1.5"/><path d="M20 18C10 16 13 6 18 2c7 7 7 12 2 16Z" fill="#8a9a6a"/><path d="M13 40h14" stroke="currentColor" stroke-width="1.5"/></svg>`;
const soundIcon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></svg>`;
const settingsIcon=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="#f8f5eb"/><circle cx="15" cy="17" r="3" fill="#f8f5eb"/></svg>`;
document.querySelector('#app')!.innerHTML=`
<header class="topbar"><div class="brand">${leaf}<div><div class="brand-name">willowbrook<span style="color:#8c9e71">.</span></div><div class="brand-sub">A LITTLE PLACE TO WANDER</div></div></div><nav class="nav" aria-label="Game navigation"><button id="explore" class="active">Explore</button><button id="journal">Field notes <kbd>J</kbd></button><button id="help">How to play <kbd>?</kbd></button></nav><div class="topright"><span class="save-note"><i></i> A slower kind of adventure</span><button class="icon-button" id="sound" aria-label="Mute ambient sound" title="Ambient sound (M)">${soundIcon}</button><button class="icon-button" id="settings" aria-label="Settings" title="Settings">${settingsIcon}</button></div></header>
<main id="viewport"><canvas id="game" aria-label="Willowbrook 3D town. WASD to move, drag mouse to look, E to interact." tabindex="0"></canvas><div class="vignette"></div><div class="location"><i class="dot"></i> WILLOWBROOK <span>/</span> <span id="district">TOWN COMMONS</span></div>
<aside class="quest-card"><div class="eyebrow"><span style="font-size:15px;color:#ad935d">✧</span> A LITTLE ADVENTURE</div><h2 id="quest-title">A warm welcome</h2><p id="quest-desc">Every good day begins with a hello.<br>Meet your new neighbor, Mira.</p><div class="objective"><span class="ring"></span><span id="quest-objective">Talk to Mira by the lane</span></div><div class="progress"><span id="quest-progress"></span></div><div class="quest-bottom"><span id="quest-number">01 / 03 · GETTING SETTLED</span><button id="quest-journal">Open field notes ↗</button></div></aside>
<div class="clock"><span class="sun" id="sun">☀</span><div><div class="time" id="time">9:41 AM</div><div class="season" id="season">EARLY SUMMER</div></div><div class="small-divider"></div><div class="day">A FRESH START<strong id="day">Day 01</strong></div></div>
<div class="welcome" id="welcome"><div class="eyebrow">NO HURRY. YOU’RE HERE.</div><h1>Take the scenic route.</h1><p>A little town. A few new friends. A day to make your own.</p></div>
<div class="bottom"><div class="controls"><span><kbd>W A S D</kbd> Move</span><span><kbd>⇧</kbd> Run</span><span><kbd>Space</kbd> Jump</span><span><kbd>↔</kbd> Drag to look</span><span><kbd>E</kbd> Interact</span><span><kbd>?</kbd> Help</span></div><div class="bag-count" title="Sunseeds collected"><span class="seed-icon">✧</span><span id="seed-count">0 / 5</span></div></div>
<div class="minimap"><canvas id="map" width="322" height="314" aria-label="Town map with your location, neighbors, and sunseeds"></canvas><span class="north">N ↑</span><div class="map-footer">THE NEIGHBORHOOD <span>YOU · ▲</span></div></div>
<div class="hint">Click the town to capture your mouse · Esc to release</div><div class="crosshair"></div><div class="prompt hidden" id="prompt"><kbd>E</kbd><span></span></div><div class="toast" id="toast" role="status"></div><div id="dialogue" class="dialogue hidden" role="dialog" aria-label="Resident conversation"></div><div id="modal" class="modal-shade hidden"></div><div class="loading" id="loading">A little fresh air is on its way…</div></main>`;
const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=$<HTMLCanvasElement>('#game');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xb8cbd8);scene.fog=new THREE.Fog(0xb8cbd8,55,135);
let renderer:THREE.WebGLRenderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});} catch {$('#loading').textContent='This town needs WebGL. Please use a browser with hardware acceleration enabled.';throw new Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const camera=new THREE.PerspectiveCamera(58,1,.1,180);
const hemi=new THREE.HemisphereLight(0xd4e9ee,0xa5aa75,2.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe1b5,3.1);sun.position.set(-22,35,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:100});sun.shadow.normalBias=.035;sun.shadow.radius=3;sun.shadow.bias=-.0001;scene.add(sun);scene.add(sun.target);
const physicalSky=new Sky();physicalSky.scale.setScalar(450);scene.add(physicalSky);
physicalSky.material.uniforms.turbidity.value=3.8;
physicalSky.material.uniforms.rayleigh.value=1.45;
physicalSky.material.uniforms.mieCoefficient.value=.0035;
physicalSky.material.uniforms.mieDirectionalG.value=.8;
let materialsLoaded=false;
const environmentReady=new Promise<void>((resolve)=>new RGBELoader().load('/textures/sky-environment.hdr',hdr=>{
 const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(hdr).texture;scene.environmentRotation.y=.4;hdr.dispose();pmrem.dispose();resolve();
},undefined,()=>resolve()));
Promise.all([assetsReady,environmentReady]).then(()=>{materialsLoaded=true;$('#loading')?.remove();});
const world=createWorld(scene);const player=person(0x73978c,0x745340,true);player.position.set(0,.13,18);player.rotation.y=Math.PI;scene.add(player);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const shadowContext=shadowCanvas.getContext('2d')!;const shadowGradient=shadowContext.createRadialGradient(32,32,2,32,32,31);shadowGradient.addColorStop(0,'rgba(30,35,25,.5)');shadowGradient.addColorStop(1,'rgba(30,35,25,0)');shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,64,64);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,opacity:.5,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
const marker=new THREE.Group();const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.18),new THREE.MeshStandardMaterial({color:0xf5d58e,emissive:0xc99c4d,emissiveIntensity:.35}));marker.add(diamond);scene.add(marker);
// A few windborne petals add movement without obscuring the town.
const petalGeo=new THREE.BufferGeometry();const petalPositions=new Float32Array(120*3);for(let i=0;i<120;i++){petalPositions[i*3]=(Math.random()-.5)*66;petalPositions[i*3+1]=Math.random()*9+1;petalPositions[i*3+2]=(Math.random()-.5)*65;}petalGeo.setAttribute('position',new THREE.BufferAttribute(petalPositions,3));const moteCanvas=document.createElement('canvas');moteCanvas.width=moteCanvas.height=32;const moteContext=moteCanvas.getContext('2d')!;const moteGradient=moteContext.createRadialGradient(16,16,0,16,16,15);moteGradient.addColorStop(0,'rgba(255,255,255,1)');moteGradient.addColorStop(.25,'rgba(255,255,255,.7)');moteGradient.addColorStop(1,'rgba(255,255,255,0)');moteContext.fillStyle=moteGradient;moteContext.fillRect(0,0,32,32);const petals=new THREE.Points(petalGeo,new THREE.PointsMaterial({map:new THREE.CanvasTexture(moteCanvas),color:0xfff0c4,size:.055,transparent:true,opacity:.65,depthWrite:false}));scene.add(petals);
const audio=new TownAudio();
type Save={version:number;seeds:number[];stage:number;minutes:number;days:number;position:number[]};
let collected=new Set<number>(),stage=0,minutes=9*60+41,days=1,saveAvailable=true;
try{const saved=JSON.parse(localStorage.getItem('willowbrook-save')||'null') as Save|null;if(saved&&saved.version===1){collected=new Set(saved.seeds.filter(n=>Number.isInteger(n)&&n>=0&&n<5));stage=Math.max(0,Math.min(4,saved.stage));minutes=saved.minutes;days=saved.days;}}catch{saveAvailable=false;}
world.seeds.forEach((s,i)=>s.visible=!collected.has(i));
const keys=new Set<string>();let yaw=.06,pitch=.27,distance=10.5,vertical=0,grounded=true,walkTime=0,elapsed=0,daylight=1,paused=false,dialogue=false,hasMoved=false,nearest: {kind:'npc';npc:Resident}|{kind:'door';door:Door}|{kind:'seed';index:number}|null=null;
let velocity=new THREE.Vector2(),dragging=false,dragTravel=0,lastX=0,lastY=0,toastTimer=0,sensitivity=.003,autoCycle=true;
const focus=new THREE.Vector3(),desired=new THREE.Vector3(),cameraRay=new THREE.Raycaster();
function resize(){const r=$('#viewport').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
function save(){try{localStorage.setItem('willowbrook-save',JSON.stringify({version:1,seeds:[...collected],stage,minutes,days,position:player.position.toArray()}));}catch{saveAvailable=false;}}
function toast(message:string){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function questUI(){
 const titles=['A warm welcome','A pocketful of sunshine','Something to share','The scenic delivery','Right where you belong'];
 const descriptions=['Every good day begins with a hello.<br>Meet your new neighbor, Mira.','Mira’s sunseeds blew across town.<br>Find five little glimmers of gold.','The garden is ready to bloom.<br>Bram has something at the bakery.','Warm bread, good company.<br>Find Theo in Willow Park.','You brought a little joy to town.<br>Stay awhile. There’s no hurry.'];
 const objectives=['Talk to Mira by the lane',collected.size===5?'Return to Mira':`Gather sunseeds · ${collected.size} / 5`,'Talk to Bram at The Honeycomb','Bring the bread to Theo','Enjoy your time in Willowbrook'];
 $('#quest-title').textContent=titles[stage];$('#quest-desc').innerHTML=descriptions[stage];$('#quest-objective').textContent=objectives[stage];$('#quest-progress').style.width=`${stage===0?0:stage===1?collected.size*20:100}%`;$('#seed-count').textContent=`${collected.size} / 5`;$('#quest-number').textContent=stage===4?'ALL 3 CHAPTERS COMPLETE':`${stage<2?'01':stage===2?'02':'03'} / 03 · ${stage<2?'GETTING SETTLED':stage===2?'A KIND GESTURE':'GOOD NEIGHBORS'}`;
}
questUI();
function release(){if(document.pointerLockElement)document.exitPointerLock();keys.clear();dragging=false;}
function closeModal(){paused=false;$('#modal').classList.add('hidden');$('#explore').classList.add('active');$('#journal').classList.remove('active');canvas.focus();}
function modal(content:string){release();paused=true;$('#modal').innerHTML=`<section class="modal" role="dialog" aria-modal="true"><button class="close" aria-label="Close">×</button>${content}</section>`;$('#modal').classList.remove('hidden');$('#modal .close').onclick=closeModal;$('#modal .close').focus();}
function openJournal(){
 modal(`<div class="eyebrow">YOUR FIELD NOTES</div><h2>Small moments,<br>good memories.</h2><div class="journal-row"><strong>${stage>=2?'✓':'○'} A pocketful of sunshine</strong>${stage===0?'Meet Mira by the lane to get started.':`Sunseeds found: ${collected.size} of 5. ${stage>=2?'Mira’s garden is ready to bloom.':'Look for gold glimmers near the park, cottages, and fountain lane.'}`}</div><div class="journal-row"><strong>${stage>=3?'✓':'○'} Something to share</strong>${stage>=2?'Visit Bram outside The Honeycomb bakery.':'Help Mira to discover your next little adventure.'}</div><div class="journal-row"><strong>${stage===4?'✓':'○'} The scenic delivery</strong>${stage>=3?'Bring Bram’s fresh loaf to Theo in Willow Park.':'Good things are better when shared.'}</div><p>In your satchel: ${collected.size} sunseeds${stage===3?' · 1 warm loaf':stage===4?' · a neighbor’s keepsake':''}.<br>${saveAvailable?'Your quest progress is saved on this browser.':'Browser storage is unavailable; progress lasts this session.'}</p><button class="primary" id="back">Back to wandering</button>`);$('#back').onclick=closeModal;$('#journal').classList.add('active');$('#explore').classList.remove('active');
}
function openHelp(){modal(`<div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>A day at your own pace.</h2><p>Follow the gold diamond to your next neighbor. Walk close to people, doors, or sunseeds and press E.</p><div class="help-grid"><span><kbd>W A S D</kbd> / arrows</span><span>Walk in the camera’s direction</span><span><kbd>Shift</kbd></span><span>Hold to run</span><span><kbd>Space</kbd></span><span>Jump over small obstacles</span><span>Mouse</span><span>Drag to orbit, or click to capture</span><span>Scroll wheel</span><span>Zoom the camera</span><span><kbd>E</kbd></span><span>Talk, collect, open / close doors</span><span><kbd>J</kbd> / <kbd>M</kbd></span><span>Field notes / toggle sound</span><span><kbd>Esc</kbd></span><span>Release mouse / close menus</span></div><button class="primary" id="back">Let’s wander</button>`);$('#back').onclick=closeModal;}
function openSettings(){modal(`<div class="eyebrow">A LITTLE ADJUSTMENT</div><h2>Find your comfort.</h2><div class="setting-row"><label for="sensitivity">Mouse sensitivity</label><input id="sensitivity" type="range" min="1" max="6" value="${sensitivity*1000}"/></div><div class="setting-row"><label for="quality">Graphics</label><select id="quality"><option value="high" ${renderer.shadowMap.enabled?'selected':''}>High · soft shadows</option><option value="low" ${!renderer.shadowMap.enabled?'selected':''}>Low · lighter rendering</option></select></div><div class="setting-row"><label for="cycle">Day / night cycle</label><input type="checkbox" id="cycle" ${autoCycle?'checked':''}/></div><div class="setting-row"><label for="daytime">Time of day</label><select id="daytime"><option value="">Choose a time…</option><option value="580">Morning</option><option value="1020">Golden hour</option><option value="1320">Night</option></select></div><p>A full town day takes 12 minutes. Pause the cycle to linger in your favorite light.</p><button class="primary" id="back">Back to town</button>`);$('#back').onclick=closeModal;$<HTMLInputElement>('#sensitivity').oninput=e=>sensitivity=Number((e.target as HTMLInputElement).value)/1000;$<HTMLSelectElement>('#quality').onchange=e=>{renderer.shadowMap.enabled=(e.target as HTMLSelectElement).value==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,renderer.shadowMap.enabled?1.75:1));scene.traverse(o=>{if(o instanceof THREE.Mesh){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.needsUpdate=true);}});};$<HTMLInputElement>('#cycle').onchange=e=>autoCycle=(e.target as HTMLInputElement).checked;$<HTMLSelectElement>('#daytime').onchange=e=>{const value=(e.target as HTMLSelectElement).value;if(value){minutes=Number(value);updateLight();save();}};}
$('#journal').onclick=openJournal;$('#quest-journal').onclick=openJournal;$('#help').onclick=openHelp;$('#settings').onclick=openSettings;$('#explore').onclick=()=>{closeDialogue();closeModal();};
function toggleSound(){audio.start();const enabled=audio.toggle();$('#sound').style.opacity=enabled?'1':'.4';$('#sound').setAttribute('aria-label',enabled?'Mute ambient sound':'Enable ambient sound');toast(enabled?'The sounds of Willowbrook are on.':'A little quiet. Ambient sound muted.');}
$('#sound').onclick=toggleSound;
function closeDialogue(){dialogue=false;$('#dialogue').classList.add('hidden');canvas.focus();}
function speak(npc:Resident){release();dialogue=true;let text='',button='See you around',action=()=>{};
 if(npc.name==='Mira'){
  if(stage===0){text='Oh, a new face! I’m Mira. A gust of wind scattered my five sunseeds around town. Would you gather those golden little things for me? There’s no rush — take the pretty way.';button='I’ll keep an eye out';action=()=>{stage=1;toast('New field note · A pocketful of sunshine');};}
  else if(stage===1&&collected.size<5)text=`You’ve found ${collected.size} of the five sunseeds! Try the cottage garden, the park paths, and both ends of the town lane. They catch the light beautifully.`;
  else if(stage===1){text='All five! You’ve made this gardener’s day. I’ll plant them before sunset. Bram at The Honeycomb was hoping to meet you — I think something lovely just came out of his oven.';button='I’ll stop by the bakery';action=()=>{stage=2;audio.chime();toast('Chapter complete · A pocketful of sunshine');};}
  else text='The garden already feels brighter with you around. Thank you for helping the little things grow.';
 }else if(npc.name==='Bram'){
  if(stage===2){text='You must be our new neighbor! Mira told me about the seeds. Here, take this warm loaf to Theo in Willow Park. He tends those trees all day and always forgets his lunch.';button='Take the warm loaf';action=()=>{stage=3;audio.chime();toast('In your satchel · One warm loaf');};}
  else text=stage>=3?'Nothing brings a town together quite like fresh bread. You’re always welcome at The Honeycomb.':'Good morning! Follow your nose and you’ll always find your way back here. Have you met Mira by the lane?';
 }else if(npc.name==='Theo'){
  if(stage===3){text='Is that Bram’s bread? What a lovely surprise. Sit for a moment and listen to the leaves. Here’s a little keepsake from the park — you’re part of Willowbrook now.';button='Share a quiet moment';action=()=>{stage=4;audio.chime();toast('All chapters complete · A place to call your own');};}
  else text=stage===4?'The bench is always here, and so am I. Some days, a little wandering is all you need.':'The trees are in their summer green. Take a walk around the pond — you might find something that sparkles.';
 }else {text={Elsie:'I’m Elsie, from the house by the fountain. Try the doors around town — everyone leaves a little room for a visitor.',Otto:'Letters, postcards, tiny good tidings. That’s my route! The lane makes a lovely loop around the square.',Pip:'My favorite time is when the lamps come on. If you stay a while, you’ll see the whole town turn gold.'}[npc.name]||'Lovely day for a walk.';}
 $('#dialogue').innerHTML=`<div class="eyebrow">${npc.role}</div><h3>${npc.name}</h3><p>${text}</p><button class="primary" id="dialogue-next">${button} <span style="opacity:.5;margin-left:9px">↵</span></button>`;$('#dialogue').classList.remove('hidden');$('#dialogue-next').onclick=()=>{action();questUI();save();closeDialogue();};$('#dialogue-next').focus();
}
function interact(){audio.start();if(paused)return;if(dialogue){$('#dialogue-next').click();return;}if(!nearest)return;
 if(nearest.kind==='npc')speak(nearest.npc);
 else if(nearest.kind==='door'){const door=nearest.door;
 if(door.open&&Math.abs(player.position.z-door.point.z+.65)<.9&&Math.abs(player.position.x-door.point.x)<1){toast('Step clear of the doorway to close it.');return;}
 door.open=!door.open;audio.tone(180,.18,.15,90);toast(`${door.open?'Opened':'Closed'} · ${door.name}`);
 }else {const i=nearest.index;collected.add(i);world.seeds[i].visible=false;audio.chime();questUI();save();toast(collected.size===5?'All five sunseeds found. Mira will be delighted!':`A little sunshine · Sunseed ${collected.size} of 5`);}
}
window.addEventListener('keydown',e=>{
 if((e.target instanceof HTMLInputElement)||(e.target instanceof HTMLSelectElement))return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!paused)e.preventDefault();
 if(e.code==='Escape'){if(dialogue)closeDialogue();else if(paused)closeModal();release();return;}
 if(e.repeat)return;
 if(e.code==='KeyJ'){paused?closeModal():openJournal();return;}if(e.code==='KeyM'){toggleSound();return;}if(e.code==='Slash'){openHelp();return;}
 if(e.code==='KeyE'){interact();return;}if(e.code==='Enter'&&dialogue){$('#dialogue-next').click();return;}
 if(paused||dialogue)return;keys.add(e.code);audio.start();
 if(e.code==='Space'&&grounded){vertical=6.8;grounded=false;audio.tone(220,.15,.04,380);}
});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;});document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden){audio.context?.suspend();save();}else if(audio.context)void audio.context.resume();});
canvas.addEventListener('pointerdown',e=>{if(paused||dialogue)return;audio.start();dragging=true;dragTravel=0;lastX=e.clientX;lastY=e.clientY;canvas.focus();});
window.addEventListener('pointermove',e=>{if(paused||dialogue)return;const locked=document.pointerLockElement===canvas;if(!dragging&&!locked)return;const dx=locked?e.movementX:e.clientX-lastX,dy=locked?e.movementY:e.clientY-lastY;dragTravel+=Math.abs(dx)+Math.abs(dy);lastX=e.clientX;lastY=e.clientY;yaw-=dx*sensitivity;pitch=THREE.MathUtils.clamp(pitch+dy*sensitivity,.12,1.15);});
window.addEventListener('pointerup',()=>{dragging=false;});
canvas.addEventListener('click',()=>{if(dragTravel<4&&!paused&&!dialogue&&!document.pointerLockElement){try{const result=canvas.requestPointerLock() as unknown as Promise<void>|undefined;result?.catch(()=>toast('Drag the mouse to look around.'));}catch{toast('Drag the mouse to look around.');}}});
document.addEventListener('pointerlockerror',()=>toast('Drag the mouse to look around.'));
document.addEventListener('pointerlockchange',()=>{$('#viewport').classList.toggle('locked',document.pointerLockElement===canvas);keys.clear();});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.012,5,19);},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
function blocked(x:number,z:number){const radius=.34;return world.colliders.some(b=>{if(b.enabled&&!b.enabled())return false;if(player.position.y>b.top+.08)return false;const cx=THREE.MathUtils.clamp(x,b.x-b.w/2,b.x+b.w/2),cz=THREE.MathUtils.clamp(z,b.z-b.d/2,b.z+b.d/2);return (x-cx)**2+(z-cz)**2<radius*radius;});}
function updateMovement(dt:number){
 let x=0,z=0;if(!paused&&!dialogue){x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));}
 const len=Math.hypot(x,z)||1;const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?6.7:3.7;
 const tx=(x*Math.cos(yaw)+z*Math.sin(yaw))/len*speed,tz=(-x*Math.sin(yaw)+z*Math.cos(yaw))/len*speed;
 velocity.lerp(new THREE.Vector2(tx,tz),1-Math.exp(-dt*14));
 const nx=THREE.MathUtils.clamp(player.position.x+velocity.x*dt,-35,35),nz=THREE.MathUtils.clamp(player.position.z+velocity.y*dt,-35,34);
 if(!blocked(nx,player.position.z))player.position.x=nx;if(!blocked(player.position.x,nz))player.position.z=nz;
 if(!grounded){vertical-=18*dt;const nextY=player.position.y+vertical*dt;let floor=.13;
 if(vertical<0){for(const b of world.colliders){if(b.enabled&&!b.enabled())continue;if(Math.abs(player.position.x-b.x)<b.w/2+.2&&Math.abs(player.position.z-b.z)<b.d/2+.2&&player.position.y>=b.top&&nextY<=b.top)floor=Math.max(floor,b.top+.09);}}
 player.position.y=Math.max(floor,nextY);if(player.position.y<=floor){vertical=0;grounded=true;}}
 else {let supported=player.position.y<=.14;if(!supported)supported=world.colliders.some(b=>(!b.enabled||b.enabled())&&Math.abs(player.position.x-b.x)<b.w/2+.25&&Math.abs(player.position.z-b.z)<b.d/2+.25&&Math.abs(player.position.y-b.top-.09)<.15);if(!supported){grounded=false;vertical=0;}}
 const moving=velocity.length()>.15;if(moving){walkTime+=dt*(speed>4?1.5:1);const angle=Math.atan2(velocity.x,velocity.y);player.rotation.y+=Math.atan2(Math.sin(angle-player.rotation.y),Math.cos(angle-player.rotation.y))*(1-Math.exp(-dt*15));if(!hasMoved){hasMoved=true;$('#welcome').style.opacity='0';}}
 animatePerson(player,walkTime,moving&&grounded?Math.min(1,velocity.length()/3):0);shadow.position.set(player.position.x,.105,player.position.z);shadow.scale.setScalar(Math.max(.5,1-player.position.y*.08));
 audio.update(dt,daylight,moving&&grounded,walkTime);
}
function updateCamera(dt:number,instant=false){
 focus.copy(player.position).y+=1.25;desired.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance).add(focus);
 // Keep the camera outside solid buildings and close enough to see indoor rooms.
 const rayDirection=desired.clone().sub(focus);const rayLength=rayDirection.length();cameraRay.set(focus,rayDirection.normalize());let safe=rayLength;let roomBuilding:(typeof world.buildings)[number]|undefined;
 for(const b of world.buildings){if(Math.abs(player.position.x-b.x)<b.w/2&&Math.abs(player.position.z-b.z)<b.d/2){b.roof.visible=false;roomBuilding=b;continue;}b.roof.visible=true;
 const bounds=new THREE.Box3(new THREE.Vector3(b.x-b.w/2-.2,0,b.z-b.d/2-.2),new THREE.Vector3(b.x+b.w/2+.2,7.5,b.z+b.d/2+.2));const hit=cameraRay.ray.intersectBox(bounds,new THREE.Vector3());if(hit)safe=Math.min(safe,Math.max(1.2,hit.distanceTo(focus)-.35));}
 if(roomBuilding){const b=roomBuilding;desired.set(THREE.MathUtils.clamp(focus.x+Math.sin(yaw)*1.7,b.x-b.w/2+.45,b.x+b.w/2-.45),focus.y+5.2,THREE.MathUtils.clamp(focus.z+Math.cos(yaw)*1.7,b.z-b.d/2+.45,b.z+b.d/2-.45));}else desired.copy(focus).addScaledVector(rayDirection,safe);desired.y=Math.max(.5,desired.y);camera.position.lerp(desired,instant?1:1-Math.exp(-dt*9));camera.lookAt(focus);
}
function updateNearby(){nearest=null;let best=2.6;
 for(let i=0;i<world.seeds.length;i++){if(collected.has(i))continue;const dist=player.position.distanceTo(world.seeds[i].position);if(dist<1.8&&dist<best){nearest={kind:'seed',index:i};best=dist;}}
 for(const npc of world.residents){const dist=player.position.distanceTo(npc.model.position);if(dist<best){nearest={kind:'npc',npc};best=dist;}}
 for(const door of world.doors){const dist=player.position.distanceTo(door.point);if(dist<2.25&&dist<best){nearest={kind:'door',door};best=dist;}}
 $('#prompt').classList.toggle('hidden',!nearest||paused||dialogue);if(nearest)$('#prompt span').textContent=nearest.kind==='npc'?`Talk to ${nearest.npc.name}`:nearest.kind==='seed'?'Pick up sunseed':`${nearest.door.open?'Close':'Open'} ${nearest.door.name}`;
 const target=world.residents.find(n=>n.name===(stage<2?'Mira':stage===2?'Bram':'Theo'))!;marker.visible=stage!==4;marker.position.copy(target.model.position).y+=2.9+Math.sin(elapsed*2)*.13;marker.rotation.y=elapsed;
 $('#district').textContent=player.position.x>8&&player.position.z>14?'WILLOW PARK':player.position.z<-10?'MARKET LANE':world.buildings.find(b=>Math.abs(player.position.x-b.x)<b.w/2&&Math.abs(player.position.z-b.z)<b.d/2)?.name.toUpperCase()||'TOWN COMMONS';
}
function updateLight(){const hour=minutes/60;daylight=THREE.MathUtils.smoothstep(Math.sin((hour-6)/24*Math.PI*2),-.15,.5);const sky=new THREE.Color(0x172d48).lerp(new THREE.Color(0xb8cbd8),daylight);const golden=Math.max(0,1-Math.abs(hour-17.7)/2.1)*daylight;sky.lerp(new THREE.Color(0xe6baa0),golden*.45);(scene.background as THREE.Color).copy(sky);(scene.fog as THREE.Fog).color.copy(sky);hemi.intensity=.32+daylight*.49;sun.intensity=.16+daylight*3.02;scene.environmentIntensity=.14+daylight*.54;physicalSky.visible=daylight>.05;physicalSky.material.uniforms.sunPosition.value.set(Math.cos(hour/24*Math.PI*2)*-25,Math.sin((hour-6)/24*Math.PI*2)*35,20);sun.color.set(0xffedda).lerp(new THREE.Color(0xffb075),golden*.65);sun.position.set(-25*Math.cos(hour/24*Math.PI*2),Math.max(6,12+Math.sin((hour-6)/24*Math.PI*2)*25),20);world.windowMat.emissiveIntensity=.025+(1-daylight)*1.8;world.lamps.forEach(l=>{l.intensity=(1-daylight)*35;l.visible=renderer.shadowMap.enabled&&daylight<.5&&l.position.distanceTo(player.position)<20;});$('#sun').textContent=daylight>.4?'☀':'☾';const h=Math.floor(minutes/60);$('#time').textContent=`${h%12||12}:${String(Math.floor(minutes%60)).padStart(2,'0')} ${h<12?'AM':'PM'}`;$('#day').textContent=`Day ${String(days).padStart(2,'0')}`;}
const map=$<HTMLCanvasElement>('#map').getContext('2d')!;
function drawMap(){const ctx=map;ctx.clearRect(0,0,322,314);ctx.fillStyle='#d9dfbd';ctx.fillRect(0,0,322,314);const X=(x:number)=>161+x*4.1,Y=(z:number)=>157+z*4.1;
 ctx.fillStyle='#eee4cb';ctx.fillRect(X(-4.5),7,37,302);ctx.fillRect(18,Y(-4),280,33);ctx.beginPath();ctx.arc(X(0),Y(-7),28,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9fbd94';ctx.fillRect(X(9),Y(15),79,65);ctx.fillStyle='#a2c6bf';ctx.beginPath();ctx.ellipse(X(24),Y(25),12,10,0,0,7);ctx.fill();
 for(const b of world.buildings){ctx.fillStyle='#b49072';ctx.fillRect(X(b.x-b.w/2),Y(b.z-b.d/2),b.w*4.1,b.d*4.1);ctx.fillStyle='#d0ad89';ctx.fillRect(X(b.x-b.w/2)+2,Y(b.z-b.d/2)+2,b.w*4.1-4,b.d*4.1-4);}
 ctx.fillStyle='#8abbb8';ctx.beginPath();ctx.arc(X(0),Y(-7),8,0,7);ctx.fill();
 for(const [i,s]of world.seeds.entries()){if(collected.has(i))continue;ctx.fillStyle='#b88d3e';ctx.save();ctx.translate(X(s.position.x),Y(s.position.z));ctx.rotate(Math.PI/4);ctx.fillRect(-2.8,-2.8,5.6,5.6);ctx.restore();}
 for(const n of world.residents){ctx.fillStyle='#f7f1dd';ctx.beginPath();ctx.arc(X(n.model.position.x),Y(n.model.position.z),3.5,0,7);ctx.fill();}
 if(stage!==4){ctx.strokeStyle='#ac8239';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(X(marker.position.x),Y(marker.position.z),6,0,7);ctx.stroke();}
 ctx.save();ctx.translate(X(player.position.x),Y(player.position.z));ctx.rotate(-player.rotation.y);ctx.fillStyle='#345f4a';ctx.strokeStyle='#fffae6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(-6,-5);ctx.lineTo(0,-2);ctx.lineTo(6,-5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
let last=performance.now(),lastUI=0,saveTime=0;
function frame(now:number){requestAnimationFrame(frame);const dt=THREE.MathUtils.clamp((now-last)/1000,0,.15);last=now;if(document.hidden)return;
 if(!paused&&!dialogue){elapsed+=dt;const steps=Math.max(1,Math.ceil(dt/.025));for(let step=0;step<steps;step++)updateMovement(dt/steps);if(autoCycle){minutes+=dt*2;if(minutes>=1440){minutes-=1440;days++;}}
 world.residents.forEach(n=>{if(n.roaming){const old=n.model.position.clone();n.model.position.x=n.origin.x+Math.sin(elapsed*.23+n.phase)*.7;n.model.position.z=n.origin.z+Math.sin(elapsed*.17+n.phase)*2.4;const delta=n.model.position.clone().sub(old);n.model.rotation.y=Math.atan2(delta.x,delta.z);animatePerson(n.model,elapsed,.3);}else n.model.rotation.y=Math.sin(elapsed*.2+n.phase)*.15;});
 wind.value=elapsed;world.waterMat.normalMap!.offset.set(elapsed*.015,elapsed*.009);
 world.seeds.forEach((s,i)=>{s.position.y=.95+Math.sin(elapsed*2+i)*.15;s.rotation.y=elapsed*.8;});
 for(let i=0;i<120;i++){petalPositions[i*3]+=.18*dt;petalPositions[i*3+1]-=.09*dt;if(petalPositions[i*3]>35)petalPositions[i*3]=-35;if(petalPositions[i*3+1]<.3)petalPositions[i*3+1]=9;}petalGeo.attributes.position.needsUpdate=true;
 world.drops.children.forEach((d,i)=>{const t=(elapsed*1.1+i*.13)%1;const a=d.userData.phase;const r=d.userData.radius;d.position.set(Math.cos(a)*r*t,2.12+Math.sin(t*Math.PI)*.5-t*1.35,-7+Math.sin(a)*r*t);});
 }
 world.doors.forEach(d=>{d.angle=THREE.MathUtils.damp(d.angle,d.open?Math.PI/2:0,8,dt);d.pivot.rotation.y=d.angle;});updateCamera(dt);
 if(now-lastUI>100){updateLight();updateNearby();drawMap();lastUI=now;}if(now-saveTime>8000){save();saveTime=now;}
 renderer.render(scene,camera);
}
updateLight();updateCamera(0,true);drawMap();requestAnimationFrame(frame);
// Read-only runtime diagnostics are useful for QA without exposing mutation hooks in production.
const diagnostics=()=>({assetsReady:materialsLoaded,cameraDistance:camera.position.distanceTo(focus),position:player.position.toArray(),yaw,pitch,distance,grounded,stage,seeds:[...collected],minutes,daylight,paused,dialogue,audio:{enabled:audio.enabled,state:audio.context?.state??'not-started'},nearby:nearest?.kind==='npc'?nearest.npc.name:nearest?.kind==='door'?nearest.door.name:nearest?.kind??null,doors:world.doors.map(d=>({name:d.name,open:d.open,x:d.point.x,z:d.point.z})),roofs:world.buildings.map(b=>({name:b.name,visible:b.roof.visible})),npcs:world.residents.map(n=>({name:n.name,position:n.model.position.toArray()})),render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}});
Object.defineProperty(window,'__town',{value:{state:diagnostics,...(new URLSearchParams(location.search).has('test')?{teleport:(x:number,z:number)=>{player.position.set(x,.13,z);velocity.set(0,0);vertical=0;grounded=true;updateCamera(0,true);updateNearby();},setCamera:(y:number,p=.47)=>{yaw=y;pitch=p;updateCamera(0,true);}}:{})},writable:false});
