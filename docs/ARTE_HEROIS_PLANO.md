# Arte dos heróis — diagnóstico e plano de melhoria

Plano para tornar os heróis mais detalhados e fazer o equipamento **vestir** o personagem (e não só pintá-lo),
com inspiração em Dungeons & Dragons. Nada aqui muda regra de jogo: é tudo cliente (`apps/client/src/art/`),
sem `RULES_VERSION` nem migration (a única exceção opcional está marcada na Fase 5).

---

## 1. Como é hoje

- **Arte gerada por código**: grades de letras (`heroes.ts`, `outfit.ts`) em 32×32, 3 direções × 3 quadros de
  caminhada, refinadas para 64×64 por Scale2x + luz automática (`refine.ts`). No jogo o herói ocupa 1,38 tile.
- **Corpo útil minúsculo**: cabeça 16×9 e corpo 16×16 dentro do quadro de 32. O refino arredonda escadas,
  mas não cria detalhe.
- **Equipamento por camadas**, com uma letra por slot recolorida pelo material do nível (`MATERIALS`/`CLOTH`):

| Slot | O que acontece hoje | Muda a silhueta? |
|---|---|---|
| Armadura de guerra | recolore o tronco com um padrão por nível; ombreiras só nos níveis 4–5 | pouco |
| Manto arcano | recolore a túnica inteira com o tecido | não |
| Capacete | troca a cabeça inteira (5 elmos; **um único chapéu pontudo para todos os níveis arcanos**) | sim |
| Calça | só troca a cor da calça | não |
| Botas | só troca a cor da bota | não |
| Escudo | 5 formas, mão esquerda ou costas | sim |
| Arma | cavaleiro: 3 espadas + 1 machado para os 5 níveis; arco e cajado só tingidos; besta e varinha trocam a forma | parcial |
| Raridade (raro/mágico) | **não aparece no corpo** | — |

## 2. Problemas encontrados

Em ordem de impacto no que o jogador vê:

1. **A classe some com o equipamento.** O cavaleiro perde o vermelho, o paladino perde o amarelo e,
   com vestes arcanas, **feiticeiro e druida ficam idênticos** (mesmo chapéu, mesma túnica). Numa equipe de 4,
   ninguém sabe quem é quem.
2. **Conjunto completo vira monocromático.** Todas as peças no mesmo material = "boneco de lata". O Mithral
   (quase branco) parece um fantasma. Faltam os materiais secundários que dão leitura (couro das correias,
   tecido do tabardo, ouro da guarnição).
3. **Calça, botas, arco e cajado só mudam de cor.** "Grevas de ferro" e "Coxotes de mithral" não têm forma
   própria; o machado é o mesmo do nível 1 ao 5.
4. **Nome do item ≠ arte.** "Capuz de lã", "Capuz rúnico" e "Coroa de chifres de dragão" aparecem como chapéu
   pontudo. O druida veste chapéu de mago (no D&D, druida usa capuz, folhas e chifres, nunca metal).
5. **Raridade invisível.** A Espada Vorpal é igual à espada de mithral comum. É justamente o item que o
   jogador mais quer exibir.
6. **Densidade de pixel menor que a dos monstros.** Monstro: 32 px de arte em 1 tile (1 texel por unidade).
   Herói: 32 px de arte em 1,38 tile (0,73 texel por unidade). O herói, que é o protagonista, é o sprite
   menos detalhado da tela.
7. **Sem pose de ação.** Só caminhada; golpe, tiro e magia são apenas efeitos sobre um herói parado.

Pequenos achados de código: `KNIGHT_WEAPONS[1]` (porrete) nunca é usado; o comentário de `MATERIALS` diz
"aço" no nível 4, que se chama Mithral; o paladino veste exatamente a armadura do cavaleiro.

## 3. Direção de arte (D&D)

Princípios, nesta ordem de prioridade:

1. **Cada item tem a sua arte, igual em qualquer classe.** Um item do catálogo (`ITEMS`) tem uma
   representação vestida só sua, e quem o veste não muda o desenho: o Manto rúnico é o mesmo no feiticeiro e
   no druida; as Botas de mithral, o mesmo nas 4 classes. Nenhum item fica só tingido ou reaproveita o
   desenho de outro.
2. **Silhueta antes de detalhe.** No celular o herói tem ~60 px CSS. Cada nível precisa mudar a **forma**
   (ombreira, crista, gola, comprimento da bota), não só a cor.
3. **A classe aparece no que não é item.** Rosto, cabelo, barba e as roupas de baixo da classe aparecem onde
   o equipamento não cobre (seção 3.1).
4. **Três materiais por figura.** Material do item (dominante) + couro/tecido (correias, forro) + metal de
   guarnição. Nunca um conjunto de cor única.
