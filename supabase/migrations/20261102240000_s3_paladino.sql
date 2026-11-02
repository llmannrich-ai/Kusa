-- Grimório 4.0, fase 6 (Paladino): a magia do slot 3 de cada lado da especialização, embaixo da última magia do lado
-- (faixa ±1), pedindo ela no nível 1 de uso; 2.500 de gold. Catálogo em packages/shared/src/spells.ts e talents.ts
-- (RIBS): mude os dois juntos.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('paladin_phantom_shot', 'paladin', 1, 2500, 1, 0, 'paladin_sniper_stance', 1, true),
  ('paladin_wind_dance', 'paladin', 1, 2500, 1, 0, 'paladin_swift_quiver', 1, true),
  ('paladin_flaming_cross', 'paladin', 1, 2500, 1, 0, 'paladin_divine_caldera', 1, true),
  ('paladin_sanctuary', 'paladin', 1, 2500, 1, 0, 'paladin_consecrated_ground', 1, true),
  ('paladin_bombardment', 'paladin', 1, 2500, 1, 0, 'paladin_barrage', 1, true),
  ('paladin_minefield', 'paladin', 1, 2500, 1, 0, 'paladin_arrow_cordon', 1, true);
