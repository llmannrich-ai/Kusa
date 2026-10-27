-- Fila de deploy (skill `deploy`, .claude/skills/deploy/SKILL.md): sessões do Claude que publicam ao mesmo tempo
-- entram numa fila e só uma por vez faz a parte que mexe no `main` e no banco (mesclar o main, aplicar migration,
-- esperar o CI, mesclar o PR). Fica no schema `ops`, fora da API do jogo: anon e authenticated não enxergam nada;
-- só quem roda SQL como dono do banco (ferramenta do Supabase) usa a fila.
-- Entrada sem batida há mais de 45 min é dada como abandonada (sessão que morreu não trava a fila).

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;

create table ops.fila_deploy (
  id bigint generated always as identity primary key,
  branch text not null,
  sessao text not null,
  descricao text not null default '',
  estado text not null default 'aguardando'
    check (estado in ('aguardando', 'publicando', 'concluido', 'desistiu', 'expirado')),
  entrou_em timestamptz not null default now(),
  batida_em timestamptz not null default now(),
  vez_em timestamptz,
  saiu_em timestamptz
);
alter table ops.fila_deploy enable row level security;
create unique index fila_deploy_branch_ativa on ops.fila_deploy (branch)
  where estado in ('aguardando', 'publicando');
revoke all on ops.fila_deploy from public, anon, authenticated;

-- Marca como expiradas as entradas sem batida recente. Chamada por todas as funções abaixo.
create or replace function ops.fila_expirar() returns void
language sql set search_path = '' as $$
  update ops.fila_deploy set estado = 'expirado', saiu_em = now()
  where estado in ('aguardando', 'publicando') and batida_em < now() - interval '45 minutes';
$$;

-- Entra na fila (ou devolve a entrada ativa que a branch já tem). Devolve o id.
create or replace function ops.fila_entrar(p_branch text, p_sessao text, p_descricao text default '')
returns bigint language plpgsql set search_path = '' as $$
declare v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('ops.fila_deploy'));
  perform ops.fila_expirar();
  select id into v_id from ops.fila_deploy
  where branch = p_branch and estado in ('aguardando', 'publicando');
  if v_id is null then
    insert into ops.fila_deploy (branch, sessao, descricao) values (p_branch, p_sessao, p_descricao)
    returning id into v_id;
  else
    update ops.fila_deploy set sessao = p_sessao, batida_em = now() where id = v_id;
  end if;
  return v_id;
end;
$$;

-- Batida + consulta: renova a entrada, expira as abandonadas e diz se é a vez dela. Quando é a primeira da fila,
-- passa para 'publicando'. Devolve a fila ativa inteira para a sessão saber quem está na frente.
create or replace function ops.fila_vez(p_id bigint) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_estado text;
  v_primeiro bigint;
begin
  perform pg_advisory_xact_lock(hashtext('ops.fila_deploy'));
  update ops.fila_deploy set batida_em = now()
  where id = p_id and estado in ('aguardando', 'publicando');
  perform ops.fila_expirar();
  select estado into v_estado from ops.fila_deploy where id = p_id;
  select id into v_primeiro from ops.fila_deploy
  where estado in ('aguardando', 'publicando')
  order by (estado = 'publicando') desc, entrou_em, id limit 1;
  if v_primeiro = p_id and v_estado = 'aguardando' then
    update ops.fila_deploy set estado = 'publicando', vez_em = now() where id = p_id;
    v_estado := 'publicando';
  end if;
  return jsonb_build_object(
    'id', p_id,
    'estado', v_estado,
    'minha_vez', v_estado = 'publicando',
    'fila', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'branch', branch, 'sessao', sessao, 'descricao', descricao, 'estado', estado,
        'entrou_em', entrou_em, 'batida_em', batida_em) order by (estado = 'publicando') desc, entrou_em, id)
      from ops.fila_deploy where estado in ('aguardando', 'publicando')), '[]'::jsonb));
end;
$$;

-- Sai da fila ('concluido' depois do merge, 'desistiu' se parou sem publicar). Devolve o próximo da fila,
-- para a sessão que sai avisá-lo.
create or replace function ops.fila_sair(p_id bigint, p_estado text default 'concluido') returns jsonb
language plpgsql set search_path = '' as $$
begin
  if p_estado not in ('concluido', 'desistiu') then
    raise exception 'fila_sair: estado deve ser concluido ou desistiu';
  end if;
  perform pg_advisory_xact_lock(hashtext('ops.fila_deploy'));
  update ops.fila_deploy set estado = p_estado, saiu_em = now()
  where id = p_id and estado in ('aguardando', 'publicando');
  perform ops.fila_expirar();
  return (select jsonb_build_object('id', id, 'branch', branch, 'sessao', sessao)
          from ops.fila_deploy where estado in ('aguardando', 'publicando')
          order by (estado = 'publicando') desc, entrou_em, id limit 1);
end;
$$;

revoke all on function ops.fila_expirar(), ops.fila_entrar(text, text, text), ops.fila_vez(bigint),
  ops.fila_sair(bigint, text) from public, anon, authenticated;