5. **O item mostra a regra.** Atributos do item viram sinais visuais (fogo em quem tem `burn`, espinhos em
   `thorns`...). Mudou a regra, a arte acompanha sozinha.
6. **O desenho segue o nome do catálogo.** "Capuz de lã" é capuz; "Grevas de ferro" cobrem a canela.

### 3.1 O que identifica a classe

Como os itens são iguais em todas as classes, a classe é reconhecida pelo corpo base e pelo que nenhum item
substitui. A arte do item é desenhada sobre um "manequim" único (mesmo tronco, mesmos encaixes) e serve em
qualquer classe.

| Classe | Corpo e detalhes que ficam visíveis |
|---|---|
| Cavaleiro | cabelo castanho curto, rosto com cicatriz, roupa de baixo vermelha nas mangas e na barra |
| Paladino | cabelo loiro, faixa na testa (some sob capacete fechado), aljava nas costas |
| Feiticeiro | barba branca longa (aparece sob capacete aberto e chapéu), roupa de baixo roxa |
| Druida | cabelo castanho com folhas, pintura verde no rosto, roupa de baixo verde |

Consequência aceita: quando o equipamento cobre quase tudo, duas classes com o mesmo conjunto ficam parecidas.
Pelo catálogo, isso só acontece entre feiticeiro e druida (mesmas vestes arcanas e mesmas armas). Cavaleiro e
paladino dividem a armadura, mas seguram armas diferentes (espada/machado × arco/besta). Se a confusão
aparecer no jogo, a saída é o nome ou um anel na cor da classe sob o herói, nunca variar o item.

### 3.2 Arte de cada item

Os nomes são os do catálogo (`packages/shared/src/items.ts`). Cada célula é um desenho próprio.

| Família | 1 Rústico | 2 Bronze | 3 Ferro | 4 Mithral | 5 Dragão |
|---|---|---|---|---|---|
| Armadura de guerra | Gibão de couro: acolchoado com amarração | Couraça de bronze: peitoral e saiote de tiras | Cota de malha: malha até a coxa, ombreiras pequenas | Placas de mithral: placas com ombreiras grandes e gola | Escamas de dragão: escamas, ombreiras com espinhos |
| Manto arcano | Túnica de linho: com corda na cintura | Manto de viagem: capuz caído nas costas | Manto rúnico: runas acesas na barra | Vestes de mithral: fios prateados, gola alta | Manto de seda de dragão: gola de escamas e capa |
| Elmo de guerra | Gorro de couro | Elmo de bronze: aberto, com crista | Elmo de ferro: nórdico, com nasal | Elmo de mithral: fechado, viseira e penacho | Elmo do dragão: chifres de dragão |
| Chapéu arcano | Capuz de lã | Chapéu pontudo | Capuz rúnico: capuz com runas na borda | Chapéu do mago: aba larga com estrelas | Coroa de chifres de dragão |
| Perneiras de guerra | Calças de couro: joelheira de couro | Perneiras de bronze: joelheiras | Perneiras de malha: malha nas coxas | Coxotes de mithral: placas articuladas | Perneiras de escamas de dragão |
| Calças arcanas | Calças de linho | Calças de lã: faixa na barra | Calças rúnicas: runas na lateral | Calças de mithral: fios prateados | Calças de couro de dragão |
| Botas | Botas de couro: botinas | Botas de bronze: com caneleira | Grevas de ferro: cobrem a canela | Botas de mithral: sabatons | Botas de escamas de dragão: garras |
| Escudo | Broquel de madeira | Escudo de bronze: redondo com bossa | Escudo de ferro: "heater" | Escudo de mithral: alto, com cruz | Escudo do dragão: olho de dragão |
| Espada | Espada curta | Espada de bronze: gládio | Espada longa | Espada de mithral: bastarda | Lâmina do dragão |
| Machado | Machadinha | Machado de bronze | Machado de batalha: barbado | Machado de mithral: duplo | Grande machado do dragão |
| Arco | Arco curto | Arco de caça | Arco longo (mais alto que o herói) | Arco de mithral: recurvo | Arco de osso de dragão |
| Besta | Besta leve | Besta de bronze | Besta de ferro | Besta pesada de mithral: com manivela | Balestra de osso de dragão |
| Varinha | Varinha de salgueiro | Varinha de bronze | Varinha rúnica | Varinha de mithral: com cristal | Varinha de dente de dragão |
| Cajado | Cajado de carvalho: nodoso | Cajado de bronze: anel de bronze | Cajado rúnico: cristal | Cajado de mithral: orbe flutuante | Cajado de presa de dragão: chama |

