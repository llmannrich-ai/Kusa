-- Grimório 4.0, fase 5 (Paladino): as 3 magias de combo das costelas novas, embaixo da de leque de cada costela
-- (linha 4, 800 de gold), pedindo a de leque no nível 1 de uso. Catálogo em packages/shared/src/spells.ts e
-- talents.ts (RIBS): mude os dois juntos.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('paladin_weak_point_arrow', 'paladin', 1, 800, 1, 0, 'paladin_arrow_fan', 1, true),
  ('paladin_dawn_arrow', 'paladin', 1, 800, 1, 0, 'paladin_holy_flash', 1, true),
  ('paladin_powder_keg', 'paladin', 1, 800, 1, 0, 'paladin_caltrops', 1, true);
