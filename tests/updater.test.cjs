const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const cp = require('node:child_process');
const actions = JSON.parse(cp.execFileSync('python3', ['-c', "import plistlib,json; print(json.dumps(plistlib.load(open('shortcuts/depCheck/plist.txt','rb'))['WFWorkflowActions']))"], {encoding:'utf8'}));
const updateId='D7145B90-13E9-4D22-9B6E-5C0F4016F04D';
async function check(fetch) {
  const value=actions.find(a=>a.WFWorkflowActionIdentifier==='is.workflow.actions.urlencode' && a.WFWorkflowActionParameters.WFInput?.Value?.string?.includes('<script>')).WFWorkflowActionParameters.WFInput.Value;
  const source=value.string.replace(/\ufffc/g,(_,offset)=>value.attachmentsByRange['{'+offset+', 1}'].Type==='Variable'?'1.0':'https://update.example.invalid').replace('<script>','').replace('</script>','');
  const document={body:{textContent:''}};
  await vm.runInNewContext(source,{fetch,document});
  return JSON.parse(document.body.textContent);
}
// Interpret only the real exported dictionary/conditional/text dataflow; no native actions execute.
function message(update) {
  const outputs={[updateId]:update}; const variables={main:{name:'Synthetic shortcut'}};
  function reference(r) {
    let value=r.Type==='Variable'?variables[r.VariableName]:outputs[r.OutputUUID];
    for(const ag of r.Aggrandizements||[])if(ag.DictionaryKey)value=value?.[ag.DictionaryKey];
    return value;
  }
  function value(v) {
    if(v?.Variable)return value(v.Variable);
    if(v?.WFSerializationType==='WFTextTokenAttachment')return reference(v.Value);
    if(v?.WFSerializationType==='WFTextTokenString') {
      const t=v.Value;return t.string.replace(/\ufffc/g,(_,offset)=>reference(t.attachmentsByRange['{'+offset+', 1}'])??'');
    }
    return v;
  }
  const start=actions.findIndex(a=>a.WFWorkflowActionParameters?.UUID===updateId)+1;
  const frames=[];let active=true;const texts=[];
  for(const action of actions.slice(start)) {
    const p=action.WFWorkflowActionParameters||{};const id=action.WFWorkflowActionIdentifier;
    if(id==='is.workflow.actions.repeat.count')break;
    if(id==='is.workflow.actions.conditional') {
      if(p.WFControlFlowMode===0) {
        const input=value(p.WFInput);const matches=p.WFCondition===100?input!=null && input!=='':Boolean(input);
        frames.push({parent:active,matches});active=active&&matches;
      } else if(p.WFControlFlowMode===1) {const f=frames.at(-1);active=f.parent&&!f.matches;}
      else {active=frames.pop().parent;}
      continue;
    }
    if(!active)continue;
    if(id==='is.workflow.actions.getvalueforkey')outputs[p.UUID]=value(p.WFInput)?.[p.WFDictionaryKey];
    if(id==='is.workflow.actions.gettext') {outputs[p.UUID]=value(p.WFTextActionText);texts.push(outputs[p.UUID]);}
  }
  assert.equal(frames.length,0,'control-flow groups close');
  return texts.join('\n');
}
for(const scenario of ['http','parse','missing','network'])test('update '+scenario+' failure is never reported as current',async()=>{
  const result=await check(async()=>{
    if(scenario==='network')throw new TypeError('Failed to fetch');
    return {ok:scenario!=='http',status:500,json:async()=>{if(scenario==='parse')throw new SyntaxError('bad JSON');return {};}};
  });
  assert.ok(result.error);
  const output=message(result);assert.match(output,/Update check failed/);assert.doesNotMatch(output,/Up to date/);
});
for(const [notes,expected] of [['force update','Update forced'],['Optional improvement','Update Available']])test('update importance chooses '+expected,async()=>{
  const result=await check(async()=>({ok:true,json:async()=>({Version:'2.0',Notes:notes,URL:'https://www.icloud.com/shortcuts/synthetic'})}));
  assert.match(message(result),new RegExp(expected));
});
test('successful equal version retains current-version message',async()=>{
  const result=await check(async()=>({ok:true,json:async()=>({Version:'1.0',Notes:''})}));
  assert.match(message(result),/Up to date/);
});
