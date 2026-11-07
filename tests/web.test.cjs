const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const tick = () => new Promise(resolve => setImmediate(resolve));
function auth(responses) {
  const w = new JSDOM(fs.readFileSync('shortcuts/authtest/index.html', 'utf8'), { url: 'https://site.test/shortcuts/authtest/', runScripts: 'outside-only' }).window;
  const requests = []; let ceremonies = 0;
  w.__register = w.__authenticate = async () => { ceremonies++; return {}; };
  w.document.querySelector('dialog').showModal = () => {};
  w.document.querySelector('[data-email]').value = 'a+b@example.invalid';
  w.fetch = async (url, options) => { requests.push({ url: String(url), options }); const result = responses.shift(); if (result instanceof Error) throw result; return result; };
  const source = fs.readFileSync('shortcuts/authtest/main.js', 'utf8').replace(/^import[^\n]+\n/, 'const startRegistration = window.__register, startAuthentication = window.__authenticate;\n');
  w.eval(source);
  return { w, requests, ceremonies: () => ceremonies, message: () => w.document.querySelector('[data-content]').textContent || w.document.querySelector('[data-content]').innerText };
}
for (const action of ['signup','login']) test('auth ' + action + ' stops after initialization errors and encodes email exactly', async () => {
  const a = auth([{ ok: false, json: async () => ({ error: 'Synthetic server rejection' }) }, { ok: false, json: async () => ({ error: 'Wrong second request' }) }]);
  await a.w[action]();
  assert.equal(new URL(a.requests[0].url).searchParams.get('email'), 'a+b@example.invalid');
  assert.equal(a.ceremonies(), 0);
  assert.equal(a.requests.length, 1);
  assert.match(a.message(), /Synthetic server rejection/);
  a.w.close();
});
test('verification failures and network rejection retain meaningful errors', async () => {
  const a = auth([{ ok: true, json: async () => ({ challenge: 'synthetic' }) }, { ok: false, json: async () => ({ error: 'Verification denied' }) }]);
  await a.w.signup(); assert.match(a.message(), /Verification denied/); a.w.close();
  const b = auth([new Error('Synthetic offline failure')]);
  await b.w.login(); assert.match(b.message(), /offline failure/); b.w.close();
});
test('published auth page resolves a self-contained built module in its subdirectory', () => {
  const doc = new JSDOM(fs.readFileSync('shortcuts/authtest/index.html','utf8')).window.document;
  const src = doc.querySelector('script[type=module]').getAttribute('src');
  assert.equal(src.startsWith('/'), false);
  const file = path.join('shortcuts/authtest', src);
  assert.ok(fs.existsSync(file));
  assert.equal(/from\s*["']@simplewebauthn/.test(fs.readFileSync(file,'utf8')), false);
});
test('map metadata is text and view links are restricted to HTTPS Mod.io hosts', async () => {
  const w = new JSDOM(fs.readFileSync('gorilla-tag/index.html','utf8'), { url:'https://site.test/gorilla-tag/',runScripts:'outside-only' }).window;
  w.console.log = () => {};
  w.fetch = async () => ({ ok:true,text:async()=>JSON.stringify([{title:'<b data-inert="title">Literal title</b>',author:'<em data-inert="author">Literal author</em>',link:'javascript:inert',submissionDate:'2026-01-01'}]) });
  for(const script of w.document.querySelectorAll('script:not([src])'))w.eval(script.textContent);
  await tick();
  assert.equal(w.document.querySelector('[data-inert]'),null);
  assert.match(w.document.getElementById('mapList').textContent, /<b data-inert/);
  assert.equal(w.document.querySelector('#mapList a[href^="javascript:"]'),null);
  w.close();
});
test('opaque/failed map submission preserves the draft and feedback', async () => {
  const w=new JSDOM(fs.readFileSync('gorilla-tag/submit.html','utf8'),{url:'https://site.test/gorilla-tag/submit.html',runScripts:'outside-only'}).window;
  w.console.error=()=>{};
  w.document.getElementById('title').value='Synthetic map';
  w.document.getElementById('author').value='Synthetic author';
  w.document.getElementById('link').value='https://mod.io/g/gorilla-tag/m/synthetic';
  w.fetch=async()=>({ok:false,status:0,type:'opaque',json:async()=>{throw new Error('Unreadable response');}});
  for(const script of w.document.querySelectorAll('script:not([src])'))w.eval(script.textContent);
  w.document.getElementById('mapForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
  await tick();
  assert.equal(w.document.getElementById('title').value,'Synthetic map');
  assert.match(w.document.getElementById('message').textContent,/confirm|failed|unable|problem/i);
  w.close();
});
test('SideQuest links use persistent GitHub release assets', () => {
  const doc=new JSDOM(fs.readFileSync('shortcuts/bsm/download/index.html','utf8')).window.document;
  const links=[...doc.querySelectorAll('a')].filter(a=>/SideQuest|sidequest/i.test(a.textContent));
  assert.equal(links.length,3);
  for(const link of links){assert.equal(link.hostname,'github.com');assert.match(link.pathname,/\/releases\/download\//);assert.equal(link.search,'');}
});
