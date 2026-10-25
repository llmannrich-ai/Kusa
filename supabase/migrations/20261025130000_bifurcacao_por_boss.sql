-- Bifurcação por boss: o lado de uma bifurcação abre com **um** boss só, não com qualquer boss do cenário anterior. Na
-- Caverna da Travessia, o Observador ('beholder', covil leste) abre as Dunas Cantantes; o Basilisco (covil oeste) não.
-- `profile_boss_clears` anota os bosses vencidos por personagem (conta e classe), com a mesma regra do cenário vencido:
-- todo humano que estava na hunt quando o boss caiu, vivo ou morto. O servidor de jogo anota por `record_boss_clear`
-- (só service role); a hunt solo e a sala no aparelho, por `record_solo_boss_clear` (o boss tem que ser do mapa da
-- hunt aberta). `map_unlocked_by_boss` repete `UNLOCK_BOSS` do packages/shared (`src/world.ts`): mude os dois juntos.
-- Contas atuais: quem levou a runa de um boss com a classe venceu aquele boss.

create table public.profile_boss_clears (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  class_id text not null check (class_id in ('knight', 'paladin', 'sorcerer', 'druid')),
  boss_kind text not null,
  first_at timestamptz not null default now(),
  primary key (profile_id, class_id, boss_kind)
);

alter table public.profile_boss_clears enable row level security;
create policy "jogador vê os próprios bosses vencidos"
  on public.profile_boss_clears for select to authenticated
  using ((select auth.uid()) = profile_id);

-- Lado de bifurcação: o boss que abre o cenário (null: abre com o cenário anterior vencido). UNLOCK_BOSS do packages/shared.
create or replace function public.map_unlocked_by_boss(p_map_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'dunes' then 'beholder'
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
  select p_map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas') and (
    public.map_unlocked_by(p_map_id) is null
    or case
      when public.map_unlocked_by_boss(p_map_id) is not null then exists (
        select 1 from public.profile_boss_clears b
        where b.profile_id = p_profile_id and b.class_id = p_class_id and b.boss_kind = public.map_unlocked_by_boss(p_map_id)
      )
      else exists (
        select 1 from public.profile_map_clears c
        where c.profile_id = p_profile_id and c.class_id = p_class_id and c.map_id = public.map_unlocked_by(p_map_id)
      )
    end
  );
$$;

revoke execute on function public.map_unlocked(uuid, text, text) from public, anon, authenticated;
grant execute on function public.map_unlocked(uuid, text, text) to service_role;

-- Servidor de jogo: o personagem venceu este boss (tem que ser um boss do mapa).
create or replace function public.record_boss_clear(p_profile_id uuid, p_class_id text, p_map_id text, p_boss text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profile_boss_clears (profile_id, class_id, boss_kind)
  select p_profile_id, p_class_id, p_boss
  where p_class_id in ('knight', 'paladin', 'sorcerer', 'druid') and p_boss = any (public.map_bosses(p_map_id))
  on conflict do nothing;
$$;

revoke execute on function public.record_boss_clear(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_boss_clear(uuid, text, text, text) to service_role;

-- Hunt solo e sala no aparelho: o jogador anota o próprio boss vencido pela hunt aberta (classe e mapa vêm dela; o
-- boss tem que ser do mapa). Vale até 3 h depois de a hunt começar, como `record_solo_map_clear`.
create or replace function public.record_solo_boss_clear(p_run_id uuid, p_boss text)
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
  if not found or not (p_boss = any (public.map_bosses(v_run.map_id))) then return false; end if;
  insert into public.profile_boss_clears (profile_id, class_id, boss_kind)
  select v_uid, v_run.class_id, p_boss
  where v_run.class_id in ('knight', 'paladin', 'sorcerer', 'druid')
  on conflict do nothing;
  return true;
end;
$$;

revoke execute on function public.record_solo_boss_clear(uuid, text) from public, anon;
grant execute on function public.record_solo_boss_clear(uuid, text) to authenticated;

-- Contas atuais: quem levou a runa do boss com a classe venceu aquele boss.
insert into public.profile_boss_clears (profile_id, class_id, boss_kind, first_at)
select profile_id, class_id, boss_kind, min(created_at)
from public.profile_boss_runes
group by 1, 2, 3
on conflict do nothing;
