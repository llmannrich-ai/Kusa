-- Especializações do Cavaleiro (ver 20261021150000_especializacoes.sql).
-- Catálogo em packages/shared/src/talents.ts e traits.ts: mude os dois juntos.
--   Lâmina: Berserker (Sede de Batalha) ou Duelista (Riposta).
--   Bastião: Guardião (Intervir) ou Inabalável (Último Bastião).
--   Comando: Senhor da Guerra (Liderança) ou Desafiante (Intimidar).
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('knight_battle_thirst', 'knight', 1, 1000, 1, 0, 'knight_execution', 1),
  ('knight_riposte', 'knight', 1, 1000, 1, 0, 'knight_execution', 1),
  ('knight_intervene', 'knight', 1, 1000, 1, 0, 'knight_steel_wall', 1),
  ('knight_last_bastion', 'knight', 1, 1000, 1, 0, 'knight_steel_wall', 1),
  ('knight_leadership', 'knight', 1, 1000, 1, 0, 'knight_commander_shout', 1),
  ('knight_intimidate', 'knight', 1, 1000, 1, 0, 'knight_commander_shout', 1);
update public.talents set exclusive_with = 'knight_riposte' where id = 'knight_battle_thirst';
update public.talents set exclusive_with = 'knight_battle_thirst' where id = 'knight_riposte';
update public.talents set exclusive_with = 'knight_last_bastion' where id = 'knight_intervene';
update public.talents set exclusive_with = 'knight_intervene' where id = 'knight_last_bastion';
update public.talents set exclusive_with = 'knight_intimidate' where id = 'knight_leadership';
update public.talents set exclusive_with = 'knight_leadership' where id = 'knight_intimidate';

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('knight_steel_whirlwind', 'knight', 3, 1200, 1.6, 0, 'knight_battle_thirst', 1),
  ('knight_thrown_blade', 'knight', 3, 1200, 1.6, 0, 'knight_riposte', 1),
  ('knight_shield_bash', 'knight', 3, 1200, 1.6, 0, 'knight_intervene', 1),
  ('knight_iron_thorns', 'knight', 3, 1200, 1.6, 0, 'knight_last_bastion', 1),
  ('knight_charge', 'knight', 3, 1200, 1.6, 0, 'knight_leadership', 1),
  ('knight_iron_chain', 'knight', 3, 1200, 1.6, 0, 'knight_intimidate', 1);
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('knight_berserk_rage', 'knight', 3, 1600, 1.6, 0, 'knight_steel_whirlwind', 1),
  ('knight_thousand_cuts', 'knight', 3, 1600, 1.6, 0, 'knight_thrown_blade', 1),
  ('knight_shared_aegis', 'knight', 3, 1600, 1.6, 0, 'knight_shield_bash', 1),
  ('knight_living_fortress', 'knight', 3, 1600, 1.6, 0, 'knight_iron_thorns', 1),
  ('knight_war_banner', 'knight', 3, 1600, 1.6, 0, 'knight_charge', 1),
  ('knight_supreme_challenge', 'knight', 3, 1600, 1.6, 0, 'knight_iron_chain', 1);
