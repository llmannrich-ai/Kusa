-- Magias sobem de nível com o uso nas hunts, não com gold (packages/shared/src/spellxp.ts e talents.ts: mude os
-- dois juntos). Comprar uma magia só a libera (nível 0, aprendiz); cada lançamento em combate rende XP igual aos
-- segundos de recarga da magia, com teto por hunt. Morrer tira 5% do XP das magias usadas na hunt, sem cair abaixo
-- do nível 1. O nível 1 de uma magia é o pré-requisito dos nós de baixo na árvore. Áureas e Traços continuam com gold.
-- O XP chega por record_spell_xp (servidor de jogo, service role) e por finish_solo_run (hunt solo, com teto pelo
-- tempo de hunt). finish_run não muda.

alter table public.profile_talents add column xp int not null default 0 check (xp >= 0);

alter table public.talents add column is_spell boolean not null default false;

update public.talents set is_spell = true where id in (
  'knight_blade_spin', 'knight_war_cry', 'knight_crushing_blow', 'knight_holy_shield', 'knight_vampiric_blade', 'knight_iron_skin',
  'knight_earthquake', 'knight_steel_wall', 'knight_commander_shout', 'knight_execution', 'knight_steel_whirlwind', 'knight_thrown_blade',
  'knight_berserk_rage', 'knight_thousand_cuts', 'knight_shield_bash', 'knight_iron_thorns', 'knight_shared_aegis', 'knight_living_fortress',
  'knight_charge', 'knight_iron_chain', 'knight_war_banner', 'knight_supreme_challenge', 'knight_twin_slash', 'knight_cross_cut',
  'knight_open_wound', 'knight_seismic_rift', 'knight_aegis_strike', 'knight_shield_quake', 'knight_stunning_roar', 'knight_battle_order',
  'knight_challenge_mark', 'paladin_holy_arrow', 'paladin_arrow_rain', 'paladin_piercing_shot', 'paladin_healing_light', 'paladin_stun_arrow',
  'paladin_blessed_ward', 'paladin_deadly_shot', 'paladin_divine_judgment', 'paladin_explosive_volley', 'paladin_hunter_mark', 'paladin_evasive_roll',
  'paladin_sniper_stance', 'paladin_swift_quiver', 'paladin_holy_spear', 'paladin_light_shield', 'paladin_divine_caldera', 'paladin_consecrated_ground',
  'paladin_lightning_arrow', 'paladin_bear_trap', 'paladin_barrage', 'paladin_arrow_cordon', 'paladin_double_shot', 'paladin_barbed_arrow',
  'paladin_sunbeam', 'paladin_holy_hammer', 'paladin_net_arrow', 'paladin_fire_arrows', 'sorcerer_shadow_orb', 'sorcerer_void_storm',
  'sorcerer_lightning_bolt', 'sorcerer_frost_nova', 'sorcerer_chain_lightning', 'sorcerer_ice_lance', 'sorcerer_drain_life', 'sorcerer_meteor',
  'sorcerer_blizzard', 'sorcerer_dark_pact', 'sorcerer_energy_beam', 'sorcerer_fireball', 'sorcerer_sky_fury', 'sorcerer_infernal_core',
  'sorcerer_cone_of_cold', 'sorcerer_misty_step', 'sorcerer_ice_prison', 'sorcerer_magic_wall', 'sorcerer_sudden_death', 'sorcerer_eldritch_blast',
  'sorcerer_raise_skeletons', 'sorcerer_black_tentacles', 'sorcerer_spark', 'sorcerer_ember_rain', 'sorcerer_frostbite', 'sorcerer_frozen_orb',
  'sorcerer_dark_seal', 'sorcerer_plague', 'druid_forest_blessing', 'druid_thorn_roots', 'druid_spirit_wolf', 'druid_healing_moth',
  'druid_venom_thorn', 'druid_wolf_pack', 'druid_hornet_swarm', 'druid_ancient_bear', 'druid_grove_guardian', 'druid_nature_wrath',
  'druid_forest_heart', 'druid_beast_cry', 'druid_panther_form', 'druid_giant_eagle', 'druid_bear_form', 'druid_distant_heal',
  'druid_barkskin', 'druid_rebirth_seed', 'druid_reviving_rain', 'druid_mamba_bite', 'druid_thunderwave', 'druid_poison_cloud',
  'druid_call_lightning', 'druid_howl', 'druid_purifying_sap', 'druid_blossom_burst', 'druid_vine_lash', 'druid_spore_burst',
  'druid_bramble_burst'
);

-- Magia se compra uma vez só; o preço do 1º nível continua o mesmo.
update public.talents set max_rank = 1, cost_growth = 1 where is_spell;

-- XP acumulado para cada nível (SPELL_LEVEL_XP): 60, 400, 1.200, 2.800 e 5.500.
create function public.spell_level(p_xp int)
returns int
language sql
immutable
set search_path = ''
as $$
  select (coalesce(p_xp, 0) >= 60)::int + (coalesce(p_xp, 0) >= 400)::int + (coalesce(p_xp, 0) >= 1200)::int
    + (coalesce(p_xp, 0) >= 2800)::int + (coalesce(p_xp, 0) >= 5500)::int;
$$;

