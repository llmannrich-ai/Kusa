-- Grimório fase 5b: Tomos (um por ramo, inspirado nas Maestrias do Diablo 2). Cada nível dá +5% de força a todas as
-- magias do ramo; 3 níveis, 300 de gold e ×1,8 por nível, como as áureas. Pedem o primeiro nó do tronco do ramo.
-- Não são magias (is_spell fica false): o nível é o comprado, e `buy_talent` já trata isso sem mudança.
-- As sinergias (nível de uso das magias vizinhas) não passam pelo banco: o servidor calcula ao entrar na sala.
-- Catálogo em packages/shared/src/talents.ts (TOME_*): mude os dois juntos.

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('knight_tome0', 'knight', 3, 300, 1.8, 0, 'knight_damage', 1),
  ('knight_tome1', 'knight', 3, 300, 1.8, 0, 'knight_hp', 1),
  ('knight_tome2', 'knight', 3, 300, 1.8, 0, 'knight_war_cry', 1),
  ('paladin_tome0', 'paladin', 3, 300, 1.8, 0, 'paladin_damage', 1),
  ('paladin_tome1', 'paladin', 3, 300, 1.8, 0, 'paladin_hp', 1),
  ('paladin_tome2', 'paladin', 3, 300, 1.8, 0, 'paladin_arrow_rain', 1),
  ('sorcerer_tome0', 'sorcerer', 3, 300, 1.8, 0, 'sorcerer_damage', 1),
  ('sorcerer_tome1', 'sorcerer', 3, 300, 1.8, 0, 'sorcerer_mana', 1),
  ('sorcerer_tome2', 'sorcerer', 3, 300, 1.8, 0, 'sorcerer_void_storm', 1),
  ('druid_tome0', 'druid', 3, 300, 1.8, 0, 'druid_damage', 1),
  ('druid_tome1', 'druid', 3, 300, 1.8, 0, 'druid_mana', 1),
  ('druid_tome2', 'druid', 3, 300, 1.8, 0, 'druid_thorn_roots', 1);
