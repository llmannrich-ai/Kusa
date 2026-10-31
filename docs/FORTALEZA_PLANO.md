# Fortaleza Orc — plano para o melhor cenário do jogo

Objetivo: transformar a Fortaleza Orc (Ruínas do Império, mapa fixo) no cenário de referência do Kusa, o que se mostra
para apresentar o jogo. Este plano cobre **só o cenário** (planta, arte, andares, ambiente, desempenho); os monstros e
o boss vêm depois, num plano próprio.

Base de hoje (branch `feat/fortaleza-orc`): gerador `generateFortress` com `FORTRESS_SEED` fixa, desenho em
`apps/client/src/fortressMap.ts` e `art/fortressArt.ts`, andares só no desenho (vale abaixo com névoa e paralaxe,
terraço e telhados que somem com o herói embaixo), seção no GDD.

---

## 1. Onde estamos (diagnóstico honesto)

| Parte | Estado | Nota (0–5) |
|---|---|---|
| Composição geral | Progressão vertical clara: vila → desfiladeiro → pátio murado → esporão → torre | 4 |
| Andares (assinatura do mapa) | O desfiladeiro funciona; a borda lateral do esporão lê pouco como precipício | 3 |
| Chão | Bom de perto; manchas de calçamento com borda em degraus, gramado ainda grande na vila | 3 |
| Arquitetura | Muralhas, torres e arco do império reaproveitados; torre de menagem ainda chapada vista de cima | 3 |
| Acampamento orc | Tendas, totens, fogueiras, estandartes: o ponto mais vivo | 4 |
| Interiores | Salão do trono e casernas vazios (só o piso, o trono e os pilares) | 1 |
| Ambiente | Névoa e fogo; falta vento, fumaça, pássaros, luz de interior | 2 |
| Desempenho | No nível dos Portões depois da fase 0 (3,7 s × 3,3 s); **falta o celular** | 3 |
| Jogar deitado (915×412) | Conferido na prévia | 4 |

A fase 0 mostrou que o custo estava alto (o dobro dos Portões) e o trouxe para o nível deles: sobra espaço para
detalhe, desde que cada peça nova seja medida.

---

## 2. Princípios (valem para toda fase)

1. **Os andares são a assinatura.** Toda fase pergunta: "isso deixa mais claro que há um andar acima e um abaixo?".
2. **Legível antes de bonito.** Tile tem ≈46 px no celular. O orc (verde) precisa saltar do chão: o castelo é cinza,
   ocre e terra; o verde fica para a mata de fora e o vale lá embaixo.
3. **O desenho é a colisão.** O que bloqueia parece bloquear; o que parece chão anda (critério de aceite do
   `CENARIOS_PLANO.md`).
4. **Câmera nunca treme** (`CLAUDE.md`). Movimento vem do cenário: chama, fumaça, pano, névoa, pássaros.
5. **Sem `Math.random`, sem PNG**: tudo pintado por código com `hash`, igual em todo aparelho.
6. **Mapa fixo = mapa autoral.** Agora que a planta não muda, cada canto pode ter intenção (seção 3, fase 1).

---

## 3. Fases

| Fase | Entrega | Tamanho | Depende de |
|---|---|---|---|
| **0. Medir** | Tempo de desenho e memória no celular, Jogar deitado, referência dos Portões e das Dunas | P | — |
| **1. Planta autoral** | A planta vira um desenho à mão (ASCII) com intenção em cada área | M | 0 |
| **2. Andares** | Precipícios fortes, cachoeira, pássaros no vale, sombra das pontes, interior escuro | G | 1 |
| **3. Chão e bordas** | Transições orgânicas, variações, marcas de uso | M | 1 |
| **4. Arquitetura** | Adarve das muralhas, torre de menagem marcante, pontes com volume, telhados variados | G | 1 |
| **5. Interiores** | Salão do trono e casernas mobiliados, luz interna | M | 2, 4 |
| **6. Vida e ambiente** | Fumaça, faíscas, panos ao vento, corvos, hora do dia | M | 2 |
| **7. Legibilidade e jogo** | Contraste dos orcs, telhado × emboscada, minimapa, rotas | P | 1–6 |
| **8. Desempenho e entrega** | Metas da fase 0 cumpridas, galeria, GDD, teste `cenarios` | P | todas |

Cada fase é **um PR**, aprovado por imagem (prévia `mapa.html?mapa=fortress`) antes da próxima.

