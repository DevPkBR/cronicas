import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../.test-build/route.mjs';
import {initialState} from '../.test-build/game.mjs';
const payload={character:{name:'Ari',origin:'Viajante',goal:'Encontrar abrigo',weapon:'Bastão'},state:initialState,action:'Perguntar sobre a entrega',history:[]};
function request(headers={}){return new Request('https://example.test/api/turn',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(payload)});}
test('requires a key and rejects cross-origin requests',async()=>{assert.equal((await POST(request())).status,401);assert.equal((await POST(request({origin:'https://elsewhere.test'}))).status,403);});
test('AI contract and failures with simulated provider; no network calls',async(t)=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;const data=calls===1?{kind:'routine',attribute:'Presença',difficulty:'easy',danger:false,reason:'Conversa sem risco'}:{text:'Mara explica a entrega e observa o viajante próximo à janela.',choices:['Ouvir Mara','Falar com Ivo'],location:'Estalagem',memory:'Mara explicou a entrega.',rival:'Ivo observa.'};return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(data)}]}}]});});
 const key={'x-narrator-key':'test-not-a-real-key'};
 const response=await POST(request(key));assert.equal(response.status,200);const output=await response.json();assert.equal(output.state.turn,1);assert.equal(output.state.hp,12);assert.equal(calls,2);
 globalThis.fetch=async()=>Response.json({error:'quota'},{status:429});assert.equal((await POST(request(key))).status,429);
 globalThis.fetch=async()=>Response.json({candidates:[{content:{parts:[{text:'{}'}]}}]});assert.equal((await POST(request(key))).status,422);
});
