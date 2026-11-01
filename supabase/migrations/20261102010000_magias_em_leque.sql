-- Grimório 4.0, fase 2a (docs/GRIMORIO_4_PLANO.md): 11 magias em leque nas costelas novas. São magias como as outras
-- (is_spell, compradas uma vez, o nível sobe com o uso); o preço segue a linha da árvore (500 na linha 3, 800 na 4) e
-- cada uma pede o pai no nível 1 de uso. `buy_talent` não muda.
-- Catálogo em packages/shared/src/spells.ts e talents.ts (RIBS): mude os dois juntos.

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('knight_gale_blade', 'knight', 1, 500, 1, 0, 'knight_crushing_blow', 1, true),
  ('knight_shield_wall', 'knight', 1, 500, 1, 0, 'knight_holy_shield', 1, true),
  ('knight_cutting_shout', 'knight', 1, 500, 1, 0, 'knight_mana', 1, true),
  ('paladin_arrow_fan', 'paladin', 1, 500, 1, 0, 'paladin_piercing_shot', 1, true),
  ('paladin_holy_flash', 'paladin', 1, 500, 1, 0, 'paladin_healing_light', 1, true),
  ('sorcerer_fire_spit', 'sorcerer', 1, 500, 1, 0, 'sorcerer_lightning_bolt', 1, true),
  ('sorcerer_lightning_fan', 'sorcerer', 1, 800, 1, 0, 'sorcerer_fire_spit', 1, true),
  ('sorcerer_dark_wail', 'sorcerer', 1, 500, 1, 0, 'sorcerer_hp', 1, true),
  ('druid_pack_roar', 'druid', 1, 500, 1, 0, 'druid_spirit_wolf', 1, true),
  ('druid_pollen_breeze', 'druid', 1, 500, 1, 0, 'druid_healing_moth', 1, true),
  ('druid_thorn_spray', 'druid', 1, 500, 1, 0, 'druid_venom_thorn', 1, true);
