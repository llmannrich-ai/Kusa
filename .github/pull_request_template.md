## O que muda

<!-- Mecânica, tela ou regra, do ponto de vista do jogador. -->

## Checklist

- [ ] Parti do `origin/main` atualizado e mesclei o `main` de novo antes de abrir o PR
- [ ] `npm run check` passou (typecheck, build do cliente e testes de fumaça)
- [ ] Testado em viewport de celular na vertical (ex.: 412×915 com toque), se mexe na tela
- [ ] Mudou o banco → migration nova em `supabase/migrations/` aplicada e advisors de segurança rodados
- [ ] Mecânica que mexe em dano, cura, loot ou progressão alimenta `RunStats` (telemetria)
- [ ] `docs/GDD.md` atualizado
