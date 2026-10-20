-- Grimório: a árvore de magias vira uma árvore de verdade, com 3 ramos por classe e mais magias
-- (escudo do Cavaleiro, invocações do Druida etc.). As magias passam a ter 3 níveis, e as 2
-- iniciais de cada classe entram na árvore já no nível 1 (free_rank), com os níveis 2 e 3 à venda.
-- O catálogo repete packages/shared/src/talents.ts; mude os dois juntos. Os ids antigos continuam
-- valendo, então nada do que os jogadores já compraram se perde.

alter table public.talents
  add column free_rank int not null default 0 check (free_rank >= 0);
alter table public.talents
  add constraint talents_free_rank_le_max check (free_rank <= max_rank);

-- Catálogo: primeiro os nós (sem pai, por causa da chave estrangeira), depois os galhos.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank) values
  ('knight_blade_spin', 'knight', 3, 150, 1.6, 1),
  ('knight_damage', 'knight', 3, 120, 1.8, 0),
  ('knight_hp', 'knight', 3, 120, 1.8, 0),
  ('knight_war_cry', 'knight', 3, 150, 1.6, 1),
  ('knight_crushing_blow', 'knight', 3, 300, 1.6, 0),
  ('knight_holy_shield', 'knight', 3, 300, 1.6, 0),
  ('knight_mana', 'knight', 3, 150, 1.8, 0),
  ('knight_vampiric_blade', 'knight', 3, 500, 1.6, 0),
  ('knight_iron_skin', 'knight', 3, 500, 1.6, 0),
  ('knight_speed', 'knight', 2, 300, 1.8, 0),
  ('knight_earthquake', 'knight', 3, 800, 1.6, 0),
  ('knight_steel_wall', 'knight', 3, 800, 1.6, 0),
  ('knight_commander_shout', 'knight', 3, 800, 1.6, 0),
  ('knight_execution', 'knight', 3, 1200, 1.6, 0),
  ('paladin_holy_arrow', 'paladin', 3, 150, 1.6, 1),
  ('paladin_damage', 'paladin', 3, 120, 1.8, 0),
  ('paladin_hp', 'paladin', 3, 120, 1.8, 0),
  ('paladin_arrow_rain', 'paladin', 3, 150, 1.6, 1),
  ('paladin_piercing_shot', 'paladin', 3, 300, 1.6, 0),
  ('paladin_healing_light', 'paladin', 3, 300, 1.6, 0),
  ('paladin_mana', 'paladin', 3, 150, 1.8, 0),
  ('paladin_stun_arrow', 'paladin', 3, 500, 1.6, 0),
  ('paladin_blessed_ward', 'paladin', 3, 500, 1.6, 0),
  ('paladin_speed', 'paladin', 2, 300, 1.8, 0),
  ('paladin_deadly_shot', 'paladin', 3, 800, 1.6, 0),
  ('paladin_divine_judgment', 'paladin', 3, 800, 1.6, 0),
  ('paladin_explosive_volley', 'paladin', 3, 800, 1.6, 0),
  ('sorcerer_shadow_orb', 'sorcerer', 3, 150, 1.6, 1),
  ('sorcerer_damage', 'sorcerer', 3, 120, 1.8, 0),
  ('sorcerer_mana', 'sorcerer', 3, 150, 1.8, 0),
  ('sorcerer_void_storm', 'sorcerer', 3, 150, 1.6, 1),
  ('sorcerer_lightning_bolt', 'sorcerer', 3, 300, 1.6, 0),
  ('sorcerer_frost_nova', 'sorcerer', 3, 300, 1.6, 0),
  ('sorcerer_hp', 'sorcerer', 3, 120, 1.8, 0),
  ('sorcerer_chain_lightning', 'sorcerer', 3, 500, 1.6, 0),
  ('sorcerer_ice_lance', 'sorcerer', 3, 500, 1.6, 0),
  ('sorcerer_drain_life', 'sorcerer', 3, 500, 1.6, 0),
  ('sorcerer_meteor', 'sorcerer', 3, 800, 1.6, 0),
  ('sorcerer_blizzard', 'sorcerer', 3, 800, 1.6, 0),
  ('sorcerer_speed', 'sorcerer', 2, 300, 1.8, 0),
  ('sorcerer_dark_pact', 'sorcerer', 3, 1200, 1.6, 0),
  ('druid_forest_blessing', 'druid', 3, 150, 1.6, 1),
  ('druid_damage', 'druid', 3, 120, 1.8, 0),
  ('druid_mana', 'druid', 3, 150, 1.8, 0),
  ('druid_thorn_roots', 'druid', 3, 150, 1.6, 1),
  ('druid_spirit_wolf', 'druid', 3, 300, 1.6, 0),
  ('druid_healing_moth', 'druid', 3, 300, 1.6, 0),
  ('druid_venom_thorn', 'druid', 3, 300, 1.6, 0),
  ('druid_wolf_pack', 'druid', 3, 500, 1.6, 0),
  ('druid_hp', 'druid', 3, 120, 1.8, 0),
  ('druid_hornet_swarm', 'druid', 3, 500, 1.6, 0),
  ('druid_ancient_bear', 'druid', 3, 800, 1.6, 0),
  ('druid_grove_guardian', 'druid', 3, 800, 1.6, 0),
  ('druid_nature_wrath', 'druid', 3, 800, 1.6, 0),
  ('druid_speed', 'druid', 2, 300, 1.8, 0),
  ('druid_forest_heart', 'druid', 3, 1200, 1.6, 0)
on conflict (id) do update set
  class_id = excluded.class_id,
  max_rank = excluded.max_rank,
  base_cost = excluded.base_cost,
  cost_growth = excluded.cost_growth,
  free_rank = excluded.free_rank,
  requires_id = null,
  requires_rank = 0;

