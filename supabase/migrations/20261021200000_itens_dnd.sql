-- Itens no espírito de D&D (packages/shared/src/items.ts): 6 slots (arma, capacete, armadura, calça, botas e
-- escudo), famílias com restrição de classe e 3 raridades (comum, raro, mágico). O id passa a ser
-- slot-família-nível-raridade (ex.: weapon-sword-3-rare); o slot continua sendo a primeira parte.
-- O catálogo abaixo sai de `npx tsx apps/server/scripts/catalog-sql.ts`; mude os dois juntos.

alter table public.market_items
  add column tier int check (tier between 1 and 5),
  add column rarity text check (rarity in ('common', 'rare', 'magic')),
  -- null = todas as classes
  add column classes text[];

insert into public.market_items (item_id, buy_price, sell_price, tier, rarity, classes) values
  ('weapon-sword-1-common', 60, 10, 1, 'common', '{knight}'),
  ('weapon-sword-1-rare', null, 20, 1, 'rare', '{knight}'),
  ('weapon-sword-1-magic', null, 40, 1, 'magic', '{knight}'),
  ('weapon-sword-2-common', 150, 25, 2, 'common', '{knight}'),
  ('weapon-sword-2-rare', null, 50, 2, 'rare', '{knight}'),
  ('weapon-sword-2-magic', null, 100, 2, 'magic', '{knight}'),
  ('weapon-sword-3-common', 350, 60, 3, 'common', '{knight}'),
  ('weapon-sword-3-rare', null, 120, 3, 'rare', '{knight}'),
  ('weapon-sword-3-magic', null, 240, 3, 'magic', '{knight}'),
  ('weapon-sword-4-common', 800, 130, 4, 'common', '{knight}'),
  ('weapon-sword-4-rare', null, 260, 4, 'rare', '{knight}'),
  ('weapon-sword-4-magic', null, 520, 4, 'magic', '{knight}'),
  ('weapon-sword-5-common', null, 300, 5, 'common', '{knight}'),
  ('weapon-sword-5-rare', null, 600, 5, 'rare', '{knight}'),
  ('weapon-sword-5-magic', null, 1200, 5, 'magic', '{knight}'),
  ('weapon-axe-1-common', 60, 10, 1, 'common', '{knight}'),
  ('weapon-axe-1-rare', null, 20, 1, 'rare', '{knight}'),
  ('weapon-axe-1-magic', null, 40, 1, 'magic', '{knight}'),
  ('weapon-axe-2-common', 150, 25, 2, 'common', '{knight}'),
  ('weapon-axe-2-rare', null, 50, 2, 'rare', '{knight}'),
  ('weapon-axe-2-magic', null, 100, 2, 'magic', '{knight}'),
  ('weapon-axe-3-common', 350, 60, 3, 'common', '{knight}'),
  ('weapon-axe-3-rare', null, 120, 3, 'rare', '{knight}'),
  ('weapon-axe-3-magic', null, 240, 3, 'magic', '{knight}'),
  ('weapon-axe-4-common', 800, 130, 4, 'common', '{knight}'),
  ('weapon-axe-4-rare', null, 260, 4, 'rare', '{knight}'),
  ('weapon-axe-4-magic', null, 520, 4, 'magic', '{knight}'),
  ('weapon-axe-5-common', null, 300, 5, 'common', '{knight}'),
  ('weapon-axe-5-rare', null, 600, 5, 'rare', '{knight}'),
  ('weapon-axe-5-magic', null, 1200, 5, 'magic', '{knight}'),
  ('weapon-bow-1-common', 60, 10, 1, 'common', '{paladin}'),
  ('weapon-bow-1-rare', null, 20, 1, 'rare', '{paladin}'),
  ('weapon-bow-1-magic', null, 40, 1, 'magic', '{paladin}'),
  ('weapon-bow-2-common', 150, 25, 2, 'common', '{paladin}'),
  ('weapon-bow-2-rare', null, 50, 2, 'rare', '{paladin}'),
  ('weapon-bow-2-magic', null, 100, 2, 'magic', '{paladin}'),
  ('weapon-bow-3-common', 350, 60, 3, 'common', '{paladin}'),
  ('weapon-bow-3-rare', null, 120, 3, 'rare', '{paladin}'),
  ('weapon-bow-3-magic', null, 240, 3, 'magic', '{paladin}'),
  ('weapon-bow-4-common', 800, 130, 4, 'common', '{paladin}'),
  ('weapon-bow-4-rare', null, 260, 4, 'rare', '{paladin}'),
  ('weapon-bow-4-magic', null, 520, 4, 'magic', '{paladin}'),
  ('weapon-bow-5-common', null, 300, 5, 'common', '{paladin}'),
  ('weapon-bow-5-rare', null, 600, 5, 'rare', '{paladin}'),
  ('weapon-bow-5-magic', null, 1200, 5, 'magic', '{paladin}'),
  ('weapon-crossbow-1-common', 60, 10, 1, 'common', '{paladin}'),
  ('weapon-crossbow-1-rare', null, 20, 1, 'rare', '{paladin}'),
  ('weapon-crossbow-1-magic', null, 40, 1, 'magic', '{paladin}'),
  ('weapon-crossbow-2-common', 150, 25, 2, 'common', '{paladin}'),
  ('weapon-crossbow-2-rare', null, 50, 2, 'rare', '{paladin}'),
  ('weapon-crossbow-2-magic', null, 100, 2, 'magic', '{paladin}'),
  ('weapon-crossbow-3-common', 350, 60, 3, 'common', '{paladin}'),
  ('weapon-crossbow-3-rare', null, 120, 3, 'rare', '{paladin}'),
  ('weapon-crossbow-3-magic', null, 240, 3, 'magic', '{paladin}'),
  ('weapon-crossbow-4-common', 800, 130, 4, 'common', '{paladin}'),
  ('weapon-crossbow-4-rare', null, 260, 4, 'rare', '{paladin}'),
  ('weapon-crossbow-4-magic', null, 520, 4, 'magic', '{paladin}'),
  ('weapon-crossbow-5-common', null, 300, 5, 'common', '{paladin}'),
  ('weapon-crossbow-5-rare', null, 600, 5, 'rare', '{paladin}'),
  ('weapon-crossbow-5-magic', null, 1200, 5, 'magic', '{paladin}'),
  ('weapon-wand-1-common', 60, 10, 1, 'common', '{sorcerer,druid}'),
  ('weapon-wand-1-rare', null, 20, 1, 'rare', '{sorcerer,druid}'),
  ('weapon-wand-1-magic', null, 40, 1, 'magic', '{sorcerer,druid}'),
  ('weapon-wand-2-common', 150, 25, 2, 'common', '{sorcerer,druid}'),
  ('weapon-wand-2-rare', null, 50, 2, 'rare', '{sorcerer,druid}'),
  ('weapon-wand-2-magic', null, 100, 2, 'magic', '{sorcerer,druid}'),
  ('weapon-wand-3-common', 350, 60, 3, 'common', '{sorcerer,druid}'),
  ('weapon-wand-3-rare', null, 120, 3, 'rare', '{sorcerer,druid}'),
  ('weapon-wand-3-magic', null, 240, 3, 'magic', '{sorcerer,druid}'),
  ('weapon-wand-4-common', 800, 130, 4, 'common', '{sorcerer,druid}'),
  ('weapon-wand-4-rare', null, 260, 4, 'rare', '{sorcerer,druid}'),
  ('weapon-wand-4-magic', null, 520, 4, 'magic', '{sorcerer,druid}'),
  ('weapon-wand-5-common', null, 300, 5, 'common', '{sorcerer,druid}'),
  ('weapon-wand-5-rare', null, 600, 5, 'rare', '{sorcerer,druid}'),
  ('weapon-wand-5-magic', null, 1200, 5, 'magic', '{sorcerer,druid}'),
  ('weapon-staff-1-common', 60, 10, 1, 'common', '{sorcerer,druid}'),
  ('weapon-staff-1-rare', null, 20, 1, 'rare', '{sorcerer,druid}'),
  ('weapon-staff-1-magic', null, 40, 1, 'magic', '{sorcerer,druid}'),
  ('weapon-staff-2-common', 150, 25, 2, 'common', '{sorcerer,druid}'),
  ('weapon-staff-2-rare', null, 50, 2, 'rare', '{sorcerer,druid}'),
  ('weapon-staff-2-magic', null, 100, 2, 'magic', '{sorcerer,druid}'),
  ('weapon-staff-3-common', 350, 60, 3, 'common', '{sorcerer,druid}'),
  ('weapon-staff-3-rare', null, 120, 3, 'rare', '{sorcerer,druid}'),
  ('weapon-staff-3-magic', null, 240, 3, 'magic', '{sorcerer,druid}'),
  ('weapon-staff-4-common', 800, 130, 4, 'common', '{sorcerer,druid}'),
  ('weapon-staff-4-rare', null, 260, 4, 'rare', '{sorcerer,druid}'),
  ('weapon-staff-4-magic', null, 520, 4, 'magic', '{sorcerer,druid}'),
  ('weapon-staff-5-common', null, 300, 5, 'common', '{sorcerer,druid}'),
  ('weapon-staff-5-rare', null, 600, 5, 'rare', '{sorcerer,druid}'),
  ('weapon-staff-5-magic', null, 1200, 5, 'magic', '{sorcerer,druid}'),
  ('helmet-war-1-common', 60, 10, 1, 'common', '{knight,paladin}'),
  ('helmet-war-1-rare', null, 20, 1, 'rare', '{knight,paladin}'),
  ('helmet-war-1-magic', null, 40, 1, 'magic', '{knight,paladin}'),
  ('helmet-war-2-common', 150, 25, 2, 'common', '{knight,paladin}'),
  ('helmet-war-2-rare', null, 50, 2, 'rare', '{knight,paladin}'),
  ('helmet-war-2-magic', null, 100, 2, 'magic', '{knight,paladin}'),
  ('helmet-war-3-common', 350, 60, 3, 'common', '{knight,paladin}'),
  ('helmet-war-3-rare', null, 120, 3, 'rare', '{knight,paladin}'),
  ('helmet-war-3-magic', null, 240, 3, 'magic', '{knight,paladin}'),
  ('helmet-war-4-common', 800, 130, 4, 'common', '{knight,paladin}'),
  ('helmet-war-4-rare', null, 260, 4, 'rare', '{knight,paladin}'),
  ('helmet-war-4-magic', null, 520, 4, 'magic', '{knight,paladin}'),
  ('helmet-war-5-common', null, 300, 5, 'common', '{knight,paladin}'),
  ('helmet-war-5-rare', null, 600, 5, 'rare', '{knight,paladin}'),
  ('helmet-war-5-magic', null, 1200, 5, 'magic', '{knight,paladin}'),
  ('armor-war-1-common', 60, 10, 1, 'common', '{knight,paladin}'),
  ('armor-war-1-rare', null, 20, 1, 'rare', '{knight,paladin}'),
  ('armor-war-1-magic', null, 40, 1, 'magic', '{knight,paladin}'),
  ('armor-war-2-common', 150, 25, 2, 'common', '{knight,paladin}'),
  ('armor-war-2-rare', null, 50, 2, 'rare', '{knight,paladin}'),
  ('armor-war-2-magic', null, 100, 2, 'magic', '{knight,paladin}'),
  ('armor-war-3-common', 350, 60, 3, 'common', '{knight,paladin}'),
  ('armor-war-3-rare', null, 120, 3, 'rare', '{knight,paladin}'),
  ('armor-war-3-magic', null, 240, 3, 'magic', '{knight,paladin}'),
  ('armor-war-4-common', 800, 130, 4, 'common', '{knight,paladin}'),
  ('armor-war-4-rare', null, 260, 4, 'rare', '{knight,paladin}'),
  ('armor-war-4-magic', null, 520, 4, 'magic', '{knight,paladin}'),
  ('armor-war-5-common', null, 300, 5, 'common', '{knight,paladin}'),
  ('armor-war-5-rare', null, 600, 5, 'rare', '{knight,paladin}'),
  ('armor-war-5-magic', null, 1200, 5, 'magic', '{knight,paladin}'),
  ('legs-war-1-common', 60, 10, 1, 'common', '{knight,paladin}'),
  ('legs-war-1-rare', null, 20, 1, 'rare', '{knight,paladin}'),
  ('legs-war-1-magic', null, 40, 1, 'magic', '{knight,paladin}'),
  ('legs-war-2-common', 150, 25, 2, 'common', '{knight,paladin}'),
  ('legs-war-2-rare', null, 50, 2, 'rare', '{knight,paladin}'),
  ('legs-war-2-magic', null, 100, 2, 'magic', '{knight,paladin}'),
  ('legs-war-3-common', 350, 60, 3, 'common', '{knight,paladin}'),
  ('legs-war-3-rare', null, 120, 3, 'rare', '{knight,paladin}'),
  ('legs-war-3-magic', null, 240, 3, 'magic', '{knight,paladin}'),
  ('legs-war-4-common', 800, 130, 4, 'common', '{knight,paladin}'),
  ('legs-war-4-rare', null, 260, 4, 'rare', '{knight,paladin}'),
  ('legs-war-4-magic', null, 520, 4, 'magic', '{knight,paladin}'),
  ('legs-war-5-common', null, 300, 5, 'common', '{knight,paladin}'),
  ('legs-war-5-rare', null, 600, 5, 'rare', '{knight,paladin}'),
  ('legs-war-5-magic', null, 1200, 5, 'magic', '{knight,paladin}'),
  ('helmet-arcane-1-common', 60, 10, 1, 'common', '{sorcerer,druid}'),
  ('helmet-arcane-1-rare', null, 20, 1, 'rare', '{sorcerer,druid}'),
  ('helmet-arcane-1-magic', null, 40, 1, 'magic', '{sorcerer,druid}'),
  ('helmet-arcane-2-common', 150, 25, 2, 'common', '{sorcerer,druid}'),
  ('helmet-arcane-2-rare', null, 50, 2, 'rare', '{sorcerer,druid}'),
  ('helmet-arcane-2-magic', null, 100, 2, 'magic', '{sorcerer,druid}'),
  ('helmet-arcane-3-common', 350, 60, 3, 'common', '{sorcerer,druid}'),
  ('helmet-arcane-3-rare', null, 120, 3, 'rare', '{sorcerer,druid}'),
  ('helmet-arcane-3-magic', null, 240, 3, 'magic', '{sorcerer,druid}'),
  ('helmet-arcane-4-common', 800, 130, 4, 'common', '{sorcerer,druid}'),
  ('helmet-arcane-4-rare', null, 260, 4, 'rare', '{sorcerer,druid}'),
  ('helmet-arcane-4-magic', null, 520, 4, 'magic', '{sorcerer,druid}'),
  ('helmet-arcane-5-common', null, 300, 5, 'common', '{sorcerer,druid}'),
  ('helmet-arcane-5-rare', null, 600, 5, 'rare', '{sorcerer,druid}'),
  ('helmet-arcane-5-magic', null, 1200, 5, 'magic', '{sorcerer,druid}'),
  ('armor-arcane-1-common', 60, 10, 1, 'common', '{sorcerer,druid}'),
  ('armor-arcane-1-rare', null, 20, 1, 'rare', '{sorcerer,druid}'),
  ('armor-arcane-1-magic', null, 40, 1, 'magic', '{sorcerer,druid}'),
  ('armor-arcane-2-common', 150, 25, 2, 'common', '{sorcerer,druid}'),
  ('armor-arcane-2-rare', null, 50, 2, 'rare', '{sorcerer,druid}'),
  ('armor-arcane-2-magic', null, 100, 2, 'magic', '{sorcerer,druid}'),
  ('armor-arcane-3-common', 350, 60, 3, 'common', '{sorcerer,druid}'),
  ('armor-arcane-3-rare', null, 120, 3, 'rare', '{sorcerer,druid}'),
  ('armor-arcane-3-magic', null, 240, 3, 'magic', '{sorcerer,druid}'),
  ('armor-arcane-4-common', 800, 130, 4, 'common', '{sorcerer,druid}'),
  ('armor-arcane-4-rare', null, 260, 4, 'rare', '{sorcerer,druid}'),
  ('armor-arcane-4-magic', null, 520, 4, 'magic', '{sorcerer,druid}'),
  ('armor-arcane-5-common', null, 300, 5, 'common', '{sorcerer,druid}'),
  ('armor-arcane-5-rare', null, 600, 5, 'rare', '{sorcerer,druid}'),
  ('armor-arcane-5-magic', null, 1200, 5, 'magic', '{sorcerer,druid}'),
  ('legs-arcane-1-common', 60, 10, 1, 'common', '{sorcerer,druid}'),
  ('legs-arcane-1-rare', null, 20, 1, 'rare', '{sorcerer,druid}'),
  ('legs-arcane-1-magic', null, 40, 1, 'magic', '{sorcerer,druid}'),
  ('legs-arcane-2-common', 150, 25, 2, 'common', '{sorcerer,druid}'),
  ('legs-arcane-2-rare', null, 50, 2, 'rare', '{sorcerer,druid}'),
  ('legs-arcane-2-magic', null, 100, 2, 'magic', '{sorcerer,druid}'),
  ('legs-arcane-3-common', 350, 60, 3, 'common', '{sorcerer,druid}'),
  ('legs-arcane-3-rare', null, 120, 3, 'rare', '{sorcerer,druid}'),
  ('legs-arcane-3-magic', null, 240, 3, 'magic', '{sorcerer,druid}'),
  ('legs-arcane-4-common', 800, 130, 4, 'common', '{sorcerer,druid}'),
  ('legs-arcane-4-rare', null, 260, 4, 'rare', '{sorcerer,druid}'),
  ('legs-arcane-4-magic', null, 520, 4, 'magic', '{sorcerer,druid}'),
  ('legs-arcane-5-common', null, 300, 5, 'common', '{sorcerer,druid}'),
  ('legs-arcane-5-rare', null, 600, 5, 'rare', '{sorcerer,druid}'),
  ('legs-arcane-5-magic', null, 1200, 5, 'magic', '{sorcerer,druid}'),
  ('boots-boots-1-common', 60, 10, 1, 'common', null),
  ('boots-boots-1-rare', null, 20, 1, 'rare', null),
  ('boots-boots-1-magic', null, 40, 1, 'magic', null),
  ('boots-boots-2-common', 150, 25, 2, 'common', null),
  ('boots-boots-2-rare', null, 50, 2, 'rare', null),
  ('boots-boots-2-magic', null, 100, 2, 'magic', null),
  ('boots-boots-3-common', 350, 60, 3, 'common', null),
  ('boots-boots-3-rare', null, 120, 3, 'rare', null),
  ('boots-boots-3-magic', null, 240, 3, 'magic', null),
  ('boots-boots-4-common', 800, 130, 4, 'common', null),
  ('boots-boots-4-rare', null, 260, 4, 'rare', null),
  ('boots-boots-4-magic', null, 520, 4, 'magic', null),
  ('boots-boots-5-common', null, 300, 5, 'common', null),
  ('boots-boots-5-rare', null, 600, 5, 'rare', null),
  ('boots-boots-5-magic', null, 1200, 5, 'magic', null),
  ('shield-shield-1-common', 60, 10, 1, 'common', null),
  ('shield-shield-1-rare', null, 20, 1, 'rare', null),
  ('shield-shield-1-magic', null, 40, 1, 'magic', null),
  ('shield-shield-2-common', 150, 25, 2, 'common', null),
  ('shield-shield-2-rare', null, 50, 2, 'rare', null),
  ('shield-shield-2-magic', null, 100, 2, 'magic', null),
  ('shield-shield-3-common', 350, 60, 3, 'common', null),
  ('shield-shield-3-rare', null, 120, 3, 'rare', null),
  ('shield-shield-3-magic', null, 240, 3, 'magic', null),
  ('shield-shield-4-common', 800, 130, 4, 'common', null),
  ('shield-shield-4-rare', null, 260, 4, 'rare', null),
  ('shield-shield-4-magic', null, 520, 4, 'magic', null),
  ('shield-shield-5-common', null, 300, 5, 'common', null),
  ('shield-shield-5-rare', null, 600, 5, 'rare', null),
  ('shield-shield-5-magic', null, 1200, 5, 'magic', null)
