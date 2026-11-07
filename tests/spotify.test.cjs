const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const cp = require('node:child_process');
const { JSDOM } = require('jsdom');
function page() {
  const w=new JSDOM(fs.readFileSync('shortcuts/spotify/actionGen/index.html','utf8'),{url:'https://site.test/shortcuts/spotify/actionGen/',runScripts:'outside-only'}).window;
  w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.structuredClone=structuredClone;
  w.navigator.clipboard={writeText:async()=>{}};w.alert=message=>{throw new Error(message);};
  if(fs.existsSync('shortcuts/spotify/actionGen/intent-bundle.js'))w.eval(fs.readFileSync('shortcuts/spotify/actionGen/intent-bundle.js','utf8'));
  const source=[...w.document.querySelectorAll('script:not([src])')].map(s=>s.textContent).join('\n').replace(/location\.href='shortcuts:[^\n]+/,'/* external app launch disabled in offline test */');
  w.eval(source);
  return w;
}
test('incomplete Spotify URLs return validation failure without throwing',()=>{
  const w=page();
  for(const value of ['https://open.spotify.com/','https://open.spotify.com/playlist/','https://open.spotify.com.evil.test/playlist/abc','spotify:playlist:'])assert.equal(w.parseSpotifyLink(value),null);
  w.close();
});
for(const title of ['Short','x'.repeat(40),'x'.repeat(400),'x'.repeat(2000),'漢字 🎵 Café'])test('generated binary intent round-trips title of '+title.length+' characters',()=>{
  const w=page();
  w.document.getElementById('title').value=title;
  w.document.getElementById('link').value='https://open.spotify.com/playlist/4ErYzZVnpQbYQLUNRL4ndo';
  w.buildAction();
  const output=w.document.getElementById('output').value;
  const parsed=cp.spawnSync('python3',['tests/inspect_intent.py'],{input:output,encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
  const result=JSON.parse(parsed.stdout);
  assert.equal(result.title,title);assert.equal(result.displayTitle,'Your '+title);
  assert.equal(result.uri,'spotify:playlist:4ErYzZVnpQbYQLUNRL4ndo');
  assert.equal(result.archive,'NSKeyedArchiver');
  w.close();
});
