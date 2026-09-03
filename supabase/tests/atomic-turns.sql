-- Privileged connection; isolated fixtures, no email, full rollback.
begin;
do $$
declare owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid(); campaign_id uuid:=gen_random_uuid(); request_id uuid:=gen_random_uuid(); lease_a uuid:=gen_random_uuid(); lease_b uuid:=gen_random_uuid(); t public.turns; same public.turns; signature text;
 start_state jsonb:='{"hp":12,"energy":6,"turn":0,"location":"Breu","memory":"Test","rival":"Ivo"}';
 next_state jsonb:='{"hp":9,"energy":6,"turn":1,"location":"Breu","memory":"Test","rival":"Ivo"}';
begin
 insert into auth.users(id,aud,role) values(owner_a,'authenticated','authenticated'),(owner_b,'authenticated','authenticated');
 perform public.create_campaign(owner_a,campaign_id,'{"name":"A","origin":"Viajante","goal":"Abrigo","weapon":"Bastão"}',start_state);
 perform public.create_campaign(owner_a,campaign_id,'{"name":"A","origin":"Viajante","goal":"Abrigo","weapon":"Bastão"}',start_state);
 if (select count(*) from public.characters where owner_id=owner_a)<>1 then raise exception 'FAIL duplicate creation'; end if;
 begin
  perform public.reserve_turn(owner_b,campaign_id,request_id,'Agir',0,1::smallint,lease_a);
  raise exception 'FAIL cross owner';
 exception when raise_exception then if sqlerrm<>'campaign_not_found' then raise; end if; end;
 t:=public.reserve_turn(owner_a,campaign_id,request_id,'Agir',0,1::smallint,lease_a);
 begin
  perform public.reserve_turn(owner_a,campaign_id,request_id,'Agir',0,12::smallint,lease_b);
  raise exception 'FAIL concurrent lease';
 exception when raise_exception then if sqlerrm<>'turn_busy' then raise; end if; end;
 perform public.checkpoint_turn(owner_a,t.id,lease_a,'{"kind":"test"}',jsonb_build_object('state',next_state));
 perform public.release_turn(owner_a,t.id,lease_a);
 begin
  perform public.reserve_turn(owner_a,campaign_id,gen_random_uuid(),'Outra',0,12::smallint,lease_b);
  raise exception 'FAIL pending replaced';
 exception when raise_exception then if sqlerrm<>'pending_turn' then raise; end if; end;
 same:=public.reserve_turn(owner_a,campaign_id,request_id,'Agir',0,12::smallint,lease_b);
 if same.id<>t.id or same.roll<>1 or same.resolution is null then raise exception 'FAIL retry lost result'; end if;
 begin
  perform public.finish_turn(owner_a,t.id,lease_a,next_state,'{"text":"stale"}');
  raise exception 'FAIL stale lease';
 exception when raise_exception then if sqlerrm<>'lease_lost' then raise; end if; end;
 begin
  perform public.finish_turn(owner_a,t.id,lease_b,jsonb_set(next_state,'{hp}','12'),'{}');
  raise exception 'FAIL changed mechanical outcome';
 exception when raise_exception then if sqlerrm<>'state_mismatch' then raise; end if; end;
 perform public.finish_turn(owner_a,t.id,lease_b,next_state,'{"text":"Concluído"}');
 perform public.finish_turn(owner_a,t.id,lease_b,next_state,'{"text":"Duplicado"}');
 same:=public.reserve_turn(owner_a,campaign_id,request_id,'Agir',0,12::smallint,lease_a);
 if same.entry->>'text'<>'Concluído' or same.status<>'completed' or (select version from public.campaigns where id=campaign_id)<>1 then raise exception 'FAIL duplicate completion'; end if;
 foreach signature in array array['create_campaign(uuid,uuid,jsonb,jsonb)','reserve_turn(uuid,uuid,uuid,text,integer,smallint,uuid)','checkpoint_turn(uuid,uuid,uuid,jsonb,jsonb)','finish_turn(uuid,uuid,uuid,jsonb,jsonb)','release_turn(uuid,uuid,uuid)'] loop
  if has_function_privilege('authenticated','public.'||signature,'EXECUTE') or has_function_privilege('anon','public.'||signature,'EXECUTE') or not has_function_privilege('service_role','public.'||signature,'EXECUTE') then raise exception 'FAIL function grants'; end if;
 end loop;
end $$;
select 'PASS: atomic creation, ownership, exclusive lease, retry retains roll/result, stale lease rejected, immutable outcome, idempotent completion, server-only functions' as result;
rollback;
