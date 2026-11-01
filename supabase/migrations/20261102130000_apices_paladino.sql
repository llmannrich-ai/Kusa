-- Grimório 4.0, fase 3b-2 (docs/GRIMORIO_4_PLANO.md): os Ápices de Mira e Luz do Paladino (2.000 de gold, no fim do
-- tronco, pedem a última magia do tronco no nível 1 de uso). Magias como as outras (is_spell); `buy_talent` não muda.
-- Catálogo em packages/shared/src/spells.ts e talents.ts (RIBS): mude os dois juntos.

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('paladin_doomsday_shot', 'paladin', 1, 2000, 1, 0, 'paladin_deadly_shot', 1, true),
  ('paladin_solar_crown', 'paladin', 1, 2000, 1, 0, 'paladin_divine_judgment', 1, true);
