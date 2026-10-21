-- Morrer passa a custar só 1 equipamento (sorteado pelo servidor de jogo, que o tira de p_items).
-- O equipamento que sobrou volta para o inventário em qualquer desfecho; gold só para quem sai vivo.
create or replace function public.finish_run(
  p_match_id uuid,
  p_profile_id uuid,
  p_class_id text,
  p_outcome text,
  p_level int,
  p_loot int,
  p_items text[] default '{}'
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_survived boolean := p_outcome in ('escaped', 'completed');
  v_gold int := case when v_survived then greatest(p_loot, 0) else 0 end;
begin
  insert into public.matches (id) values (p_match_id) on conflict (id) do nothing;

  insert into public.match_players (match_id, profile_id, class_id, outcome, level_reached, loot_value, gold_awarded)
  values (p_match_id, p_profile_id, p_class_id, p_outcome, p_level, greatest(p_loot, 0), v_gold);

  update public.profiles set gold = gold + v_gold where id = p_profile_id;

  insert into public.profile_items (profile_id, item_id, source)
  select p_profile_id, i, 'hunt' from unnest(p_items) i
  where exists (select 1 from public.market_items m where m.item_id = i);
  return v_gold;
end;
$$;

revoke execute on function public.finish_run(uuid, uuid, text, text, int, int, text[]) from public, anon, authenticated;
grant execute on function public.finish_run(uuid, uuid, text, text, int, int, text[]) to service_role;
