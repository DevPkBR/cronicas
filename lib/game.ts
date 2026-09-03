import { z } from 'zod';
export const attributes = ['Corpo', 'Agilidade', 'Mente', 'Presença'] as const;
export const characterSchema = z.object({name:z.string().trim().min(1).max(40),origin:z.string().trim().min(1).max(60),goal:z.string().trim().min(1).max(160),weapon:z.string().trim().min(1).max(60)});
export type Character = z.infer<typeof characterSchema>;
export const stateSchema=z.object({hp:z.number().int().min(1).max(12),energy:z.number().int().min(0).max(6),turn:z.number().int().min(0).max(10000),location:z.string().max(100),memory:z.string().max(2400),rival:z.string().max(300)});
export type State=z.infer<typeof stateSchema>;
export type Entry={action:string;text:string;choices:string[];test?:string};
export const initialState:State={hp:12,energy:6,turn:0,location:'Vila de Breu · A Estalagem do Sino',memory:'Chegada a Breu. Mara oferece abrigo em troca da entrega de um pacote ao velho moinho. Ivo está sentado na estalagem, buscando esse pacote. Ainda não há rivalidade.',rival:'Um desconhecido junto à janela.'};
export const opening:Entry={action:'',text:'A chuva acompanha você até Breu. Na estalagem, o cheiro de lenha molhada se mistura ao de sopa. Acima do balcão, um sino sem badalo balança com o vento.\n\nMara, a estalajadeira, empurra um pequeno embrulho pela madeira. “Leve isto ao velho moinho e terá cama e comida esta noite. Entregue apenas à mulher de luvas azuis.”\n\nJunto à janela, um viajante interrompe a leitura. Por um instante, seus olhos acompanham o pacote.',choices:['Perguntar a Mara sobre o pacote','Conversar com o viajante','Examinar o embrulho sem abri-lo']};
export const intentSchema=z.object({kind:z.enum(['routine','test','rest','magic','impossible']),attribute:z.enum(attributes),difficulty:z.enum(['easy','normal','hard']),danger:z.boolean(),reason:z.string().max(220)});
export type Intent=z.infer<typeof intentSchema>;
export function bonus(character:Character,attribute:string){const origin=character.origin.toLowerCase();return attribute==='Mente'&&/mago|cozinheir|estudios/.test(origin)?3:attribute==='Corpo'&&/soldado|ferreiro|guerreiro/.test(origin)?3:attribute==='Agilidade'&&/caçador|ladino|viajante/.test(origin)?3:attribute==='Presença'&&/bardo|mercador/.test(origin)?3:2;}
export function resolve(state:State,character:Character,intent:Intent,die:number){
 const next={...state,turn:state.turn+1};let result='sucesso';let test='Sem teste · ação possível e sem risco';
 if(intent.kind==='impossible'){result='impossível';test='Ação indisponível · '+intent.reason;}
 else if(intent.kind==='magic'&&state.energy<2){result='sem energia';test='São necessários 2 pontos de energia.';}
 else if(intent.kind==='rest'){next.hp=Math.min(12,next.hp+3);next.energy=Math.min(6,next.energy+2);test='Descanso em segurança · +3 vida / +2 energia (até o máximo)';}
 else if(intent.kind==='test'||intent.kind==='magic'){
  const dc={easy:6,normal:9,hard:12}[intent.difficulty];const add=bonus(character,intent.attribute);const total=die+add;
  result=total>=dc?'sucesso':total>=dc-2?'sucesso com custo':'fracasso';
  if(intent.kind==='magic')next.energy-=2;
  if(intent.danger&&result!=='sucesso') next.hp=Math.max(1,next.hp-(result==='fracasso'?3:1));
  test=`d12: ${die} + ${add} ${intent.attribute} = ${total} · dificuldade ${dc} · ${result}`;
  if(next.hp===1&&intent.danger&&result!=='sucesso'){result='derrota e retirada';test+=' · você recua e sobrevive com 1 de vida';}
 }
 return {state:next,result,test};
}
export function demoTurn(state:State,character:Character,action:string):{state:State;entry:Entry}{
 const base={...state,turn:state.turn+1};
 if(state.turn===0){return {state:{...base,memory:'Mara explicou a entrega. O viajante Ivo reivindica o pacote.',rival:'Ivo · interessado no mesmo pacote'},entry:{action,text:'Mara cobre o embrulho com a mão. “É uma peça de bronze. Não a abra aqui. A mulher do moinho sabe o que fazer.”\n\nO viajante se aproxima. “Meu nome é Ivo. Esse objeto foi retirado da minha família. Antes de aceitar o trabalho, você deveria ouvir a outra parte.”\n\nMara não nega a acusação. Do lado de fora, a chuva engrossa.',choices:['Ouvir a história de Ivo','Levar o pacote ao moinho','Pedir que Mara explique a acusação'],test:'Demonstração · cena pré-escrita, sem interpretação de IA'}};}
 if(state.turn===1){return {state:{...base,location:'Vila de Breu · Caminho do moinho',rival:'Ivo · acompanha a entrega'},entry:{action,text:`Você sai da estalagem com ${character.weapon.toLowerCase()} à mão e o embrulho sob o casaco. Ivo segue a uma distância respeitosa. Ainda não é seu inimigo — mas também não pretende perder o pacote de vista.\n\nNa ponte, uma tábua cede sob seus pés. O riacho está cheio. Você pode tentar atravessar com cuidado ou voltar e procurar outra passagem.`,choices:['Atravessar a ponte com cuidado','Voltar para a estalagem'],test:'Demonstração · a história segue um roteiro curto'}};}
 const back=/voltar/i.test(action);const intent:Intent={kind:back?'routine':'test',attribute:'Agilidade',difficulty:'normal',danger:true,reason:'Travessia sobre a água'};const resolved=resolve(state,character,intent,Math.floor(Math.random()*12)+1);
 return {state:{...resolved.state,location:back?'Vila de Breu · A Estalagem do Sino':'Vila de Breu · Ponte do moinho'},entry:{action,text:back?'Você retorna à estalagem. A ponte pode esperar.\n\nAqui termina a demonstração. Conecte o narrador de IA para interpretar suas próprias ações e continuar a aventura.':`${resolved.result==='sucesso'?'Você alcança o outro lado sem perder o equilíbrio.':resolved.result==='derrota e retirada'?'Você recua para a margem, ferido. Ivo impede que a correnteza leve você.':'A madeira cede. Você se agarra ao corrimão, mas se machuca nas tábuas. Ivo estende a mão.'}\n\nAqui termina a demonstração. Com o narrador de IA conectado, sua próxima decisão pode mudar a relação com Ivo.`,choices:[],test:resolved.test}};
}