São 70 desenhos (14 famílias × 5 níveis). Sem item na mão, cada classe segura a arma básica dela
(espada de treino, arco simples, cajado da classe), que não é item.

### 3.3 Raridade e itens mágicos no corpo

| Raridade | Arte |
|---|---|
| Comum | o desenho da tabela 3.2 |
| Raro (+1) | o mesmo desenho + brilho que percorre a borda a cada ~2 s, na cor da raridade (azul) |
| Mágico | **desenho próprio** de cada item com nome (Espada Vorpal, Manto das Estrelas...): a base do nível com um ornamento único (gema, runa, forma da lâmina ou da gola) + aura roxa + o sinal da propriedade mágica |

Exemplos de itens mágicos: Lâmina Flamejante com a lâmina em brasa; Manto das Estrelas azul-noite com estrelas;
Botas Aladas com asinhas no tornozelo; Machado dos Reis Anões com runas anãs; Escudo Animado com um rosto.
São mais 70 desenhos (um por item mágico), feitos como variação do desenho do nível para caber no prazo.

| Propriedade (`ItemStats`) | Sinal |
|---|---|
| `burn` | brasas saindo da lâmina / ponta da flecha |
| `poison` | gotas verdes pingando |
| `lifesteal` | fiapo vermelho ao acertar |
| `thorns` | espinhos na armadura ou no escudo |
| `speed` / `haste` | rastro curto nas botas / borrão na arma |
| `spellPower` / `mana` | runas pulsando no manto, gema acesa |
| `hp` / `armor` | brilho dourado discreto no peito |

Os sinais animados ficam fora da folha de sprites (partículas e sobreposição no Phaser), para não multiplicar
texturas. Os estáticos (espinhos, runas) entram na arte.

## 4. Regras de vestimenta (o "contrato" das camadas)

Ordem de pintura por direção (de trás para a frente):
capa e itens nas costas (aljava da classe, escudo de costas) → braço de trás → corpo base da classe →
calça → botas → armadura → ombreiras → cabeça da classe → capacete → barba e cabelo expostos →
braço da frente → arma e escudo da frente → efeitos.

| Slot | Cobre | Deixa à mostra | Regra de conflito |
|---|---|---|---|
| Capacete fechado (Elmo de mithral, Elmo do dragão) | cabeça, cabelo, barba | — | — |
| Capacete aberto / chapéu / capuz | topo da cabeça (capuz: também as laterais) | rosto e barba | substitui o chapéu ou capuz da classe |
| Armadura | tronco e braços (mangas pelo modelo) | mãos | manto arcano desce até a canela: a calça aparece só abaixo da barra e no passo |
| Calça | coxas e canelas | — | grevas cobrem a canela da calça |
| Botas | pés até a altura do modelo | — | — |
| Escudo | antebraço | — | quem segura arco ou besta leva o escudo nas costas |
| Arma | mão | — | cajado e arco longo podem passar do quadro (área de folga) |

A arte de cada item é desenhada uma vez sobre o manequim e encaixada por pontos de encaixe por quadro
(mão, cabeça, ombros, cintura, pés). Os corpos das 4 classes usam os mesmos encaixes, e é isso que garante
que o item fique igual em qualquer classe. Vale também para as poses de ataque da Fase 4.

**Garantia automática:** um teste percorre `ITEMS` e falha se algum item não tiver arte vestida (ou se dois
itens diferentes apontarem para o mesmo desenho, exceto o raro, que usa o do comum). Item novo no catálogo sem
arte quebra o CI.

## 5. Decisão técnica: resolução e origem da arte

**Resolução recomendada: 48×48 de arte**, exibida no mesmo 1,38 tile de hoje.
Fica ~1 texel por unidade, igual aos monstros (hoje é 0,73), e o corpo passa de 16 para ~24 px de largura:
espaço para ombreira, correia, fivela e rosto com expressão, sem virar outro estilo. O refino Scale2x continua.

**Origem da arte** (a decisão mais importante do plano):

| Opção | Prós | Contras |
|---|---|---|
| A. Continuar em código (grades de letras) | controle total, determinístico, sem licença, já integrado | grades 48×48 por slot × nível × direção ficam enormes; teto de qualidade limitado |
| B. LPC (Liberated Pixel Cup) | acervo enorme de armaduras D&D e animações prontas (andar, golpe, tiro, magia, morte) | licença CC-BY-SA/GPL (atribuição e share-alike); estilo 64×64 diferente do Tibia/Crawl dos monstros |
| C. Artista, PNG por camadas com cores-chave | melhor qualidade e identidade própria | custo e prazo; precisa de especificação |
| **D. Híbrido (recomendado)** | código define regras, encaixes e paletas agora; as camadas viram PNGs com cores-chave que um artista (ou nós) refina depois, sem mexer no motor | exige montar o carregador de PNGs por camada |

