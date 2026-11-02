-- Grimório 4.0, fase 5 (Feiticeiro): as 2 magias de combo das costelas novas (o Raio já tem as duas de leque),
-- embaixo da de leque (linha 4, 800 de gold), pedindo a de leque no nível 1 de uso. Catálogo em
-- packages/shared/src/spells.ts e talents.ts (RIBS): mude os dois juntos.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('sorcerer_thermal_shock', 'sorcerer', 1, 800, 1, 0, 'sorcerer_frost_breath', 1, true),
  ('sorcerer_sentence', 'sorcerer', 1, 800, 1, 0, 'sorcerer_dark_wail', 1, true);
