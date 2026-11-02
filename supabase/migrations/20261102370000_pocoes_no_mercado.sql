-- Poções deixam de cair de monstro e de baú (`POTIONS_DROP` em packages/shared/src/potions.ts): compram-se no Mercado,
-- com gold, ou com o vendedor do acampamento do terreno de caça, com o loot da hunt (isso fica só na hunt).
--   - `profile_potions`: as poções da conta, por personagem (conta e classe), até 5 de cada (`POTION_MAX`).
--   - `buy_potion`: compra no Mercado (preços em `MARKET_POTION_PRICES`: mude os dois juntos).
--   - Servidor de jogo (service role): `take_potions` leva as poções para a hunt e `store_potions` devolve as que sobraram.
--   - Hunt solo e sala no aparelho (cada jogador grava o seu): `take_my_potions` e `store_my_potions`, presas à hunt aberta
--     em `solo_runs` (uma devolução por hunt, só para quem saiu vivo, até 5 de cada: o teto do que se pode inventar).

create table public.profile_potions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  class_id text not null check (class_id in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman')),
  potion_id text not null check (potion_id in ('potion-health', 'potion-mana')),
  qty int not null default 0 check (qty >= 0 and qty <= 5),
  primary key (profile_id, class_id, potion_id)
);

alter table public.profile_potions enable row level security;
create policy "jogador vê as próprias poções"
  on public.profile_potions for select to authenticated
  using ((select auth.uid()) = profile_id);

alter table public.solo_runs add column if not exists potions_stored boolean not null default false;

create or replace function public.potion_price(p_potion_id text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_potion_id when 'potion-health' then 50 when 'potion-mana' then 40 else null end;
$$;

-- Compra `p_count` poções no Mercado para o personagem; devolve o gold que sobrou.
create or replace function public.buy_potion(p_class_id text, p_potion_id text, p_count int default 1)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_price int := public.potion_price(p_potion_id);
  v_have int;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  if p_class_id not in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman') then raise exception 'classe inválida'; end if;
  if v_price is null then raise exception 'item fora de venda'; end if;
  if p_count is null or p_count < 1 or p_count > 5 then raise exception 'quantidade inválida'; end if;
  perform 1 from public.profiles where id = v_uid for update;
  select coalesce((select qty from public.profile_potions where profile_id = v_uid and class_id = p_class_id and potion_id = p_potion_id), 0) into v_have;
  if v_have + p_count > 5 then raise exception 'sem lugar para mais'; end if;

  update public.profiles set gold = gold - v_price * p_count where id = v_uid and gold >= v_price * p_count
  returning gold into v_gold;
  if not found then raise exception 'gold insuficiente'; end if;

  insert into public.profile_potions (profile_id, class_id, potion_id, qty) values (v_uid, p_class_id, p_potion_id, p_count)
  on conflict (profile_id, class_id, potion_id) do update set qty = public.profile_potions.qty + excluded.qty;
  return v_gold;
end;
$$;

revoke execute on function public.buy_potion(text, text, int) from public, anon;
grant execute on function public.buy_potion(text, text, int) to authenticated;

-- Tira as poções do personagem e devolve a contagem: {"potion-health": n, "potion-mana": n}.
create or replace function public.take_potion_stock(p_profile_id uuid, p_class_id text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_stock jsonb;
begin
  with taken as (
    delete from public.profile_potions where profile_id = p_profile_id and class_id = p_class_id and qty > 0
    returning potion_id, qty
  )
  select coalesce(jsonb_object_agg(potion_id, qty), '{}'::jsonb) into v_stock from taken;
  return v_stock;
end;
$$;

revoke execute on function public.take_potion_stock(uuid, text) from public, anon, authenticated;

-- Guarda as poções que sobraram (até 5 de cada; o resto se perde).
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
  for v_id in select unnest(array['potion-health', 'potion-mana']) loop
    v_qty := least(5, greatest(0, coalesce((p_potions ->> v_id)::int, 0)));
    if v_qty = 0 then continue; end if;
    insert into public.profile_potions (profile_id, class_id, potion_id, qty) values (p_profile_id, p_class_id, v_id, v_qty)
    on conflict (profile_id, class_id, potion_id) do update set qty = least(5, public.profile_potions.qty + excluded.qty);
  end loop;
end;
$$;

revoke execute on function public.store_potion_stock(uuid, text, jsonb) from public, anon, authenticated;

-- Servidor de jogo: a hunt começou, as poções do personagem entram com ele.
create or replace function public.take_potions(p_profile_id uuid, p_class_id text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.take_potion_stock(p_profile_id, p_class_id);
$$;

revoke execute on function public.take_potions(uuid, text) from public, anon, authenticated;
grant execute on function public.take_potions(uuid, text) to service_role;

-- Servidor de jogo: a hunt acabou, as poções que sobraram voltam para a conta.
create or replace function public.store_potions(p_profile_id uuid, p_class_id text, p_potions jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.store_potion_stock(p_profile_id, p_class_id, p_potions);
$$;

revoke execute on function public.store_potions(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.store_potions(uuid, text, jsonb) to service_role;

-- Hunt solo / sala no aparelho: leva as poções do personagem para a hunt aberta (`start_solo_run`/`start_guest_run`).
create or replace function public.take_my_potions(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_run public.solo_runs%rowtype;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select * into v_run from public.solo_runs where id = p_run_id and profile_id = v_uid for update;
  if not found then raise exception 'hunt não encontrada'; end if;
  if v_run.finished_at is not null then raise exception 'hunt já fechada'; end if;
  return public.take_potion_stock(v_uid, v_run.class_id);
end;
$$;

revoke execute on function public.take_my_potions(uuid) from public, anon;
grant execute on function public.take_my_potions(uuid) to authenticated;

-- Hunt solo / sala no aparelho: devolve as poções que sobraram, uma vez por hunt e só para quem saiu vivo.
create or replace function public.store_my_potions(p_run_id uuid, p_potions jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_run public.solo_runs%rowtype;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select * into v_run from public.solo_runs where id = p_run_id and profile_id = v_uid for update;
  if not found then raise exception 'hunt não encontrada'; end if;
  if v_run.finished_at is null or v_run.outcome not in ('escaped', 'completed') then raise exception 'hunt sem poções para devolver'; end if;
  if v_run.potions_stored then return; end if;
  update public.solo_runs set potions_stored = true where id = p_run_id;
  perform public.store_potion_stock(v_uid, v_run.class_id, p_potions);
end;
$$;

revoke execute on function public.store_my_potions(uuid, jsonb) from public, anon;
grant execute on function public.store_my_potions(uuid, jsonb) to authenticated;
