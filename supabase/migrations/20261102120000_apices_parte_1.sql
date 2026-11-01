-- Grimório 4.0, fase 3b-1 (docs/GRIMORIO_4_PLANO.md): Ápices do slot 3 (2.000 de gold, no fim do tronco de cada ramo,
-- pedem a última magia do tronco no nível 1 de uso; valem para os dois lados da especialização) e a magia de entrada do
-- slot 3 do Xamã Orc (1.000, ao lado da raiz). Magias como as outras (is_spell); `buy_talent` não muda.
-- Catálogo em packages/shared/src/spells.ts e talents.ts (RIBS): mude os dois juntos.

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('knight_champion_reap', 'knight', 1, 2000, 1, 0, 'knight_execution', 1, true),
  ('knight_bulwark', 'knight', 1, 2000, 1, 0, 'knight_steel_wall', 1, true),
  ('knight_legion_charge', 'knight', 1, 2000, 1, 0, 'knight_commander_shout', 1, true),
  ('paladin_endless_rain', 'paladin', 1, 2000, 1, 0, 'paladin_explosive_volley', 1, true),
  ('sorcerer_branching_bolt', 'sorcerer', 1, 2000, 1, 0, 'sorcerer_meteor', 1, true),
  ('sorcerer_ice_age', 'sorcerer', 1, 2000, 1, 0, 'sorcerer_blizzard', 1, true),
  ('sorcerer_black_hole', 'sorcerer', 1, 2000, 1, 0, 'sorcerer_dark_pact', 1, true),
  ('druid_wild_hunt', 'druid', 1, 2000, 1, 0, 'druid_ancient_bear', 1, true),
  ('druid_tree_of_life', 'druid', 1, 2000, 1, 0, 'druid_forest_heart', 1, true),
  ('druid_leaf_hurricane', 'druid', 1, 2000, 1, 0, 'druid_nature_wrath', 1, true),
  ('shaman_ancestral_totem', 'shaman', 1, 1000, 1, 0, 'shaman_ember_totem', 1, true);
