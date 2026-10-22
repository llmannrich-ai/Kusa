-- Especializações dos ramos Luz e Batedor do Paladino (ver 20261021150000_especializacoes.sql).
-- Catálogo em packages/shared/src/talents.ts e traits.ts: mude os dois juntos.

-- Luz: Cruzado (Flechas Consagradas) ou Guardião da Luz (Aura Sagrada).
-- Batedor: Artilheiro (Pólvora) ou Armadilheiro (Engenhoso).
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('paladin_consecrated_arrows', 'paladin', 1, 1000, 1, 0, 'paladin_divine_judgment', 1),
  ('paladin_sacred_aura', 'paladin', 1, 1000, 1, 0, 'paladin_divine_judgment', 1),
  ('paladin_gunpowder', 'paladin', 1, 1000, 1, 0, 'paladin_explosive_volley', 1),
  ('paladin_ingenious', 'paladin', 1, 1000, 1, 0, 'paladin_explosive_volley', 1);
update public.talents set exclusive_with = 'paladin_sacred_aura' where id = 'paladin_consecrated_arrows';
update public.talents set exclusive_with = 'paladin_consecrated_arrows' where id = 'paladin_sacred_aura';
update public.talents set exclusive_with = 'paladin_ingenious' where id = 'paladin_gunpowder';
update public.talents set exclusive_with = 'paladin_gunpowder' where id = 'paladin_ingenious';

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('paladin_holy_spear', 'paladin', 3, 1200, 1.6, 0, 'paladin_consecrated_arrows', 1),
  ('paladin_light_shield', 'paladin', 3, 1200, 1.6, 0, 'paladin_sacred_aura', 1),
  ('paladin_lightning_arrow', 'paladin', 3, 1200, 1.6, 0, 'paladin_gunpowder', 1),
  ('paladin_bear_trap', 'paladin', 3, 1200, 1.6, 0, 'paladin_ingenious', 1);
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('paladin_divine_caldera', 'paladin', 3, 1600, 1.6, 0, 'paladin_holy_spear', 1),
  ('paladin_consecrated_ground', 'paladin', 3, 1600, 1.6, 0, 'paladin_light_shield', 1),
  ('paladin_barrage', 'paladin', 3, 1600, 1.6, 0, 'paladin_lightning_arrow', 1),
  ('paladin_arrow_cordon', 'paladin', 3, 1600, 1.6, 0, 'paladin_bear_trap', 1);
