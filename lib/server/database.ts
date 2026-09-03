import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabaseUrl,supabasePublicKey } from '@/lib/supabase-public';
import { characterSchema,stateSchema,opening,type Entry } from '@/lib/game';
export class HttpError extends Error {constructor(message:string,public status=500){super(message);}}
export async function authenticated(request:Request) {
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)throw new HttpError('Origem não permitida.',403);
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)throw new HttpError('Entre na sua conta para continuar.',401);
 const auth=createClient(supabaseUrl,supabasePublicKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await auth.auth.getUser(token);
 if(error||!data.user)throw new HttpError('Sua sessão expirou. Entre novamente.',401);
 const secret=process.env.SUPABASE_SECRET_KEY;
 if(!secret)throw new HttpError('O salvamento ainda não foi habilitado no servidor. A demonstração continua disponível.',503);
 const db=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 return {owner:data.user.id,db};
}
export type Database = Awaited<ReturnType<typeof authenticated>>['db'];
export async function rpc(db:Database,name:string,args:Record<string,unknown>){
 const {data,error}=await db.rpc(name,args);
 if(error){
  const messages:Record<string,[string,number]>={campaign_not_found:['Aventura não encontrada.',404],campaign_limit:['Você atingiu o limite de 20 aventuras deste experimento.',409],turn_busy:['Esta ação ainda está sendo processada. Aguarde e retome a aventura.',409],pending_turn:['Há uma ação pendente. Retome a aventura para tentar a mesma ação.',409],stale_version:['A aventura avançou em outra aba. Retome-a antes de continuar.',409],request_mismatch:['Esta tentativa pertence a outra ação. Retome a aventura.',409],lease_lost:['A ação foi retomada em outra tentativa. Reabra a aventura.',409]};
  const known=messages[error.message];throw new HttpError(known?.[0]??'Não foi possível salvar a aventura. Tente novamente.',known?.[1]??502);
 }
 return data;
}
export async function campaign(db:Database,owner:string,id:string){
 const {data,error}=await db.from('campaigns').select('id,state,version,characters(name,origin,goal,weapon)').eq('owner_id',owner).eq('id',id).single();
 if(error||!data)throw new HttpError('Aventura não encontrada.',404);
 const {data:turns,error:turnError}=await db.from('turns').select('request_id,action,status,entry,sequence').eq('owner_id',owner).eq('campaign_id',id).order('sequence',{ascending:false}).limit(100);
 if(turnError)throw new HttpError('Não foi possível carregar os acontecimentos.',502);
 const rows=turns??[];
 return {id:data.id,character:characterSchema.parse(data.characters),state:stateSchema.parse(data.state),entries:[opening,...rows.filter(t=>t.status==='completed').reverse().map(t=>t.entry as Entry)],pending:rows.find(t=>t.status!=='completed')??null};
}
export async function body(request:Request){const raw=await request.text();if(raw.length>12000)throw new HttpError('Requisição muito grande.',413);try{return JSON.parse(raw);}catch{throw new HttpError('Dados inválidos.',400);}}
export function failure(error:unknown){return Response.json({error:error instanceof HttpError?error.message:error instanceof z.ZodError?'Não foi possível validar os dados ou a resposta da IA. Tente novamente.':'Não foi possível concluir a ação. Tente novamente.'},{status:error instanceof HttpError?error.status:error instanceof z.ZodError?422:500,headers:{'Cache-Control':'no-store'}});}
export function json(data:unknown){return Response.json(data,{headers:{'Cache-Control':'no-store'}});}