on conflict (item_id) do update set buy_price = excluded.buy_price, sell_price = excluded.sell_price,
  tier = excluded.tier, rarity = excluded.rarity, classes = excluded.classes;

-- Itens antigos (weapon-3, helmet-2...) viram o comum equivalente na família da última classe jogada:
-- arma de cavaleiro (o nível 3 era um machado), arco do paladino ou cajado de feiticeiro e druida;
-- capacete e armadura de guerra ou arcanos.
update public.profile_items pi
set item_id = case split_part(pi.item_id, '-', 1)
    when 'weapon' then 'weapon-' || case
      when x.class_id = 'paladin' then 'bow'
      when x.class_id in ('sorcerer', 'druid') then 'staff'
      when split_part(pi.item_id, '-', 2) = '3' then 'axe'
      else 'sword' end
    when 'shield' then 'shield-shield'
    else split_part(pi.item_id, '-', 1) || '-' || case when x.class_id in ('sorcerer', 'druid') then 'arcane' else 'war' end
    end || '-' || split_part(pi.item_id, '-', 2) || '-common'
from (
  select p.id, coalesce((select mp.class_id from public.match_players mp where mp.profile_id = p.profile_id
                         order by mp.ended_at desc limit 1), 'knight') as class_id
  from public.profile_items p
) x
where x.id = pi.id and split_part(pi.item_id, '-', 3) = '';

