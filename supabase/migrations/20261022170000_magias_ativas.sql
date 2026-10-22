-- Magias ativas do Grimório: o jogador escolhe até 3 magias por slot que aparecem na escolha da hunt quando o slot
-- abre. Com 3 ou menos no slot, todas ficam ativas sozinhas. A regra (`activeSlotSpells` em
-- packages/shared/src/talents.ts) roda no servidor de jogo e no cliente; o banco só guarda a escolha.
-- Ids de nó do Grimório (ex.: knight_twin_slash), de todas as classes. Escolher mais de 3 num slot não dá vantagem
-- (o servidor corta em 3), então o banco só confere que são magias do catálogo e um teto total.

alter table public.profiles add column active_spells text[] not null default '{}';

create function public.set_active_spells(p_spells text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_spells text[] := array(select distinct unnest(coalesce(p_spells, '{}')));
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  -- 4 classes × 2 slots × 3 magias.
  if cardinality(v_spells) > 24 then raise exception 'magias ativas demais'; end if;
  if exists (
    select 1 from unnest(v_spells) as s(id)
    where not exists (select 1 from public.talents t where t.id = s.id and t.is_spell)
  ) then
    raise exception 'magia inexistente';
  end if;
  update public.profiles set active_spells = v_spells where id = v_uid;
end;
$$;
revoke execute on function public.set_active_spells(text[]) from public, anon;
grant execute on function public.set_active_spells(text[]) to authenticated;
