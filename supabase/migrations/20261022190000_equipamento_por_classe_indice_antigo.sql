-- A versão aplicada de equipamento_por_classe não removeu o índice antigo (um item equipado por slot na conta),
-- recriado pelas runas com "slot <> 'rune'". Com ele, equipar no druida um slot que outra classe já veste falhava
-- com "slot ocupado por outra classe". Cada classe tem os próprios slots: vale só o índice por classe.
drop index if exists public.profile_items_one_equipped_per_slot;
