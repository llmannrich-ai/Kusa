-- O paladino atira com arco e besta (as duas mãos) e deixa de usar escudo: os escudos passam a ser só do
-- cavaleiro, do feiticeiro e do druida (`NO_PALADIN` em packages/shared/src/items.ts). O equip_item já
-- confere market_items.classes.

update public.market_items
set classes = '{knight,sorcerer,druid}'
where item_id like 'shield-%';

-- Escudo que já estava vestido num paladino volta para o cofre (nada se perde; pode passar do limite do
-- cofre, que só impede guardar mais até liberar espaço).
update public.profile_items
set equipped = false, class_id = null
where equipped and class_id = 'paladin' and slot = 'shield';