update public.talents t set requires_id = v.requires_id, requires_rank = v.requires_rank
from (values
  ('knight_damage', 'knight_blade_spin', 1),
  ('knight_hp', 'knight_blade_spin', 1),
  ('knight_war_cry', 'knight_blade_spin', 1),
  ('knight_crushing_blow', 'knight_damage', 1),
  ('knight_holy_shield', 'knight_hp', 1),
  ('knight_mana', 'knight_war_cry', 1),
  ('knight_vampiric_blade', 'knight_crushing_blow', 1),
  ('knight_iron_skin', 'knight_holy_shield', 1),
  ('knight_speed', 'knight_mana', 1),
  ('knight_earthquake', 'knight_vampiric_blade', 1),
  ('knight_steel_wall', 'knight_iron_skin', 1),
  ('knight_commander_shout', 'knight_speed', 1),
  ('knight_execution', 'knight_earthquake', 1),
  ('paladin_damage', 'paladin_holy_arrow', 1),
  ('paladin_hp', 'paladin_holy_arrow', 1),
  ('paladin_arrow_rain', 'paladin_holy_arrow', 1),
  ('paladin_piercing_shot', 'paladin_damage', 1),
  ('paladin_healing_light', 'paladin_hp', 1),
  ('paladin_mana', 'paladin_arrow_rain', 1),
  ('paladin_stun_arrow', 'paladin_piercing_shot', 1),
  ('paladin_blessed_ward', 'paladin_healing_light', 1),
  ('paladin_speed', 'paladin_mana', 1),
  ('paladin_deadly_shot', 'paladin_stun_arrow', 1),
  ('paladin_divine_judgment', 'paladin_blessed_ward', 1),
  ('paladin_explosive_volley', 'paladin_speed', 1),
  ('sorcerer_damage', 'sorcerer_shadow_orb', 1),
  ('sorcerer_mana', 'sorcerer_shadow_orb', 1),
  ('sorcerer_void_storm', 'sorcerer_shadow_orb', 1),
  ('sorcerer_lightning_bolt', 'sorcerer_damage', 1),
  ('sorcerer_frost_nova', 'sorcerer_mana', 1),
  ('sorcerer_hp', 'sorcerer_void_storm', 1),
  ('sorcerer_chain_lightning', 'sorcerer_lightning_bolt', 1),
  ('sorcerer_ice_lance', 'sorcerer_frost_nova', 1),
  ('sorcerer_drain_life', 'sorcerer_hp', 1),
  ('sorcerer_meteor', 'sorcerer_chain_lightning', 1),
  ('sorcerer_blizzard', 'sorcerer_ice_lance', 1),
  ('sorcerer_speed', 'sorcerer_drain_life', 1),
  ('sorcerer_dark_pact', 'sorcerer_speed', 1),
  ('druid_damage', 'druid_forest_blessing', 1),
  ('druid_mana', 'druid_forest_blessing', 1),
  ('druid_thorn_roots', 'druid_forest_blessing', 1),
  ('druid_spirit_wolf', 'druid_damage', 1),
  ('druid_healing_moth', 'druid_mana', 1),
  ('druid_venom_thorn', 'druid_thorn_roots', 1),
  ('druid_wolf_pack', 'druid_spirit_wolf', 1),
  ('druid_hp', 'druid_healing_moth', 1),
  ('druid_hornet_swarm', 'druid_venom_thorn', 1),
  ('druid_ancient_bear', 'druid_wolf_pack', 1),
  ('druid_grove_guardian', 'druid_hp', 1),
  ('druid_nature_wrath', 'druid_hornet_swarm', 1),
  ('druid_speed', 'druid_ancient_bear', 1),
  ('druid_forest_heart', 'druid_grove_guardian', 1)
) as v (id, requires_id, requires_rank)
where t.id = v.id;

-- Compra o próximo nível de um nó. O nível grátis conta como já comprado (no próprio nó e no pai).
create or replace function public.buy_talent(p_talent_id text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_talent public.talents;
  v_current int;
  v_required int;
  v_required_free int;
  v_cost bigint;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;

  select * into v_talent from public.talents where id = p_talent_id;
  if not found then raise exception 'magia inexistente'; end if;

  -- Trava o perfil: duas compras ao mesmo tempo não gastam o mesmo gold.
  perform 1 from public.profiles where id = v_uid for update;

  select rank into v_current from public.profile_talents
  where profile_id = v_uid and talent_id = p_talent_id;
  v_current := greatest(coalesce(v_current, 0), v_talent.free_rank);
  if v_current >= v_talent.max_rank then raise exception 'já está no nível máximo'; end if;

  if v_talent.requires_id is not null then
    select free_rank into v_required_free from public.talents where id = v_talent.requires_id;
    select rank into v_required from public.profile_talents
    where profile_id = v_uid and talent_id = v_talent.requires_id;
    if greatest(coalesce(v_required, 0), coalesce(v_required_free, 0)) < v_talent.requires_rank then
      raise exception 'pré-requisito não comprado';
    end if;
  end if;

  v_cost := ceil(v_talent.base_cost * power(v_talent.cost_growth, v_current));

  update public.profiles set gold = gold - v_cost where id = v_uid and gold >= v_cost
  returning gold into v_gold;
  if not found then raise exception 'gold insuficiente'; end if;

  insert into public.profile_talents (profile_id, talent_id, rank)
  values (v_uid, p_talent_id, v_current + 1)
  on conflict (profile_id, talent_id) do update set rank = excluded.rank;

  return v_gold;
end;
$$;

revoke execute on function public.buy_talent(text) from public, anon;
grant execute on function public.buy_talent(text) to authenticated;
