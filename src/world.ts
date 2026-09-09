import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Box = { x: number; z: number; w: number; d: number; top: number; enabled?: () => boolean };
export type Door = { name: string; pivot: THREE.Group; point: THREE.Vector3; open: boolean; angle: number };
export type Resident = { name: string; role: string; model: THREE.Group; origin: THREE.Vector3; phase: number; roaming: boolean };
export type Building = { name: string; x: number; z: number; w: number; d: number; roof: THREE.Group };
const mats = new Map<string, THREE.MeshStandardMaterial>();
export function material(color: string | number) {
  const key = String(color); if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: .88, flatShading: true }));
  return mats.get(key)!;
}
export function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, color: string | number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material(color)); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cylinder(parent: THREE.Object3D, rt: number, rb: number, h: number, x: number,y: number,z: number,color: string | number, segments=10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material(color)); m.position.set(x,y,z); m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function blob(parent: THREE.Object3D,x:number,y:number,z:number,r:number,color:string|number,detail=0) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r,detail),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function sign(text: string, color='#fff2d4', background='#305647', width=3.5, height=.65) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=background;ctx.fillRect(0,0,512,128);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(9,9,494,110);
  ctx.fillStyle=color;ctx.font='bold 46px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65,460);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
}
export function person(coat: number, hair=0x573e31, hat=false) {
  const g=new THREE.Group();
  const legs=new THREE.Group();legs.name='legs';g.add(legs);
  for(const x of [-.18,.18]) {const limb=new THREE.Group();limb.position.set(x,.7,0); box(limb,.24,.58,.28,0,-.27,0,0x3d5655);box(limb,.27,.17,.4,0,-.58,.07,0x554339);legs.add(limb);}
  const body=cylinder(g,.34,.4,.7,0,1.03,0,coat,8);body.name='body';
  blob(g,0,1.68,0,.34,0xeec5a0,1);blob(g,0,1.88,-.04,.32,hair,1);
  for(const x of [-.115,.115]) box(g,.055,.065,.05,x,1.73,.302,0x353f36);
  for(const x of [-.44,.44]){const arm=new THREE.Group();arm.position.set(x,1.28,0);box(arm,.19,.46,.22,0,-.16,0,coat);blob(arm,0,-.43,0,.12,0xeec5a0);arm.name='arm';g.add(arm);}
  if(hat) {cylinder(g,.49,.49,.08,0,1.98,0,0xe6c78b,12);cylinder(g,.29,.35,.26,0,2.11,0,0xe6c78b,10);cylinder(g,.354,.354,.07,0,2.01,0,0x976b49,10);box(g,.43,.52,.23,0,1.06,-.35,0xba774d);box(g,.3,.2,.05,0,1.04,-.49,0xdbab75);}
  return g;
}
export function animatePerson(g:THREE.Group, time:number, speed:number) {
  const legs=g.getObjectByName('legs')!;legs.children.forEach((l,i)=>l.rotation.x=Math.sin(time*9+i*Math.PI)*.62*speed);
  let i=0;g.children.filter(c=>c.name==='arm').forEach(a=>{a.rotation.x=Math.sin(time*9+i++*Math.PI)*.5*speed;});
}
export function createWorld(scene: THREE.Scene) {
 const terrain=new THREE.Group();scene.add(terrain);
 const colliders: Box[]=[];const doors:Door[]=[];const residents:Resident[]=[];const buildings:Building[]=[];const lamps:THREE.PointLight[]=[];
 const windowMat=new THREE.MeshStandardMaterial({color:0xa9d1c6,emissive:0xffb766,emissiveIntensity:.1,roughness:.4});
 const random=(()=>{let s=17;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();
 const addCollider=(x:number,z:number,w:number,d:number,top=3)=>colliders.push({x,z,w,d,top});
 box(terrain,160,1,160,0,-.57,0,0x8fac6a);
 // A compact town framed by a winding river and distant hills.
 box(terrain,78,.1,82,0,-.06,0,0xa7be7b);
 const waterMat=new THREE.MeshStandardMaterial({color:0x71bfc5,roughness:.3,metalness:.15,transparent:true,opacity:.92});
 const river=new THREE.Mesh(new THREE.PlaneGeometry(14,155),waterMat);river.rotation.x=-Math.PI/2;river.position.set(45,-.01,0);terrain.add(river);
 box(terrain,.8,.3,90,37.3,.04,0,0xd1d4a2);addCollider(38,0,1,90,6);
 for(let i=0;i<20;i++){const angle=i/20*Math.PI*2;const r=70+random()*13;const hill=blob(terrain,Math.sin(angle)*r,0,Math.cos(angle)*r,13+random()*12,[0x96b995,0x7fa78c,0xa8bf91][i%3],1);hill.scale.y=.55;}
 box(terrain,9,.1,73,0,.02,0,0xc5b59a);box(terrain,66,.1,8,0,.022,0,0xc5b59a);
 box(terrain,12,.08,71,0,-.005,0,0xe4d4b4);box(terrain,67,.08,11,0,-.003,0,0xe4d4b4);
 // Inlaid paving stones, each slightly varied in color.
 for(let i=0;i<260;i++){const x=(random()-.5)*8.3,z=(random()-.5)*70;box(terrain,.5+random()*.5,.018,.3+random()*.3,x,.083,z,[0xcfbfa4,0xbdad95,0xd5c7ac][i%3]);}
 for(let i=0;i<150;i++){const x=(random()-.5)*64,z=(random()-.5)*7.5;box(terrain,.5+random()*.5,.02,.35,x,.085,z,0xd2c3a8);}
 // The fountain square.
 cylinder(terrain,7,7,.15,0,.1,-7,0xe5d5b5,32);
 cylinder(terrain,2.35,2.45,.55,0,.35,-7,0xa9aa93,20);cylinder(terrain,2.08,2.08,.08,0,.66,-7,0x6bbcc0,24);
 cylinder(terrain,.5,.7,1.5,0,1.15,-7,0xc5bba0,10);cylinder(terrain,1.25,.7,.25,0,1.95,-7,0xd8cfb3,16);cylinder(terrain,1.11,1.11,.05,0,2.08,-7,0x80c9cf,16);
 cylinder(terrain,.18,.27,.7,0,2.3,-7,0xcac5a6);blob(terrain,0,2.75,-7,.27,0xe2c587,1);addCollider(0,-7,4.7,4.7,1.3);
 const drops=new THREE.Group();scene.add(drops);for(let i=0;i<28;i++){const d=blob(drops,0,0,0,.048,0xc2eff0);d.userData.phase=random()*Math.PI*2;d.userData.radius=.6+random()*.7;}
 function tree(x:number,z:number,size=1,pink=false){
  cylinder(terrain,.15*size,.24*size,2.3*size,x,1.15*size,z,0x856b48,7);
  const colors=pink?[0xdfa39f,0xe8b6a9,0xc99294]:[0x719952,0x86a95e,0x96b871];
  blob(terrain,x,3.15*size,z,1.65*size,colors[0],1);blob(terrain,x-.8*size,2.9*size,z+.45*size,1.15*size,colors[1],1);blob(terrain,x+.8*size,3.25*size,z-.3*size,1.2*size,colors[2],1);addCollider(x,z,.5*size,.5*size,2);
 }
 function flowers(x:number,z:number,w=2){box(terrain,w,.25,.85,x,.16,z,0xb79571);box(terrain,w-.16,.05,.7,x,.3,z,0x665d3c);for(let i=0;i<9;i++){const fx=x+(random()-.5)*(w-.2),fz=z+(random()-.5)*.55;cylinder(terrain,.025,.025,.3,fx,.44,fz,0x698149,5);blob(terrain,fx,.64+random()*.1,fz,.13,[0xf2ce79,0xe69c83,0xf4e1b7][i%3]);}}
 function bench(x:number,z:number,rotation=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;terrain.add(g);for(let i=0;i<3;i++)box(g,2.2,.12,.16,0,.65,(i-1)*.2,0x997450);for(let i=0;i<2;i++)box(g,2.2,.18,.1,0,1.04+i*.24,-.28,0xb18b5c);for(const x of [-.85,.85]){box(g,.12,.62,.55,x,.32,0,0x4c6355);box(g,.12,.6,.12,x,.95,-.28,0x4c6355);}addCollider(x,z,2.4,.9,1.4);}
 function lamp(x:number,z:number){cylinder(terrain,.075,.13,3.4,x,1.7,z,0x405b50,8);box(terrain,.48,.65,.48,x,3.5,z,0x405b50);const lightBox=box(terrain,.37,.47,.37,x,3.5,z,0xf8e4ad);lightBox.material=new THREE.MeshStandardMaterial({color:0xffdeb0,emissive:0xffc46a,emissiveIntensity:.6});cylinder(terrain,0,.43,.35,x,4,z,0x405b50,4);const light=new THREE.PointLight(0xffc47f,0,9,2);light.position.set(x,3.4,z);scene.add(light);lamps.push(light);addCollider(x,z,.3,.3);}
 function house(x:number,z:number,w:number,d:number,color:number,roofColor:number,name:string,shop=false){
  const h=shop?5.2:4.5;const front=z+d/2;
  box(terrain,w+.5,.2,d+.5,x,.12,z,0xc6bda4);
  box(terrain,w,h,.25,x,h/2,z-d/2,color);addCollider(x,z-d/2,w,.3,h);
  for(const side of [-1,1]){box(terrain,.25,h,d,x+side*w/2,h/2,z,color);addCollider(x+side*w/2,z,.3,d,h);box(terrain,(w-1.5)/2,h,.25,x+side*(w/4+.375),h/2,front,color);addCollider(x+side*(w/4+.375),front,(w-1.5)/2,.35,h);}
  box(terrain,1.5,h-2.4,.25,x,(h+2.4)/2,front,color);
  // Windows and timber trim on both side facades.
  for(const side of [-1,1]) for(const zz of [-d*.24,d*.24]) for(const yy of [1.7,3.65]) {
    box(terrain,.13,1.2,1.2,x+side*(w/2+.1),yy,z+zz,0xf5e1bd);
    const sideWindow=box(terrain,.14,.96,.96,x+side*(w/2+.18),yy,z+zz,0xa9d1c6);sideWindow.material=windowMat;
    box(terrain,.05,.96,.07,x+side*(w/2+.26),yy,z+zz,0xf5e1bd);
    box(terrain,.05,.07,.96,x+side*(w/2+.26),yy,z+zz,0xf5e1bd);
  }
  box(terrain,w+.15,.2,.35,x,.38,front+.13,0xc4ac88);
  box(terrain,2,.035,1.8,x,.085,front+1,0xdac7a6);
  box(terrain,w+.18,.18,.35,x,2.9,front+.08,0xf5e1b5);
  for(const side of [-1,1])box(terrain,.2,h,.25,x+side*(w/2-.2),h/2,front+.18,0xf3dcaf);
  box(terrain,w-.4,.05,d-.4,x,.25,z,0xbe9c77);box(terrain,2.6,.03,2.4,x,.285,z,0xc47859);
  // A little furnished room is revealed when you enter.
  box(terrain,2.4,.15,.9,x,1.2,z-1,0x9b7652);for(const dx of [-1,1])box(terrain,.14,1,.6,x+dx,.65,z-1,0x795b40);
  box(terrain,1.4,1.8,.45,x-w/2+.9,1.12,z-d/2+.6,0x866a4b);
  for(let i=0;i<5;i++)box(terrain,.16,.4,.25,x-w/2+.4+i*.22,1.6,z-d/2+.85,[0xd1ac72,0x789e94,0xc78269][i%3]);
  addCollider(x,z-1,2.4,.9,1.3);addCollider(x-w/2+.9,z-d/2+.6,1.4,.6,2);
  const roof=new THREE.Group();scene.add(roof);
  // Custom gabled prism, ridge along the depth of the house.
  const geom=new THREE.BufferGeometry();const a=w/2+.6,b=d/2+.6,hh=2.3;
  const pts=[-a,0,b,a,0,b,0,hh,b, a,0,-b,-a,0,-b,0,hh,-b, -a,0,-b,-a,0,b,0,hh,b, -a,0,-b,0,hh,b,0,hh,-b, a,0,b,a,0,-b,0,hh,-b, a,0,b,0,hh,-b,0,hh,b];geom.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geom.computeVertexNormals();const rm=new THREE.Mesh(geom,material(roofColor));rm.position.set(x,h,z);rm.castShadow=true;rm.receiveShadow=true;roof.add(rm);
  // Ridge caps and a chimney make the silhouette legible from the street.
  box(roof,.25,.22,d+1.3,x,h+hh,z,0xc38461);box(roof,.7,1.8,.75,x+w*.27,h+1.4,z-.8,0xd6b08c);box(roof,.9,.16,.95,x+w*.27,h+2.3,z-.8,0xf0d6ae);
  buildings.push({name,x,z,w,d,roof});
  for(const side of [-1,1]){const wx=x+side*w*.3;for(const y of [1.65,3.85]){box(terrain,1.35,1.35,.13,wx,y,front+.2,0xf7e6c5);const win=box(terrain,1.12,1.12,.14,wx,y,front+.29,0xa9d1c6);win.material=windowMat;box(terrain,.07,1.12,.05,wx,y,front+.38,0xf7e6c5);box(terrain,1.12,.07,.05,wx,y,front+.38,0xf7e6c5);for(const s of [-1,1])box(terrain,.25,1.35,.15,wx+s*.83,y,front+.2,shop?0x587f6a:0x879770);}
  flowers(wx,front+.55,1.6);}
  const pivot=new THREE.Group();pivot.position.set(x-.7,0,front+.18);scene.add(pivot);box(pivot,1.4,2.35,.16,.7,1.2,0,0x527864);box(pivot,1.04,.85,.06,.7,1.65,.1,0x8db4a3);blob(pivot,1.16,1,.14,.075,0xdfbf77,1);
  const door:Door={name,pivot,point:new THREE.Vector3(x,0,front+.65),open:false,angle:0};doors.push(door);colliders.push({x,z:front,w:1.5,d:.3,top:2.5,enabled:()=>!door.open});
  // The opened door still has a physical footprint along the inside wall.
  colliders.push({x:x-.7,z:front-.7,w:.2,d:1.4,top:2.5,enabled:()=>door.open});
  if(shop){for(let i=0;i<10;i++){const aw=box(terrain,w/10,.13,1.4,x-w/2+(i+.5)*w/10,2.95,front+.7,i%2===0?0xf3e0ba:roofColor);aw.rotation.x=.14;box(terrain,w/10,.3,.1,x-w/2+(i+.5)*w/10,2.7,front+1.4,i%2===0?0xf3e0ba:roofColor);}const s=sign(name,'#fff0cd','#35594b',w*.73,.58);s.position.set(x,3.36,front+.26);terrain.add(s);}
 }
 house(-12,-16,7,6,0xe3bc86,0xa86249,'The Honeycomb',true);
 house(12,-16,7,6,0xd6b7a0,0x708780,'Fern & Fable',true);
 house(-13,6,7,6,0xebd5a8,0xb96d50,'Mira’s cottage');
 house(13,6,7,6,0xd7b999,0xb57858,'The little post',true);
 house(-23,-9,6,5,0xcfbca0,0x778f76,'Rose cottage');
 house(23,-9,6,5,0xe5c695,0xb77058,'Juniper house');
 house(-13,-28,7,5,0xe1c6a2,0xa66851,'Orchard house');
 house(12,-28,6,5,0xcbd0b1,0xb66f53,'Ivy cottage');
 // Park with gravel paths, pond, flowers, benches, and a little pavilion.
 box(terrain,18,.05,15,18,.04,22,0x91ae6b);box(terrain,16,.035,2,18,.085,21,0xd7c6a4);box(terrain,2,.035,15,17,.085,22,0xd7c6a4);
 cylinder(terrain,3.2,3.4,.2,24,.13,25,0xc0c49b,20);const pond=new THREE.Mesh(new THREE.CylinderGeometry(3,3,.05,24),waterMat);pond.position.set(24,.25,25);terrain.add(pond);addCollider(24,25,6,6,.5);
 for(let i=0;i<6;i++){const a=random()*6.28;const leaf=cylinder(terrain,.3,.3,.04,24+Math.cos(a)*2,.29,25+Math.sin(a)*2,0x669762,7);leaf.rotation.z=.02;}
 bench(13,18,Math.PI);bench(20,29);bench(-5,-8,-Math.PI/2);bench(5,-8,Math.PI/2);bench(-9,19);
 for(const p of [[9,16],[10,29],[28,16],[29,30],[20,15],[-9,14],[-21,15],[-24,23],[-18,28],[-7,-23],[6,-25],[-27,-21],[29,-23],[-29,1],[29,3]])tree(p[0],p[1],.9+random()*.4,p[0]<-18);
 for(let i=0;i<44;i++){const side=i%2===0?-1:1;tree(side*(32+random()*4),-35+random()*70,.7+random()*.7,i%7===0);}
 for(const p of [[-5,10],[5,10],[-5,-18],[5,-18],[-5,25],[7,0],[22,0],[-22,0],[18,18]])lamp(...p as [number,number]);
 for(const p of [[-7,16],[-17,11],[9,11],[14,28],[-7,-13],[7,-13]])flowers(p[0],p[1],2.2);
 // Garden fences.
 for(const [x,z,w] of [[-20,27,13],[18,31,18],[-24,12,8]] ) {for(let i=0;i<=w;i++)box(terrain,.12,.95,.14,x+i-w/2,.48,z,0xeee2bf);box(terrain,w,.12,.1,x,.38,z,0xf1e5c4);box(terrain,w,.12,.1,x,.76,z,0xf1e5c4);addCollider(x,z,w,.2,1);}
 const parkSign=sign('WILLOW PARK','#f4e8c9','#57725a',2.4,.5);parkSign.position.set(11,1.6,15);terrain.add(parkSign);cylinder(terrain,.07,.09,1.5,11,.75,15,0x795d3f);
 const townSign=sign('Willowbrook','#f5e5bc','#3d5d4c',3.4,.8);townSign.position.set(-5,2,27);townSign.rotation.y=.25;terrain.add(townSign);for(const x of [-6.25,-3.75])cylinder(terrain,.09,.11,2,x,1,27,0x7c6246);
 // Bunting strung between the shops.
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-8,4.4,-11),new THREE.Vector3(0,3.6,-11),new THREE.Vector3(8,4.4,-11)]);const rope=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.025,4,false),material(0x7d7055));terrain.add(rope);
 for(let i=0;i<15;i++){const p=curve.getPoint((i+.5)/15);const flag=new THREE.Mesh(new THREE.ConeGeometry(.23,.48,3),material([0xcd8667,0xe4c26f,0x7da799][i%3]));flag.rotation.z=Math.PI;flag.position.copy(p).y-=.2;terrain.add(flag);}
 // Grass and wildflowers around the town edges.
 for(let i=0;i<300;i++){const x=(random()-.5)*65,z=(random()-.5)*68;if(Math.abs(x)<7||Math.abs(z)<6||buildings.some(b=>Math.abs(x-b.x)<b.w/2+1&&Math.abs(z-b.z)<b.d/2+2))continue;const tuft=new THREE.Mesh(new THREE.ConeGeometry(.13,.35,3),material(i%4===0?0xd8cc8b:0x819e5e));tuft.position.set(x,.2,z);terrain.add(tuft);}
 function npc(name:string,role:string,x:number,z:number,coat:number,roaming=false){const model=person(coat,name==='Mira'?0xb87545:0x67554a);model.position.set(x,.13,z);scene.add(model);const r={name,role,model,origin:model.position.clone(),phase:random()*6.28,roaming};residents.push(r);return r;}
 npc('Mira','THE GARDENER',-4,12,0xbe795d);npc('Bram','THE BAKER',-9,-10,0xe1c18e);npc('Theo','THE PARK KEEPER',16,23,0x6f9176);npc('Elsie','YOUR NEW NEIGHBOR',4,-2,0xc099b4,true);npc('Otto','THE POSTMAN',-4,-23,0x7595a3,true);npc('Pip','AN AFTERNOON WANDERER',8,20,0xd5ae62,true);
 const seeds:THREE.Group[]=[];const seedPositions=[[-6,18],[7,-12],[-22,19],[21,18],[4,-28]];
 seedPositions.forEach(([x,z],i)=>{const g=new THREE.Group();g.position.set(x,.95,z);const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.26),new THREE.MeshStandardMaterial({color:0xffd87c,emissive:0xffbe55,emissiveIntensity:.55,metalness:.25,roughness:.3}));g.add(gem);const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.025,5,24),material(0xf6dda0));ring.rotation.x=Math.PI/2;g.add(ring);scene.add(g);g.userData.id=i;seeds.push(g);});
 // Merge stationary meshes by material to keep the town inexpensive to render.
 terrain.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();const remove:THREE.Mesh[]=[];
 terrain.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);const list=batches.get(o.material)||[];list.push(geo);batches.set(o.material,list);remove.push(o);}});
 remove.forEach(m=>m.removeFromParent());for(const [mat,geos] of batches){const merged=mergeGeometries(geos,false);if(merged){const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;terrain.add(mesh);}geos.forEach(g=>g.dispose());}
 return {colliders,doors,residents,buildings,lamps,seeds,windowMat,drops,waterMat};
}
