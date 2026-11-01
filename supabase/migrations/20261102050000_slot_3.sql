-- Grimório 4.0, fase 3a (docs/GRIMORIO_4_PLANO.md): o slot 3 abre no nível 12 (magias supremas).
-- 1) `record_spell_xp` guarda o XP de até 3 magias por hunt (uma por slot); antes parava na 2ª.
-- 2) As 4 magias de entrada do slot 3, ao lado da raiz de cada classe: 1.000 de gold, pedem só a raiz. Todas as magias
--    do slot 3 se compram (decisão do Leonardo): sem comprar, o slot abre vazio.
-- Regras em packages/shared/src/spells.ts (SPELL_SLOT_LEVELS, SPELLS) e talents.ts (RIBS): mude os dois juntos.

create or replace function public.record_spell_xp(p_profile_id uuid, p_class_id text, p_outcome text, p_spell_xp jsonb)
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
    -- Uma magia por slot: 3 slots.
    exit when v_count >= 3;
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

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('knight_titan_fury', 'knight', 1, 1000, 1, 0, 'knight_blade_spin', 1, true),
  ('paladin_sky_arrow', 'paladin', 1, 1000, 1, 0, 'paladin_holy_arrow', 1, true),
  ('sorcerer_arcane_vortex', 'sorcerer', 1, 1000, 1, 0, 'sorcerer_shadow_orb', 1, true),
  ('druid_butterfly_swarm', 'druid', 1, 1000, 1, 0, 'druid_forest_blessing', 1, true);