delete from public.market_items where split_part(item_id, '-', 3) = '';

alter table public.market_items
  alter column tier set not null,
  alter column rarity set not null;

-- Servidor de jogo: a hunt começou, sai da conta só o equipamento que a classe usa. O resto (a espada,
-- para um druida) fica equipado em casa. A versão de um argumento continua para quem não sabe a classe.
create function public.take_loadout(p_profile_id uuid, p_class_id text)
returns setof text
language sql
security definer
set search_path = ''
as $$
  delete from public.profile_items pi
  using public.market_items m
  where pi.profile_id = p_profile_id and pi.equipped and m.item_id = pi.item_id
    and (m.classes is null or p_class_id = any (m.classes))
  returning pi.item_id;
$$;

revoke execute on function public.take_loadout(uuid, text) from public, anon, authenticated;
grant execute on function public.take_loadout(uuid, text) to service_role;

-- A bag vai para o cofre com os itens mais valiosos primeiro (o id não tem mais o nível na 2ª parte).
create or replace function public.store_bag(p_profile_id uuid, p_bag text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_free int;
  v_item text;
begin
  perform 1 from public.profiles where id = p_profile_id for update;
  v_free := greatest(20 - public.vault_count(p_profile_id), 0);
  for v_item in
    select b.i from unnest(p_bag) b(i)
    join public.market_items m on m.item_id = b.i
    order by m.sell_price desc, m.tier desc
  loop
    insert into public.profile_items (profile_id, item_id, source, location)
    values (p_profile_id, v_item, 'hunt', case when v_free > 0 then 'vault' else 'bag' end);
    v_free := v_free - 1;
  end loop;
end;
$$;