-- XP depois da hunt (spellXpAfterRun): soma o ganho até o teto de 400 e, na morte, tira 5% do total sem cair
-- abaixo do nível 1 (nem abaixo do que a magia tinha, se ainda não chegou nele).
create function public.spell_xp_after_run(p_xp int, p_gained int, p_died boolean)
returns int
language sql
immutable
set search_path = ''
as $$
  select case when p_died then greatest(t - floor(t * 0.05)::int, least(t, 60)) else t end
  from (select greatest(coalesce(p_xp, 0), 0) + least(greatest(coalesce(p_gained, 0), 0), 400) as t) s;
$$;

-- Quem já comprou magias com gold fica com o nível que tinha: comprada (nível 1 antigo) vira nível 1, o 2 antigo
-- vira o 2 e o 3 antigo (com a Maestria) vira o 5. Depois, toda magia comprada fica com 1 só no rank.
update public.profile_talents pt
set xp = greatest(pt.xp, case when pt.rank >= 3 then 5500 when pt.rank = 2 then 400 else 60 end), rank = 1
from public.talents t
where t.id = pt.talent_id and t.is_spell;

-- Nível do nó para os pré-requisitos (nodeLevel): magia comprada → nível do XP (as iniciais nunca abaixo do 1);
-- magia que a conta não tem → 0; áurea ou Traço → níveis comprados.
create function public.talent_node_level(p_profile_id uuid, p_talent_id text)
returns int
language sql
stable
set search_path = ''
as $$
  select case
    when not t.is_spell then greatest(coalesce(pt.rank, 0), t.free_rank)
    when greatest(coalesce(pt.rank, 0), t.free_rank) = 0 then 0
    else public.spell_level(greatest(coalesce(pt.xp, 0), case when t.free_rank > 0 then 60 else 0 end))
  end
  from public.talents t
  left join public.profile_talents pt on pt.talent_id = t.id and pt.profile_id = p_profile_id
  where t.id = p_talent_id;
$$;

revoke execute on function public.talent_node_level(uuid, text) from public, anon, authenticated;

-- Compra uma magia (uma vez), o próximo nível de uma áurea ou um Traço. O pai que é magia precisa estar no nível
-- pedido (ganho com o uso). Devolve o gold que sobrou.
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
  v_cost bigint;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;

  select * into v_talent from public.talents where id = p_talent_id;
  if not found then raise exception 'magia inexistente'; end if;

  -- Trava o perfil: duas compras ao mesmo tempo não gastam o mesmo gold (nem escolhem os dois lados).
  perform 1 from public.profiles where id = v_uid for update;

  select rank into v_current from public.profile_talents
  where profile_id = v_uid and talent_id = p_talent_id;
  v_current := greatest(coalesce(v_current, 0), v_talent.free_rank);
  if v_current >= v_talent.max_rank then
    if v_talent.is_spell then raise exception 'magia já aprendida'; end if;
    raise exception 'já está no nível máximo';
  end if;

  if v_talent.requires_id is not null
     and public.talent_node_level(v_uid, v_talent.requires_id) < v_talent.requires_rank then
    raise exception 'pré-requisito não comprado';
  end if;

  -- Segundo pai (costela que cruza com o tronco): também precisa estar no nível.
  if v_talent.also_requires_id is not null
     and public.talent_node_level(v_uid, v_talent.also_requires_id) < v_talent.also_requires_rank then
    raise exception 'pré-requisito não comprado';
  end if;

  if v_talent.exclusive_with is not null and exists (
    select 1 from public.profile_talents
    where profile_id = v_uid and talent_id = v_talent.exclusive_with and rank > 0
  ) then
    raise exception 'especialização já escolhida';
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

-- Soma o XP de uso das magias da hunt (id do nó → XP ganho). Só valem até 2 magias (uma por slot) compradas da
-- classe da hunt; na morte (ou soterrado), cada uma perde um pouco. Só o servidor de jogo e finish_solo_run chamam.
create function public.record_spell_xp(p_profile_id uuid, p_class_id text, p_outcome text, p_spell_xp jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_died boolean := coalesce(p_outcome, 'died') not in ('escaped', 'completed');
  v_key text;
  v_value text;
  v_gain int;
  v_floor int;
  v_count int := 0;
  v_talent public.talents;
begin
  if p_spell_xp is null or jsonb_typeof(p_spell_xp) <> 'object' then return; end if;
  for v_key, v_value in select key, value from jsonb_each_text(p_spell_xp) order by key loop
    exit when v_count >= 2;
    select * into v_talent from public.talents where id = v_key and is_spell and class_id = p_class_id;
    continue when not found;
    -- A magia precisa estar comprada (as iniciais já vêm).
    continue when v_talent.free_rank = 0 and not exists (
      select 1 from public.profile_talents where profile_id = p_profile_id and talent_id = v_key and rank > 0);
    v_count := v_count + 1;
    v_gain := case when v_value ~ '^[0-9]{1,9}$' then v_value::int else 0 end;
    v_floor := case when v_talent.free_rank > 0 then 60 else 0 end;
    insert into public.profile_talents (profile_id, talent_id, rank, xp)
    values (p_profile_id, v_key, 1, public.spell_xp_after_run(v_floor, v_gain, v_died))
    on conflict (profile_id, talent_id) do update
      set xp = public.spell_xp_after_run(greatest(public.profile_talents.xp, v_floor), v_gain, v_died);
  end loop;
end;
$$;

revoke execute on function public.record_spell_xp(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_spell_xp(uuid, text, text, jsonb) to service_role;
