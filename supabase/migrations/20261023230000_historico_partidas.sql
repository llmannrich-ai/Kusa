-- Configurações > Histórico: uma entrada por partida (match_id de `telemetry_runs`), com cada jogador que estava
-- nela: personagem, desfecho, loot e penalidades da morte. Lê a telemetria que o servidor e o `finish_solo_run`
-- já gravam, então não há tabela nova. `p_mine` = só as partidas em que a conta de quem consulta jogou;
-- `p_before` pagina (partidas que começaram antes desse instante). O jogo é entre amigos: os nomes aparecem,
-- como no ranking. Seed, build e id de conta ficam de fora.

create function public.match_history(p_mine boolean default true, p_before timestamptz default null, p_limit int default 20)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with partidas as (
    select r.match_id, min(r.created_at) as quando
    from public.telemetry_runs r
    group by r.match_id
    having (not p_mine or bool_or(r.profile_id = (select auth.uid())))
      and (p_before is null or min(r.created_at) < p_before)
    order by min(r.created_at) desc
    limit least(greatest(coalesce(p_limit, 20), 1), 50)
  )
  select coalesce(jsonb_agg(m order by m.quando desc), '[]') from (
    select pt.match_id, pt.quando,
      max(r.map_id) as mapa,
      bool_or(r.solo) as solo,
      max(r.party_size) as equipe,
      max(r.duration_s) as duracao_s,
      jsonb_agg(jsonb_build_object(
        'nome', coalesce(p.username, r.player_name),
        'conta', r.profile_id is not null,
        'eu', r.profile_id is not null and r.profile_id = (select auth.uid()),
        'classe', r.class_id,
        'nivel', r.level,
        'desfecho', r.outcome,
        'abandonou', r.abandoned,
        'morto_por', r.killed_by,
        'loot', r.loot,
        -- Gold juntado na hunt (monstros, baús e bônus do boss); quem morre leva 0 em `loot`.
        'gold_coletado', coalesce((r.stats #>> '{loot,monsters}')::int, 0) + coalesce((r.stats #>> '{loot,chests}')::int, 0)
          + coalesce((r.stats #>> '{loot,bossBonus}')::int, 0),
        'itens_pegos', coalesce(r.stats #> '{items,picked}', '[]'),
        'itens_largados', coalesce(r.stats #> '{items,dropped}', '[]'),
        'itens_perdidos', coalesce(r.stats #> '{items,lost}', '[]'),
        'magias', coalesce((select jsonb_agg(s.value ->> 'id' order by s.key) from jsonb_each(r.stats -> 'spellsChosen') s), '[]'),
        'xp_magias', coalesce(r.stats -> 'spellXp', '{}')
      ) order by r.outcome in ('died', 'buried'), coalesce(p.username, r.player_name)) as jogadores
    from partidas pt
    join public.telemetry_runs r on r.match_id = pt.match_id
    left join public.profiles p on p.id = r.profile_id
    group by pt.match_id, pt.quando
  ) m;
$$;

revoke execute on function public.match_history(boolean, timestamptz, int) from public, anon;
grant execute on function public.match_history(boolean, timestamptz, int) to authenticated;
