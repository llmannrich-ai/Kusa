-- Grimório 4.0, Fase 3b-3: os Dons do fundo (packages/shared/src/gifts.ts). Um embaixo de cada Ápice, com 25 níveis
-- (60 de gold no 1º, ×1,12 por nível, como os Dons do topo), pedindo o Ápice no nível 1. O efeito é um gatilho de
-- momento calculado no servidor de jogo; o banco só guarda o nível comprado.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('knight_last_duel', 'knight', 25, 60, 1.12, 0, 'knight_champion_reap', 1),
  ('knight_bedrock', 'knight', 25, 60, 1.12, 0, 'knight_bulwark', 1),
  ('knight_living_banner', 'knight', 25, 60, 1.12, 0, 'knight_legion_charge', 1),
  ('paladin_hunter_breath', 'paladin', 25, 60, 1.12, 0, 'paladin_doomsday_shot', 1),
  ('paladin_grace', 'paladin', 25, 60, 1.12, 0, 'paladin_solar_crown', 1),
  ('paladin_quick_hand', 'paladin', 25, 60, 1.12, 0, 'paladin_endless_rain', 1),
  ('sorcerer_circuit', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_branching_bolt', 1),
  ('sorcerer_frost_reserve', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_ice_age', 1),
  ('sorcerer_ossuary', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_black_hole', 1),
  ('druid_instinct', 'druid', 25, 60, 1.12, 0, 'druid_wild_hunt', 1),
  ('druid_cycle', 'druid', 25, 60, 1.12, 0, 'druid_tree_of_life', 1),
  ('druid_closed_sky', 'druid', 25, 60, 1.12, 0, 'druid_leaf_hurricane', 1);
