-- Especializações do Feiticeiro (ver 20261021150000_especializacoes.sql).
-- Catálogo em packages/shared/src/talents.ts e traits.ts: mude os dois juntos.
--   Raio: Tempestuoso (Estática) ou Piromante (Combustão).
--   Gelo: Criomante (Estilhaçar) ou Arcanista (Escudo de Mana).
--   Trevas: Necromante (Colheita) ou Bruxo (Maldição).
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('sorcerer_static_charge', 'sorcerer', 1, 1000, 1, 0, 'sorcerer_meteor', 1),
  ('sorcerer_combustion', 'sorcerer', 1, 1000, 1, 0, 'sorcerer_meteor', 1),
  ('sorcerer_shatter', 'sorcerer', 1, 1000, 1, 0, 'sorcerer_blizzard', 1),
  ('sorcerer_mana_shield', 'sorcerer', 1, 1000, 1, 0, 'sorcerer_blizzard', 1),
  ('sorcerer_harvest', 'sorcerer', 1, 1000, 1, 0, 'sorcerer_dark_pact', 1),
  ('sorcerer_hex', 'sorcerer', 1, 1000, 1, 0, 'sorcerer_dark_pact', 1);
update public.talents set exclusive_with = 'sorcerer_combustion' where id = 'sorcerer_static_charge';
update public.talents set exclusive_with = 'sorcerer_static_charge' where id = 'sorcerer_combustion';
update public.talents set exclusive_with = 'sorcerer_mana_shield' where id = 'sorcerer_shatter';
update public.talents set exclusive_with = 'sorcerer_shatter' where id = 'sorcerer_mana_shield';
update public.talents set exclusive_with = 'sorcerer_hex' where id = 'sorcerer_harvest';
update public.talents set exclusive_with = 'sorcerer_harvest' where id = 'sorcerer_hex';

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('sorcerer_energy_beam', 'sorcerer', 3, 1200, 1.6, 0, 'sorcerer_static_charge', 1),
  ('sorcerer_fireball', 'sorcerer', 3, 1200, 1.6, 0, 'sorcerer_combustion', 1),
  ('sorcerer_cone_of_cold', 'sorcerer', 3, 1200, 1.6, 0, 'sorcerer_shatter', 1),
  ('sorcerer_misty_step', 'sorcerer', 3, 1200, 1.6, 0, 'sorcerer_mana_shield', 1),
  ('sorcerer_sudden_death', 'sorcerer', 3, 1200, 1.6, 0, 'sorcerer_harvest', 1),
  ('sorcerer_eldritch_blast', 'sorcerer', 3, 1200, 1.6, 0, 'sorcerer_hex', 1);
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('sorcerer_sky_fury', 'sorcerer', 3, 1600, 1.6, 0, 'sorcerer_energy_beam', 1),
  ('sorcerer_infernal_core', 'sorcerer', 3, 1600, 1.6, 0, 'sorcerer_fireball', 1),
  ('sorcerer_ice_prison', 'sorcerer', 3, 1600, 1.6, 0, 'sorcerer_cone_of_cold', 1),
  ('sorcerer_magic_wall', 'sorcerer', 3, 1600, 1.6, 0, 'sorcerer_misty_step', 1),
  ('sorcerer_raise_skeletons', 'sorcerer', 3, 1600, 1.6, 0, 'sorcerer_sudden_death', 1),
  ('sorcerer_black_tentacles', 'sorcerer', 3, 1600, 1.6, 0, 'sorcerer_eldritch_blast', 1);
