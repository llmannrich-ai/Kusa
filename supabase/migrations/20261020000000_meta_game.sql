-- Kusa: metajogo (contas, gold, upgrades permanentes, cosméticos, amigos, histórico de hunts).
-- Regra geral: o navegador só lê. Gold e resultados de hunt são gravados pelo servidor de jogo
-- (service role) ou por funções security definer que validam a operação.

-- Perfis ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 16),
  gold bigint not null default 0 check (gold >= 0),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "perfis visíveis para jogadores logados"
  on public.profiles for select to authenticated using (true);

-- O jogador só pode trocar o próprio username; gold nunca é gravado pelo cliente.
create policy "jogador edita o próprio perfil"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.profiles from authenticated, anon;
grant update (username) on public.profiles to authenticated;

-- Cria o perfil quando a conta é criada.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'aventureiro_' || substr(replace(new.id::text, '-', ''), 1, 6));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Upgrades permanentes -------------------------------------------------------

create table public.upgrades (
  id text primary key,
  name text not null,
  description text not null,
  max_level int not null check (max_level > 0),
  base_cost int not null check (base_cost > 0),
  -- custo do nível n = base_cost * cost_growth^(n-1)
  cost_growth numeric not null default 1.5 check (cost_growth >= 1)
);

alter table public.upgrades enable row level security;
create policy "catálogo de upgrades é público"
  on public.upgrades for select to anon, authenticated using (true);

create table public.profile_upgrades (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  upgrade_id text not null references public.upgrades (id),
  level int not null check (level >= 0),
  primary key (profile_id, upgrade_id)
);

alter table public.profile_upgrades enable row level security;
create policy "jogador vê os próprios upgrades"
  on public.profile_upgrades for select to authenticated
  using ((select auth.uid()) = profile_id);

create index profile_upgrades_upgrade_id_idx on public.profile_upgrades (upgrade_id);

-- Cosméticos -----------------------------------------------------------------

create table public.cosmetics (
  id text primary key,
  name text not null,
  slot text not null check (slot in ('outfit', 'head', 'weapon_skin', 'aura')),
  price int not null check (price >= 0)
);

alter table public.cosmetics enable row level security;
create policy "catálogo de cosméticos é público"
  on public.cosmetics for select to anon, authenticated using (true);

create table public.profile_cosmetics (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  cosmetic_id text not null references public.cosmetics (id),
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (profile_id, cosmetic_id)
);

alter table public.profile_cosmetics enable row level security;
-- Cosméticos equipados aparecem para a equipe, então qualquer jogador logado pode ler.
create policy "cosméticos visíveis para jogadores logados"
  on public.profile_cosmetics for select to authenticated using (true);

create index profile_cosmetics_cosmetic_id_idx on public.profile_cosmetics (cosmetic_id);

-- Amigos ---------------------------------------------------------------------

create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;

create policy "jogador vê as próprias amizades"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "jogador envia pedido de amizade"
  on public.friendships for insert to authenticated
  with check ((select auth.uid()) = requester_id and status = 'pending');

create policy "destinatário aceita o pedido"
  on public.friendships for update to authenticated
  using ((select auth.uid()) = addressee_id)
  with check ((select auth.uid()) = addressee_id and status = 'accepted');

create policy "qualquer lado desfaz a amizade"
  on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create index friendships_addressee_id_idx on public.friendships (addressee_id);

-- Histórico de hunts ---------------------------------------------------------

create table public.matches (
  id uuid primary key,
  map_id text not null default 'catacumbas',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  class_id text not null,
  outcome text not null check (outcome in ('died', 'escaped', 'completed', 'buried')),
  level_reached int not null,
  loot_value int not null default 0,
  gold_awarded int not null default 0,
  ended_at timestamptz not null default now(),
  primary key (match_id, profile_id)
);

alter table public.matches enable row level security;
alter table public.match_players enable row level security;

create policy "jogador vê as próprias hunts"
  on public.match_players for select to authenticated
  using ((select auth.uid()) = profile_id);

create policy "jogador vê partidas de que participou"
  on public.matches for select to authenticated
  using (exists (
    select 1 from public.match_players mp
    where mp.match_id = matches.id and mp.profile_id = (select auth.uid())
  ));

create index match_players_profile_id_idx on public.match_players (profile_id);

-- Funções --------------------------------------------------------------------

