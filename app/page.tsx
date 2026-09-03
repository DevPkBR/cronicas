'use client';
import { useState,useRef,useEffect } from 'react';
import { BookOpen, Flame, Heart, Feather, ArrowUp, Compass, Backpack, Settings2, Swords, RotateCcw, LoaderCircle, KeyRound, ChevronRight } from 'lucide-react';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogAction,AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { type Character,type Entry,type State,initialState,opening,attributes,bonus,characterSchema,demoTurn } from '@/lib/game';
import { browserDatabase } from '@/lib/supabase-browser';
import { Account } from '@/components/account';
import type { Session } from '@supabase/supabase-js';
type SavedCampaign={id:string;character:Character;state:State;entries:Entry[];pending:{request_id:string;action:string}|null};
type CampaignSummary={id:string;title:string;version:number;characters:{name:string}};
export default function Home(){
 const [character,setCharacter]=useState<Character>({name:'',origin:'',goal:'',weapon:''});
 const [state,setState]=useState(initialState);const [entries,setEntries]=useState<Entry[]>([]);const [started,setStarted]=useState(false);const [mode,setMode]=useState<'demo'|'ai'>('demo');
 const [action,setAction]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [settings,setSettings]=useState(false);const [rules,setRules]=useState(false);const [reset,setReset]=useState(false);const [key,setKey]=useState('');const [draftKey,setDraftKey]=useState('');const lock=useRef(false);const storyRef=useRef<HTMLDivElement>(null);
 const [session,setSession]=useState<Session|null>(null);const [authReady,setAuthReady]=useState(false);const [account,setAccount]=useState(false);
 const [campaigns,setCampaigns]=useState<CampaignSummary[]>([]);const [campaignId,setCampaignId]=useState<string|null>(null);
 const [pending,setPending]=useState<{request_id:string;action:string}|null>(null);const creationId=useRef<string|null>(null);const userId=useRef<string|null>(null);const generation=useRef(0);
 useEffect(()=>{const {data:{subscription}}=browserDatabase().auth.onAuthStateChange((event,next)=>{
  if(userId.current!==next?.user.id){generation.current++;userId.current=next?.user.id??null;setStarted(false);setCampaignId(null);setPending(null);setEntries([]);setState(initialState);setCampaigns([]);setKey('');setDraftKey('');setAction('');setError('');creationId.current=null;}
  setSession(next);setAuthReady(true);if(event==='PASSWORD_RECOVERY')setAccount(true);
 });return ()=>subscription.unsubscribe();},[]);
 async function api<T>(path:string,options:RequestInit={}){
  const {data:{session:active}}=await browserDatabase().auth.getSession();
  if(!active)throw new Error('Entre na sua conta para continuar.');
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${active.access_token}`,...options.headers},signal:AbortSignal.timeout(75000)});
  const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error??'Não foi possível acessar sua aventura.');return result as T;
 }
 useEffect(()=>{if(!session?.user.id)return;let cancelled=false;
  api<{campaigns:CampaignSummary[]}>('/api/campaigns').then(data=>{if(!cancelled)setCampaigns(data.campaigns);}).catch(e=>{if(!cancelled)setError(e.message);});
  return ()=>{cancelled=true;};
 },[session?.user.id,started]);
 function restore(saved:SavedCampaign){setCampaignId(saved.id);setCharacter(saved.character);setState(saved.state);setEntries(saved.entries);setPending(saved.pending);setAction(saved.pending?.action??'');setMode('ai');setStarted(true);setError('');}
 async function resume(id:string){if(lock.current)return;lock.current=true;setBusy(true);const g=generation.current;
  try{const saved=await api<SavedCampaign>('/api/campaigns?id='+encodeURIComponent(id));if(g===generation.current)restore(saved);}catch(e){if(g===generation.current)setError(e instanceof Error?e.message:'Não foi possível retomar.');}finally{lock.current=false;setBusy(false);}}
 const current=entries.at(-1)??opening;
 async function start(nextMode:'demo'|'ai'){
  if(lock.current)return;
  const parsed=characterSchema.safeParse(character);if(!parsed.success){setError('Preencha seu nome, sua origem, sua motivação e seu objeto pessoal.');return;}
  setCharacter(parsed.data);setError('');
  if(nextMode==='demo'){setMode('demo');setCampaignId(null);setPending(null);setState(initialState);setEntries([opening]);setStarted(true);return;}
  if(!session){setAccount(true);return;}if(!key){setSettings(true);return;}
  lock.current=true;setBusy(true);const g=generation.current;
  creationId.current??=crypto.randomUUID();
  try{const saved=await api<SavedCampaign>('/api/campaigns',{method:'POST',body:JSON.stringify({id:creationId.current,character:parsed.data})});if(g===generation.current){restore(saved);creationId.current=null;}}
  catch(e){if(g===generation.current)setError(e instanceof Error?e.message:'Não foi possível criar a aventura.');}finally{lock.current=false;setBusy(false);}
 }
 function configure(){if(draftKey.trim().length<20){setError('Cole uma chave válida do Google AI Studio.');return;}setKey(draftKey.trim());setDraftKey('');setSettings(false);setError('');}
 async function act(text:string){
  if(lock.current||!text.trim())return;
  if(mode==='ai'&&!key){setSettings(true);return;}
  const chosen=(pending?.action??text).trim().slice(0,600);lock.current=true;setBusy(true);setError('');const g=generation.current;
  try{
   if(mode==='demo'){const result=demoTurn(state,character,chosen);setState(result.state);setEntries(e=>[...e,result.entry]);}
   else {const attempt=pending??{request_id:crypto.randomUUID(),action:chosen};setPending(attempt);
    const saved=await api<SavedCampaign>('/api/turn',{method:'POST',headers:{'x-narrator-key':key},body:JSON.stringify({campaignId,requestId:attempt.request_id,action:chosen,version:state.turn})});
    if(g!==generation.current)return;restore(saved);
   }
   setAction('');requestAnimationFrame(()=>storyRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  }catch(e){if(g===generation.current){setAction(chosen);setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:'O narrador demorou a responder. Retome a mesma ação.');}}finally{setBusy(false);lock.current=false;}
 }
 const demoEnded=mode==='demo'&&state.turn>=3;
 return <div className="app-shell">
  <header className="masthead"><a className="brand" href="/" aria-label="Crônicas do Véu, início"><BookOpen size={23}/><span>CRÔNICAS <i>do</i> VÉU</span></a><div className="header-actions"><button className="reset-button" disabled={busy||!authReady} onClick={()=>setAccount(true)}>{session?'Minha conta':'Entrar'}</button><span className="edition">RPG SOLO · EXPERIMENTO 01</span><button className="icon-button" onClick={()=>setRules(true)} aria-label="Como jogar"><BookOpen size={19}/></button><button className="icon-button" onClick={()=>{setError('');setSettings(true);}} disabled={busy} aria-label="Configurar narrador de IA"><Settings2 size={19}/></button></div></header>
  {!started?<main className="creation">
   <section className="creation-intro"><p className="eyebrow">UMA HISTÓRIA AINDA NÃO ESCRITA</p><h1>Todo caminho<br/>deixa <em>marcas.</em></h1><p className="intro-copy">Uma vila sob a chuva. Uma entrega aparentemente simples. Alguém que não vai esquecer de você.</p><div className="chapter-teaser"><span className="chapter-number">I</span><div><p className="eyebrow">O PRIMEIRO CAPÍTULO</p><h2>O sino sem voz</h2><p>Vila de Breu, ao cair da noite.</p></div></div><p className="intro-note">Você descreve o que tenta fazer.<br/>O mundo responde às suas escolhas.</p></section>
   <section className="creation-form">{session&&<section className="saved-campaigns"><h2>Minhas aventuras</h2>{campaigns.length?campaigns.map(c=><button className="secondary-button" key={c.id} disabled={busy} onClick={()=>resume(c.id)}>{c.characters.name} · turno {c.version} · Retomar</button>):<p className="muted">Suas aventuras salvas aparecerão aqui.</p>}</section>}<div className="section-heading"><Feather size={21}/><h2>Quem chega a Breu?</h2></div><p className="muted">Comece pequeno. O resto, você descobre no caminho.</p><form onSubmit={e=>{e.preventDefault();start('ai');}}>
    <label>Seu nome<input autoComplete="off" maxLength={40} required placeholder="Como chamam você?" value={character.name} onChange={e=>setCharacter({...character,name:e.target.value})}/></label>
    <div className="form-row"><label>De onde você vem<input maxLength={60} required value={character.origin} onChange={e=>setCharacter({...character,origin:e.target.value})} placeholder="Profissão ou origem"/></label><label>Seu objeto pessoal<input maxLength={60} required placeholder="Escolha um objeto comum" value={character.weapon} onChange={e=>setCharacter({...character,weapon:e.target.value})}/></label></div>
    <p className="field-note">Escolha livremente: todo objeto começa com poder comum.</p>
    <label>O que move você?<textarea maxLength={160} required rows={2} placeholder="O que seu personagem procura?" value={character.goal} onChange={e=>setCharacter({...character,goal:e.target.value})}/></label>
    <div className="starting-stats">{attributes.map(a=><div key={a}><strong>{bonus(character,a)}</strong><span>{a}</span></div>)}</div>
    {error&&!settings&&<p role="alert" className="error">{error}</p>}
    <button className="primary-button" type="submit" disabled={busy||!authReady}><Feather size={18}/> Começar com narrador de IA <ChevronRight size={18}/></button>
    <button className="secondary-button demo-button" type="button" disabled={busy} onClick={()=>start('demo')}>Experimentar demonstração sem IA</button>
    <p className="session-note">IA: entre na sua conta e configure sua chave do Gemini. Os turnos concluídos são salvos automaticamente. Demonstração: 3 cenas fixas, sem salvamento.</p>
   </form></section>
  </main>:<main className="game-layout">
   <aside className="character-panel"><div className="identity"><span className="eyebrow">SEU PERSONAGEM</span><h2>{character.name}</h2><p>{character.origin}</p></div><div className="resource"><div><span><Heart size={15}/> Vida</span><b>{state.hp}<small> / 12</small></b></div><Progress value={state.hp/12*100} aria-label={`Vida: ${state.hp} de 12`} className="health-bar"/></div><div className="resource"><div><span><Flame size={15}/> Energia</span><b>{state.energy}<small> / 6</small></b></div><Progress value={state.energy/6*100} aria-label={`Energia: ${state.energy} de 6`} className="energy-bar"/></div><div className="attributes">{attributes.map(a=><div key={a}><span>{a}</span><strong>+{bonus(character,a)}</strong></div>)}</div>
    <section className="side-section"><h3><Backpack size={16}/> Na mochila</h3><p>{character.weapon}</p><span className="muted small">Objeto comum · poder inicial equilibrado</span><p>Capa de viagem</p></section><section className="side-section"><h3><Flame size={16}/> Magia conhecida</h3><p>Centelha <span className="muted">· 2 energia</span></p><span className="muted small">Uma pequena chama. Nada maior que isso, por enquanto.</span></section>
    {mode==='ai'&&<button className="reset-button" disabled={busy} onClick={()=>setStarted(false)}>Minhas aventuras · salvo no turno {state.turn}</button>}<button className="reset-button" disabled={busy} onClick={()=>setReset(true)}><RotateCcw size={14}/> Novo personagem</button>
   </aside>
   <section className="adventure"><div className="story-topline"><span><Compass size={15}/>{state.location}</span><span className="turn">TURNO {String(state.turn).padStart(2,'0')}</span></div><div className="chapter-title"><p className="eyebrow">CAPÍTULO I</p><h1>O sino sem voz</h1><span className={`mode-badge ${mode==='ai'?'ai':''}`}>{mode==='ai'?'NARRADOR · GEMINI':'DEMONSTRAÇÃO · SEM IA'}</span></div>
    {entries.length>1&&<details className="past"><summary>Ler acontecimentos anteriores ({entries.length-1})</summary>{entries.slice(0,-1).map((e,i)=><article key={i}>{e.action&&<p className="past-action">Você: {e.action}</p>}<p>{e.text}</p>{e.test&&<small>{e.test}</small>}</article>)}</details>}
    <div className="current-scene" ref={storyRef} aria-live="polite" aria-busy={busy}>{current.action&&<div className="player-action"><Feather size={15}/><span>{current.action}</span></div>}<div className="prose">{current.text.split('\n\n').map((p,i)=><p key={i}>{p}</p>)}</div>{current.test&&<div className="test-result"><Swords size={14}/><span>{current.test}</span></div>}</div>
    <section className="action-area"><h2>{demoEnded?'Sua próxima história pode ser livre.':'O que você faz?'}</h2>{demoEnded?<button className="primary-button" onClick={()=>{setStarted(false);setState(initialState);setEntries([]);}}><KeyRound size={16}/> Criar uma aventura com IA</button>:<>{pending&&<div className="pending-action"><p>Uma ação aguarda conclusão: {pending.action}</p><button className="primary-button" disabled={busy} onClick={()=>act(pending.action)}>Retomar a mesma ação</button><button className="secondary-button" disabled={busy} onClick={()=>campaignId&&resume(campaignId)}>Atualizar aventura</button></div>}<div className="choices">{current.choices.map((choice,i)=><button key={choice} disabled={busy||!!pending} onClick={()=>act(choice)}><span>{String(i+1).padStart(2,'0')}</span>{choice}<ChevronRight size={15}/></button>)}</div>{mode==='ai'?<form className="action-form" onSubmit={e=>{e.preventDefault();act(action);}}><label htmlFor="action">Ou tente algo seu</label><div className="action-input"><textarea id="action" rows={2} maxLength={600} value={action} disabled={busy||!!pending} onChange={e=>setAction(e.target.value)} placeholder="Descreva uma ação, uma pergunta ou uma ideia…"/><button type="submit" disabled={busy||!!pending||!action.trim()} aria-label="Enviar ação">{busy?<LoaderCircle className="spin" size={20}/>:<ArrowUp size={21}/>}</button></div><p className="field-note">Uma ação por vez. Criatividade é bem-vinda; o resultado vem do mundo.</p></form>:<p className="demo-notice">Nesta demonstração, as opções avançam um roteiro fixo. Conecte a IA para escrever ações livres.</p>}</>}
    {busy&&<p role="status" className="loading"><LoaderCircle size={16} className="spin"/> O narrador está ouvindo sua ideia…</p>}{error&&!settings&&<p className="error" role="alert">{error}</p>}</section>
   </section>
   <aside className="journal-panel"><p className="eyebrow">SEU DIÁRIO</p><section><span className="journal-index">01 / MOTIVAÇÃO</span><h3>O que trouxe você</h3><p>{character.goal}</p></section><section><span className="journal-index">02 / PONTO DE PARTIDA</span><h3>Uma entrega ao moinho</h3><p>Mara ofereceu abrigo em troca de uma entrega. Você decide o que fazer com a proposta.</p></section><section><span className="journal-index">03 / UM ROSTO RECORRENTE</span><h3>O outro viajante</h3><p>{state.rival}</p></section><div className="journal-footer"><Feather size={22}/><p>Algumas escolhas deixam<br/>marcas em outras pessoas.</p></div></aside>
  </main>}
  <footer className="page-footer"><span>CRÔNICAS DO VÉU</span><span>Fantasia, escolhas e consequências.</span><button onClick={()=>setRules(true)}>Como jogar</button></footer>
  <Dialog open={account} onOpenChange={setAccount}><DialogContent className="game-dialog"><DialogHeader><DialogTitle>Sua conta</DialogTitle><DialogDescription>Salve e retome suas aventuras.</DialogDescription></DialogHeader><Account email={session?.user.email} onClose={()=>setAccount(false)}/></DialogContent></Dialog>
  <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="game-dialog"><DialogHeader><DialogTitle>Seu narrador de IA</DialogTitle><DialogDescription>Conecte uma chave do Gemini para interpretar ações livres.</DialogDescription></DialogHeader><p>Usamos o Gemini 2.5 Flash-Lite. O Google oferece uma faixa gratuita sujeita a cotas e disponibilidade da sua conta.</p><a className="external-link" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Criar ou consultar chave no Google AI Studio ↗</a><label>Chave da API<input type="password" autoComplete="off" spellCheck={false} value={draftKey} onChange={e=>setDraftKey(e.target.value)} placeholder="Cole sua chave aqui"/></label><p className="field-note">A chave fica apenas na memória desta página e é enviada ao nosso servidor para acessar o Google. A história e suas ações são enviadas ao Gemini; o uso gratuito pode ser usado pelo Google para melhorar seus produtos. Não inclua dados pessoais.</p>{key&&<p className="muted">Há uma chave configurada nesta sessão. A conexão é verificada ao enviar uma ação.</p>}{error&&<p className="error" role="alert">{error}</p>}<button className="primary-button" disabled={!draftKey.trim()} onClick={configure}>Salvar chave nesta sessão</button>{key&&<button className="secondary-button" onClick={()=>{setKey('');setDraftKey('');setSettings(false);setError('');}}>Remover chave desta sessão</button>}<p className="field-note">Duas chamadas por ação: interpretação e narração. Nenhuma contratação ou cobrança é ativada pelo jogo. Se sua conta já usa faturamento, aplicam-se as condições do Google. <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noreferrer">Consultar preços e limites.</a></p></DialogContent></Dialog>
  <Dialog open={rules} onOpenChange={setRules}><DialogContent className="game-dialog"><DialogHeader><DialogTitle>O mundo responde. Você escolhe.</DialogTitle><DialogDescription>Regras pequenas para uma aventura aberta.</DialogDescription></DialogHeader><p>Escolha uma sugestão ou, com a IA conectada, descreva uma ação. O narrador interpreta sua intenção; o jogo resolve os testes.</p><ul className="rules-list"><li><b>Testes:</b> d12 + atributo. Dificuldade 6, 9 ou 12. Até 2 pontos abaixo: sucesso com custo. Abaixo disso: fracasso.</li><li><b>Consequências:</b> apenas ações com risco físico podem tirar vida. Com 1 de vida, uma derrota força sua retirada.</li><li><b>Equipamento:</b> seu objeto é comum, independentemente do nome. O nome não concede poderes especiais.</li><li><b>Magia:</b> Centelha cria uma pequena chama e gasta 2 de energia. Descansar em segurança recupera até 3 de vida e 2 de energia.</li><li><b>Memória:</b> o narrador recebe um resumo da aventura e as últimas cenas. Aventuras com IA são salvas na conta. A demonstração dura apenas nesta página. O histórico exibido inclui até 100 turnos recentes.</li></ul></DialogContent></Dialog>
  <AlertDialog open={reset} onOpenChange={setReset}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Começar uma nova história?</AlertDialogTitle><AlertDialogDescription>Aventuras com IA permanecem salvas na sua conta. O progresso da demonstração será descartado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Continuar aventura</AlertDialogCancel><AlertDialogAction onClick={()=>{setStarted(false);setCampaignId(null);setPending(null);creationId.current=null;setCharacter({name:'',origin:'',goal:'',weapon:''});setEntries([]);setState(initialState);setAction('');setError('');}}>Criar personagem</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>;
}
