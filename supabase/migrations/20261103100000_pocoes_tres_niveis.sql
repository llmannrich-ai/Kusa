-- Poções em três níveis com cura fixa (`POTIONS` em packages/shared/src/potions.ts): pequena (os ids de antes,
-- `potion-health` e `potion-mana`), média (`-2`) e grande (`-3`). Até 5 de cada nível por personagem (`POTION_MAX`).
-- Preços do Mercado em `MARKET_POTION_PRICES`: mude os dois juntos. As funções de compra, retirada e devolução da
-- migration anterior (20261102390000_pocoes_no_mercado.sql) leem o preço e a lista daqui.

alter table public.profile_potions drop constraint if exists profile_potions_potion_id_check;
alter table public.profile_potions add constraint profile_potions_potion_id_check check (potion_id in (
  'potion-health', 'potion-health-2', 'potion-health-3', 'potion-mana', 'potion-mana-2', 'potion-mana-3'
));

create or replace function public.potion_price(p_potion_id text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_potion_id
    when 'potion-health' then 50 when 'potion-health-2' then 150 when 'potion-health-3' then 400
    when 'potion-mana' then 40 when 'potion-mana-2' then 120 when 'potion-mana-3' then 320
    else null end;
$$;

-- Guarda as poções que sobraram (até 5 de cada nível; o resto se perde).
create or replace function public.store_potion_stock(p_profile_id uuid, p_class_id text, p_potions jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id text;
  v_qty int;
begin
  if p_potions is null or jsonb_typeof(p_potions) <> 'object' then return; end if;
  for v_id in select unnest(array['potion-health', 'potion-health-2', 'potion-health-3', 'potion-mana', 'potion-mana-2', 'potion-mana-3']) loop
    v_qty := least(5, greatest(0, coalesce((p_potions ->> v_id)::int, 0)));
    if v_qty = 0 then continue; end if;
    insert into public.profile_potions (profile_id, class_id, potion_id, qty) values (p_profile_id, p_class_id, v_id, v_qty)
    on conflict (profile_id, class_id, potion_id) do update set qty = least(5, public.profile_potions.qty + excluded.qty);
  end loop;
end;
$$;

revoke execute on function public.store_potion_stock(uuid, text, jsonb) from public, anon, authenticated;
