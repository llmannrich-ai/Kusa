-- Hunt solo abandonada sem perda no começo. A hunt solo abre no banco ao começar; se o app fecha ou recarrega no
-- meio, o resultado nunca chega e o `start_solo_run` seguinte fechava a hunt aberta como morte: 1 equipamento
-- sorteado e a bag perdidos, sem aviso. Entrar e sair em segundos (trocar de mapa, recarregar) custava um item
-- por vez. Agora a hunt só vale como morte depois que o herói saiu da sala inicial e jogou
-- `SOLO_LIMITS.committedSeconds` (60 s): o cliente avisa por `solo_run_committed`. Antes disso, a hunt aberta fecha
-- como fuga sem loot, com o equipamento e a bag de volta. O `start_solo_run` também devolve o que fechou
-- (`closed`), para o cliente avisar o jogador do que se perdeu.

alter table public.solo_runs add column if not exists committed_at timestamptz;

-- Marca a hunt aberta do próprio jogador como "valendo": a partir daqui, abandonar conta como morte.
create or replace function public.solo_run_committed(p_run_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.solo_runs set committed_at = now()
  where id = p_run_id and profile_id = auth.uid() and finished_at is null and committed_at is null;
$$;

revoke all on function public.solo_run_committed(uuid) from public, anon;
grant execute on function public.solo_run_committed(uuid) to authenticated;

-- Fecha as hunts abertas do jogador (antes de abrir outra). Devolve o que fechou e o que se perdeu.
create or replace function public.close_open_solo_runs(p_uid uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.solo_runs;
  v_kept text[];
  v_lost text;
  v_died boolean;
  v_closed jsonb := '[]'::jsonb;
begin
  for v_old in select * from public.solo_runs where profile_id = p_uid and finished_at is null for update loop
    v_died := v_old.committed_at is not null;
    v_lost := null;
    if v_died then
      v_kept := public.drop_random_item(v_old.loadout);
      -- O item sorteado é o primeiro que difere (ou o último, se a diferença estiver no fim).
      for i in 1 .. coalesce(array_length(v_old.loadout, 1), 0) loop
        if v_kept[i] is distinct from v_old.loadout[i] then
          v_lost := v_old.loadout[i];
          exit;
        end if;
      end loop;
      update public.solo_runs set finished_at = now(), outcome = 'died' where id = v_old.id;
      perform public.finish_run(v_old.id, p_uid, v_old.class_id, 'died', 1, 0, v_kept);
    else
      update public.solo_runs set finished_at = now(), outcome = 'escaped' where id = v_old.id;
      perform public.finish_run(v_old.id, p_uid, v_old.class_id, 'escaped', 1, 0, v_old.loadout);
      if coalesce(array_length(v_old.bag, 1), 0) > 0 then perform public.store_bag(p_uid, v_old.bag); end if;
    end if;
    v_closed := v_closed || jsonb_build_object(
      'map_id', v_old.map_id, 'class_id', v_old.class_id, 'died', v_died, 'lost', v_lost,
      'lost_bag', case when v_died then to_jsonb(v_old.bag) else '[]'::jsonb end);
  end loop;
  return v_closed;
end;
$$;

revoke all on function public.close_open_solo_runs(uuid) from public, anon, authenticated;

-- `start_solo_run`: o fechamento das hunts abertas passa para `close_open_solo_runs`, e a resposta ganha `closed`.
do $$
declare
  v_def text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_old_loop constant text := $q$  for v_old in select * from public.solo_runs where profile_id = v_uid and finished_at is null for update loop
    update public.solo_runs set finished_at = now(), outcome = 'died' where id = v_old.id;
    perform public.finish_run(v_old.id, v_uid, v_old.class_id, 'died', 1, 0, public.drop_random_item(v_old.loadout));
  end loop;
$q$;
  v_old_return constant text := $q$  return jsonb_build_object(
    'run_id', v_run.id,$q$;
begin
  if position(v_old_loop in v_def) = 0 or position(v_old_return in v_def) = 0 then
    raise exception 'start_solo_run: trecho do fechamento não encontrado';
  end if;
  v_def := replace(v_def, v_old_loop, $q$  v_closed := public.close_open_solo_runs(v_uid);
$q$);
  v_def := replace(v_def, v_old_return, $q$  return jsonb_build_object(
    'closed', v_closed,
    'run_id', v_run.id,$q$);
  v_def := replace(v_def, $q$  v_bag text[];
begin$q$, $q$  v_bag text[];
  v_closed jsonb;
begin$q$);
  execute v_def;
end;
$$;