### Fase 0 — Medir (antes de pintar mais)

- Medir no celular real (Android de entrada e iPhone): `window.desenhoMs` da prévia, quadros por segundo andando pelo
  pátio, memória de textura. Mesma medida nos **Portões do Império** e nas **Dunas** (referência do
  `CENARIOS_PLANO.md`).
- Testar **Jogar deitado** (915×412): o vale aparece? A torre cabe? O pátio interno se lê?
- Registrar as peças novas no teste `cenarios` (`apps/server/scripts/cenarios.ts`), como as do império.

**Meta para seguir:** desenho ≤ 1,3× o dos Portões; 60 qps andando; sem textura acima de 4096 px. Se passar disso, a
fase 8 vira a fase 1 (gerar o chão no build).

**Ferramentas:** a prévia mede com `mapa.html?mapa=fortress&passeio=1` (a câmera anda da entrada ao boss e a tela
mostra desenho, texturas e quadros por segundo) e `largura=<tiles>` afasta a câmera; para o celular,
`npm run medicao -w @kusa/client -- arquivo.html` empacota uma página só que mede a Fortaleza, os Portões e as Dunas
em sequência.

**Resultado (31/10, navegador sem placa de vídeo, só a proporção vale):**

| Mapa | Desenho | Texturas | Quadros/s (piores 5%) |
|---|---|---|---|
| Fortaleza, antes | 7,4 s | 73 MB | 49 (35) |
| **Fortaleza, depois** | **3,7 s** | **44 MB** | **60 (59)** |
| Portões do Império | 3,3 s | 36 MB | 60 (58) |
| Dunas Cantantes | 1,5 s | 22 MB | 60 (58) |

O que pesava: o vale (187 dos 440 quadros do atlas, e desenhado embaixo do mapa todo), um telhado pintado inteiro por
caserna (17 MB) e variações demais de muro. Agora o vale só existe onde pode aparecer pelo abismo, com uma variação e
bordas pelos 4 lados; os telhados são tiles do atlas (os mesmos para todas as casernas), como no Tibia; os muros soltos
têm uma altura e 2 variações; a névoa do vale cobre só as faixas com abismo. Jogar deitado (915×412) conferido: o
vale e a beira do esporão aparecem (lê até melhor que em pé).

**iPhone (31/10, 402×742 @3x, app do Claude):** Fortaleza 1,9 s, 43 MB, 60 qps (piores 5%: 60); Portões 0,8 s, 39 MB,
60; Dunas 0,5 s, 20 MB, 60. Fluidez e memória perfeitas; o desenho ficou em 2,3× o dos Portões, em parte porque a
página media os Portões depois da Fortaleza (as peças compartilhadas já estavam pintadas).

**Pintura adiada:** como os Portões já fazem com a fachada e o mosaico, o que fica longe da entrada (o vale, o terraço
da torre de menagem, os telhados) vai num segundo atlas, pintado no quadro seguinte ao mapa aparecer. A página de
medição passou a fazer 2 rodadas (a 2ª compara os mapas com as peças compartilhadas já prontas) e a mostrar o tempo
da pintura adiada. Na prévia: Fortaleza 2,3 s + 0,5 s depois contra 2,2 s dos Portões na 2ª rodada (1,04×), 44 MB
contra 48 MB (os Portões também pintam a fachada depois). **Meta da fase 0 cumprida.**

**iPhone com a página nova (31/10):** 2ª rodada: Fortaleza 657 ms (+207 ms depois) contra 615 ms dos Portões (1,07×),
44 MB contra 48 MB, 60 qps (piores 5%: 60). 1ª rodada (a Fortaleza abre primeiro, sem nada pronto): 1,5 s + 0,3 s.
**Fase 0 concluída.** Falta, quando houver um à mão, um Android de entrada (a página está pronta:
`npm run medicao -w @kusa/client -- arquivo.html`).

### Fase 1 — Planta autoral

Hoje a planta é a seed 9 do gerador. Proposta: **exportar essa planta para um desenho em texto** (uma letra por tile,
como o ASCII de teste) e passar a editá-lo à mão. O gerador da Fortaleza vira "ler a planta"; a semântica dos tiles não
muda (abismo é `Tile.Water`, ruína, mata, chão).

