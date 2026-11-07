const {test}=require('node:test');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const actions=JSON.parse(cp.execFileSync('python3',['-c',"import plistlib,json; print(json.dumps(plistlib.load(open('bsm/Test.txt','rb'))['WFWorkflowActions']))"],{encoding:'utf8'}));
const finalId='3B2D370A-0669-462E-8DEE-8DAC86CF2CCD';
function serialize(songs,metadata) {
  const outputs={'4B48D27E-07D3-4CE1-ADAB-7F7ABD9DC66C':metadata,'AD9F0D39-7F0A-4BC9-ADB8-1CB6ACBCE517':'synthetic-image'};
  const variables={};
  function ref(r) {
    let result=r.Type==='Variable'?variables[r.VariableName]:outputs[r.OutputUUID];
    for(const a of r.Aggrandizements||[])if(a.DictionaryKey)result=a.DictionaryKey.split('.').reduce((v,k)=>v?.[k],result);
    return result;
  }
  const text=v=>Array.isArray(v)?v.map(text).join('\n'):v!==null&&typeof v==='object'?JSON.stringify(v):String(v??'');
  function value(v) {
    if(v?.WFSerializationType==='WFTextTokenAttachment')return ref(v.Value);
    if(v?.WFSerializationType==='WFTextTokenString')return v.Value.string.replace(/\ufffc/g,(_,offset)=>text(ref(v.Value.attachmentsByRange['{'+offset+', 1}'])));
    return v;
  }
  function run(action) {
    const p=action.WFWorkflowActionParameters||{},id=action.WFWorkflowActionIdentifier;let result;
    if(id==='is.workflow.actions.dictionary')result=Object.fromEntries(p.WFItems.Value.WFDictionaryFieldValueItems.map(item=>[value(item.WFKey),value(item.WFValue)]));
    else if(id==='is.workflow.actions.gettext')result=value(p.WFTextActionText);
    else if(id==='is.workflow.actions.list')result=structuredClone(p.WFItems);
    else if(id==='is.workflow.actions.setvariable')variables[p.WFVariableName]=value(p.WFInput);
    else if(id==='is.workflow.actions.appendvariable')(variables[p.WFVariableName]??=[]).push(value(p.WFInput));
    else if(id==='is.workflow.actions.text.combine')result=(value(p.WFInput)||[]).join(p.WFTextCustomSeparator);
    else if(id==='is.workflow.actions.text.replace')result=value(p.WFInput).replace(new RegExp(p.WFReplaceTextFind),p.WFReplaceTextReplace);
    if(p.UUID && result!==undefined)outputs[p.UUID]=result;
  }
  const start=actions.findIndex(a=>a.WFWorkflowActionIdentifier==='is.workflow.actions.repeat.each' && a.WFWorkflowActionParameters.GroupingIdentifier==='131FD45C-A669-4A08-A79A-FDB30439FC6B' && a.WFWorkflowActionParameters.WFControlFlowMode===0);
  const group=actions[start].WFWorkflowActionParameters.GroupingIdentifier;
  const end=actions.findIndex((a,i)=>i>start&&a.WFWorkflowActionParameters?.GroupingIdentifier===group&&a.WFWorkflowActionParameters.WFControlFlowMode===2);
  // Only synthetic dataflow is interpreted. Download/auth/image/save actions never run.
  for(const action of actions.slice(0,start))if(['is.workflow.actions.list','is.workflow.actions.setvariable'].includes(action.WFWorkflowActionIdentifier))run(action);
  for(const song of songs) {
    outputs['795905D0-5718-4A94-B523-0D5F35C054D3']=song;
    outputs['18C0796B-C7B8-4C9E-BF94-75A94EF0A3B2']={name:song.songName};
    for(const action of actions.slice(start+1,end))run(action);
  }
  for(const action of actions.slice(end+1))run(action);
  return outputs[finalId];
}
for(const count of [0,1,2])test('playlist export is valid JSON with '+count+' songs and escaped metadata',()=>{
  const songs=Array.from({length:count},(_,i)=>({key:'key'+i,hash:'hash'+i,songName:'Song "quoted" \\ $1 🎵\n'+i}));
  const metadata={name:'My "playlist" \\ $1 漢字',owner:{display_name:'A\nB'},description:'Quotes " and tab\t and \\'};
  const output=serialize(songs,metadata);
  const parsed=JSON.parse(output);
  assert.deepEqual(parsed,{playlistTitle:metadata.name,playlistAuthor:metadata.owner.display_name,playlistDescription:metadata.description,image:'synthetic-image',songs});
});

test('one ordinary song has no trailing comma',()=>{
  const song={key:'key',hash:'hash',songName:'Song'};
  assert.deepEqual(JSON.parse(serialize([song],{name:'Playlist',owner:{display_name:'Author'},description:''})).songs,[song]);
});
