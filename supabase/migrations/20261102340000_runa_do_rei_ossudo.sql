-- Bug: `profile_boss_runes` tem uma lista fixa de bosses e o Rei Ossudo ('boneKing', Fíbula) não estava nela. Quem
-- saía da Fíbula com a runa dele tinha a hunt inteira recusada por `finish_solo_run` (a inserção da runa falhava e
-- desfazia tudo): o jogador via "perdeu todo o loot" e, ao começar a próxima hunt, a anterior era fechada como morte
-- (perdendo 1 equipamento). As duas primeiras hunts de teste caíram nisso.
--   - A lista passa a ser a dos bosses de `map_bosses` (os mesmos de `packages/shared/src/maps.ts`): boss novo entra
--     por `map_bosses`, sem precisar lembrar desta restrição.
--   - A inserção da runa em `finish_solo_run` já filtra por `map_bosses(v_run.map_id)`, então um boss que não
--     estiver lá é ignorado em vez de derrubar a hunt.

alter table public.profile_boss_runes drop constraint profile_boss_runes_boss_kind_check;
alter table public.profile_boss_runes add constraint profile_boss_runes_boss_kind_check
  check (boss_kind in (
    'dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh',
    'bullywugKing', 'emberWarlord', 'greenDragon', 'erlking', 'morgrana', 'kragmor', 'boneKing'
  ));
