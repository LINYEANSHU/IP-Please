let context:AudioContext|undefined,musicGain:GainNode|undefined,musicOsc:OscillatorNode|undefined;
let musicLevel=0,effectsLevel=.35;const active=new Set<OscillatorNode>();
export function unlockAudio(){try{context??=new AudioContext();void context.resume();}catch{/* Visible subtitles remain complete. */}}
function tone(freq:number,duration:number,volume:number,type:OscillatorType='triangle',delay=0){
  if(!context||!effectsLevel)return;const o=context.createOscillator(),g=context.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,context.currentTime+delay);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.45),context.currentTime+delay+duration);
  g.gain.setValueAtTime(0,context.currentTime+delay);g.gain.linearRampToValueAtTime(volume*effectsLevel,context.currentTime+delay+.008);g.gain.exponentialRampToValueAtTime(.0001,context.currentTime+delay+duration);
  o.connect(g).connect(context.destination);active.add(o);o.onended=()=>{active.delete(o);o.disconnect();g.disconnect();};o.start(context.currentTime+delay);o.stop(context.currentTime+delay+duration+.01);
}
export function playUtterance(profileId:string,text:string){
  const seed=[...profileId].reduce((n,c)=>n+c.charCodeAt(0),0),count=Math.min(9,Math.ceil(text.length/3));
  for(let i=0;i<count;i++)tone(105+(seed*7+i*37)%165,.09,.12,i%3===0?'sawtooth':'triangle',i*.09);
}
export function playStamp(){tone(78,.12,.6,'square');tone(1500,.028,.15,'triangle');}
export function playPaper(){tone(620,.045,.12,'sawtooth');}
export function playNotice(){tone(440,.15,.16,'square');tone(330,.18,.14,'square',.18);}
export function stopFeedback(){for(const o of active){try{o.stop();}catch{/* already ended */}}}
export function setAudioLevels(music:number,effects:number){musicLevel=music;effectsLevel=effects;if(musicGain)musicGain.gain.value=musicLevel*.018;if(!effects)stopFeedback();}
export function setMusic(on:boolean){
  if(!context)return;if(!on){if(musicOsc){musicOsc.stop();musicOsc.disconnect();musicOsc=undefined;}return;}
  if(musicOsc)return;musicOsc=context.createOscillator();musicGain=context.createGain();musicOsc.type='sine';musicOsc.frequency.value=55;musicGain.gain.value=musicLevel*.018;musicOsc.connect(musicGain).connect(context.destination);musicOsc.start();
}
