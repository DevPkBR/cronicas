import {test} from 'node:test';
import assert from 'node:assert/strict';
import {interpret,narrate,ProviderError} from '../.test-build/narrator.mjs';
import {initialState,resolve} from '../.test-build/game.mjs';
const payload={character:{name:'Ari',origin:'Viajante',goal:'Encontrar abrigo',weapon:'Bastão'},state:initialState,action:'Perguntar sobre a entrega',history:[]};
test('AI contract and failures with simulated provider; no network calls',async(t)=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;const data=calls===1?{kind:'routine',attribute:'Presença',difficulty:'easy',danger:false,reason:'Conversa sem risco'}:{text:'Mara explica a entrega e observa o viajante próximo à janela.',choices:['Ouvir Mara','Falar com Ivo'],location:'Estalagem',memory:'Mara explicou a entrega.',rival:'Ivo observa.'};return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(data)}]}}]});});
 const intent=await interpret('test-key',payload);const resolution=resolve(initialState,payload.character,intent,4);
 const output=await narrate('test-key',payload,intent,resolution);assert.equal(output.location,'Estalagem');assert.equal(resolution.state.turn,1);assert.equal(calls,2);
 globalThis.fetch=async()=>Response.json({error:'quota'},{status:429});await assert.rejects(()=>interpret('test-key',payload),e=>e instanceof ProviderError&&e.status===429);
 globalThis.fetch=async()=>Response.json({candidates:[{content:{parts:[{text:'{}'}]}}]});await assert.rejects(()=>interpret('test-key',payload));
});
