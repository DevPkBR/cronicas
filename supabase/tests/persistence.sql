-- Run against a test/local database with a privileged SQL connection.
-- All fixtures (including auth users) are rolled back. No emails are sent.
begin;
select set_config('test.user_a',gen_random_uuid()::text,true),
       set_config('test.user_b',gen_random_uuid()::text,true),
       set_config('test.character_a',gen_random_uuid()::text,true),
       set_config('test.character_b',gen_random_uuid()::text,true),
       set_config('test.campaign_a',gen_random_uuid()::text,true),
       set_config('test.campaign_b',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values
 (current_setting('test.user_a')::uuid,'authenticated','authenticated'),
 (current_setting('test.user_b')::uuid,'authenticated','authenticated');
insert into public.characters(id,owner_id,name,origin,goal,weapon) values
 (current_setting('test.character_a')::uuid,current_setting('test.user_a')::uuid,'Test A','Viajante','Abrigo','Bastão'),
 (current_setting('test.character_b')::uuid,current_setting('test.user_b')::uuid,'Test B','Artesão','Explorar','Martelo');
insert into public.campaigns(id,owner_id,character_id,state) values
 (current_setting('test.campaign_a')::uuid,current_setting('test.user_a')::uuid,current_setting('test.character_a')::uuid,'{"hp":12,"energy":6,"turn":0,"location":"Breu","memory":"Teste","rival":"Desconhecido"}'),
 (current_setting('test.campaign_b')::uuid,current_setting('test.user_b')::uuid,current_setting('test.character_b')::uuid,'{"hp":12,"energy":6,"turn":0,"location":"Breu","memory":"Teste","rival":"Desconhecido"}');
insert into public.turns(campaign_id,owner_id,request_id,sequence,action,roll) values
 (current_setting('test.campaign_a')::uuid,current_setting('test.user_a')::uuid,gen_random_uuid(),1,'Observar',6),
 (current_setting('test.campaign_b')::uuid,current_setting('test.user_b')::uuid,gen_random_uuid(),1,'Conversar',8);
do $$
begin
 begin
  insert into public.campaigns(owner_id,character_id,state)
  select current_setting('test.user_b')::uuid,character_id,state from public.campaigns where id=current_setting('test.campaign_a')::uuid;
  raise exception 'FAIL: cross-owner character accepted';
 exception when foreign_key_violation then null; end;
 begin
  insert into public.turns(campaign_id,owner_id,request_id,sequence,action,roll,status,intent,resolution,entry)
  values(current_setting('test.campaign_a')::uuid,current_setting('test.user_b')::uuid,gen_random_uuid(),2,'Test',1,'completed','{}','{}','{}');
  raise exception 'FAIL: cross-owner turn accepted';
 exception when foreign_key_violation then null; end;
 begin
  insert into public.turns(campaign_id,owner_id,request_id,sequence,action,roll)
  select campaign_id,owner_id,request_id,sequence,action,roll from public.turns where campaign_id=current_setting('test.campaign_a')::uuid;
  raise exception 'FAIL: duplicate request accepted';
 exception when unique_violation then null; end;
 begin
  insert into public.turns(campaign_id,owner_id,request_id,sequence,action,roll)
  values(current_setting('test.campaign_a')::uuid,current_setting('test.user_a')::uuid,gen_random_uuid(),2,'Outra ação',7);
  raise exception 'FAIL: concurrent unfinished turn accepted';
 exception when unique_violation then null; end;
 begin
  update public.campaigns set state=jsonb_set(state,'{hp}','99') where id=current_setting('test.campaign_a')::uuid;
  raise exception 'FAIL: invalid health accepted';
 exception when check_violation then null; end;
 begin
  update public.campaigns set version=1 where id=current_setting('test.campaign_a')::uuid;
  raise exception 'FAIL: version/state mismatch accepted';
 exception when check_violation then null; end;
 begin
  update public.turns set status='completed' where campaign_id=current_setting('test.campaign_a')::uuid;
  raise exception 'FAIL: incomplete turn completed';
 exception when check_violation then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.user_a'),true);
do $$
declare t text; n integer;
begin
 foreach t in array array['characters','campaigns','turns'] loop
  execute format('select count(*) from public.%I where owner_id = %L::uuid',t,current_setting('test.user_a')) into n;
  if n<>1 then raise exception 'FAIL: own row inaccessible in %',t; end if;
  execute format('select count(*) from public.%I where owner_id = %L::uuid',t,current_setting('test.user_b')) into n;
  if n<>0 then raise exception 'FAIL: other user visible in %',t; end if;
  if has_table_privilege('authenticated','public.'||t,'INSERT') or has_table_privilege('authenticated','public.'||t,'UPDATE') or has_table_privilege('authenticated','public.'||t,'DELETE') then
   raise exception 'FAIL: client writes allowed in %',t;
  end if;
 end loop;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
do $$
begin
 if (select count(*) from public.campaigns where owner_id=current_setting('test.user_b')::uuid)<>1
 or (select count(*) from public.campaigns where owner_id=current_setting('test.user_a')::uuid)<>0 then
  raise exception 'FAIL: second user isolation';
 end if;
end $$;
reset role;
do $$
declare t text;
begin
 foreach t in array array['characters','campaigns','turns'] loop
  if has_table_privilege('anon','public.'||t,'SELECT') then raise exception 'FAIL: anonymous read allowed in %',t; end if;
 end loop;
end $$;
select 'PASS: ownership isolation, server-only writes, cross-owner FKs, duplicate/concurrent turns, state constraints' as result;
rollback;
