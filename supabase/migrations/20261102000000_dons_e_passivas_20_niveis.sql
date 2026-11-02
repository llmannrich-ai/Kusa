-- Grimório 4.0, fase 1 (docs/GRIMORIO_4_PLANO.md): passivas compradas com gold.
-- 1) Dons: 12 nós novos (um no topo de cada ramo), 25 níveis, 60 de gold e ×1,12 por nível. Pedem o primeiro nó do
--    tronco do ramo (como o Tomo). Não são magias (is_spell fica false): `buy_talent` já trata isso sem mudança.
-- 2) Áureas e Tomos vão até o nível 20 (a Áurea de velocidade, até o 6). Os níveis que a conta já tem não mudam; o
--    preço passa a crescer ×1,15 (áureas), ×1,3 (velocidade) e ×1,12 (Tomos) em vez de ×1,8, então os níveis 2 e 3
--    ficam mais baratos para quem ainda não comprou.
-- 3) `buy_talent_levels`: compra até 5 níveis de uma vez, numa transação só (as mesmas regras do `buy_talent`).
-- Catálogo em packages/shared/src/talents.ts (AURA_RULES, TOME_RULE) e gifts.ts: mude os dois juntos.

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('knight_honed_edge', 'knight', 25, 60, 1.12, 0, 'knight_damage', 1),
  ('knight_tanned_hide', 'knight', 25, 60, 1.12, 0, 'knight_hp', 1),
  ('knight_command_voice', 'knight', 25, 60, 1.12, 0, 'knight_war_cry', 1),
  ('paladin_patient_eye', 'paladin', 25, 60, 1.12, 0, 'paladin_damage', 1),
  ('paladin_burning_faith', 'paladin', 25, 60, 1.12, 0, 'paladin_hp', 1),
  ('paladin_tracker_step', 'paladin', 25, 60, 1.12, 0, 'paladin_arrow_rain', 1),
  ('sorcerer_conductor', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_damage', 1),
  ('sorcerer_cold_heart', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_mana', 1),
  ('sorcerer_shadow_hunger', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_void_storm', 1),
  ('druid_pack_bond', 'druid', 25, 60, 1.12, 0, 'druid_damage', 1),
  ('druid_ancient_sap', 'druid', 25, 60, 1.12, 0, 'druid_mana', 1),
  ('druid_venom_sap', 'druid', 25, 60, 1.12, 0, 'druid_thorn_roots', 1);

update public.talents set max_rank = 20, cost_growth = 1.15
where id in (
  'knight_damage', 'knight_hp', 'knight_mana', 'paladin_damage', 'paladin_hp', 'paladin_mana',
  'sorcerer_damage', 'sorcerer_hp', 'sorcerer_mana', 'druid_damage', 'druid_hp', 'druid_mana'
);

update public.talents set max_rank = 6, cost_growth = 1.3
where id in ('knight_speed', 'paladin_speed', 'sorcerer_speed', 'druid_speed');

update public.talents set max_rank = 20, cost_growth = 1.12
where id in (
  'knight_tome0', 'knight_tome1', 'knight_tome2', 'paladin_tome0', 'paladin_tome1', 'paladin_tome2',
  'sorcerer_tome0', 'sorcerer_tome1', 'sorcerer_tome2', 'druid_tome0', 'druid_tome1', 'druid_tome2'
);

-- Compra `p_count` níveis seguidos (1 a 5). Cada nível passa pelo `buy_talent` (pré-requisito, gold, teto e trava do
-- perfil); se um falhar, nada é comprado. Devolve o gold que sobrou.
create or replace function public.buy_talent_levels(p_talent_id text, p_count int)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gold bigint;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if p_count is null or p_count < 1 or p_count > 5 then raise exception 'quantidade inválida'; end if;
  for i in 1 .. p_count loop
    v_gold := public.buy_talent(p_talent_id);
  end loop;
  return v_gold;
end;
$$;

revoke execute on function public.buy_talent_levels(text, int) from public, anon;
grant execute on function public.buy_talent_levels(text, int) to authenticated;
