-- Grimório 4.0, fase 4b (Druida): os 6 Dons da costela de passivas (packages/shared/src/gifts.ts, `rib`), nas linhas
-- VI e VII do lado oposto ao Ápice: o da VI pede a ponta do tronco no nível 1, o da VII pede o da VI. 25 níveis, 60 de
-- gold no 1º e ×1,12 por nível.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('druid_roar_echo', 'druid', 25, 60, 1.12, 0, 'druid_ancient_bear', 1),
  ('druid_venom_fang', 'druid', 25, 60, 1.12, 0, 'druid_roar_echo', 1),
  ('druid_golden_pollen', 'druid', 25, 60, 1.12, 0, 'druid_forest_heart', 1),
  ('druid_nectar', 'druid', 25, 60, 1.12, 0, 'druid_golden_pollen', 1),
  ('druid_thistle_burst', 'druid', 25, 60, 1.12, 0, 'druid_nature_wrath', 1),
  ('druid_ancient_bramble', 'druid', 25, 60, 1.12, 0, 'druid_thistle_burst', 1);
