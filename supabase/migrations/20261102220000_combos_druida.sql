-- Grimório 4.0, fase 5 (Druida): as 3 magias de combo das costelas novas, embaixo da de leque de cada costela
-- (linha 4, 800 de gold), pedindo a de leque no nível 1 de uso. Catálogo em packages/shared/src/spells.ts e
-- talents.ts (RIBS): mude os dois juntos.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('druid_pack_hunt', 'druid', 1, 800, 1, 0, 'druid_pack_roar', 1, true),
  ('druid_twin_sprout', 'druid', 1, 800, 1, 0, 'druid_pollen_breeze', 1, true),
  ('druid_bramble_embrace', 'druid', 1, 800, 1, 0, 'druid_thorn_spray', 1, true);
