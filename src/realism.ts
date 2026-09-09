import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const pending: Promise<void>[] = [];
function texture(name: string, color = false) {
  let done: () => void;
  pending.push(new Promise<void>(resolve => { done = resolve; }));
  const t = loader.load(`/textures/${name}.jpg`, () => done(), undefined, () => done());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const surfaces = Object.fromEntries(['paving','plaster','roof','wood','grass','bark'].map(name => [name, {
  map: texture(`${name}-color`, true),
  normalMap: texture(`${name}-normal`),
  roughnessMap: texture(`${name}-roughness`),
}])) as Record<string, { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture }>;
export const assetsReady = Promise.all(pending);
const palettes: Record<string, number[]> = {
  plaster: [0xe3bc86,0xd6b7a0,0xebd5a8,0xd7b999,0xcfbca0,0xe5c695,0xe1c6a2,0xcbd0b1],
  paving: [0xc5b59a,0xe4d4b4,0xe5d5b5,0xc6bda4,0xa9aa93,0xc5bba0,0xd8cfb3,0xcac5a6,0xc4ac88,0xdac7a6,0xd7c6a4,0xc0c49b,0xd1d4a2],
  roof: [0xa86249,0x708780,0xb96d50,0xb57858,0x778f76,0xb77058,0xa66851,0xb66f53,0xc38461],
  wood: [0x997450,0xb18b5c,0x795b40,0x866a4b,0x9b7652,0xbe9c77,0x795d3f,0x7c6246,0x7d7055,0xb79571],
  bark: [0x856b48],
  grass: [0x8fac6a,0xa7be7b,0x91ae6b],
};
const cache = new Map<string, THREE.MeshStandardMaterial>();
export function realisticMaterial(color: string | number) {
  const key = String(color);
  if (cache.has(key)) return cache.get(key)!;
  const family = typeof color === 'number' ? Object.keys(palettes).find(name => palettes[name].includes(color)) : undefined;
  const m = new THREE.MeshStandardMaterial({ color, roughness: .82, flatShading: false });
  if (family) {
    Object.assign(m, surfaces[family]);
    m.color.set(0xffffff);
    m.normalScale.setScalar(family === 'plaster' ? .45 : family === 'grass' ? .6 : .85);
    if (family === 'plaster') m.color.set(color).lerp(new THREE.Color(0xe0ded3), .7);
    if (family === 'roof' && [0x708780,0x778f76].includes(Number(color))) m.color.set(0x82918b);
    if (family === 'grass') m.color.set(0x89b36b);
    m.roughness = family === 'wood' ? .92 : 1;
  } else if ([0x405b50,0x4c6355].includes(Number(color))) {
    m.color.set(0x384139);m.metalness=.72;m.roughness=.38;
  }
  cache.set(key, m);
  return m;
}
/** Keep the photographic material scale consistent across different-sized primitives. */
export function projectUV(g: THREE.BufferGeometry, x=0, y=0, z=0, scale=.5) {
  const pos=g.getAttribute('position'), normal=g.getAttribute('normal');
  const uv=new Float32Array(pos.count*2);
  for(let i=0;i<pos.count;i++) {
    const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
    if(ny>nx&&ny>nz) {uv[i*2]=(pos.getX(i)+x)*scale;uv[i*2+1]=(pos.getZ(i)+z)*scale;}
    else if(nx>nz) {uv[i*2]=(pos.getZ(i)+z)*scale;uv[i*2+1]=(pos.getY(i)+y)*scale;}
    else {uv[i*2]=(pos.getX(i)+x)*scale;uv[i*2+1]=(pos.getY(i)+y)*scale;}
  }
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  return g;
}

function leafTexture(pink=false) {
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;
  let seed=87;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  ctx.lineCap='round';
  for(let branch=0;branch<5;branch++) {
    const x=30+branch*44,y=30+random()*45;
    ctx.strokeStyle='#625b3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(128,238);ctx.quadraticCurveTo(128,140,x,y);ctx.stroke();
    for(let i=0;i<26;i++) {
      const t=random(),lx=128+(x-128)*t+(random()-.5)*58,ly=230+(y-230)*t+(random()-.5)*38;
      ctx.save();ctx.translate(lx,ly);ctx.rotate(random()*6.28);
      const length=7+random()*11;
      ctx.fillStyle=pink?['#b78d8d','#dcaca5','#dfbbb0'][i%3]:['#527033','#657f3e','#799347','#3f612c','#829b54'][i%5];
      ctx.beginPath();ctx.ellipse(0,0,length,length*.4,0,0,6.28);ctx.fill();
      ctx.strokeStyle=pink?'#edc8b7':'#a0ad6e';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(-length*.8,0);ctx.lineTo(length*.8,0);ctx.stroke();ctx.restore();
    }
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
export const wind = { value: 0 };
const leafMaterials=[false,true].map(pink=>{
  const m=new THREE.MeshStandardMaterial({map:leafTexture(pink),alphaTest:.45,side:THREE.DoubleSide,roughness:.95,metalness:0});
  m.onBeforeCompile=shader=>{
    shader.uniforms.windTime=wind;
    shader.vertexShader='uniform float windTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 origin = instanceMatrix[3].xyz;
        transformed.x += sin(windTime * .85 + origin.x * .8 + origin.z * .4) * .08 * uv.y;
        transformed.z += cos(windTime * .65 + origin.z) * .045 * uv.y;
      #endif`);
  };
  return m;
});
const clusters: { matrix:THREE.Matrix4; color:THREE.Color; pink:boolean }[]=[];
export function addLeafCrown(x:number,z:number,size:number,pink:boolean,random:()=>number) {
  const dummy=new THREE.Object3D();
  for(let i=0;i<75;i++) {
    const az=random()*Math.PI*2,cos=2*random()-1,r=Math.cbrt(random())*1.6;
    const radial=Math.sqrt(1-cos*cos);
    dummy.position.set(x+Math.cos(az)*radial*r*size,3.45*size+cos*r*size*.9,z+Math.sin(az)*radial*r*size);
    dummy.rotation.set((random()-.5)*Math.PI,random()*6.28,(random()-.5)*1.4);
    dummy.scale.setScalar((.75+random()*.65)*size);dummy.updateMatrix();
    clusters.push({matrix:dummy.matrix.clone(),color:new THREE.Color().setHSL(.22,.1,.75+random()*.22),pink});
  }
}
export function finishVegetation(scene:THREE.Scene, buildings:{x:number;z:number;w:number;d:number}[],random:()=>number) {
  for(const pink of [false,true]) {
    const group=clusters.filter(c=>c.pink===pink);
    const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.65,1.65),leafMaterials[Number(pink)],group.length);
    group.forEach((c,i)=>{mesh.setMatrixAt(i,c.matrix);mesh.setColorAt(i,c.color);});
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([-.012,0,0,.012,0,0,.006,.16,0,.006,.16,0,.012,0,0,.035,.27,.018, 0,0,-.012,0,0,.012,0,.17,0,0,.17,0,0,0,.012,-.025,.23,.018],3));g.computeVertexNormals();
  const grass=new THREE.InstancedMesh(g,new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide}),52000);
  const dummy=new THREE.Object3D();let count=0;
  for(let i=0;i<100000&&count<52000;i++) {
    const x=(random()-.5)*69,z=(random()-.5)*69;
    if(Math.abs(x)<6.2||Math.abs(z)<5.8||buildings.some(b=>Math.abs(x-b.x)<b.w/2+.5&&Math.abs(z-b.z)<b.d/2+1.5)||(x>9&&x<28&&(Math.abs(z-21)<1.25||Math.abs(x-17)<1.25))||Math.hypot(x-24,z-25)<3.5)continue;
    dummy.position.set(x,.08,z);dummy.rotation.y=random()*6.28;dummy.scale.set(.35+random()*.4,.35+random()*.5,.35+random()*.4);dummy.updateMatrix();grass.setMatrixAt(count,dummy.matrix);grass.setColorAt(count,new THREE.Color().setHSL(.23+random()*.025,.22+random()*.12,.28+random()*.11).convertSRGBToLinear());count++;
  }
  grass.count=count;grass.receiveShadow=true;grass.computeBoundingSphere();scene.add(grass);
}

export function rippleNormal() {
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const a=x/size*Math.PI*2,b=y/size*Math.PI*2,i=(y*size+x)*4;
    const nx=Math.cos(a*4+b*3)*.27+Math.sin(a*7-b*5)*.15,ny=Math.sin(a*3+b*6)*.24;
    const v=new THREE.Vector3(nx,ny,1).normalize();data[i]=(v.x*.5+.5)*255;data[i+1]=(v.y*.5+.5)*255;data[i+2]=(v.z*.5+.5)*255;data[i+3]=255;
  }
  const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
