-- Hunt solo: a simulação roda no aparelho do jogador (apps/client/src/solo.ts), então o banco não confia
-- no resultado. start_solo_run sorteia a seed e tira equipamento e bag da conta; finish_solo_run corta o que
-- não for plausível e entrega o resto pelos mesmos finish_run e store_bag das hunts em equipe.
-- Os limites repetem SOLO_LIMITS (packages/shared/src/solo.ts) e a duração dos mapas (packages/shared/src/maps.ts):
-- mude os dois juntos.

create table public.solo_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  class_id text not null,
  map_id text not null check (map_id in ('crypt', 'swamp')),
  seed int not null,
  -- O que entrou com o jogador: pode voltar sem contar no teto diário.
  loadout text[] not null default '{}',
  bag text[] not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text check (outcome in ('died', 'escaped', 'completed', 'buried')),
  gold_awarded int not null default 0,
  -- Preço de venda dos itens novos que saíram da dungeon (conta no teto diário).
  items_value int not null default 0
);

alter table public.solo_runs enable row level security;
create policy "jogador vê as próprias hunts solo"
  on public.solo_runs for select to authenticated
  using ((select auth.uid()) = profile_id);
create index solo_runs_profile_finished_idx on public.solo_runs (profile_id, finished_at);

-- A telemetria passa a separar as hunts solo: os números delas vêm do aparelho do jogador.
alter table public.telemetry_runs add column solo boolean not null default false;

-- Tira um item sorteado da lista (o equipamento perdido na morte).
create function public.drop_random_item(p_items text[])
returns text[]
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_n int := coalesce(array_length(p_items, 1), 0);
  v_i int;
begin
  if v_n = 0 then return p_items; end if;
  v_i := 1 + floor(random() * v_n)::int;
  return p_items[:v_i - 1] || p_items[v_i + 1:];
end;
$$;

revoke execute on function public.drop_random_item(text[]) from public, anon, authenticated;

-- Começa uma hunt solo. Hunt solo aberta de antes (aba fechada no meio) conta como morte, como sair de uma
-- hunt em equipe: perde 1 equipamento sorteado e a bag; o resto do equipamento volta.
create function public.start_solo_run(p_class_id text, p_map_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_old public.solo_runs;
  v_run public.solo_runs;
  v_items text[];
  v_bag text[];
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  if not exists (select 1 from public.talents where class_id = p_class_id) then raise exception 'classe inválida'; end if;
  if p_map_id is null or p_map_id not in ('crypt', 'swamp') then raise exception 'mapa inválido'; end if;

  for v_old in select * from public.solo_runs where profile_id = v_uid and finished_at is null for update loop
    update public.solo_runs set finished_at = now(), outcome = 'died' where id = v_old.id;
    perform public.finish_run(v_old.id, v_uid, v_old.class_id, 'died', 1, 0, public.drop_random_item(v_old.loadout));
  end loop;

  select coalesce(array_agg(i), '{}') into v_items from public.take_loadout(v_uid) i;
  select coalesce(array_agg(i), '{}') into v_bag from public.take_bag(v_uid) i;

  insert into public.solo_runs (profile_id, class_id, map_id, seed, loadout, bag)
  values (v_uid, p_class_id, p_map_id, floor(random() * 2147483647)::int, v_items, v_bag)
  returning * into v_run;

  return jsonb_build_object(
    'run_id', v_run.id,
    'seed', v_run.seed,
    'items', to_jsonb(v_items),
    'bag', to_jsonb(v_bag),
    'talents', coalesce((select jsonb_object_agg(talent_id, rank) from public.profile_talents where profile_id = v_uid), '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.start_solo_run(text, text) from public, anon;
grant execute on function public.start_solo_run(text, text) to authenticated;

-- Termina a hunt solo e credita o que for plausível. Devolve { gold, items, bag } de fato creditados.
create function public.finish_solo_run(
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
  v_max_loot := case v_run.map_id when 'swamp' then 2700 else 1050 end;
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

  -- Telemetria (números do aparelho; relatório grande demais fica sem os detalhes). Relatório malformado
  -- não derruba o resultado: só fica sem a linha de telemetria.
  begin
  insert into public.telemetry_runs (
    match_id, profile_id, player_name, class_id, party_size, map_id, seed, build, outcome, abandoned,
    level, duration_s, loot, max_depth, path_rooms, killed_by, stats, solo
  )
  select v_run.id, v_uid, p.username, v_run.class_id, 1, v_run.map_id, v_run.seed, 'solo', v_outcome,
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

revoke execute on function public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb) from public, anon;
grant execute on function public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb) to authenticated;
