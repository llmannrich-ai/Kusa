-- Grimório 4.0, fase 5 (Cavaleiro): as 3 magias de combo das costelas novas, embaixo da de leque de cada costela
-- (linha 4, 800 de gold), pedindo a de leque no nível 1 de uso. Catálogo em packages/shared/src/spells.ts e
-- talents.ts (RIBS): mude os dois juntos.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('knight_hemorrhagic_cut', 'knight', 1, 800, 1, 0, 'knight_gale_blade', 1, true),
  ('knight_shield_toss', 'knight', 1, 800, 1, 0, 'knight_shield_wall', 1, true),
  ('knight_exposed_strike', 'knight', 1, 800, 1, 0, 'knight_cutting_shout', 1, true);
