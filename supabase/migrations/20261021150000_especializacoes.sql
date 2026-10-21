-- Especializações do Grimório: no fim de um ramo, a árvore se divide em dois lados. Cada lado tem um Traço
-- (nó de nível único) e duas magias que pedem o Traço. Comprar o Traço de um lado tranca o outro para sempre
-- (escolha permanente). Catálogo em packages/shared/src/talents.ts e traits.ts: mude os dois juntos.

alter table public.talents add column exclusive_with text references public.talents (id);
create index talents_exclusive_with_idx on public.talents (exclusive_with);

-- Paladino, ramo Mira: Atirador de Elite (Olho de Águia) ou Caçador Ágil (Passo Leve).
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('paladin_eagle_eye', 'paladin', 1, 1000, 1, 0, 'paladin_deadly_shot', 1),
  ('paladin_light_step', 'paladin', 1, 1000, 1, 0, 'paladin_deadly_shot', 1);
update public.talents set exclusive_with = 'paladin_light_step' where id = 'paladin_eagle_eye';
update public.talents set exclusive_with = 'paladin_eagle_eye' where id = 'paladin_light_step';

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('paladin_hunter_mark', 'paladin', 3, 1200, 1.6, 0, 'paladin_eagle_eye', 1),
  ('paladin_evasive_roll', 'paladin', 3, 1200, 1.6, 0, 'paladin_light_step', 1);
insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, free_rank, requires_id, requires_rank) values
  ('paladin_sniper_stance', 'paladin', 3, 1600, 1.6, 0, 'paladin_hunter_mark', 1),
  ('paladin_swift_quiver', 'paladin', 3, 1600, 1.6, 0, 'paladin_evasive_roll', 1);

-- Compra o próximo nível de um nó da árvore. Devolve o gold que sobrou.
-- Novo: o Traço de um lado não pode ser comprado se o do outro lado já foi (escolha permanente).
create or replace function public.buy_talent(p_talent_id text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_talent public.talents;
  v_current int;
  v_required int;
  v_required_free int;
  v_cost bigint;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;

  select * into v_talent from public.talents where id = p_talent_id;
  if not found then raise exception 'magia inexistente'; end if;

  -- Trava o perfil: duas compras ao mesmo tempo não gastam o mesmo gold (nem escolhem os dois lados).
  perform 1 from public.profiles where id = v_uid for update;

  select rank into v_current from public.profile_talents
  where profile_id = v_uid and talent_id = p_talent_id;
  v_current := greatest(coalesce(v_current, 0), v_talent.free_rank);
  if v_current >= v_talent.max_rank then raise exception 'já está no nível máximo'; end if;

  if v_talent.requires_id is not null then
    select free_rank into v_required_free from public.talents where id = v_talent.requires_id;
    select rank into v_required from public.profile_talents
    where profile_id = v_uid and talent_id = v_talent.requires_id;
    if greatest(coalesce(v_required, 0), coalesce(v_required_free, 0)) < v_talent.requires_rank then
      raise exception 'pré-requisito não comprado';
    end if;
  end if;

  if v_talent.exclusive_with is not null and exists (
    select 1 from public.profile_talents
    where profile_id = v_uid and talent_id = v_talent.exclusive_with and rank > 0
  ) then
    raise exception 'especialização já escolhida';
  end if;

  v_cost := ceil(v_talent.base_cost * power(v_talent.cost_growth, v_current));

  update public.profiles set gold = gold - v_cost where id = v_uid and gold >= v_cost
  returning gold into v_gold;
  if not found then raise exception 'gold insuficiente'; end if;

  insert into public.profile_talents (profile_id, talent_id, rank)
  values (v_uid, p_talent_id, v_current + 1)
  on conflict (profile_id, talent_id) do update set rank = excluded.rank;

  return v_gold;
end;
$$;
revoke execute on function public.buy_talent(text) from public, anon;
grant execute on function public.buy_talent(text) to authenticated;
