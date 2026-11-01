-- Classe nova: Xamã Orc ('shaman'), Fase 1 (docs/CLASSE_XAMA_ORC.md).
--   - Abre na conta inteira quando qualquer personagem dela vence Vorgak ('emberWarlord') na Fortaleza Orc
--     (`CLASS_UNLOCK` em packages/shared/src/classes.ts; aqui `class_unlocked_by_boss` e `class_unlocked`, mude os dois
--     juntos). O servidor de jogo confere ao entrar na sala; a hunt solo e a sala no aparelho, em `start_solo_run`.
--   - Começa a campanha no Pântano como qualquer personagem (o progresso continua por conta e classe).
--   - Veste os cajados, as varinhas e as vestes arcanas (como o Feiticeiro e o Druida) e o escudo.
--   - Grimório da Fase 1: as 2 iniciais (Totem da Brasa e Tambor de Guerra), as áureas de dano, mana e vida, o Tomo
--     da Brasa e os 3 Dons (Grito do Clã, Casca de Ferro, Brasa Viva). Os ramos Horda, Totens e Brasa crescem na Fase 2.

-- 1. A classe entra nas restrições de todas as tabelas por classe.
alter table public.talents drop constraint talents_class_id_check;
alter table public.talents add constraint talents_class_id_check
  check (class_id in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman'));
alter table public.profile_items drop constraint profile_items_class_id_check;
alter table public.profile_items add constraint profile_items_class_id_check
  check (class_id in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman'));
alter table public.profile_boss_runes drop constraint profile_boss_runes_class_id_check;
alter table public.profile_boss_runes add constraint profile_boss_runes_class_id_check
  check (class_id in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman'));
alter table public.profile_map_clears drop constraint profile_map_clears_class_id_check;
alter table public.profile_map_clears add constraint profile_map_clears_class_id_check
  check (class_id in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman'));
alter table public.profile_boss_clears drop constraint profile_boss_clears_class_id_check;
alter table public.profile_boss_clears add constraint profile_boss_clears_class_id_check
  check (class_id in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman'));

-- 2. As funções que listam as classes (finish_run, equip_item, record_map_clear, record_boss_clear,
-- record_solo_map_clear, record_solo_boss_clear, record_boss_runes): troca a lista no texto atual de cada uma, sem
-- reescrever o resto (o `create or replace` de pg_get_functiondef mantém os grants).
do $$
declare
  v_old constant text := $q$'knight', 'paladin', 'sorcerer', 'druid')$q$;
  v_new constant text := $q$'knight', 'paladin', 'sorcerer', 'druid', 'shaman')$q$;
  v_fn record;
  v_count int := 0;
begin
  for v_fn in
    select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and position(v_old in p.prosrc) > 0
  loop
    execute replace(pg_get_functiondef(v_fn.oid), v_old, v_new);
    v_count := v_count + 1;
  end loop;
  if v_count < 7 then raise exception 'esperava 7 funções com a lista de classes, achei %', v_count; end if;
end;
$$;

-- 3. Equipamento: o xamã veste o que o druida veste (cajado, varinha, vestes arcanas e escudo).
update public.market_items set classes = array_append(classes, 'shaman')
where 'druid' = any (classes) and not 'shaman' = any (classes);

-- 4. Desbloqueio da classe. `CLASS_UNLOCK` do packages/shared.
create or replace function public.class_unlocked_by_boss(p_class_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_class_id when 'shaman' then 'emberWarlord' else null end;
$$;

-- A classe está aberta para a conta? Qualquer personagem da conta que venceu o boss abre a classe para todos.
create or replace function public.class_unlocked(p_profile_id uuid, p_class_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.class_unlocked_by_boss(p_class_id) is null or exists (
    select 1 from public.profile_boss_clears b
    where b.profile_id = p_profile_id and b.boss_kind = public.class_unlocked_by_boss(p_class_id)
  );
$$;

revoke execute on function public.class_unlocked(uuid, text) from public, anon, authenticated;
grant execute on function public.class_unlocked(uuid, text) to service_role;

-- 5. Hunt solo e sala no aparelho: classe trancada não começa hunt.
do $$
declare
  v_start text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_anchor constant text := $q$if not exists (select 1 from public.talents where class_id = p_class_id) then raise exception 'classe inválida'; end if;$q$;
  v_check constant text := $q$
  if not public.class_unlocked(v_uid, p_class_id) then raise exception 'classe trancada: vença o boss que a abre'; end if;$q$;
begin
  if position('public.class_unlocked(' in v_start) > 0 then return; end if;
  if position(v_anchor in v_start) = 0 then raise exception 'start_solo_run: verificação da classe não encontrada'; end if;
  execute replace(v_start, v_anchor, v_anchor || v_check);
end;
$$;

-- 6. Grimório da Fase 1 (`SHAPES.shaman`, `TOME_LANES`, `AURA_RULES` e `TOME_RULE` em talents.ts; Dons em
-- gifts.ts): as 2 iniciais grátis, as áureas de dano, mana e vida (20 níveis), o Tomo da Brasa (20 níveis) e um Dom por
-- ramo (25 níveis), cada um pedindo o primeiro nó do tronco do ramo.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, requires_id, requires_rank, free_rank, is_spell) values
  ('shaman_ember_totem', 'shaman', 1, 150, 1, null, 0, 1, true),
  ('shaman_war_drum', 'shaman', 1, 150, 1, 'shaman_ember_totem', 1, 1, true),
  ('shaman_damage', 'shaman', 20, 120, 1.15, 'shaman_ember_totem', 1, 0, false),
  ('shaman_mana', 'shaman', 20, 150, 1.15, 'shaman_ember_totem', 1, 0, false),
  ('shaman_hp', 'shaman', 20, 120, 1.15, 'shaman_war_drum', 1, 0, false),
  ('shaman_tome2', 'shaman', 20, 300, 1.12, 'shaman_war_drum', 1, 0, false),
  ('shaman_clan_cry', 'shaman', 25, 60, 1.12, 'shaman_damage', 1, 0, false),
  ('shaman_ironwood_skin', 'shaman', 25, 60, 1.12, 'shaman_mana', 1, 0, false),
  ('shaman_living_ember', 'shaman', 25, 60, 1.12, 'shaman_war_drum', 1, 0, false);
