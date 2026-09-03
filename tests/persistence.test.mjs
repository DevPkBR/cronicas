import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../.test-build/route.mjs';
import {initialState} from '../.test-build/game.mjs';
const owner='00000000-0000-4000-8000-000000000001';const campaignId='00000000-0000-4000-8000-000000000002';const requestId='00000000-0000-4000-8000-000000000003';
const character={name:'Ari',origin:'Viajante',goal:'Encontrar abrigo',weapon:'Bastão'};
const request=(extra={},headers={})=>new Request('https://example.test/api/turn',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fake-token','x-narrator-key':'fake-key',...headers},body:JSON.stringify({campaignId,requestId,action:'Conversar',version:0,...extra})});
test('rejects unauthenticated and cross-origin writes before database or AI calls',async(t)=>{
 t.mock.method(globalThis,'fetch',()=>{throw new Error('Unexpected network call');});
 assert.equal((await POST(request({}, {Authorization:''}))).status,401);
 assert.equal((await POST(request({}, {origin:'https://evil.test'}))).status,403);
});
test('checkpoint survives failed narration; retry uses saved roll and commits only once',async(t)=>{
 process.env.SUPABASE_SECRET_KEY='fake-server-secret';
 t.after(()=>delete process.env.SUPABASE_SECRET_KEY);
 let savedState={...initialState};let turn;let calls=0;let interpretations=0;let finishes=0;
 const intent={kind:'test',attribute:'Corpo',difficulty:'normal',danger:true,reason:'Risco físico'};
 t.mock.method(globalThis,'fetch',async(input,init)=>{
  const url=typeof input==='string'?input:input.url??String(input);const body=init?.body?JSON.parse(init.body):{};
  if(url.includes('/auth/v1/user'))return Response.json({id:owner,aud:'authenticated',role:'authenticated',email:'fake@example.test'});
  if(url.includes('/rpc/reserve_turn')){assert.equal(body.p_owner,owner);turn??={id:requestId,request_id:requestId,sequence:1,action:'Conversar',status:'pending',roll:1};return Response.json(turn);}
  if(url.includes('/rpc/checkpoint_turn')){turn.intent=body.p_intent;turn.resolution=body.p_resolution;turn.status='resolved';return Response.json(null);}
  if(url.includes('/rpc/release_turn'))return Response.json(null);
  if(url.includes('/rpc/finish_turn')){finishes++;assert.equal(body.p_provider,'gemini-2.5-flash-lite');savedState=body.p_state;turn.entry=body.p_entry;turn.status='completed';return Response.json(null);}
  if(url.includes('/rest/v1/campaigns'))return Response.json({id:campaignId,state:savedState,version:savedState.turn,characters:character});
  if(url.includes('/rest/v1/turns'))return Response.json(turn?[turn]:[]);
  if(url.includes('generativelanguage')){
   calls++;if(calls===2)return Response.json({error:'quota'},{status:429});
   const isInterpret=body.systemInstruction.parts[0].text.includes('Primeiro interprete');if(isInterpret)interpretations++;
   const answer=isInterpret?intent:{text:'Você tropeça ao tentar atravessar a passagem e precisa recuar.',choices:['Observar','Esperar'],location:'Estalagem',memory:'Tentou atravessar e recuou.',rival:'Ivo observa.'};
   return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(answer)}]}}]});
  }
  throw new Error('Unexpected endpoint: '+url);
 });
 assert.equal((await POST(request())).status,429);assert.equal(savedState.turn,0);assert.equal(turn.resolution.state.hp,9);
 const retry=await POST(request());assert.equal(retry.status,200);const result=await retry.json();assert.equal(result.state.hp,9);assert.equal(result.state.turn,1);assert.equal(interpretations,1);assert.equal(finishes,1);assert.equal(calls,3);
 assert.equal((await POST(request())).status,200);assert.equal(finishes,1);assert.equal(calls,3);
 // Browser-supplied stats cannot enter the canonical request contract.
 assert.equal((await POST(request({state:{hp:999}}))).status,422);
});
