-- Os dois lados da bifurcação da Travessia se reencontram na Fortaleza Orc: ela abre com o boss das Mesas de Solária
-- (`map_unlocked_by('fortress') = 'mesas'`) **ou** com o do Coração da Mata (`map_unlocked_by_also('fortress')`).
-- Antes, quem seguia pela floresta (Basilisco → Bosque Velho → Coração da Mata) parava num beco sem saída.
-- Repete `ALSO_UNLOCKED_BY`/`unlockedByAny` do packages/shared/src/world.ts (mude os dois juntos).
-- Parte do estado depois de 20261102320000_fibula.sql: `map_unlocked_by` e `map_unlocked_by_boss` não mudam.

-- Outros cenários cujo boss também abre este (qualquer um basta, além de `map_unlocked_by`).
create or replace function public.map_unlocked_by_also(p_map_id text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'fortress' then array['heartwood']
    else array[]::text[]
  end;
$$;

create or replace function public.map_unlocked(p_profile_id uuid, p_class_id text, p_map_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_map_id in ('grove', 'fibula', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands') and (
    public.map_unlocked_by(p_map_id) is null
    or case
      when public.map_unlocked_by_boss(p_map_id) is not null then exists (
        select 1 from public.profile_boss_clears b
        where b.profile_id = p_profile_id and b.class_id = p_class_id and b.boss_kind = public.map_unlocked_by_boss(p_map_id)
      )
      else exists (
        select 1 from public.profile_map_clears c
        where c.profile_id = p_profile_id and c.class_id = p_class_id
          and c.map_id = any (public.map_unlocked_by(p_map_id) || public.map_unlocked_by_also(p_map_id))
      )
    end
  );
$$;
