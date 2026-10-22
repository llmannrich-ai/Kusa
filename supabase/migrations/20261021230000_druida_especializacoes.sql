-- Especializações do Druida (ver 20261021150000_especializacoes.sql).
-- Catálogo em packages/shared/src/talents.ts e traits.ts: mude os dois juntos.
--   Matilha: Mestre das Feras (Vínculo Selvagem) ou Metamorfo (Pele Selvagem).
--   Bosque: Círculo da Vida (Florescer) ou Guardião da Natureza (Seiva Protetora).
--   Espinhos: Peste (Toxina) ou Tempestade (Céu Carregado).
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('druid_wild_bond', 'druid', 1, 1000, 1, 0, 'druid_speed', 1),
  ('druid_wild_hide', 'druid', 1, 1000, 1, 0, 'druid_speed', 1),
  ('druid_bloom', 'druid', 1, 1000, 1, 0, 'druid_forest_heart', 1),
  ('druid_protective_sap', 'druid', 1, 1000, 1, 0, 'druid_forest_heart', 1),
  ('druid_toxin', 'druid', 1, 1000, 1, 0, 'druid_nature_wrath', 1),
  ('druid_charged_sky', 'druid', 1, 1000, 1, 0, 'druid_nature_wrath', 1);
update public.talents set exclusive_with = 'druid_wild_hide' where id = 'druid_wild_bond';
update public.talents set exclusive_with = 'druid_wild_bond' where id = 'druid_wild_hide';
update public.talents set exclusive_with = 'druid_protective_sap' where id = 'druid_bloom';
update public.talents set exclusive_with = 'druid_bloom' where id = 'druid_protective_sap';
update public.talents set exclusive_with = 'druid_charged_sky' where id = 'druid_toxin';
update public.talents set exclusive_with = 'druid_toxin' where id = 'druid_charged_sky';

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('druid_beast_cry', 'druid', 3, 1200, 1.6, 0, 'druid_wild_bond', 1),
  ('druid_panther_form', 'druid', 3, 1200, 1.6, 0, 'druid_wild_hide', 1),
  ('druid_distant_heal', 'druid', 3, 1200, 1.6, 0, 'druid_bloom', 1),
  ('druid_barkskin', 'druid', 3, 1200, 1.6, 0, 'druid_protective_sap', 1),
  ('druid_mamba_bite', 'druid', 3, 1200, 1.6, 0, 'druid_toxin', 1),
  ('druid_thunderwave', 'druid', 3, 1200, 1.6, 0, 'druid_charged_sky', 1);
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('druid_giant_eagle', 'druid', 3, 1600, 1.6, 0, 'druid_beast_cry', 1),
  ('druid_bear_form', 'druid', 3, 1600, 1.6, 0, 'druid_panther_form', 1),
  ('druid_rebirth_seed', 'druid', 3, 1600, 1.6, 0, 'druid_distant_heal', 1),
  ('druid_reviving_rain', 'druid', 3, 1600, 1.6, 0, 'druid_barkskin', 1),
  ('druid_poison_cloud', 'druid', 3, 1600, 1.6, 0, 'druid_mamba_bite', 1),
  ('druid_call_lightning', 'druid', 3, 1600, 1.6, 0, 'druid_thunderwave', 1);
