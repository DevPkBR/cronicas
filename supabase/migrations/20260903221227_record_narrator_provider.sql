create function public.finish_turn_with_provider(p_owner uuid,p_turn uuid,p_lease uuid,p_state jsonb,p_entry jsonb,p_provider text)
returns void language plpgsql security invoker set search_path = '' as $$
declare t public.turns; c public.campaigns;
begin
 if char_length(p_provider) not between 1 and 80 then raise exception 'provider_invalid'; end if;
 select * into t from public.turns where id=p_turn and owner_id=p_owner;
 if not found then raise exception 'campaign_not_found'; end if;
 select * into c from public.campaigns where id=t.campaign_id and owner_id=p_owner for update;
 select * into t from public.turns where id=p_turn for update;
 if t.status='completed' then return; end if;
 if t.lease_token is distinct from p_lease or t.lease_until<=now() or t.resolution is null then raise exception 'lease_lost'; end if;
 if c.version<>t.sequence-1 then raise exception 'stale_version'; end if;
 if (p_state->>'hp')::int<>(t.resolution->'state'->>'hp')::int or (p_state->>'energy')::int<>(t.resolution->'state'->>'energy')::int or (p_state->>'turn')::int<>t.sequence then raise exception 'state_mismatch'; end if;
 update public.campaigns set state=p_state,version=t.sequence,updated_at=now() where id=c.id;
 update public.turns set status='completed',entry=p_entry,provider=p_provider,lease_token=null,lease_until=null,updated_at=now() where id=t.id;
end $$;
revoke all on function public.finish_turn_with_provider(uuid,uuid,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_turn_with_provider(uuid,uuid,uuid,jsonb,jsonb,text) to service_role;