- Onde fica: em `dungeon.ts` (o gerador só pode importar arquivos de `RULES_FILES`; se a planta for para um arquivo
  próprio, ele entra na lista e no teste `maps`).
- O que desenhar com intenção:
  - **Mirantes**: 3 pontos onde a beira do castelo avança sobre o abismo (um na vila, olhando o desfiladeiro; um em
    cada lado do esporão), feitos para o jogador parar e olhar o vale.
  - **Gargalos**: as duas pontes e os dois portões como os únicos acessos (já são); a brecha da muralha bem marcada.
  - **Espaços de luta**: zonas com 9×9 livres no meio (4 heróis + bando), cobertura nas bordas (blocos, tendas).
  - **Caminho principal legível**: a estrada do portão à torre sem obstáculo, com marcos de referência (fonte,
    estátua caída, forca dos orcs) para o jogador se localizar sem o minimapa.
  - **Vila baixa**: quarteirões de verdade (ruas em grade, casas encostadas), não ruínas soltas no capim.
- Teste: `maps` confere conexão e que o mapa é fixo; zonas, campinas e salas continuam alcançáveis.

### Fase 2 — Andares (a assinatura)

| Item | O que é | Por que |
|---|---|---|
| Paredão lateral | Face de rocha nas beiradas de leste e oeste mais larga e com estratos, e o castelo projetando sombra no vale | Hoje a beira do esporão lê como margem de lago |
| **Cachoeira** | Um riacho do pátio cai pelo paredão do desfiladeiro até o rio do vale (quadros animados, espuma lá embaixo) | Mostra a altura sem texto; é o cartão-postal do mapa |
| **Pássaros no vale** | Corvos e abutres circulando **abaixo** do castelo, na camada do vale, com a mesma paralaxe | O que voa embaixo de você prova que você está no alto |
| Sombra das pontes | A sombra da ponte de pedra e da de cordas no vale, deslocada pela luz | Liga as pontes ao chão lá embaixo |
| Vale com objetos | Copas de árvore, telhados de uma aldeia afundada e uma torre em ruínas lá embaixo (sprites escurecidos com paralaxe) | Hoje o vale é só capim, mata e rio em blocos |
| Bandas de névoa | Faixas de névoa passando devagar entre o vale e o castelo | Profundidade em camadas |
| Interior escuro | Ao entrar na torre ou numa caserna, os cantos da tela escurecem (como a ruína dos Portões) e a luz vem dos braseiros | O andar de cima some e o de dentro "acende" |
| Andar de cima nas torres | As torres das muralhas com o alto (ameias, um orc vigia parado) deslocado e transparente com o herói perto | A ideia do Tibia também nas torres, não só na de menagem |

### Fase 3 — Chão e bordas (P1, P2, P4)

- Transição calçamento ↔ capim com borda orgânica (pedras soltas, lajes levantadas, capim nas juntas), sem o degrau de
  tile; o mesmo para terra batida ↔ capim e terra ↔ calçamento.
- 6–8 variações por chão, com 1 detalhe raro: ralo romano, mosaico quebrado, marca de fogueira antiga.
- Marcas de uso: trilhas de terra entre as tendas, sulcos de carroça na estrada, sangue velho perto dos totens.
- Decoração em grupos (60/30/10) encostada em muro e canto, não espalhada.
- Pátio interno: o eixo de lajes do império, com o capim tomando as bordas.

### Fase 4 — Arquitetura

- **Muralhas com adarve**: o caminho de ronda por cima, com escadas de pedra subindo do pátio (desenho, não andável),
  guaritas e trechos desabados com entulho no pé.
- **Torre de menagem**: buraco do telhado com vigas carbonizadas e entulho caído no salão; no terraço, uma balista
  orc, barris e o estandarte grande; fachada com mais variação (janelas iluminadas por dentro, grade da porta
  levantada, rachaduras, hera).
- **Pontes**: a de pedra com arcos visíveis na face sul e estátuas quebradas nas cabeceiras; a de cordas com postes,
  tábuas faltando e o pano rasgado.
- **Telhados das casernas**: 3 tipos (telha do império meio caída, remendo de couro orc, palha) e chaminé com fumaça.
- **Marcos**: a fonte seca do pátio externo, a estátua do imperador derrubada com uma corda de orc, uma forca.

### Fase 5 — Interiores

- **Salão do trono**: estrado com degraus, peles no chão, braseiros nos pilares, estandartes pendurados, ossos e
  oferendas em volta do trono, luz quente que treme.
