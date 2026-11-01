-- Grimório 4.0, fase 2b (docs/GRIMORIO_4_PLANO.md): Sopro Gélido (Feiticeiro, canalizada) e Abrolhos (Paladino, várias
-- armadilhas de uma vez), nas costelas novas. Magias como as outras (is_spell), 500 de gold na linha 3, pedem o pai no
-- nível 1 de uso. `buy_talent` não muda. Catálogo em packages/shared/src/spells.ts e talents.ts: mude os dois juntos.

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('sorcerer_frost_breath', 'sorcerer', 1, 500, 1, 0, 'sorcerer_frost_nova', 1, true),
  ('paladin_caltrops', 'paladin', 1, 500, 1, 0, 'paladin_mana', 1, true);
