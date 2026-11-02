-- Grimório 4.0, fase 6 (Cavaleiro): a magia do slot 3 de cada lado da especialização, embaixo da última magia do lado
-- (faixa ±1), pedindo ela no nível 1 de uso; 2.500 de gold. Catálogo em packages/shared/src/spells.ts e talents.ts
-- (RIBS): mude os dois juntos.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('knight_massacre', 'knight', 1, 2500, 1, 0, 'knight_berserk_rage', 1, true),
  ('knight_blade_storm', 'knight', 1, 2500, 1, 0, 'knight_thousand_cuts', 1, true),
  ('knight_protector_oath', 'knight', 1, 2500, 1, 0, 'knight_shared_aegis', 1, true),
  ('knight_mountain', 'knight', 1, 2500, 1, 0, 'knight_living_fortress', 1, true),
  ('knight_rally_cry', 'knight', 1, 2500, 1, 0, 'knight_war_banner', 1, true),
  ('knight_challenge_chains', 'knight', 1, 2500, 1, 0, 'knight_supreme_challenge', 1, true);
