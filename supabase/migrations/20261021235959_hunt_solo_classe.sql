-- Hunt solo com os itens por classe (20261021200000_itens_dnd.sql): no início sai da conta só o equipamento
-- que a classe usa, como na hunt em equipe (take_loadout de dois argumentos). Enquanto a migration dos itens
-- não estiver no banco, usa o take_loadout antigo, de um argumento: as duas ordens de aplicação funcionam.

create or replace function public.start_solo_run(p_class_id text, p_map_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_old public.solo_runs;
  v_run public.solo_runs;
  v_items text[];
  v_bag text[];
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  if not exists (select 1 from public.talents where class_id = p_class_id) then raise exception 'classe inválida'; end if;
  if p_map_id is null or p_map_id not in ('crypt', 'swamp') then raise exception 'mapa inválido'; end if;

  for v_old in select * from public.solo_runs where profile_id = v_uid and finished_at is null for update loop
    update public.solo_runs set finished_at = now(), outcome = 'died' where id = v_old.id;
    perform public.finish_run(v_old.id, v_uid, v_old.class_id, 'died', 1, 0, public.drop_random_item(v_old.loadout));
  end loop;

  if to_regprocedure('public.take_loadout(uuid, text)') is not null then
    execute 'select coalesce(array_agg(i), ''{}'') from public.take_loadout($1, $2) i' into v_items using v_uid, p_class_id;
  else
    select coalesce(array_agg(i), '{}') into v_items from public.take_loadout(v_uid) i;
  end if;
  select coalesce(array_agg(i), '{}') into v_bag from public.take_bag(v_uid) i;

  insert into public.solo_runs (profile_id, class_id, map_id, seed, loadout, bag)
  values (v_uid, p_class_id, p_map_id, floor(random() * 2147483647)::int, v_items, v_bag)
  returning * into v_run;

  return jsonb_build_object(
    'run_id', v_run.id,
    'seed', v_run.seed,
    'items', to_jsonb(v_items),
    'bag', to_jsonb(v_bag),
    'talents', coalesce((select jsonb_object_agg(talent_id, rank) from public.profile_talents where profile_id = v_uid), '{}'::jsonb)
  );
end;
$$;
