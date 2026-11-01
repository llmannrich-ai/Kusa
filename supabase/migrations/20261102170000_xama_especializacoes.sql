-- Xamã Orc, Fase 3 (docs/CLASSE_XAMA_ORC.md): as especializações, as costelas e os Ápices do slot 3
-- (`SHAPES.shaman` e `RIBS.shaman` em talents.ts, Traços em traits.ts: mude os dois juntos).
--   - Horda: Senhor da Horda (Sangue do Clã → Berserkers do Clã → Chefe de Guerra) ou Domador de Sangue (Juramento de
--     Sangue → Corrente da Submissão → Ogro Acorrentado).
--   - Totens: Entalhador (Mãos de Entalhe → Totem do Trovão → Totem Vulcânico) ou Nômade (Totem nas Costas →
--     Investida do Javali → Círculo de Totens).
--   - Brasa: Coração de Brasa (Herança de Vorgak → Fenda de Brasa → Fúria de Brasa) ou Tamboreiro (Ritmo de Guerra →
--     Tambor de Sangue → Marcha do Clã).
--   - Costelas: Xamã do Clã e Mau Agouro (Horda), Totem de Sangue (Totens), Chuva de Cinzas (Brasa).
--   - Ápices (2.000 de gold, pedem a última magia do tronco): Fúria da Horda, Círculo dos Ancestrais, Chuva da Forja.
-- Traço 1.000 de gold e escolha permanente (`exclusive_with`, que `buy_talent` confere); magias dos lados 1.200 e 1.600.

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('shaman_blood_totem', 'shaman', 1, 500, 1, 0, 'shaman_mud_totem', 1, true),
  ('shaman_ash_rain', 'shaman', 1, 500, 1, 0, 'shaman_ember_lance', 1, true),
  ('shaman_clan_shaman', 'shaman', 1, 800, 1, 0, 'shaman_clan_spearmen', 1, true),
  ('shaman_bad_omen', 'shaman', 1, 1200, 1, 0, 'shaman_clan_shaman', 1, true),
  ('shaman_clan_blood', 'shaman', 1, 1000, 1, 0, 'shaman_clan_captain', 1, false),
  ('shaman_blood_oath', 'shaman', 1, 1000, 1, 0, 'shaman_clan_captain', 1, false),
  ('shaman_horde_roar', 'shaman', 1, 2000, 1, 0, 'shaman_clan_captain', 1, true),
  ('shaman_carver_hands', 'shaman', 1, 1000, 1, 0, 'shaman_grand_totem', 1, false),
  ('shaman_totem_pack', 'shaman', 1, 1000, 1, 0, 'shaman_grand_totem', 1, false),
  ('shaman_ancestor_circle', 'shaman', 1, 2000, 1, 0, 'shaman_grand_totem', 1, true),
  ('shaman_vorgak_legacy', 'shaman', 1, 1000, 1, 0, 'shaman_forge_ogre', 1, false),
  ('shaman_war_rhythm', 'shaman', 1, 1000, 1, 0, 'shaman_forge_ogre', 1, false),
  ('shaman_forge_rain', 'shaman', 1, 2000, 1, 0, 'shaman_forge_ogre', 1, true),
  ('shaman_clan_berserkers', 'shaman', 1, 1200, 1, 0, 'shaman_clan_blood', 1, true),
  ('shaman_submission_chain', 'shaman', 1, 1200, 1, 0, 'shaman_blood_oath', 1, true),
  ('shaman_thunder_totem', 'shaman', 1, 1200, 1, 0, 'shaman_carver_hands', 1, true),
  ('shaman_boar_charge', 'shaman', 1, 1200, 1, 0, 'shaman_totem_pack', 1, true),
  ('shaman_ember_rift', 'shaman', 1, 1200, 1, 0, 'shaman_vorgak_legacy', 1, true),
  ('shaman_blood_drum', 'shaman', 1, 1200, 1, 0, 'shaman_war_rhythm', 1, true),
  ('shaman_warlord_call', 'shaman', 1, 1600, 1, 0, 'shaman_clan_berserkers', 1, true),
  ('shaman_chained_ogre', 'shaman', 1, 1600, 1, 0, 'shaman_submission_chain', 1, true),
  ('shaman_volcanic_totem', 'shaman', 1, 1600, 1, 0, 'shaman_thunder_totem', 1, true),
  ('shaman_totem_ring', 'shaman', 1, 1600, 1, 0, 'shaman_boar_charge', 1, true),
  ('shaman_ember_fury', 'shaman', 1, 1600, 1, 0, 'shaman_ember_rift', 1, true),
  ('shaman_clan_march', 'shaman', 1, 1600, 1, 0, 'shaman_blood_drum', 1, true);

update public.talents set exclusive_with = 'shaman_blood_oath' where id = 'shaman_clan_blood';
update public.talents set exclusive_with = 'shaman_clan_blood' where id = 'shaman_blood_oath';
update public.talents set exclusive_with = 'shaman_totem_pack' where id = 'shaman_carver_hands';
update public.talents set exclusive_with = 'shaman_carver_hands' where id = 'shaman_totem_pack';
update public.talents set exclusive_with = 'shaman_war_rhythm' where id = 'shaman_vorgak_legacy';
update public.talents set exclusive_with = 'shaman_vorgak_legacy' where id = 'shaman_war_rhythm';

-- Dons do fundo do Xamã Orc (gifts.ts): um embaixo de cada Ápice, pedindo o Ápice; 25 níveis, 60 de gold e ×1,12.
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank, is_spell) values
  ('shaman_horde_bond', 'shaman', 25, 60, 1.12, 0, 'shaman_horde_roar', 1, false),
  ('shaman_ancestor_stance', 'shaman', 25, 60, 1.12, 0, 'shaman_ancestor_circle', 1, false),
  ('shaman_forge_spark', 'shaman', 25, 60, 1.12, 0, 'shaman_forge_rain', 1, false);
