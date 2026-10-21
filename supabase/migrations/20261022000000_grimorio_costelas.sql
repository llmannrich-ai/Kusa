-- Grimório em espinha de peixe (inspirado no Diablo 2): costelas saem do tronco de cada ramo, com 27 magias novas.
-- Um nó de costela pode pedir dois pais (also_requires_id), como a Nevasca do Diablo 2.
-- Catálogo em packages/shared/src/talents.ts (RIBS) e spells.ts: mude os dois juntos.

alter table public.talents
  add column also_requires_id text references public.talents (id),
  add column also_requires_rank int not null default 0 check (also_requires_rank >= 0);
create index talents_also_requires_id_idx on public.talents (also_requires_id);

insert into public.talents
  (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, also_requires_id, also_requires_rank)
values
  ('knight_twin_slash', 'knight', 3, 500, 1.6, 0, 'knight_crushing_blow', 1, null, 0),
  ('knight_cross_cut', 'knight', 3, 800, 1.6, 0, 'knight_twin_slash', 1, null, 0),
  ('knight_open_wound', 'knight', 3, 800, 1.6, 0, 'knight_vampiric_blade', 1, null, 0),
  ('knight_seismic_rift', 'knight', 3, 1200, 1.6, 0, 'knight_open_wound', 1, 'knight_earthquake', 1),
  ('knight_aegis_strike', 'knight', 3, 500, 1.6, 0, 'knight_holy_shield', 1, null, 0),
  ('knight_shield_quake', 'knight', 3, 800, 1.6, 0, 'knight_aegis_strike', 1, null, 0),
  ('knight_stunning_roar', 'knight', 3, 300, 1.6, 0, 'knight_war_cry', 1, null, 0),
  ('knight_battle_order', 'knight', 3, 500, 1.6, 0, 'knight_mana', 1, null, 0),
  ('knight_challenge_mark', 'knight', 3, 800, 1.6, 0, 'knight_battle_order', 1, 'knight_speed', 1),
  ('paladin_double_shot', 'paladin', 3, 500, 1.6, 0, 'paladin_piercing_shot', 1, null, 0),
  ('paladin_barbed_arrow', 'paladin', 3, 800, 1.6, 0, 'paladin_double_shot', 1, null, 0),
  ('paladin_sunbeam', 'paladin', 3, 300, 1.6, 0, 'paladin_hp', 1, null, 0),
  ('paladin_holy_hammer', 'paladin', 3, 800, 1.6, 0, 'paladin_sunbeam', 1, 'paladin_blessed_ward', 1),
  ('paladin_net_arrow', 'paladin', 3, 300, 1.6, 0, 'paladin_arrow_rain', 1, null, 0),
  ('paladin_fire_arrows', 'paladin', 3, 800, 1.6, 0, 'paladin_speed', 1, null, 0),
  ('sorcerer_spark', 'sorcerer', 3, 500, 1.6, 0, 'sorcerer_lightning_bolt', 1, null, 0),
  ('sorcerer_ember_rain', 'sorcerer', 3, 800, 1.6, 0, 'sorcerer_spark', 1, null, 0),
  ('sorcerer_frostbite', 'sorcerer', 3, 500, 1.6, 0, 'sorcerer_frost_nova', 1, null, 0),
  ('sorcerer_frozen_orb', 'sorcerer', 3, 800, 1.6, 0, 'sorcerer_frostbite', 1, 'sorcerer_ice_lance', 1),
  ('sorcerer_dark_seal', 'sorcerer', 3, 300, 1.6, 0, 'sorcerer_void_storm', 1, null, 0),
  ('sorcerer_plague', 'sorcerer', 3, 800, 1.6, 0, 'sorcerer_drain_life', 1, null, 0),
  ('druid_howl', 'druid', 3, 500, 1.6, 0, 'druid_spirit_wolf', 1, null, 0),
  ('druid_purifying_sap', 'druid', 3, 500, 1.6, 0, 'druid_healing_moth', 1, null, 0),
  ('druid_blossom_burst', 'druid', 3, 800, 1.6, 0, 'druid_purifying_sap', 1, null, 0),
  ('druid_vine_lash', 'druid', 3, 300, 1.6, 0, 'druid_thorn_roots', 1, null, 0),
  ('druid_spore_burst', 'druid', 3, 500, 1.6, 0, 'druid_venom_thorn', 1, null, 0),
  ('druid_bramble_burst', 'druid', 3, 800, 1.6, 0, 'druid_spore_burst', 1, 'druid_hornet_swarm', 1);

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

  -- Trava o perfil: duas compras ao mesmo tempo não gastam o mesmo gold (nem escolhem os dois lados).
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

  -- Segundo pai (costela que cruza com o tronco): também precisa estar comprado.
  if v_talent.also_requires_id is not null then
    select free_rank into v_required_free from public.talents where id = v_talent.also_requires_id;
    select rank into v_required from public.profile_talents
    where profile_id = v_uid and talent_id = v_talent.also_requires_id;
    if greatest(coalesce(v_required, 0), coalesce(v_required_free, 0)) < v_talent.also_requires_rank then
      raise exception 'pré-requisito não comprado';
    end if;
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
revoke execute on function public.buy_talent(text) from public, anon;
grant execute on function public.buy_talent(text) to authenticated;