-- Chamada pelo servidor de jogo (service role) quando a hunt de um jogador termina.
-- Quem sai vivo converte o loot em gold; quem morre não ganha nada.
create function public.finish_run(
  p_match_id uuid,
  p_profile_id uuid,
  p_class_id text,
  p_outcome text,
  p_level int,
  p_loot int
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gold int := case when p_outcome in ('escaped', 'completed') then greatest(p_loot, 0) else 0 end;
begin
  insert into public.matches (id) values (p_match_id) on conflict (id) do nothing;

  insert into public.match_players (match_id, profile_id, class_id, outcome, level_reached, loot_value, gold_awarded)
  values (p_match_id, p_profile_id, p_class_id, p_outcome, p_level, greatest(p_loot, 0), v_gold);

  update public.profiles set gold = gold + v_gold where id = p_profile_id;
  return v_gold;
end;
$$;

revoke execute on function public.finish_run(uuid, uuid, text, text, int, int) from public, anon, authenticated;
grant execute on function public.finish_run(uuid, uuid, text, text, int, int) to service_role;

-- Compra do próximo nível de um upgrade com o gold do jogador.
create function public.buy_upgrade(p_upgrade_id text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_upgrade public.upgrades;
  v_current int;
  v_cost bigint;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;

  select * into v_upgrade from public.upgrades where id = p_upgrade_id;
  if not found then raise exception 'upgrade inexistente'; end if;

  select level into v_current from public.profile_upgrades
  where profile_id = v_uid and upgrade_id = p_upgrade_id for update;
  v_current := coalesce(v_current, 0);
  if v_current >= v_upgrade.max_level then raise exception 'upgrade no nível máximo'; end if;

  v_cost := ceil(v_upgrade.base_cost * power(v_upgrade.cost_growth, v_current));

  update public.profiles set gold = gold - v_cost where id = v_uid and gold >= v_cost;
  if not found then raise exception 'gold insuficiente'; end if;

  insert into public.profile_upgrades (profile_id, upgrade_id, level)
  values (v_uid, p_upgrade_id, v_current + 1)
  on conflict (profile_id, upgrade_id) do update set level = excluded.level;

  return v_current + 1;
end;
$$;

revoke execute on function public.buy_upgrade(text) from public, anon;
grant execute on function public.buy_upgrade(text) to authenticated;

-- Compra de cosmético.
create function public.buy_cosmetic(p_cosmetic_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_price int;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select price into v_price from public.cosmetics where id = p_cosmetic_id;
  if not found then raise exception 'cosmético inexistente'; end if;
  if exists (select 1 from public.profile_cosmetics where profile_id = v_uid and cosmetic_id = p_cosmetic_id) then
    raise exception 'cosmético já adquirido';
  end if;

  update public.profiles set gold = gold - v_price where id = v_uid and gold >= v_price;
  if not found then raise exception 'gold insuficiente'; end if;

  insert into public.profile_cosmetics (profile_id, cosmetic_id) values (v_uid, p_cosmetic_id);
end;
$$;

revoke execute on function public.buy_cosmetic(text) from public, anon;
grant execute on function public.buy_cosmetic(text) to authenticated;

-- Equipa um cosmético (desequipa o que estava no mesmo slot).
create function public.equip_cosmetic(p_cosmetic_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_slot text;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select c.slot into v_slot
  from public.profile_cosmetics pc join public.cosmetics c on c.id = pc.cosmetic_id
  where pc.profile_id = v_uid and pc.cosmetic_id = p_cosmetic_id;
  if not found then raise exception 'cosmético não adquirido'; end if;

  update public.profile_cosmetics pc set equipped = (pc.cosmetic_id = p_cosmetic_id)
  from public.cosmetics c
  where pc.profile_id = v_uid and c.id = pc.cosmetic_id and c.slot = v_slot;
end;
$$;

revoke execute on function public.equip_cosmetic(text) from public, anon;
grant execute on function public.equip_cosmetic(text) to authenticated;

-- Catálogo inicial -----------------------------------------------------------

insert into public.upgrades (id, name, description, max_level, base_cost, cost_growth) values
  ('vitality', 'Vitalidade', '+5% de HP máximo por nível', 10, 100, 1.6),
  ('arcana', 'Arcano', '+5% de mana máxima por nível', 10, 100, 1.6),
  ('might', 'Força', '+3% de dano base por nível', 10, 150, 1.7),
  ('swiftness', 'Agilidade', '+2% de velocidade de movimento por nível', 5, 200, 1.8),
  ('greed', 'Ganância', '+5% de loot convertido em gold por nível', 5, 250, 2.0);

insert into public.cosmetics (id, name, slot, price) values
  ('outfit_citizen', 'Traje de Cidadão', 'outfit', 0),
  ('outfit_hunter', 'Traje de Caçador', 'outfit', 500),
  ('head_feather', 'Chapéu de Pena', 'head', 300),
  ('aura_embers', 'Aura de Brasas', 'aura', 1500);
