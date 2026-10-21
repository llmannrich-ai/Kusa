-- Cofre e bag (parte 2, ver 20261021110000_cofre_bag.sql): o fim da hunt.
-- finish_run mantém a assinatura e passa a devolver o equipamento vestido; a bag de quem sai vivo
-- vai para o cofre pelo store_bag, que o servidor de jogo chama logo depois.

-- Servidor de jogo: esvazia a bag de quem saiu vivo no cofre, melhores itens primeiro; o que não couber
-- fica na bag para a próxima hunt.
create function public.store_bag(p_profile_id uuid, p_bag text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_free int;
  v_item text;
begin
  perform 1 from public.profiles where id = p_profile_id for update;
  v_free := greatest(20 - public.vault_count(p_profile_id), 0);
  for v_item in
    select i from unnest(p_bag) i
    where exists (select 1 from public.market_items m where m.item_id = i)
    order by split_part(i, '-', 2)::int desc
  loop
    insert into public.profile_items (profile_id, item_id, source, location)
    values (p_profile_id, v_item, 'hunt', case when v_free > 0 then 'vault' else 'bag' end);
    v_free := v_free - 1;
  end loop;
end;
$$;

revoke execute on function public.store_bag(uuid, text[]) from public, anon, authenticated;
grant execute on function public.store_bag(uuid, text[]) to service_role;

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
  v_item text;
  v_rest text[] := '{}';
begin
  insert into public.matches (id) values (p_match_id) on conflict (id) do nothing;

  insert into public.match_players (match_id, profile_id, class_id, outcome, level_reached, loot_value, gold_awarded)
  values (p_match_id, p_profile_id, p_class_id, p_outcome, p_level, greatest(p_loot, 0), v_gold);

  update public.profiles set gold = gold + v_gold where id = p_profile_id;
  perform 1 from public.profiles where id = p_profile_id for update;

  -- O equipamento que sobrou no corpo volta equipado. Se o jogador equipou outro item no mesmo slot
  -- pelo menu durante a hunt, o vestido vai para o cofre (ou para a bag, com o cofre cheio).
  foreach v_item in array p_items loop
    if not exists (select 1 from public.market_items m where m.item_id = v_item) then continue; end if;
    if exists (select 1 from public.profile_items
               where profile_id = p_profile_id and equipped and slot = split_part(v_item, '-', 1)) then
      v_rest := v_rest || v_item;
    else
      insert into public.profile_items (profile_id, item_id, source, equipped) values (p_profile_id, v_item, 'hunt', true);
    end if;
  end loop;
  perform public.store_bag(p_profile_id, v_rest);
  return v_gold;
end;
$$;
