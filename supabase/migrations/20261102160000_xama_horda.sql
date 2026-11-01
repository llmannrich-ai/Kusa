-- Xamã Orc, Fase 2 (docs/CLASSE_XAMA_ORC.md): o tronco dos 3 ramos do Grimório (`SHAPES.shaman` em talents.ts).
--   - Horda: Chamar Batedores → Áurea da Forja → Lanceiros do Clã → Arqueiros do Clã → Capitão do Clã.
--   - Totens: Áurea do Entalhe → Totem do Lodo → Totem do Chamado → Áurea do Clã (velocidade) → Grande Totem do Clã.
--   - Brasa: Tambor de Guerra → Lança de Brasa → Batida de Guerra → Áurea do Couro Curtido → Ogro da Forja.
-- Magias pelo preço da profundidade (150, 300, 500, 800, 1.200), a Áurea do Clã com as regras da velocidade (6 níveis,
-- 300 e ×1,3), e os Tomos da Horda e dos Totens (os ramos agora têm magia). Mudam de pai: a Áurea da Forja e o Grito
-- do Clã (Dom) passam a pedir Chamar Batedores, e a Áurea do Couro Curtido, a Batida de Guerra.

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, requires_id, requires_rank, free_rank, is_spell) values
  ('shaman_clan_scouts', 'shaman', 1, 150, 1, 'shaman_ember_totem', 1, 0, true),
  ('shaman_mud_totem', 'shaman', 1, 300, 1, 'shaman_mana', 1, 0, true),
  ('shaman_ember_lance', 'shaman', 1, 300, 1, 'shaman_war_drum', 1, 0, true),
  ('shaman_tome0', 'shaman', 20, 300, 1.12, 'shaman_clan_scouts', 1, 0, false),
  ('shaman_tome1', 'shaman', 20, 300, 1.12, 'shaman_mana', 1, 0, false);

update public.talents set requires_id = 'shaman_clan_scouts' where id in ('shaman_damage', 'shaman_clan_cry');

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, requires_id, requires_rank, free_rank, is_spell) values
  ('shaman_clan_spearmen', 'shaman', 1, 500, 1, 'shaman_damage', 1, 0, true),
  ('shaman_call_totem', 'shaman', 1, 500, 1, 'shaman_mud_totem', 1, 0, true),
  ('shaman_war_stomp', 'shaman', 1, 500, 1, 'shaman_ember_lance', 1, 0, true),
  ('shaman_clan_archers', 'shaman', 1, 800, 1, 'shaman_clan_spearmen', 1, 0, true),
  ('shaman_speed', 'shaman', 6, 300, 1.3, 'shaman_call_totem', 1, 0, false);

update public.talents set requires_id = 'shaman_war_stomp' where id = 'shaman_hp';

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, requires_id, requires_rank, free_rank, is_spell) values
  ('shaman_clan_captain', 'shaman', 1, 1200, 1, 'shaman_clan_archers', 1, 0, true),
  ('shaman_grand_totem', 'shaman', 1, 1200, 1, 'shaman_speed', 1, 0, true),
  ('shaman_forge_ogre', 'shaman', 1, 1200, 1, 'shaman_hp', 1, 0, true);
