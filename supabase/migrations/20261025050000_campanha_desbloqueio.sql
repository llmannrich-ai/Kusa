-- Campanha (mapa mundi de Verdemar): cada cenário abre ao vencer o boss do anterior, por personagem (conta e classe).
-- `profile_map_clears` anota os cenários vencidos. Ganha o cenário todo humano que estava na hunt quando o boss
-- principal morreu, vivo ou morto (sem ter saído). O servidor de jogo anota por `record_map_clear` (só service role);
-- a hunt solo e a sala no aparelho do jogador, por `record_solo_map_clear` (cada um anota o seu, pela hunt aberta).
-- A ordem repete `WORLD_ORDER` do packages/shared (`src/world.ts`): mude os dois juntos.
-- O bloqueio vale para quem cria: `start_solo_run` recusa cenário fechado, menos para quem entra na sala de outro
-- jogador no aparelho dele (`p_guest`). Contas atuais: quem já levou a runa do boss com a classe venceu o cenário.

create table public.profile_map_clears (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  class_id text not null check (class_id in ('knight', 'paladin', 'sorcerer', 'druid')),
  map_id text not null check (map_id in ('crypt', 'swamp', 'desert', 'marsh')),
  first_at timestamptz not null default now(),
  primary key (profile_id, class_id, map_id)
);

alter table public.profile_map_clears enable row level security;
create policy "jogador vê os próprios cenários vencidos"
  on public.profile_map_clears for select to authenticated
  using ((select auth.uid()) = profile_id);

-- Cenário que precisa estar vencido para abrir este (null: o primeiro da campanha). WORLD_ORDER do packages/shared.
create or replace function public.map_unlocked_by(p_map_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'crypt' then 'marsh'
    when 'desert' then 'crypt'
    when 'swamp' then 'desert'
    else null
  end;
$$;

create or replace function public.map_unlocked(p_profile_id uuid, p_class_id text, p_map_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_map_id in ('crypt', 'swamp', 'desert', 'marsh') and (
    public.map_unlocked_by(p_map_id) is null
    or exists (
      select 1 from public.profile_map_clears c
      where c.profile_id = p_profile_id and c.class_id = p_class_id and c.map_id = public.map_unlocked_by(p_map_id)
    )
  );
$$;

revoke execute on function public.map_unlocked(uuid, text, text) from public, anon, authenticated;
grant execute on function public.map_unlocked(uuid, text, text) to service_role;

-- Servidor de jogo: o personagem venceu o boss do cenário.
create or replace function public.record_map_clear(p_profile_id uuid, p_class_id text, p_map_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profile_map_clears (profile_id, class_id, map_id)
  select p_profile_id, p_class_id, p_map_id
  where p_class_id in ('knight', 'paladin', 'sorcerer', 'druid') and p_map_id in ('crypt', 'swamp', 'desert', 'marsh')
  on conflict do nothing;
$$;

revoke execute on function public.record_map_clear(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_map_clear(uuid, text, text) to service_role;

-- Hunt solo e sala no aparelho: o jogador anota o próprio cenário vencido pela hunt aberta (mapa e classe vêm dela,
-- não do cliente). Vale até 3 h depois de a hunt começar, terminada ou não (quem morreu antes do boss já fechou a dele).
create or replace function public.record_solo_map_clear(p_run_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_run public.solo_runs;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select * into v_run from public.solo_runs
  where id = p_run_id and profile_id = v_uid and started_at > now() - interval '3 hours';
  if not found then return false; end if;
  insert into public.profile_map_clears (profile_id, class_id, map_id)
  select v_uid, v_run.class_id, v_run.map_id
  where v_run.class_id in ('knight', 'paladin', 'sorcerer', 'druid')
  on conflict do nothing;
  return true;
end;
$$;

revoke execute on function public.record_solo_map_clear(uuid) from public, anon;
grant execute on function public.record_solo_map_clear(uuid) to authenticated;

-- `start_solo_run` ganha `p_guest` (entrou na sala de outro jogador no aparelho dele): quem cria ou joga sozinho
-- precisa ter o cenário aberto. Parte da definição em produção e troca só a assinatura e o teste do mapa.
do $$
declare
  v_def text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_sig_old constant text := 'public.start_solo_run(p_class_id text, p_map_id text)';
  v_sig_new constant text := 'public.start_solo_run(p_class_id text, p_map_id text, p_guest boolean DEFAULT false)';
  v_check_old constant text := $q$then raise exception 'mapa inválido'; end if;$q$;
  v_check_new constant text := $q$then raise exception 'mapa inválido'; end if;
  if not coalesce(p_guest, false) and not public.map_unlocked(v_uid, p_class_id, p_map_id) then
    raise exception 'cenário fechado: vença o boss do cenário anterior com esta classe';
  end if;$q$;
begin
  if position(v_sig_old in v_def) = 0 then raise exception 'start_solo_run: assinatura não encontrada'; end if;
  if position(v_check_old in v_def) = 0 then raise exception 'start_solo_run: teste do mapa não encontrado'; end if;
  v_def := replace(replace(v_def, v_sig_old, v_sig_new), v_check_old, v_check_new);
  drop function public.start_solo_run(text, text);
  execute v_def;
end;
$$;

revoke execute on function public.start_solo_run(text, text, boolean) from public, anon;
grant execute on function public.start_solo_run(text, text, boolean) to authenticated, service_role;

-- Contas atuais: quem levou a runa do boss com a classe venceu aquele cenário.
insert into public.profile_map_clears (profile_id, class_id, map_id, first_at)
select profile_id, class_id,
  case boss_kind when 'ogreKing' then 'marsh' when 'dragon' then 'crypt' when 'sandWorm' then 'desert' else 'swamp' end,
  min(created_at)
from public.profile_boss_runes
group by 1, 2, 3
on conflict do nothing;
