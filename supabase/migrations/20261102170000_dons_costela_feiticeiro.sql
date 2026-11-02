-- Grimório 4.0, fase 4b (Feiticeiro): os 6 Dons da costela de passivas (packages/shared/src/gifts.ts, `rib`), nas linhas
-- VI e VII do lado oposto ao Ápice: o da VI pede a ponta do tronco no nível 1, o da VII pede o da VI. 25 níveis, 60 de
-- gold no 1º e ×1,12 por nível.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('sorcerer_ember_throat', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_meteor', 1),
  ('sorcerer_pressure_cooker', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_ember_throat', 1),
  ('sorcerer_glacial_breath', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_blizzard', 1),
  ('sorcerer_crystallize', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_glacial_breath', 1),
  ('sorcerer_deep_lament', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_dark_pact', 1),
  ('sorcerer_slow_sentence', 'sorcerer', 25, 60, 1.12, 0, 'sorcerer_deep_lament', 1);
