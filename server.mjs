import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const port=Number(process.env.SOCIAL_PORT||5174);
const dataDir=path.resolve('data');
const profileFile=path.join(dataDir,'profiles.json');
fs.mkdirSync(dataDir,{recursive:true});
let profiles={};try{profiles=JSON.parse(fs.readFileSync(profileFile,'utf8'));}catch{}
const sessions=new Map();
const clients=new Set();
const customDefaults={jacket:0x5f8f83,shirt:0xc66b3f,backpack:0xc87935,hair:0x5a3c2c,hat:true,hairstyle:'short',accessory:'none'};
const cleanName=v=>String(v||'').trim().replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,18);
const cleanCustom=v=>{const input=v&&typeof v==='object'?v:{};const color=(key)=>Number.isInteger(input[key])&&input[key]>=0&&input[key]<=0xffffff?input[key]:customDefaults[key];return {jacket:color('jacket'),shirt:color('shirt'),backpack:color('backpack'),hair:color('hair'),hat:Boolean(input.hat),hairstyle:input.hairstyle==='bob'?'bob':'short',accessory:['scarf','badge'].includes(input.accessory)?input.accessory:'none'};};
const id=()=>crypto.randomUUID();
function saveProfiles(){fs.writeFileSync(profileFile,JSON.stringify(profiles,null,2));}
function hash(password,salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(String(password),salt,32).toString('hex')};}
function validPassword(password,salt,expected){return crypto.timingSafeEqual(Buffer.from(hash(password,salt).hash,'hex'),Buffer.from(expected,'hex'));}
function frame(payload){const body=Buffer.from(payload);let head;if(body.length<126){head=Buffer.from([0x81,body.length]);}else if(body.length<65536){head=Buffer.alloc(4);head[0]=0x81;head[1]=126;head.writeUInt16BE(body.length,2);}else{head=Buffer.alloc(10);head[0]=0x81;head[1]=127;head.writeBigUInt64BE(BigInt(body.length),2);}return Buffer.concat([head,body]);}
function send(c,message){if(!c.closed)c.socket.write(frame(JSON.stringify(message)));}
function publicPlayer(c){return {id:c.user.id,username:c.user.username,x:c.state.x,z:c.state.z,y:c.state.y,rotation:c.state.rotation,walking:c.state.walking,running:c.state.running,customization:c.user.customization};}
function broadcast(message,except=null){for(const c of clients)if(c!==except&&c.user)send(c,message);}
function playerList(){return [...clients].filter(c=>c.user).map(publicPlayer);}
function handle(c,msg){
 if(!msg||typeof msg!=='object')return;
 if(msg.type==='auth'){
  const action=msg.action,username=cleanName(msg.username),password=String(msg.password||'');
  if(action==='signup'){
   if(username.length<2||password.length<4)return send(c,{type:'auth-error',message:'Choose a name (2–18 characters) and a password (4+ characters).'});
   const key=username.toLowerCase();if(profiles[key])return send(c,{type:'auth-error',message:'That Willowbrook name is already taken.'});
   const credentials=hash(password);profiles[key]={id:id(),username,credentials,customization:cleanCustom(msg.customization)};saveProfiles();
   return authenticate(c,profiles[key]);
  }
  if(action==='signin'){
   const record=profiles[username.toLowerCase()];if(!record||!validPassword(password,record.credentials.salt,record.credentials.hash))return send(c,{type:'auth-error',message:'That name and password do not match.'});
   return authenticate(c,record);
  }
  if(action==='resume'){
   const record=sessions.get(String(msg.token||''));if(record)return authenticate(c,record,true);
   return send(c,{type:'auth-error',message:'Your session expired. Sign in again.'});
  }
  if(action==='guest'){
   const guest={id:`guest-${id().slice(0,8)}`,username:cleanName(msg.username)||`Wanderer ${Math.floor(Math.random()*900+100)}`,customization:cleanCustom(msg.customization),guest:true};return authenticate(c,guest);
  }
 }
 if(!c.user)return;
 if(msg.type==='state'){c.state={...c.state,x:Number(msg.x)||0,z:Number(msg.z)||0,y:Number(msg.y)||0,rotation:Number(msg.rotation)||0,walking:Boolean(msg.walking),running:Boolean(msg.running)};broadcast({type:'player-state',player:publicPlayer(c)},c);return;}
 if(msg.type==='profile'){
  c.user.customization=cleanCustom(msg.customization);
  if(!c.user.guest){const record=profiles[c.accountKey];if(record){record.customization=c.user.customization;saveProfiles();}}
  broadcast({type:'player-profile',player:publicPlayer(c)});return;
 }
 if(msg.type==='chat'){
  const text=String(msg.text||'').trim().slice(0,240);if(!text)return;
  const packet={type:'chat',id:id(),scope:msg.scope==='global'?'global':msg.scope==='dm'?'dm':'nearby',from:{id:c.user.id,username:c.user.username},text,at:Date.now()};
  if(packet.scope==='dm'){const target=[...clients].find(x=>x.user?.id===String(msg.to));if(target){send(target,packet);send(c,packet);}return;}
  if(packet.scope==='nearby'){for(const target of clients){if(!target.user)continue;const dx=target.state.x-c.state.x,dz=target.state.z-c.state.z;if(dx*dx+dz*dz<14*14)send(target,packet);}}else broadcast(packet);
  return;
 }
 if(msg.type==='emote')broadcast({type:'emote',playerId:c.user.id,emote:String(msg.emote||'wave').slice(0,16)},c);
 if(msg.type==='report'){const target=String(msg.playerId||'').slice(0,80);console.log(`[report] ${c.user.username} reported ${target}`);send(c,{type:'toast',message:'Thanks. The report was recorded for review.'});}
 if(msg.type==='voice-offer'||msg.type==='voice-answer'||msg.type==='voice-ice'){const target=[...clients].find(x=>x.user?.id===String(msg.to));if(target)send(target,{...msg,from:c.user.id});}
}
function authenticate(c,record,resumed=false){
 c.accountKey=record.guest?null:Object.keys(profiles).find(key=>profiles[key]===record);c.user={id:record.guest?record.id:`${record.id}-${id().slice(0,8)}`,username:record.username,customization:cleanCustom(record.customization)};c.state={x:0,z:18,y:.13,rotation:Math.PI,walking:false,running:false};
 const token=record.guest?null:(resumed?[...sessions].find(([,v])=>v.id===record.id)?.[0]||crypto.randomBytes(24).toString('hex'):crypto.randomBytes(24).toString('hex'));if(token)sessions.set(token,record);
 send(c,{type:'auth-ok',token,user:{id:c.user.id,username:c.user.username,customization:c.user.customization},players:playerList()});broadcast({type:'player-joined',player:publicPlayer(c)},c);
}
function parse(c,chunk){c.buffer=Buffer.concat([c.buffer,chunk]);while(c.buffer.length>=2){const first=c.buffer[0],second=c.buffer[1];const opcode=first&15;let len=second&127,offset=2;if(len===126){if(c.buffer.length<4)return;len=c.buffer.readUInt16BE(2);offset=4;}else if(len===127){if(c.buffer.length<10)return;len=Number(c.buffer.readBigUInt64BE(2));offset=10;}const masked=Boolean(second&128);if(masked)offset+=4;if(c.buffer.length<offset+len)return;let payload=c.buffer.subarray(offset,offset+len);if(masked){const mask=c.buffer.subarray(offset-4,offset);payload=Buffer.from(payload);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];}c.buffer=c.buffer.subarray(offset+len);if(opcode===8){c.socket.end();return;}if(opcode===9){c.socket.write(Buffer.from([0x8a,0]));continue;}if(opcode===1){try{handle(c,JSON.parse(payload.toString()));}catch{send(c,{type:'error',message:'Invalid message.'});}}}}
function upgrade(req,socket){const key=req.headers['sec-websocket-key'];if(!key){socket.destroy();return;}const accept=crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);const c={socket,buffer:Buffer.alloc(0),closed:false,user:null,state:{x:0,z:18,y:.13,rotation:Math.PI,walking:false,running:false}};clients.add(c);socket.on('data',chunk=>parse(c,chunk));socket.on('close',()=>{c.closed=true;clients.delete(c);if(c.user)broadcast({type:'player-left',playerId:c.user.id});});socket.on('error',()=>{c.closed=true;clients.delete(c);});}
const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({name:'Willowbrook social server',online:[...clients].filter(c=>c.user).length}));});
server.on('upgrade',upgrade);server.listen(port,'0.0.0.0',()=>console.log(`Willowbrook social server listening on ws://localhost:${port}`));
const socialOnly=process.argv.includes('--social-only');
const vite=socialOnly?null:spawn(process.execPath,[path.resolve('node_modules/vite/bin/vite.js'),'--host','0.0.0.0'],{stdio:'inherit'});
process.on('SIGINT',()=>{vite?.kill('SIGINT');server.close();process.exit(0);});
