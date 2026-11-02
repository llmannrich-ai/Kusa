-- Grimório 4.0, fase 6 (Druida): a magia do slot 3 de cada lado da especialização, embaixo da última magia do lado
-- (faixa ±1), pedindo ela no nível 1 de uso; 2.500 de gold. Fecha as 24 da fase 6. Catálogo em
-- packages/shared/src/spells.ts e talents.ts (RIBS): mude os dois juntos.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('druid_jungle_king', 'druid', 1, 2500, 1, 0, 'druid_giant_eagle', 1, true),
  ('druid_primal_form', 'druid', 1, 2500, 1, 0, 'druid_bear_form', 1, true),
  ('druid_eternal_forest', 'druid', 1, 2500, 1, 0, 'druid_rebirth_seed', 1, true),
  ('druid_oak_wall', 'druid', 1, 2500, 1, 0, 'druid_reviving_rain', 1, true),
  ('druid_pandemic', 'druid', 1, 2500, 1, 0, 'druid_poison_cloud', 1, true),
  ('druid_fan_storm', 'druid', 1, 2500, 1, 0, 'druid_call_lightning', 1, true);
