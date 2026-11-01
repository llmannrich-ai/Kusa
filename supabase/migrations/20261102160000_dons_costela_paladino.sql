-- Grimório 4.0, fase 4b (Paladino): os 6 Dons da costela de passivas (packages/shared/src/gifts.ts, `rib`), nas linhas
-- VI e VII do lado oposto ao Ápice: o da VI pede a ponta do tronco no nível 1, o da VII pede o da VI. 25 níveis, 60 de
-- gold no 1º e ×1,12 por nível.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('paladin_wide_quiver', 'paladin', 25, 60, 1.12, 0, 'paladin_deadly_shot', 1),
  ('paladin_weak_spot', 'paladin', 25, 60, 1.12, 0, 'paladin_wide_quiver', 1),
  ('paladin_dawn', 'paladin', 25, 60, 1.12, 0, 'paladin_divine_judgment', 1),
  ('paladin_votive_candle', 'paladin', 25, 60, 1.12, 0, 'paladin_dawn', 1),
  ('paladin_sharp_caltrops', 'paladin', 25, 60, 1.12, 0, 'paladin_explosive_volley', 1),
  ('paladin_short_fuse', 'paladin', 25, 60, 1.12, 0, 'paladin_sharp_caltrops', 1);
