-- Grimório 4.0, fase 6 (Feiticeiro): a magia do slot 3 de cada lado da especialização, embaixo da última magia do lado
-- (faixa ±1), pedindo ela no nível 1 de uso; 2.500 de gold. Catálogo em packages/shared/src/spells.ts e talents.ts
-- (RIBS): mude os dois juntos.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('sorcerer_storm_eye', 'sorcerer', 1, 2500, 1, 0, 'sorcerer_sky_fury', 1, true),
  ('sorcerer_dragon_breath', 'sorcerer', 1, 2500, 1, 0, 'sorcerer_infernal_core', 1, true),
  ('sorcerer_avalanche', 'sorcerer', 1, 2500, 1, 0, 'sorcerer_ice_prison', 1, true),
  ('sorcerer_arcane_rift', 'sorcerer', 1, 2500, 1, 0, 'sorcerer_magic_wall', 1, true),
  ('sorcerer_army_of_dead', 'sorcerer', 1, 2500, 1, 0, 'sorcerer_raise_skeletons', 1, true),
  ('sorcerer_abyss_gaze', 'sorcerer', 1, 2500, 1, 0, 'sorcerer_black_tentacles', 1, true);
