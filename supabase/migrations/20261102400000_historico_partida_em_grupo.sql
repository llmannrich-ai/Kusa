-- Histórico: a sala no aparelho do jogador grava cada jogador pelo `finish_solo_run`, que usava o id da hunt
-- de cada um (`solo_runs.id`) como `match_id`. Uma partida de três virava três partidas de um. Agora cada
-- jogador liga a sua hunt à partida da sala (`link_solo_match`, id derivado da sala e da seed da hunt, igual
-- para todos) e um gatilho troca o `match_id` na hora de gravar a telemetria.

alter table public.solo_runs add column match_id uuid;

create function public.link_solo_match(p_run_id uuid, p_room text, p_seed int)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.solo_runs
  set match_id = md5(left(p_room, 100) || ':' || p_seed)::uuid
  where id = p_run_id and profile_id = (select auth.uid()) and finished_at is null;
$$;
revoke execute on function public.link_solo_match(uuid, text, int) from public, anon;
grant execute on function public.link_solo_match(uuid, text, int) to authenticated;

create function public.telemetry_runs_match_da_sala()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match uuid;
begin
  if new.solo then
    select s.match_id into v_match from public.solo_runs s where s.id = new.match_id;
    new.match_id := coalesce(v_match, new.match_id);
  end if;
  return new;
end;
$$;
revoke execute on function public.telemetry_runs_match_da_sala() from public, anon, authenticated;

create trigger telemetry_runs_match_da_sala
before insert on public.telemetry_runs
for each row execute function public.telemetry_runs_match_da_sala();
