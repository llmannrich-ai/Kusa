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

1. **Silhueta antes de detalhe.** No celular o herói tem ~60 px CSS. Cada nível precisa mudar a **forma**
   (ombreira, crista, gola, comprimento da bota), não só a cor.
2. **Identidade de classe sempre visível.** Cada classe tem uma "camada de identidade" que nenhum item cobre
   e que ocupa ~25–30% da silhueta na cor da classe.
3. **Três materiais por figura.** Material do item (dominante) + couro/tecido (correias, forro) + metal de
   guarnição. Nunca um conjunto de cor única.
4. **O item mostra a regra.** Atributos do item viram sinais visuais (fogo em quem tem `burn`, espinhos em
   `thorns`...). Mudou a regra, a arte acompanha sozinha.
5. **Vocabulário do D&D** para formas e nomes: armadura leve/média/pesada, símbolo sagrado, foco arcano,
   druida sem metal.

### 3.1 Camada de identidade por classe

| Classe | Arquétipo D&D | Identidade (nunca coberta) | Peso de armadura no corpo |
|---|---|---|---|
| Cavaleiro | Guerreiro / cavaleiro | tabardo e capa vermelhos, penacho do elmo e brasão do escudo na cor da classe | **pesada** (malha, talas, placas) |
| Paladino | Paladino-arqueiro (patrulheiro sagrado) | tabardo dourado com sol, aljava, faixa na testa ou elmo alado | **média** (couro cravejado, peitoral, meia-armadura) |
| Feiticeiro | Mago | barba, faixa roxa na cintura, grimório no cinto, gema do foco | tecido (manto) |
| Druida | Druida | manto verde com broche de folha, peles nos ombros, folhas/galhos na cabeça | couro e peles (**sem metal**) |

O mesmo item do catálogo **veste diferente por classe** (só no cliente): "Cota de malha" no cavaleiro é cota
longa com tabardo; no paladino é camisa de malha com peitoral de couro. "Manto rúnico" no feiticeiro é túnica
com runas; no druida é manto de peles com runas entalhadas em osso. Não muda catálogo nem banco.

### 3.2 Progressão de forma por nível

| Slot | 1 Rústico | 2 Bronze | 3 Ferro | 4 Mithral | 5 Dragão |
|---|---|---|---|---|---|
| Armadura (cavaleiro) | gibão acolchoado | couraça | cota de malha longa + ombreiras pequenas | placas com ombreiras grandes e gola | placas de escamas, ombreiras com espinhos |
| Armadura (paladino) | couro batido | couro cravejado + peitoral | camisa de malha + tabardo | meia-armadura leve | escamas com asas de couro na gola |
| Manto (feiticeiro) | túnica de linho | manto de viagem com capuz nas costas | túnica com runas que brilham | vestes com fios prateados e gola alta | seda de dragão com gola de escamas e capa |
| Manto (druida) | túnica de linho com corda | manto de lã com pele no ombro | peles com runas de osso | manto de folhas prateadas | couro de dragão com musgo e penas |
| Elmo de guerra | coifa de couro | elmo aberto com crista | elmo nórdico com nasal | grande elmo com viseira e penacho (cor da classe) | elmo com chifres de dragão |
| Chapéu (feiticeiro) | capuz de lã | chapéu pontudo | capuz rúnico | chapéu largo com estrelas | coroa de chifres de dragão |
| Chapéu (druida) | capuz de lã | coroa de folhas | capuz com galhos | chifres de cervo | coroa de chifres de dragão com musgo |
| Calça / perneiras | calça com joelheira de couro | joelheiras de bronze | malha nas coxas | coxotes articulados | escamas |
| Botas | botinas | botas com caneleira | grevas (cobrem a canela) | sabatons | garras de dragão |
| Escudo | broquel | redondo com bossa | escudo "heater" | escudo alto com brasão da classe | escudo do dragão (olho) |
| Espada | espada curta | gládio de bronze | espada longa | espada bastarda | lâmina do dragão |
| Machado | machadinha | machado de mão | machado barbado | machado duplo | grande machado com cabeça de dragão |
| Arco | arco curto | arco de caça | arco longo (mais alto que o herói) | arco composto recurvo | arco de osso |
| Besta | besta leve | besta de bronze | besta de ferro | besta pesada com manivela | balestra de osso |
| Varinha | salgueiro | bronze | rúnica | mithral com cristal | dente de dragão |
| Cajado | carvalho nodoso | anel de bronze | rúnico com cristal | mithral com orbe flutuante | presa de dragão com chama |

