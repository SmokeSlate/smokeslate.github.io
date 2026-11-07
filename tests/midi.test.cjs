const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
function probe(file, body) {
  const w = new JSDOM(fs.readFileSync(file,'utf8'),{url:'https://site.test/random/note/',runScripts:'outside-only'}).window;
  const timers=[];
  w.setTimeout=(_callback,ms)=>{timers.push(ms);return timers.length;};w.clearTimeout=()=>{};
  w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
  w.__audio={currentTime:0,destination:{},createOscillator:()=>({frequency:{},connect(){},start(){},stop(){}}),createGain:()=>({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}})};
  const script=[...w.document.querySelectorAll('script:not([src])')].map(s=>s.textContent).join('\n');
  w.eval(script+'\nwindow.__probe = () => { '+body+' };');
  const result=w.__probe();w.close();return {result:JSON.parse(JSON.stringify(result)),timers};
}
const main='random/note/index.html';
test('stopping audio resets mapped playback state and button',()=>{
  const {result}=probe(main,'playing=true; playBtn.textContent="Pause"; stopAllAudio(); return {playing,text:playBtn.textContent};');
  assert.deepEqual(result,{playing:false,text:'Play'});
});
test('absolute quantization preserves progression across sub-grid note intervals',()=>{
  const {result}=probe(main,'bpmInput.value="120"; currentMappedNotes=buildMappedGroups([0,.06,.12,.18,.24].map(time=>({time,midi:52,duration:.1})),"off"); computeMappedStartTimes(); return mappedStartTimes;');
  assert.deepEqual(result,[0,0,.125,.125,.25]);
});
test('timeline duration includes the final hold',()=>{
  const {result}=probe(main,'bpmInput.value="120"; currentMappedNotes=[{delaySpaces:0,notes:[{midi:52,holdSpaces:16}]}]; computeMappedStartTimes(); return mappedDuration;');
  assert.equal(result,2);
});
test('playback completion uses the maximum overlapping end rather than summed holds',()=>{
  const {timers}=probe(main,'bpmInput.value="120"; audioCtx=window.__audio; currentMappedNotes=[{delaySpaces:0,notes:[{midi:52,holdSpaces:8}]},{delaySpaces:0,notes:[{midi:55,holdSpaces:8}]}]; playBtn.disabled=false; playBtn.click(); return playing;');
  assert.ok(timers.at(-1)>=1500 && timers.at(-1)<=1530, String(timers.at(-1)));
});
test('renaming an instrument updates mapped/exported note names',()=>{
  const {result}=probe(main,'currentMidi={}; tracksAbsNotes=[[{time:0,midi:52,duration:1}]]; instruments=[{id:1,name:"Old",trackIndex:0}]; trackMode.value="instruments"; rebuildMappedFromMode(); updateInstrumentName(1,"New"); return currentMappedNotes[0].notes[0].instrumentName;');
  assert.equal(result,'New');
});
test('legacy mapper uses instrument names and semitone distance including enharmonics',()=>{
  const {result}=probe('random/note/index_old.html','return {exact:findClosestNote("E3"),flat:findClosestNote("Gb3"),distance:calculateDistance("B3","C4")};');
  assert.equal(result.exact.includes('undefined'),false);
  assert.match(result.exact,/E3$/);assert.match(result.flat,/F#3$/);assert.equal(result.distance,1);
});
for(const action of ['clear','remap'])test('older MIDI '+action+' stops preview audio and clears preview state',()=>{
  const body='let stopped=0; previewPlaying=true; previewOscs=[{osc:{stop(){stopped++;}}}]; '+(action==='clear'?'clearBtn.disabled=false; clearBtn.click();':'processTrack({notes:[]});')+' return {stopped,previewPlaying,count:previewOscs.length};';
  const {result}=probe('random/note/new/index.html',body);assert.deepEqual(result,{stopped:1,previewPlaying:false,count:0});
});