Com D, as seções 3 e 4 deste plano já são o briefing do artista.

## 6. Fases

Cada fase é entregável sozinha e termina com conferência na galeria em retrato 412×915.

**Fase 0 — Provador (1–2 dias).** Tela em `arte.html` para montar qualquer combinação (classe, item por slot,
raridade, direção, animação), no tamanho real do celular e ampliada. Script de Playwright que renderiza todo
item em toda classe e acusa peça fora do quadro ou camada faltando. Sem isso, cada ajuste vira tentativa e erro.

**Fase 1 — Motor de camadas e regras (3–5 dias).** Manequim com pontos de encaixe por quadro, corpos das 4
classes nos mesmos encaixes, ordem de pintura da seção 4, catálogo de arte por item (`id` → desenho) com o
teste de cobertura, rampas de material com 4 tons + brilho (Mithral prata-azulado em vez de branco) e
terceiro material (couro/ouro) nas peças. Arco, cajado e o resto deixam de ser só tingidos.

**Fase 2 — Os 70 desenhos dos itens comuns em 48×48 (2–4 semanas, maior parte do esforço).** Tabela 3.2
completa nas 3 direções, por ordem de impacto: armadura e manto → capacete e chapéu → armas → escudo →
botas e calças.

**Fase 3 — Raridade e itens mágicos (1–2 semanas).** Brilho do raro, os 70 itens mágicos com ornamento
próprio, aura e sinais por propriedade (seção 3.3), inclusive na ficha do item e no retrato do menu.

**Fase 4 — Poses de ação (1–2 semanas).** Golpe, tiro, conjuração (2–3 quadros por direção), recuo ao levar
dano e queda na morte, ligados aos eventos de ataque que o cliente já recebe.

**Fase 5 — Base para cosméticos (opcional).** A tabela `cosmetics` já existe no banco. Com as camadas prontas,
tinturas da roupa de baixo da classe, capas e "transmog" (aparência de outro item) viram itens de loja. Só esta fase mexe no banco
(catálogo de cosméticos), seguindo as regras do `CLAUDE.md`.

## 7. Riscos e cuidados

- **Legibilidade no celular**: detalhe abaixo de 1 texel some. Toda peça é aprovada no tamanho real, não ampliada.
- **Volume de arte**: 70 itens comuns + 70 mágicos, cada um em 3 direções e nos quadros de pose. Como o item
  é igual em toda classe, não há multiplicador por classe, mas é proibido desenhar combinações: só peças +
  encaixes + regras. O provador da Fase 0 e o teste de cobertura são o controle.
- **Desempenho**: a folha é gerada no cliente por combinação. Com 48×48 e mais quadros, medir em Android
  médio; meta < 30 ms por folha, com cache (já existe em `textures.ts`).
- **Estilo dos monstros**: os heróis não podem destoar do pack Dungeon Crawl. Manter contorno escuro, luz de
  cima à esquerda e paleta próxima.
- **Escopo**: "algo grande" vira projeto sem fim se as fases não tiverem critério de pronto. Cada fase fecha
  com antes/depois na galeria e atualização da seção "Arte dos itens e equipamento visível" do GDD.

## 8. Decisões

- Cada item tem a sua arte vestida, igual em qualquer classe (seção 3).
- Origem da arte: **toda feita em código**, sem artista nem pack de terceiros (opção A da seção 5), com o motor
  de luz e contorno que deixa a qualidade consistente em todas as peças.
- Resolução: **48×48**.
- Itens mágicos: **desenho próprio** para cada um (variação do desenho do nível com materiais e enfeites).
- Paladino: arqueiro, mantendo o Tibia.

## 9. Situação

| Fase | Situação |
|---|---|
| 0 — Provador e teste | feita: provador em `apps/client/arte.html` e teste `apps/server/scripts/arte.ts` no `npm test` |
| 1 — Motor de camadas | feita: `apps/client/src/art/hero/` (`raster.ts`, `materials.ts`, `rig.ts`, `compose.ts`) |
| 2 — 70 itens comuns em 48×48 | feita: `gear.ts`, `headgear.ts`, `weapons.ts`, `shields.ts` |
| 3 — Raridade e itens mágicos | feita: 70 mágicos (`magic.ts` e `weapons.ts`), brilho e partículas no jogo (`gearFx.ts`) |
| 4 — Poses de ação | a fazer |
| 5 — Base para cosméticos | a fazer |

Medidas: um conjunto completo (9 quadros) é pintado em ~20 ms no Node; o teste desenha os 210 itens nas 4 classes
(7.560 quadros) em ~20 s.
