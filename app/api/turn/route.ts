import { z } from 'zod';
import { stateSchema,intentSchema,resolve } from '@/lib/game';
import { interpret,narrate,ProviderError } from '@/lib/narrator';
import { authenticated,body,campaign,failure,json,rpc,HttpError } from '@/lib/server/database';
const schema=z.object({campaignId:z.string().uuid(),requestId:z.string().uuid(),action:z.string().trim().min(1).max(600),version:z.number().int().min(0).max(9999)}).strict();
export async function POST(request:Request){
 let release:(()=>Promise<unknown>)|undefined;
 try{
  const {db,owner}=await authenticated(request);
  const key=request.headers.get('x-narrator-key')?.trim();
  if(!key||key.length>256)throw new HttpError('Configure sua chave do Gemini para continuar.',400);
  const input=schema.parse(await body(request));
  const random=new Uint32Array(1);do{crypto.getRandomValues(random);}while(random[0]>=4294967292);
  const lease=crypto.randomUUID();
  const turn=await rpc(db,'reserve_turn',{p_owner:owner,p_campaign:input.campaignId,p_request:input.requestId,p_action:input.action,p_version:input.version,p_roll:random[0]%12+1,p_lease:lease});
  if(turn.status==='completed')return json(await campaign(db,owner,input.campaignId));
  release=()=>rpc(db,'release_turn',{p_owner:owner,p_turn:turn.id,p_lease:lease});
  const saved=await campaign(db,owner,input.campaignId);
  const context={character:saved.character,state:saved.state,action:turn.action,history:saved.entries.slice(-8).map(({action,text})=>({action,text}))};
  const intent=turn.intent?intentSchema.parse(turn.intent):await interpret(key,context);
  const resolution:ReturnType<typeof resolve>=turn.resolution??resolve(saved.state,saved.character,intent,turn.roll);
  if(!turn.resolution)await rpc(db,'checkpoint_turn',{p_owner:owner,p_turn:turn.id,p_lease:lease,p_intent:intent,p_resolution:resolution});
  const narration=await narrate(key,context,intent,resolution);
  const next=stateSchema.parse({...resolution.state,location:narration.location,memory:narration.memory,rival:narration.rival});
  const entry={action:turn.action,text:narration.text,choices:narration.choices,test:resolution.test};
  await rpc(db,'finish_turn',{p_owner:owner,p_turn:turn.id,p_lease:lease,p_state:next,p_entry:entry});
  release=undefined;
  return json(await campaign(db,owner,input.campaignId));
 }catch(error){
  if(release)try{await release();}catch{/* Lease expires if the database is unreachable. */}
  return failure(error instanceof ProviderError?new HttpError(error.message,error.status):error);
 }
}
