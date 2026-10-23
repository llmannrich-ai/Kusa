-- Morrer não perde as runas equipadas: o equipamento sorteado (hunt solo abandonada ou que chegou tarde) é só
-- entre arma, capacete, armadura e escudo, como no servidor de jogo.
create or replace function public.drop_random_item(p_items text[])
returns text[]
language plpgsql
set search_path = ''
as $$
declare
  v_gear int[];
  v_i int;
begin
  select coalesce(array_agg(i), '{}') into v_gear
  from generate_subscripts(coalesce(p_items, '{}'), 1) i
  where split_part(p_items[i], '-', 1) <> 'rune';
  if coalesce(array_length(v_gear, 1), 0) = 0 then return p_items; end if;
  v_i := v_gear[1 + floor(random() * array_length(v_gear, 1))::int];
  return p_items[:v_i - 1] || p_items[v_i + 1:];
end;
$$;
