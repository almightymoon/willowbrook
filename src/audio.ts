export class TownAudio {
 context?: AudioContext; master?: GainNode; enabled=true; private elapsed=0;
 start(){
  if(this.context){void this.context.resume();return;}
  this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.enabled?.22:0;this.master.connect(this.context.destination);
  // Soft, filtered wind: generated locally, with no external audio downloads.
  const buffer=this.context.createBuffer(1,this.context.sampleRate*3,this.context.sampleRate);const data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.025-.0125)*.995;data[i]=last;}
  const noise=this.context.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=550;const gain=this.context.createGain();gain.gain.value=.22;noise.connect(filter);filter.connect(gain);gain.connect(this.master);noise.start();
 }
 toggle(){this.enabled=!this.enabled;if(this.master&&this.context)this.master.gain.setTargetAtTime(this.enabled?.22:0,this.context.currentTime,.1);return this.enabled;}
 tone(freq=660,duration=.15,volume=.13,slide=0){if(!this.context||!this.master)return;const t=this.context.currentTime;const oscillator=this.context.createOscillator();const gain=this.context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(freq,t);if(slide)oscillator.frequency.exponentialRampToValueAtTime(slide,t+duration);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);oscillator.connect(gain);gain.connect(this.master);oscillator.start();oscillator.stop(t+duration);}
 chime(){this.tone(659,.3,.25);setTimeout(()=>this.tone(880,.4,.2),90);setTimeout(()=>this.tone(1108,.55,.15),190);}
 update(dt:number,daylight:number,moving:boolean,phase:number){this.elapsed+=dt;if(this.elapsed>4){this.elapsed=0;if(daylight>.3){this.tone(2200,.13,.045,3100);setTimeout(()=>this.tone(2800,.14,.035,2300),180);}else this.tone(3600,.08,.025,3900);}
 if(moving&&Math.floor(phase*3)!==Math.floor((phase-dt)*3))this.tone(95+Math.random()*20,.075,.12,45);
 }
}
