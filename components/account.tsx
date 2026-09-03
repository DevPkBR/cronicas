'use client';
import { useState } from 'react';
import { browserDatabase } from '@/lib/supabase-browser';
export function Account({email,onClose}:{email?:string;onClose:()=>void}){
 const [address,setAddress]=useState('');const [password,setPassword]=useState('');
 const [mode,setMode]=useState<'login'|'signup'|'reset'|'password'>('login');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setMessage('');
 try{
  const auth=browserDatabase().auth;const redirect=window.location.origin+'/';
  const result=mode==='signup'?await auth.signUp({email:address,password,options:{emailRedirectTo:redirect}}):mode==='reset'?await auth.resetPasswordForEmail(address,{redirectTo:redirect}):mode==='password'?await auth.updateUser({password}):await auth.signInWithPassword({email:address,password});
  if(result.error){setMessage(result.error.code==='invalid_credentials'?'E-mail ou senha incorretos.':result.error.code==='email_not_confirmed'?'Confirme seu e-mail antes de entrar.':'Não foi possível concluir. Confira os dados e a configuração de e-mail do projeto; aguarde antes de tentar novamente.');return;}
  if(mode==='login'||mode==='password'){onClose();return;}
  setMessage(mode==='signup'?'Cadastro recebido. Confira o e-mail de confirmação antes de entrar.':'Se houver uma conta habilitada, você receberá um link para redefinir a senha.');
 }catch{setMessage('Não foi possível acessar sua conta. Tente novamente.');}finally{setBusy(false);}}
 return <div>{email?<><p>Conectado como {email}</p><button className="secondary-button" onClick={()=>setMode('password')}>Alterar senha</button><button className="secondary-button" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await browserDatabase().auth.signOut({scope:'local'});if(result.error)throw result.error;onClose();}catch{setMessage('Não foi possível sair. Tente novamente.');}finally{setBusy(false);}}}>Sair desta sessão</button></>:null}
 {(!email||mode==='password')&&<form onSubmit={submit}>
 <p>{mode==='signup'?'Crie sua conta para salvar aventuras.':mode==='reset'?'Receba um link para recuperar sua conta.':mode==='password'?'Defina sua nova senha.':'Entre para continuar suas aventuras.'}</p>
 {mode!=='password'&&<label>E-mail<input type="email" autoComplete="email" required maxLength={254} value={address} onChange={e=>setAddress(e.target.value)}/></label>}
 {mode!=='reset'&&<label>Senha<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?1:8} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 <button className="primary-button" disabled={busy}>{busy?'Aguarde…':mode==='signup'?'Criar conta':mode==='reset'?'Enviar link':mode==='password'?'Salvar senha':'Entrar'}</button>
 {!email&&<div className="account-links">{(['login','signup','reset'] as const).filter(m=>m!==mode).map(m=><button type="button" key={m} disabled={busy} onClick={()=>{setMode(m);setMessage('');}}>{m==='login'?'Já tenho conta':m==='signup'?'Criar conta':'Esqueci a senha'}</button>)}</div>}
 </form>}{message&&<p role="status">{message}</p>}</div>;
}
