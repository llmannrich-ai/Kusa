-- Grimório 4.0, fase 4b (Cavaleiro): os 6 Dons da costela de passivas (packages/shared/src/gifts.ts, `rib`). Dois por
-- ramo, nas linhas VI e VII do lado oposto ao Ápice: o da linha VI pede a ponta do tronco no nível 1, o da VII pede o da
-- VI no nível 1. 25 níveis, 60 de gold no 1º e ×1,12 por nível, como os outros Dons.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('knight_blood_steel', 'knight', 25, 60, 1.12, 0, 'knight_execution', 1),
  ('knight_rising_fury', 'knight', 25, 60, 1.12, 0, 'knight_blood_steel', 1),
  ('knight_anvil', 'knight', 25, 60, 1.12, 0, 'knight_steel_wall', 1),
  ('knight_chime', 'knight', 25, 60, 1.12, 0, 'knight_anvil', 1),
  ('knight_war_echo', 'knight', 25, 60, 1.12, 0, 'knight_commander_shout', 1),
  ('knight_execution_order', 'knight', 25, 60, 1.12, 0, 'knight_war_echo', 1);