No druida, escudos de qualquer nível são de madeira (o nível muda o aro e o entalhe) e cajados são galhos vivos.

### 3.3 Raridade e propriedades mágicas no corpo

| Raridade | Sinal visual |
|---|---|
| Comum | nada |
| Raro (+1) | brilho que percorre a borda da peça a cada ~2 s, na cor da raridade (azul) |
| Mágico | aura leve roxa + um sinal por propriedade mágica do item |

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
capa e itens nas costas → braço de trás → pernas/perneiras → botas → tronco base → armadura → cinto →
**camada de identidade** (tabardo, faixa, broche) → ombreiras → cabeça → capacete → cabelo/barba expostos →
braço da frente → arma e escudo da frente → efeitos.

| Slot | Cobre | Nunca cobre | Regra de conflito |
|---|---|---|---|
| Capacete fechado (nível 4–5 de guerra) | cabeça, cabelo, barba | penacho na cor da classe | — |
| Capacete aberto / chapéu | topo da cabeça | rosto, barba, cabelo da nuca | chapéu pontudo pula o capuz da classe |
| Armadura | tronco e braços (mangas pelo peso) | tabardo, faixa, broche, aljava | túnica arcana cobre as pernas (perneiras aparecem só no passo) |
| Calça | coxas e canelas | — | grevas de nível 3+ cobrem a canela da calça |
| Botas | pés até a canela (altura pelo nível) | — | — |
| Escudo | antebraço | — | com arco/besta vai nas costas; no druida é sempre madeira |
| Arma | mão | — | cajado e arco longo podem passar do quadro (área de folga) |

Cada camada declara pontos de encaixe por quadro (mão, cabeça, ombros, cintura, pés) em vez de posições fixas.
Assim uma peça nova encaixa em todos os quadros e poses, inclusive nas de ataque da Fase 4.

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

**Fase 1 — Motor de camadas e regras (3–5 dias).** Pontos de encaixe por quadro, ordem de pintura da seção 4,
variantes por classe, camada de identidade, rampas de material com 4 tons + brilho (Mithral prata-azulado em
vez de branco) e terceiro material (couro/ouro) nas peças. Ainda com a arte 32×32, já resolve os problemas 1, 2 e 4.

**Fase 2 — Arte 48×48 (2–4 semanas, maior parte do esforço).** Corpo base novo e, por ordem de impacto:
armadura → capacete/chapéu → arma → escudo → botas/calça. Tabela 3.2 completa nas 4 classes e 3 direções.

**Fase 3 — Raridade e magia (3–5 dias).** Brilho do raro, aura do mágico e sinais por propriedade (seção 3.3),
inclusive na ficha do item e no retrato do menu.

**Fase 4 — Poses de ação (1–2 semanas).** Golpe, tiro, conjuração (2–3 quadros por direção), recuo ao levar
dano e queda na morte, ligados aos eventos de ataque que o cliente já recebe.

**Fase 5 — Base para cosméticos (opcional).** A tabela `cosmetics` já existe no banco. Com as camadas prontas,
tinturas da camada de identidade, capas e "transmog" viram itens de loja. Só esta fase mexe no banco
(catálogo de cosméticos), seguindo as regras do `CLAUDE.md`.

## 7. Riscos e cuidados

- **Legibilidade no celular**: detalhe abaixo de 1 texel some. Toda peça é aprovada no tamanho real, não ampliada.
- **Explosão combinatória**: 4 classes × 6 slots × 5 níveis × 3 raridades. Proibido desenhar combinações:
  só peças + encaixes + regras. O provador da Fase 0 é o controle.
- **Desempenho**: a folha é gerada no cliente por combinação. Com 48×48 e mais quadros, medir em Android
  médio; meta < 30 ms por folha, com cache (já existe em `textures.ts`).
- **Estilo dos monstros**: os heróis não podem destoar do pack Dungeon Crawl. Manter contorno escuro, luz de
  cima à esquerda e paleta próxima.
- **Escopo**: "algo grande" vira projeto sem fim se as fases não tiverem critério de pronto. Cada fase fecha
  com antes/depois na galeria e atualização da seção "Arte dos itens e equipamento visível" do GDD.

## 8. Decisões pendentes

1. Origem da arte: A, B, C ou **D (recomendado)**.
2. Resolução: **48×48 (recomendado)** ou manter 32×32 e só aplicar as Fases 1 e 3.
3. Paladino como arqueiro com armadura média (recomendado, mantém o Tibia) ou paladino de armadura pesada (D&D clássico).
4. Poses de ação (Fase 4) agora ou depois do resto.
