-- Bestiário 2.0: encontros sorteados, Mímicos (que guardam o loot do baú) e Campeões (loot × 2,5) sobem o loot
-- máximo possível de uma hunt. O teto da hunt solo acompanha `SOLO_LIMITS.maxLoot` do packages/shared:
-- Cripta 1050 → 1200 e Pântano 2700 → 3000. O resto da função não muda (inclusive o tamanho da equipe na telemetria,
-- de 20261022130000_sala_hospedada.sql).

create or replace function public.finish_solo_run(
  p_run_id uuid,
  p_outcome text,
  p_level int,
  p_loot int,
  p_items text[] default '{}',
  p_bag text[] default '{}',
  p_report jsonb default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- SOLO_LIMITS e MAPS[...].durationSeconds.
  c_grace_seconds constant int := 60;
  c_max_new_items constant int := 15;
  c_daily_value constant int := 12000;
  c_spell_xp_per_second constant int := 2;

  v_uid uuid := auth.uid();
  v_run public.solo_runs;
  v_duration int;
  v_max_loot int;
  v_full_loot_seconds int;
  v_elapsed numeric;
  v_outcome text := p_outcome;
  v_survived boolean;
  v_loot int := 0;
  v_budget int;
  v_gold int := 0;
  v_value int := 0;
  v_new int := 0;
  v_pool text[];
  v_items text[] := '{}';
  v_bag text[] := '{}';
  v_item text;
  v_idx int;
  v_price int;
  v_is_bag boolean;
  v_spell_xp jsonb := '{}';
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  if p_outcome is null or p_outcome not in ('died', 'escaped', 'completed', 'buried') then
    raise exception 'resultado inválido';
  end if;

  select * into v_run from public.solo_runs
  where id = p_run_id and profile_id = v_uid and finished_at is null
  for update;
  if not found then raise exception 'hunt solo não encontrada'; end if;

  v_duration := case v_run.map_id when 'swamp' then 480 else 240 end;
  v_max_loot := case v_run.map_id when 'swamp' then 3000 else 1200 end;
  v_full_loot_seconds := case v_run.map_id when 'swamp' then 180 else 90 end;

  v_elapsed := extract(epoch from now() - v_run.started_at);
  -- Resultado que chega depois do fim da hunt (mais a folga) não vale: o mapa já desabou.
  if v_elapsed > v_duration + c_grace_seconds then v_outcome := 'buried'; end if;
  v_survived := v_outcome in ('escaped', 'completed');

  if v_survived then
    -- O teto cresce com o tempo de hunt: ninguém junta o loot do mapa inteiro em segundos.
    v_loot := least(greatest(coalesce(p_loot, 0), 0), floor(v_max_loot * least(1, v_elapsed / v_full_loot_seconds)))::int;
  end if;

  perform 1 from public.profiles where id = v_uid for update;
  select greatest(0, c_daily_value - coalesce(sum(gold_awarded + items_value), 0))::int into v_budget
  from public.solo_runs
  where profile_id = v_uid and finished_at > now() - interval '24 hours';
  v_gold := least(v_loot, v_budget);
  v_budget := v_budget - v_gold;

  -- O que entrou com o jogador volta sem custo; item novo precisa caber no teto diário.
  -- Quem morre perde a bag (o cliente já manda vazia; aqui garante).
  v_pool := v_run.loadout || v_run.bag;
  for v_item, v_is_bag in
    select i, false from unnest(coalesce(p_items, '{}')) i
    union all
    select i, true from unnest(case when v_survived then coalesce(p_bag, '{}') else '{}' end) i
  loop
    v_idx := array_position(v_pool, v_item);
    if v_idx is not null then
      v_pool := v_pool[:v_idx - 1] || v_pool[v_idx + 1:];
    else
      select sell_price into v_price from public.market_items where item_id = v_item;
      continue when v_price is null or v_new >= c_max_new_items or v_price > v_budget;
      v_new := v_new + 1;
      v_budget := v_budget - v_price;
      v_value := v_value + v_price;
    end if;
    if v_is_bag then v_bag := v_bag || v_item; else v_items := v_items || v_item; end if;
  end loop;

  -- Saiu vivo mas chegou tarde: soterrado, perde 1 equipamento sorteado e a bag, como no servidor.
  if v_outcome <> p_outcome and p_outcome in ('escaped', 'completed') then
    v_items := public.drop_random_item(v_items);
    v_bag := '{}';
  end if;

  update public.solo_runs
  set finished_at = now(), outcome = v_outcome, gold_awarded = v_gold, items_value = v_value
  where id = v_run.id;

  perform public.finish_run(v_run.id, v_uid, v_run.class_id, v_outcome, least(greatest(coalesce(p_level, 1), 1), 20), v_gold, v_items);
  if v_survived and coalesce(array_length(v_bag, 1), 0) > 0 then perform public.store_bag(v_uid, v_bag); end if;

  -- XP das magias: valor que não é número vira 0; acima do que o tempo de hunt permite é cortado.
  if jsonb_typeof(p_report -> 'spell_xp') = 'object' then
    select coalesce(jsonb_object_agg(key, least(
      case when value ~ '^[0-9]{1,9}$' then value::int else 0 end,
      floor(least(v_elapsed, v_duration + c_grace_seconds) * c_spell_xp_per_second)::int)), '{}')
    into v_spell_xp
    from jsonb_each_text(p_report -> 'spell_xp');
  end if;
  perform public.record_spell_xp(v_uid, v_run.class_id, v_outcome, v_spell_xp);

  -- Telemetria (números do aparelho; relatório grande demais fica sem os detalhes). Relatório malformado
  -- não derruba o resultado: só fica sem a linha de telemetria.
  begin
  insert into public.telemetry_runs (
    match_id, profile_id, player_name, class_id, party_size, map_id, seed, build, outcome, abandoned,
    level, duration_s, loot, max_depth, path_rooms, killed_by, stats, solo
  )
  select v_run.id, v_uid, p.username, v_run.class_id,
    least(greatest(coalesce((p_report ->> 'party_size')::int, 1), 1), 4),
    v_run.map_id, v_run.seed, 'solo', v_outcome,
    coalesce((p_report ->> 'abandoned')::boolean, false),
    least(greatest(coalesce(p_level, 1), 1), 20),
    least(greatest(coalesce((p_report ->> 'duration_s')::numeric, v_elapsed), 0), v_elapsed),
    v_loot,
    coalesce((p_report ->> 'max_depth')::int, -1),
    coalesce((p_report ->> 'path_rooms')::int, 0),
    left(p_report ->> 'killed_by', 40),
    case when pg_column_size(p_report) <= 65536 then coalesce(p_report -> 'stats', '{}'::jsonb) else '{}'::jsonb end,
    true
  from public.profiles p where p.id = v_uid;
  exception when others then
    raise warning 'telemetria da hunt solo % descartada: %', v_run.id, sqlerrm;
  end;

  return jsonb_build_object('gold', v_gold, 'items', to_jsonb(v_items), 'bag', to_jsonb(v_bag));
end;
$$;
