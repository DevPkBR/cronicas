import { z } from 'zod';
import { characterSchema,initialState } from '@/lib/game';
import { authenticated,body,campaign,failure,json,rpc,HttpError } from '@/lib/server/database';
export async function GET(request:Request){try{
 const {db,owner}=await authenticated(request);const id=new URL(request.url).searchParams.get('id');
 if(id)return json(await campaign(db,owner,z.string().uuid().parse(id)));
 const {data,error}=await db.from('campaigns').select('id,title,version,updated_at,characters(name)').eq('owner_id',owner).eq('status','active').order('updated_at',{ascending:false}).limit(20);
 if(error)throw new HttpError('Não foi possível carregar suas aventuras.',502);return json({campaigns:data});
}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 const {db,owner}=await authenticated(request);const input=z.object({id:z.string().uuid(),character:characterSchema}).strict().parse(await body(request));
 await rpc(db,'create_campaign',{p_owner:owner,p_id:input.id,p_character:input.character,p_state:initialState});
 return json(await campaign(db,owner,input.id));
}catch(error){return failure(error);}}
