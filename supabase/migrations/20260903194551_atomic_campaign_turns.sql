alter table public.turns add column lease_token uuid, add column lease_until timestamptz;

create function public.create_campaign(p_owner uuid, p_id uuid, p_character jsonb, p_state jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_character uuid; v_existing public.campaigns;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 select * into v_existing from public.campaigns where id=p_id;
 if found then
  if v_existing.owner_id<>p_owner then raise exception 'campaign_not_found'; end if;
  return p_id;
 end if;
 if (select count(*) from public.campaigns where owner_id=p_owner)>=20 then raise exception 'campaign_limit'; end if;
 insert into public.characters(owner_id,name,origin,goal,weapon)
 values(p_owner,p_character->>'name',p_character->>'origin',p_character->>'goal',p_character->>'weapon') returning id into v_character;
 insert into public.campaigns(id,owner_id,character_id,state) values(p_id,p_owner,v_character,p_state);
 return p_id;
end $$;

create function public.reserve_turn(p_owner uuid,p_campaign uuid,p_request uuid,p_action text,p_version integer,p_roll smallint,p_lease uuid)
returns public.turns language plpgsql security invoker set search_path = '' as $$
declare c public.campaigns; t public.turns;
begin
 select * into c from public.campaigns where id=p_campaign and owner_id=p_owner and status='active' for update;
 if not found then raise exception 'campaign_not_found'; end if;
 select * into t from public.turns where campaign_id=p_campaign and request_id=p_request;
 if found then
  if t.action<>p_action then raise exception 'request_mismatch'; end if;
  if t.status='completed' then return t; end if;
  if t.lease_until>now() then raise exception 'turn_busy'; end if;
 else
  if c.version<>p_version then raise exception 'stale_version'; end if;
  if exists(select 1 from public.turns where campaign_id=p_campaign and status<>'completed') then raise exception 'pending_turn'; end if;
  insert into public.turns(campaign_id,owner_id,request_id,sequence,action,roll)
  values(p_campaign,p_owner,p_request,c.version+1,p_action,p_roll) returning * into t;
 end if;
 update public.turns set lease_token=p_lease,lease_until=now()+interval '120 seconds',updated_at=now(),error_code=null where id=t.id returning * into t;
 return t;
end $$;

create function public.checkpoint_turn(p_owner uuid,p_turn uuid,p_lease uuid,p_intent jsonb,p_resolution jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
 update public.turns set intent=p_intent,resolution=p_resolution,status='resolved',updated_at=now()
 where id=p_turn and owner_id=p_owner and lease_token=p_lease and lease_until>now() and status<>'completed' and resolution is null;
 if not found then raise exception 'lease_lost'; end if;
end $$;

create function public.finish_turn(p_owner uuid,p_turn uuid,p_lease uuid,p_state jsonb,p_entry jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare t public.turns; c public.campaigns;
begin
 select * into t from public.turns where id=p_turn and owner_id=p_owner;
 if not found then raise exception 'campaign_not_found'; end if;
 select * into c from public.campaigns where id=t.campaign_id and owner_id=p_owner for update;
 select * into t from public.turns where id=p_turn for update;
 if t.status='completed' then return; end if;
 if t.lease_token is distinct from p_lease or t.lease_until<=now() or t.resolution is null then raise exception 'lease_lost'; end if;
 if c.version<>t.sequence-1 then raise exception 'stale_version'; end if;
 if (p_state->>'hp')::int<>(t.resolution->'state'->>'hp')::int or (p_state->>'energy')::int<>(t.resolution->'state'->>'energy')::int or (p_state->>'turn')::int<>t.sequence then raise exception 'state_mismatch'; end if;
 update public.campaigns set state=p_state,version=t.sequence,updated_at=now() where id=c.id;
 update public.turns set status='completed',entry=p_entry,provider='gemini-2.5-flash-lite',lease_token=null,lease_until=null,updated_at=now() where id=t.id;
end $$;

create function public.release_turn(p_owner uuid,p_turn uuid,p_lease uuid)
returns void language sql security invoker set search_path = '' as $$
 update public.turns set lease_token=null,lease_until=null,status=case when resolution is null then 'failed' else 'resolved' end,error_code='narrator_failed',updated_at=now()
 where id=p_turn and owner_id=p_owner and lease_token=p_lease and status<>'completed';
$$;

revoke all on function public.create_campaign(uuid,uuid,jsonb,jsonb),public.reserve_turn(uuid,uuid,uuid,text,integer,smallint,uuid),public.checkpoint_turn(uuid,uuid,uuid,jsonb,jsonb),public.finish_turn(uuid,uuid,uuid,jsonb,jsonb),public.release_turn(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_campaign(uuid,uuid,jsonb,jsonb),public.reserve_turn(uuid,uuid,uuid,text,integer,smallint,uuid),public.checkpoint_turn(uuid,uuid,uuid,jsonb,jsonb),public.finish_turn(uuid,uuid,uuid,jsonb,jsonb),public.release_turn(uuid,uuid,uuid) to service_role;
