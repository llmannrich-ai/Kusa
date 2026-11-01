-- Morte no começo da hunt deixa de custar equipamento, e o item mais raro pesa menos no sorteio da perda.
-- A conta "leo" perdeu todos os itens mágicos do cavaleiro (o Machado mágico tier 5 incluído) em mortes no nível
-- 1 a 4: cada tentativa num mapa difícil apagava uma peça do melhor equipamento.
--   - `drop_random_item` sorteia com peso pela raridade (comum 1, raro 0,5, mágico 0,25), como `DEATH_LOSS_WEIGHT`
--     (packages/shared/src/maps.ts) e `Hunt.lostSlot`. Vale para a hunt solo abandonada depois de valer
--     (`close_open_solo_runs`) e para o resultado que chega atrasado (`finish_solo_run`).
--   - `finish_solo_run`: o resultado atrasado (vira soterrado) abaixo do nível `DEATH_SAFE_LEVEL` (5) não perde
--     equipamento, como na hunt. A hunt abandonada continua perdendo: o banco não sabe o nível, e fechar o app não
--     pode livrar o item de quem ia morrer.

create or replace function public.drop_random_item(p_items text[])
returns text[]
language plpgsql
set search_path = ''
as $$
declare
  v_idx int[] := '{}';
  v_weight numeric[] := '{}';
  v_total numeric := 0;
  v_roll numeric;
  v_w numeric;
  v_i int;
begin
  for v_i in select i from generate_subscripts(coalesce(p_items, '{}'), 1) i loop
    continue when split_part(p_items[v_i], '-', 1) = 'rune';
    v_w := case split_part(p_items[v_i], '-', 4) when 'magic' then 0.25 when 'rare' then 0.5 else 1 end;
    v_idx := v_idx || v_i;
    v_weight := v_weight || v_w;
    v_total := v_total + v_w;
  end loop;
  if coalesce(array_length(v_idx, 1), 0) = 0 then return p_items; end if;
  v_roll := random() * v_total;
  for v_i in 1 .. array_length(v_idx, 1) loop
    v_roll := v_roll - v_weight[v_i];
    if v_roll < 0 or v_i = array_length(v_idx, 1) then
      return p_items[:v_idx[v_i] - 1] || p_items[v_idx[v_i] + 1:];
    end if;
  end loop;
  return p_items;
end;
$$;

revoke execute on function public.drop_random_item(text[]) from public, anon, authenticated;

-- `finish_solo_run`: o resultado atrasado só perde equipamento a partir do nível 5.
do $$
declare
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$  if v_outcome <> p_outcome and p_outcome in ('escaped', 'completed') then
    v_items := public.drop_random_item(v_items);$q$;
  v_new constant text := $q$  if v_outcome <> p_outcome and p_outcome in ('escaped', 'completed') then
    -- DEATH_SAFE_LEVEL: abaixo do nível 5 o corpo não perde equipamento.
    if coalesce(p_level, 1) >= 5 then v_items := public.drop_random_item(v_items); end if;$q$;
begin
  if position(v_new in v_finish) = 0 then
    if position(v_old in v_finish) = 0 then raise exception 'finish_solo_run: perda do resultado atrasado não encontrada'; end if;
    execute replace(v_finish, v_old, v_new);
  end if;
end;
$$;