- **Casernas**: beliches de palha, mesa com restos, barris, cavalete de armas, uma forja orc com fole (brilho
  animado), uma jaula.
- Interior lido como interior: piso diferente, sombra junto das paredes, luz de braseiro.

### Fase 6 — Vida e ambiente

- Fumaça subindo das fogueiras e das chaminés (partículas leves); faíscas voando.
- Panos e estandartes balançando (2–3 quadros).
- Corvos pousados nas ameias, levantando voo quando o herói chega perto.
- Hora do dia: fim de tarde (céu alaranjado nos cantos da tela, sombras longas), para diferenciar dos Portões (manhã).
- Caldeirão borbulhando, brasa das forjas pulsando.

### Fase 7 — Legibilidade e jogo

- **Contraste dos orcs**: conferir orc e ogro sobre capim, terra e calçamento em 412×915. Se o orc some no capim,
  reduzir o capim dentro do castelo.
- **Telhado × emboscada**: hoje o telhado esconde quem está dentro (como no Tibia). Proposta: o telhado fica
  translúcido quando o herói está a até 2 tiles da porta, para não haver monstro invisível dando dano.
- Minimapa: abismo, muralhas e pontes com cor própria; as 2 travessias visíveis.
- As saídas (portal da entrada e o do boss) bem marcadas no cenário.

### Fase 8 — Desempenho e entrega

- Cumprir as metas da fase 0. Se o desenho passar do limite: chão gerado no build e carregado como imagem feita
  pelo próprio código (opção prevista no `CENARIOS_PLANO.md`).
- Imagem do mapa em `docs/arte/`, linha "Visual" do GDD atualizada, teste `cenarios` com todas as peças.
- Critério de aceite do `CENARIOS_PLANO.md` inteiro marcado.

---

## 4. Critério de aceite final

- [ ] Um jogador novo, sem explicação, diz que o castelo está "no alto" (teste com 3 pessoas, prints da vila, da ponte
      e do esporão).
- [ ] Os andares aparecem em todas as áreas: vale pelo abismo, paredão, telhados e terraço que somem.
- [ ] Nenhum trecho de mais de 6×6 tiles sem intenção (capim liso, chão repetido).
- [ ] Orc legível sobre todos os chãos do castelo no celular em pé e deitado.
- [ ] Desenho e quadros por segundo dentro das metas da fase 0.
- [ ] `npm run check` verde; GDD e galeria atualizados.

## 5. Decisões (aceitas pelo Leonardo em 31/10)

| Decisão | Escolha |
|---|---|
| **Arte: código ou IA** | **Híbrido.** A IA pinta o que não tem colisão nem andar: **o vale lá embaixo** (uma pintura só, com névoa e paralaxe) e as **peças grandes e únicas** como sprites (torre de menagem, arco, trono, cachoeira), do jeito que já se faz com os inimigos (folha gerada, aprovada e recortada). O **chão por onde se anda continua em código** (colisão exata, memória baixa, telhados e andares funcionando). Exceção à regra "cenário é sempre código" do `CENARIOS_PLANO.md`, decidida para este mapa |
| Planta | **Desenhada à mão** (fase 1): mapa fixo pede autoria; o custo é uma vez só |
| Telhado e emboscada | **Translúcido perto da porta** (fase 7): no celular, monstro invisível parece bug |
| Hora do dia | **Fim de tarde** (fase 6): diferencia dos Portões e valoriza o fogo |
| Cachoeira | **Sim** (fase 2): é o cartão-postal do mapa |

## 6. Riscos

| Risco | Efeito | Mitigação |
|---|---|---|
| Tempo de desenho no celular | O mapa demora a abrir ou trava aparelho fraco | Fase 0 primeiro; quadros só quando aparecem; chão no build se preciso |
| Excesso de detalhe | Cenário bonito e ilegível em combate | Fase 7 com prints em combate; regra 60/30/10 |
| Planta à mão muda a versão das regras | Clientes antigos recarregam | Esperado e automático (`RULES_VERSION`); mesclar num deploy só |
| Pássaros e névoa pesando | Queda de quadros | Limite de partículas; só na tela; medir na fase 8 |
| Trabalho paralelo de outras sessões em `gatesMap`/`empireMonuments` | Conflito de merge | PRs pequenos, mesclar `origin/main` antes de cada fase |
