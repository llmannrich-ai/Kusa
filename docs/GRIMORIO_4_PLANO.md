# Grimório 4.0 — galhos mais fundos, slot 3, leques e Dons

Plano da próxima expansão do Grimório nas 4 classes: (1) **mais ramificação e mais profundidade** em todos os ramos,
(2) **abrir o slot 3** com magias supremas, (3) magias em **leque** a partir do herói e (4) **passivas compradas com
ouro**, com muitos níveis, para o ouro nunca mais ficar parado. Continua o `GRIMORIO_PLANO.md` (2.0, especializações) e
o `GRIMORIO_GALHOS.md` (3.0, costelas, sinergias, Tomos). Nada do que existe é removido e os ids comprados no banco
continuam valendo. Quando uma fase for entregue, o `GDD.md` passa a descrever o que vale e este arquivo marca a fase.

**Andamento:** planejamento fechado com o Leonardo (seção 2). Base: `main` em `c3c9ed8` (01/11/2026). O slot 3 hoje
é só o lugar reservado do botão (`#actions > [data-slot="2"]` em `style.css`, em pé e deitado); abri-lo é a fase 3.
**Fase 1 feita** (ver "Fase 1, como foi entregue" na seção 10): os 12 Dons do topo e as áureas e Tomos até o nível 20.

---

## 1. Resumo executivo

| | Hoje | Depois |
|---|---|---|
| Profundidade de cada ramo | até a linha VIII | até a linha **X** |
| Galhos (costelas) por ramo | 1–2 | **3–4** (+1 de magias, +1 de passivas) |
| Nós por classe | 40–44 | **~70** (+27 por classe) |
| Magias por classe | 27–31 (115 no jogo) | **43–47** (+16 por classe, 179 no jogo) |
| Magias em leque | 3, desenhadas como tiles acesos | **30** (+27), com 5 formas de leque e o desenho de sopro |
| Slot 3 | botão reservado | abre no **nível 12**: 1 magia de entrada + 3 Ápices + 6 de especialização por classe, **todas compradas** |
| Passivas sem slot | Áureas (2–3 níveis), Tomos (3), Traços (1) | + **12 Dons por classe (48), 25 níveis cada**; Áureas e Tomos vão a **20 níveis** |
| Mecânicas novas | — | **Reações** (estados que se combinam), **gatilhos** e **ataque básico transformado** |
| Ouro que cabe no Grimório de uma classe | ~30 mil, quase tudo de compra única | **~250 mil**, a maior parte em níveis de passiva |

**Regra de ouro:** ouro compra **acesso** (magia nova, uma vez) e **passivas** (muitos níveis). A **força da magia de
slot** continua vindo só do uso (XP, `spellxp.ts`). Gastar ouro nunca substitui jogar com a magia.

---

## 2. Decisões do Leonardo (entrevista de 01/11/2026)

| # | Tema | Decisão |
|---|---|---|
| 1 | Objetivo do jogo nos próximos meses | validar com público real: a comunidade Tibia/RPG BR |
| 2 | Co-op | solo primeiro, co-op como bônus (o plano não pode depender de grupo) |
| 3 | Nível do slot 3 | **12** (magia suprema); os mapas mais longos que vêm aí vão levar mais hunts até ele, então o plano não compensa o slot aparecer pouco hoje |
| 4 | Magias de slot 3 por classe | **9**: 3 Ápices (um por ramo) + 1 por lado de especialização |
| 5 | Crescimento da árvore | **+2 costelas e +2 linhas por ramo** |
| 6 | Passivas que já existem | **Áureas e Tomos ganham níveis** (até 20); Traços continuam com nível único |
| 7 | Dons (passivas novas) | **12 por classe** (4 por ramo), **25 níveis**, um marco a cada 5 |
| 8 | Criatividade | **combos de estados**, **gatilhos de momento** e **ataque básico/forma transformados** (magias que usam o terreno ficam de fora) |
| 9 | Direção geral (comentário) | o eixo é ramificação e profundidade, com mais passivas e mais níveis nelas, e magias mais criativas |
| 10 | Teto de força das passivas de ouro | **até ~3× ou mais** a força de uma conta nova da mesma classe (progressão estilo Tibia) |
| 11 | Mapas iniciais triviais para o veterano | **aceito**: o desafio dele são os mapas ★ altos e os mapas longos que vêm aí; nada muda nos mapas |
| 12 | Reações | **para todos, fracas na base**, inclusive golpes de aliados; Dons e magias de combo deixam forte |
| 13 | Canalizar no celular | **segurar o botão e arrastar** gira o sopro, soltar encerra; toque rápido solta o sopro inteiro para a frente |
| 14 | Como as fases chegam | **por sistema, nas 4 classes juntas** |
| 15 | Magia de slot 3 grátis | **não**: todas as magias do slot 3 se compram; o slot fica vazio até a primeira compra |
| 16 | Ordem das 3 primeiras fases | **passivas → leque → slot 3** |
| 17 | Áurea de velocidade | **para no nível 6** (+12%) |
| 18 | Publicar as fases | **direto**, quando o CI e os testes passarem (fila, migration, advisors, merge); parar só em conflito, CI vermelho ou aviso de segurança novo |
| 19 | Xamã Orc (classe que entrou em 01/11, fora deste plano) | **entra no Grimório 4.0**: a magia de entrada do slot 3 já na fase 3b; Ápices e Dons do fundo quando o tronco dele existir (fase 2 de `docs/CLASSE_XAMA_ORC.md`, de outra sessão) |
| 20 | Ápices | **os 12 do plano**, com todas as peças novas (aura que anda, carregar, órbita, cruz, puxar em área, varredura); a fase 3b sai em duas partes |

Padrões assumidos sem pergunta:
- Dons são **por classe** e comprados **só com ouro** (não pedem XP).
- As magias em leque ficam **cedo** na árvore (linhas III–V), para o jogador novo vê-las.
- Toque rápido numa magia em leque sai **na frente do herói** (regra do #218).

---

## 3. Diagnóstico (dados de produção, 01/11/2026)

**Ouro parado.** Média de ~110 de ouro por hunt (p90 ~450). A maior conta tem 7.888 de ouro, 51 de 167 nós e ~6.600
de ouro em nós que **já poderia comprar** e não compra. O que falta comprar não parece valer: magia nova vai para o
banco de reservas (2 slots, até 3 ativas por slot) e as passivas acabam em 1 a 3 níveis. Por isso a maior parte do
ouro novo vai para **passivas longas**, não para magias.

**Leque invisível.** O motor já tem `shape: "cone"` (90°, `coneTiles`) em 3 magias (Corte Largo, Barragem, Cone de
Frio). Duas ficam atrás de especialização, e o desenho só acende os tiles do chão: nada sai do herói.

**Slot 3 tardio, por enquanto.** Hoje só 8% das hunts em sala (26 de 325) chegam ao nível 12, mas os mapas novos, mais
longos, vão levar mais hunts até lá (decisão do Leonardo: o plano não compensa isso). As magias do slot 3 só precisam
valer a espera: efeito que muda a luta, não só mais dano.

**Público.** 7 contas, quase todo o uso de quem desenvolve e testa; 49% das hunts terminam em morte. As passivas
baratas no começo (nível 1 de um Dom custa 60) servem de progressão visível para o jogador novo que morre cedo.

---

## 4. Forma nova de cada ramo

```
 linha
   0          [raiz S1]   ★ magia de entrada do slot 3 (1.000)
   I                      tronco ── (Áurea)
   II    ◇ Dom do ramo ── tronco ── 📕 Tomo     ← o Dom e o Tomo saem do mesmo nó, um de cada lado
   III   ● leque ──┐      tronco      costela de hoje
   IV    ● combo ──┘      tronco      costela de hoje
   V                      ponta do tronco ──┐
   VI        ✦ Traço A    ✦ Traço B        ◇ Dom
   VII         ● S1          ● S1           ◇ Dom          ← costela de passivas
   VIII        ● S2          ● S2           ★ Ápice (S3)   ← pede o 2º Dom e a ponta do tronco
   IX          ★ S3          ★ S3                          ← S3 de cada lado (novo)
   X                                        ◇ Dom do fundo ← pede o Ápice
```

| Nó novo (por ramo) | Linha | Lado | Pede | Preço |
|---|---|---|---|---|
| ◇ **Dom do ramo** | II | o oposto ao Tomo | 1º nó do tronco (comprado) | curva dos Dons (7.3) |
| ● **Magia em leque** (S1 ou S2) | III–IV | o lado sem costela | nó do tronco da linha II–III, nível 1 de uso | tabela de hoje (300–500) |
| ● **Magia de combo** (S1 ou S2) | IV–V | mesma costela | a magia em leque, nível 1 | tabela de hoje (500–800) |
| ◇ **2 Dons da costela de passivas** | VI–VII | lane ±2 | a ponta do tronco **comprada** | curva dos Dons |
| ★ **Ápice** (S3) | VIII | lane ±2 | o 2º Dom (comprado) **e** a ponta do tronco no nível 1 | 2.000 |
| ★ **S3 de cada lado** | IX | lane ±1 | a S2 do lado, nível 1 | 2.500 |
| ◇ **Dom do fundo** | X | lane ±2 | o Ápice (comprado) | curva dos Dons |

- **Por ramo:** +9 nós (2 magias de costela, 1 Ápice, 2 S3 de lado, 4 Dons). **Por classe:** +27 nós e a magia de entrada do S3.
- **Os Dons só pedem compra, nunca XP:** o ouro sempre tem para onde ir, desde a primeira hunt.
- **O Ápice fica fora da especialização:** quem ainda não escolheu o lado já tem magia de slot 3 para comprar.
- **Layout:** hoje as costelas usam as linhas II–V e as especializações usam lane ±1 nas linhas V–VIII; as lanes ±2
  nas linhas VI–X estão livres. A costela de leque vai para o lado do ramo que não tem costela nas linhas III–V (onde
  os dois lados estiverem ocupados, ela desce uma linha). Conferir ramo a ramo em 412×915 e 360×780 antes do PR.

---

## 5. Slot 3

### 5.1 Regras

- Abre no **nível 12** do herói (`SPELL_SLOT_LEVELS = [3, 6, 12]`). O nível 12 não dá melhoria (a regra de
  `perks.ts` já pula os níveis de slot).
- Botão no lugar reservado: em pé, em cima do ⚔️ à esquerda (`data-slot="2"`, `--dx: -40px; --dy: 104px`); deitado,
  em cima do ⚔️ (`--dx: 0; --dy: 86px`). A posição já foi conferida em 360×780, 390×844, 412×915 e 915×412.
- Magias do slot 3: recarga de 25–45 s, mana alta, efeito que **muda a luta** (não só "mais dano").
- Até 3 ativas por slot (`ACTIVE_SPELLS_PER_SLOT`), como os outros slots.
- **Todas as magias do slot 3 se compram** (decisão do Leonardo). A mais barata é a **magia de entrada** da classe
  (linha 0, ao lado da raiz, 1.000 de ouro, pede só a raiz). Até a primeira compra, o botão do slot 3 aparece apagado
  com "Compre uma magia suprema no Grimório" ao chegar no 12.

### 5.2 O que muda no código para abrir

| Onde | Mudança |
|---|---|
| `packages/shared/src/spells.ts` | `SpellSlot = 0 \| 1 \| 2`; `SPELL_SLOT_LEVELS` com o 12; as 4 magias de entrada do S3 (compradas, não iniciais) |
| `packages/shared/src/talents.ts` | `activeSlotSpells` para o slot 2; nós novos |
| `apps/server/src/state.ts` | `Player.spell3` |
| `apps/server/src/hunt.ts` | `spellIn`, escolha, lançamento, XP e telemetria do slot 2; aviso "Nova magia!" no 12 |
| `apps/server/src/botAi.ts` | bots usam o slot 3 |
| `apps/client/src/spellbar.ts` | `SLOTS` com o 2, botão no `data-slot="2"`, janela de escolha |
| `apps/client/src/rules.ts`, `menu.ts`, `catalog.ts` | textos das regras, selo "slot 3" no nó, filtro do catálogo |
| Supabase | `record_spell_xp` hoje para na 2ª magia (`exit when v_count >= 2`): passa a aceitar 3; `finish_solo_run` idem |
| Testes | `ativas.ts`, `spells.ts`, `magiaxp.ts`, `bots.ts` cobrem o 3º slot |

### 5.3 XP do slot 3

Mesma regra dos outros slots (`castXp` = recarga em segundos, teto de 400 por hunt). Sem compensação para o slot
aparecer pouco hoje: os mapas mais longos que estão vindo resolvem isso (decisão do Leonardo).

---

## 6. Motor de efeitos novo

Tamanho: **P** = até 1 dia, **M** = 2–3 dias, **G** = 1 semana ou mais (com o desenho).

### 6.1 Formas de leque

Todas partem do herói, na direção mirada pelo arrasto (no toque rápido, para a frente do herói), usam a mesma conta de
tiles no cliente e no servidor e param em parede.

| # | Forma | Campo no `SpellDef` | O que faz | Tam. |
|---|---|---|---|---|
| L1 | Abertura variável | `coneAngle` (graus, padrão 90) | de 45° (estreito e longo) a 180° (meia-lua) | P |
| L2 | Onda | `wave: { stepMs }` | o leque cresce do herói para fora, um anel por vez: quem está na ponta é atingido depois | P |
| L3 | Projéteis em leque | `spread: { count, angle }` | N tiros espalhados no ângulo; cada um voa reto e pode errar; colado no monstro, todos acertam | M |
| L4 | Canalizar | `channel: { ms, tickMs, moveSlow }` | o leque se repete a cada `tickMs` enquanto o herói anda mais devagar; arrastar gira o leque, soltar ou tocar de novo encerra. É o "cuspir fogo" | M |
| L5 | Varredura | `sweep: { ms }` | um golpe corre de uma borda do leque à outra | P (depois da L2) |

**Desenho: família "sopro"** no `fx.ts`, pela `color` e pelo `element`. São partículas que saem do herói, abrem no
ângulo e avançam com a onda; cada tile acende quando a onda chega e deixa um rastro de 0,5 s (chão chamuscado,
congelado, rachado). As 3 magias de leque que já existem passam a usar esse desenho. **Sem tremor de câmera.**

### 6.2 Reações (combos de estados)

Peça central da criatividade pedida: **um estado prepara o outro**. Ficam em `packages/shared/src/reactions.ts`, e o
servidor confere a cada golpe. A força base é baixa, para ensinar o combo sem desequilibrar as magias de hoje; os Dons
de combo (seção 7) e as magias de combo (seção 8) é que deixam a reação forte. Uma reação vale para qualquer fonte,
inclusive de aliados: no co-op, o fogo do Feiticeiro e o gelo de outro jogador combinam.

| Reação | Estado no monstro + golpe | Efeito (base) | Usa |
|---|---|---|---|
| 💨 **Vapor** | queimando + magia de gelo (ou congelado + fogo) | explode em raio 1 (0,8×), ofusca 0,5 s e tira os dois estados | Feiticeiro (Raio + Gelo) |
| 💎 **Estilhaço** | congelado (preso por gelo) + golpe de energia ou físico | +40% no golpe e quebra o gelo (o Traço Estilhaçar continua mais forte) | Feiticeiro, Cavaleiro |
| 🩸 **Hemorragia** | sangrando + empurrão ou atordoamento | o resto do sangramento entra todo de uma vez | Cavaleiro, Paladino |
| 🌋 **Brasa Tóxica** | envenenado + fogo | nuvem de 2 s em raio 1 que queima | Druida + Feiticeiro/Paladino |
| 🌿 **Espinheiro** | preso por raiz + veneno | as raízes viram espinhos: sangra 3 s | Druida |
| 🌑 **Condenação** | marcado + magia de trevas | a marca explode: 1× em raio 1 | Feiticeiro (Trevas) |
| 🔆 **Incandescer** | ofuscado + fogo | luz explode em raio 1 (0,8×), dobro em mortos-vivos | Paladino (Luz) |
| 🎯 **Exposto** | marcado + atordoado | +30% de dano recebido enquanto os dois durarem | Cavaleiro, Paladino |

Estado novo: **congelado** (preso por magia de gelo; hoje o motor só sabe "preso"). Tamanho do conjunto: **G**.
Telemetria: `RunStats.reactions` (quantas de cada, de quem).

### 6.3 Gatilhos de momento

Ganchos no servidor (os Traços já têm `onHit`, `onHurt`, `onKill`, `onCast`); entram os novos: **ao rolar ou
teleportar**, **abaixo de X% da vida**, **a cada N ataques básicos**, **rotação** (3 magias diferentes em 8 s) e
**parado por 1 s**. Tamanho: **M**.

### 6.4 Ataque básico transformado

`Player.basicMods`: a cada N básicos, o golpe muda (leque curto, flecha em leque, ricochete, elemento, mordida de
lobo espectral). Usado pelos Dons de "básico" e pela Forma Primordial. Tamanho: **M**.

### 6.5 Peças de apoio

| # | Peça | Tam. | Usado por |
|---|---|---|---|
| A1 | Puxar em área (para perto de quem conjura ou para o ponto mirado) | M | Correntes do Desafio, Buraco Negro |
| A2 | Enfraquecer: monstro causa menos dano | P | Olhar do Abismo, Brado Cortante (Maestria) |
| A3 | Aura que anda com o herói | M | Carga da Legião, Estandarte Vivo |
| A4 | Carregar antes de soltar (`windupMs`, a mira aparece no chão) | M | Tiro do Fim do Mundo |
| A5 | Forma em cruz (`shape: "cross"`) | P | Cruz Flamejante |
| A6 | Várias armadilhas de uma vez, espalhadas no leque | P | Abrolhos, Campo Minado |
| A7 | Área com atraso (cai no ponto depois de `delayMs`) | P | Flecha Celeste |
| A8 | Salto com queda em área | P (usa o `dash`) | Fúria do Titã |
| A9 | Órbita (anel que gira em volta do herói) | M | Coroa Solar |
| A10 | Bumerangue (vai e volta; na volta, cura aliados) | M | Revoada |
| A11 | Projétil lento que fere tudo pelo caminho | M | Vórtice Arcano |
| A12 | Barril (campo que explode quando levar fogo ou flecha) | M | Barril de Pólvora |

Ficaram de fora por decisão: magias que usam o terreno e o Tornado (campo que anda, a única peça G de apoio).

---

## 7. Passivas compradas com ouro

### 7.1 Dons: regras

- **Não ocupam slot** e valem em toda hunt; **25 níveis**, comprados um a um; **marcos nos níveis 5, 10, 15, 20 e 25**
  (comportamento novo, como a Maestria das magias).
- Cada Dom tem um **tema**: **C** = combo de estados (fortalece uma reação), **G** = gatilho de momento, **B** = muda o
  ataque básico ou a forma.
- **Comprar não pede XP;** o nível não sobe com o uso e não cai na morte.
- **Menu:** hexágono no desenho (círculo = magia, quadrado = Áurea, losango = Traço, livro = Tomo). A ficha mostra
  "Nv 7/25", o efeito de agora e do próximo nível, o próximo marco e os botões **+1** e **+5** (preço somado). A
  barra muda de cor a cada marco.
- **Servidor:** lidos ao entrar na sala (como `spellBonuses`), fixos durante a hunt. A hunt solo e a sala no aparelho do
  jogador leem do mesmo jeito: muda a força, não a recompensa (`SOLO_LIMITS` continuam valendo).

### 7.2 Teto de poder

Decisão do Leonardo: o veterano pode chegar a **~3× ou mais** a força de uma conta nova da mesma classe (progressão
estilo Tibia). Os mapas iniciais ficam fáceis para ele, e isso é aceito: o desafio do veterano são os mapas ★ altos e os
mapas longos que vêm aí.

- Um Dom no nível 25 vale **~+25–30% num eixo** (o dobro de um Traço); as Áureas e os Tomos no 20 somam o resto.
- O efeito por nível continua **condicional** (em monstro sangrando, depois de rolar, abaixo de 30% da vida...): o
  veterano fica muito mais forte jogando com a build dele, não só com mais números.
- Os 12 Dons de uma classe mexem em eixos diferentes; nenhum soma dano bruto em todas as magias.
- Conta aproximada no máximo: Áurea de dano +29%, Tomo +35% nas magias do ramo, vida +44%, mana +58%, e os Dons
  multiplicam isso nas situações deles. Com o nível de uso das magias (+50%) e as sinergias, dá ~3× num combate em que a
  build encaixa.
- Exceção: a **velocidade** tem teto (Áurea até o 6, Passo de Rastreador até +10%), porque velocidade alta deixa o
  herói fugir de tudo.
- Conferir com `/balanceamento` quando houver 50 hunts com algum Dom acima do nível 10.

### 7.3 Preço

Usa a fórmula que o `buy_talent` já tem (`base_cost × cost_growth^nível`), então comprar 1 nível não muda a função.
**Dons: base 60, ×1,12.**

| Níveis | Preço por nível | Acumulado | Hunts no ritmo médio (~110) |
|---|---|---|---|
| 1–5 | 60 → 95 | ~380 | ~3–4 |
| 6–10 | 106 → 166 | ~1.050 | ~10 |
| 11–15 | 186 → 293 | ~2.240 | ~20 |
| 16–20 | 328 → 516 | ~4.300 | ~40 |
| 21–25 | 578 → 910 | ~8.000 | ~73 |

Um Dom completo: ~8 mil. Os 12 de uma classe: ~96 mil. Função nova `buy_talent_levels(p_talent_id, p_count)` (até 5
níveis numa transação, mesmas regras do `buy_talent`) para o botão +5.

### 7.4 Áureas e Tomos até o nível 20

Os níveis de hoje não mudam (ninguém perde nada); do 4 em diante cada nível dá um ganho menor, mas são 17 níveis.

| Passiva | Níveis 1–3 (hoje) | Níveis 4–20 | No nível 20 | Preço novo |
|---|---|---|---|---|
| Áurea de dano | +4%/nível | +1%/nível | +29% | base 120, ×1,15 (~12 mil no total) |
| Áurea de vida | +6%/nível | +1,5%/nível | +43,5% | base 120, ×1,15 (~12 mil) |
| Áurea de mana | +8%/nível | +2%/nível | +58% | base 150, ×1,15 (~15 mil) |
| Áurea de velocidade | +4%/nível (2 níveis) | +1%/nível, **só até o 6** | +12% | base 300, ×1,3 (~3,8 mil) |
| Tomo (por ramo) | +5%/nível | +1,2%/nível | +35,4% | base 300, ×1,12 (~21,6 mil) |

- A velocidade para no nível 6 (decisão do Leonardo): velocidade alta muda a sensação do jogo e a do monstro (fugir de tudo).
- O crescimento do preço cai de ×1,8 para ×1,15/×1,12. Os níveis 2 e 3 ficam **mais baratos** do que hoje para quem
  ainda não comprou. É o efeito colateral aceitável de usar a fórmula que já existe.
- O teto de força extra das magias (sinergia + Tomo) sobe de +45% para ~+65%: conferir em `spellsChosen.bonus`.

### 7.5 Catálogo dos Dons

Formato: **efeito por nível** · marcos **5 / 10 / 15 / 20 / 25**. Posição: **T** = topo do ramo (linha I), **P1/P2** =
costela de passivas (VI–VII), **F** = fundo (X). Números de partida para o balanceamento, já no teto de ~3× (7.2).

#### Cavaleiro

| Ramo | Pos. | Dom | Tema | Por nível | Marcos |
|---|---|---|---|---|---|
| Lâmina | T | 🗡️ **Fio Temperado** | B | +1,2% de dano do básico | o 4º golpe seguido sangra 3 s · o 4º golpe vira corte em leque de 60° · a cada 3º golpe · o leque sangra · o leque abre a 90° |
| Lâmina | P1 | 🩸 **Sangue no Aço** | C | +3% de dano da Hemorragia | Hemorragia cura 2% · empurrar faz sangrar 2 s · Hemorragia pega também quem está colado · +1 s de sangramento em tudo · Hemorragia devolve 1 s de recarga do slot 1 |
| Lâmina | P2 | 💢 **Fúria Crescente** | G | matar dá +0,2% de dano por acúmulo (até 10, por 6 s) | até 12 acúmulos · com o máximo, básico 15% mais rápido · acúmulos duram 8 s · até 15 · com o máximo, a próxima magia do slot 1 não gasta mana |
| Lâmina | F | ⚔️ **Último Duelo** | G | abaixo de 30% da vida: +1,6% de dano | e 10% de roubo de vida · abaixo de 35% · e 15% mais rápido · roubo 15% · abaixo de 30%, a recarga do slot 3 corre 2× |
| Bastião | T | 🛡️ **Couro Curtido** | — | +0,6 de armadura (15 no 25: a armadura tem retorno decrescente e 20 pontos já cortariam 50%) | escudos +10% · imune a lentidão · +5% de vida · escudos +10% · ao quebrar um escudo, 2 s com 30% menos dano |
| Bastião | P1 | 🧱 **Bigorna** | C | monstro empurrado contra parede ou monstro fica atordoado +0,08 s (até 2 s) | e leva 0,5× · empurra também o de trás · +1 tile em todos os empurrões · o impacto conta como atordoar para a Hemorragia · o impacto deixa 30% lento por 3 s |
| Bastião | P2 | 🔔 **Repique** | G | golpe recebido com escudo ativo devolve +2% do absorvido em raio 1 | raio 2 · o repique provoca · devolve também em mana (1%) · raio 3 · o repique atordoa 0,3 s |
| Bastião | F | 🏯 **Pedra Fundamental** | G | parado há 1 s: +1,2% de corte de dano | parado regenera 1% da vida por s · parado provoca os colados a cada 3 s · +5 de armadura parado · parado há 0,5 s · parado, o básico corta todos os colados |
| Comando | T | 🎖️ **Voz de Comando** | — | +1% de dano para você e aliados a até 4 tiles (bots e criaturas incluídos) | alcance 5 · provocar dura +1 s · aliados +5% de velocidade · alcance 6 · aliado abaixo de 20% ganha escudo de 15% (1 vez a cada 60 s) |
| Comando | P1 | 📢 **Eco de Guerra** | G | ao provocar, escudo de 0,4% da vida por monstro provocado (até 8) | dura 6 s · provocados andam 15% mais devagar · até 10 monstros · provocar cura 1% por monstro · o eco se repete 2 s depois com 50% |
| Comando | P2 | 🎯 **Ordem de Execução** | C | +2,4% de dano na reação **Exposto** | Exposto dura +1 s · marcar atordoa 0,3 s · Exposto também em quem está colado · +1 s · matar um Exposto marca o mais perto |
| Comando | F | 👑 **Estandarte Vivo** | G | aura (A3) de raio 3: aliados com +0,6% de velocidade de ataque | raio 4 · +3 de armadura na aura · aliado que mata na aura cura 2% · raio 5 · a aura dá 10% de corte de dano por 3 s depois do slot 3 |

#### Paladino

| Ramo | Pos. | Dom | Tema | Por nível | Marcos |
|---|---|---|---|---|---|
| Mira | T | 🦅 **Olhar Paciente** | — | +1,2% de dano a 4 tiles ou mais | +0,5 tile no básico · tiro no alcance máximo atordoa 0,3 s (a cada 10 s) · +0,5 tile · 5% de chance de flecha dupla · 10% |
| Mira | P1 | 🪶 **Aljava Larga** | B | o 5º básico seguido solta um leque de 3 flechas com 30% +2%/nível | a cada 4º · 4 flechas · a cada 3º · 5 flechas · as flechas do leque atravessam 1 monstro |
| Mira | P2 | 🎯 **Ponto Fraco** | C | +2,4% de dano na reação **Exposto** e em monstro marcado e sangrando | marcar faz sangrar 2 s · Exposto +1 s · sangramento em marcado +20% · +1 s · matar um marcado marca o mais perto |
| Mira | F | 🌬️ **Fôlego do Caçador** | G | depois de rolar ou saltar, o próximo tiro dá +4% | e atravessa · rolar devolve 10% da recarga do slot 1 · os 2 próximos tiros · e atordoa 0,3 s · rolar dá escudo de 5% |
| Luz | T | ✝️ **Fé Ardente** | — | +1,6% de dano em mortos-vivos | queimar +1 s · ofuscar +0,2 s · morto-vivo morto cura 1% · +0,2 s · a luz atravessa o 1º monstro |
| Luz | P1 | 🔆 **Aurora** | C | +3% de dano do **Incandescer** | Incandescer em raio 2 · ofuscado que queima fica ofuscado +0,3 s · +1 s de queimadura · Incandescer cura 1% dos aliados perto · Incandescer ofusca quem pega |
| Luz | P2 | 🕯️ **Vela Votiva** | G | monstro morto por luz deixa uma vela por 3 s que fere em raio 1 (0,1×/s +2%/nível) | 4 s · a vela ofusca quem passa · 2 velas por morte em mortos-vivos · 5 s · a vela dá +3 de armadura aos aliados perto |
| Luz | F | ⛪ **Graça** | G | a cada 10 magias, a próxima não gasta mana e sai +2% mais forte | a cada 9 · e cura 5% · a cada 8 · e ofusca em raio 2 · a cada 7 |
| Batedor | T | 🧭 **Passo de Rastreador** | — | +0,4% de velocidade de movimento (até +10%; a velocidade tem teto, ver 7.4) | armadilhas +10% de duração · +1 armadilha ao mesmo tempo · 3 s sem levar dano: +10% no próximo tiro · +10% · +1 armadilha |
| Batedor | P1 | 🪤 **Estrepes Afiados** | — | +1,2% de dano dos campos no chão | +5% de lentidão nos campos · campos +1 s · os campos fazem sangrar · +1 s · monstro que morre num campo deixa estrepes no tile |
| Batedor | P2 | 🧨 **Pavio Curto** | C | armadilha que dispara em monstro queimando explode em raio 1 (1× +4%/nível) | raio 2 · a explosão queima · armadilha queima quem prende · a explosão empurra 1 tile · a explosão dispara a armadilha mais perto |
| Batedor | F | 🎇 **Mão Rápida** | B | 0,8% de chance por nível de o básico sair incendiário (queima 3 s) | a flecha incendiária explode em raio 1 · +2% de chance · a explosão deixa chão em chamas 2 s · +2% · a cada 6º básico, sai sempre |

#### Feiticeiro

| Ramo | Pos. | Dom | Tema | Por nível | Marcos |
|---|---|---|---|---|---|
| Raio | T | ⚡ **Condutor** | — | +1,2% de dano de energia e fogo | cadeias +1 salto · queimar +1 s · Estática/Combustão (se tiver) +5% · +1 salto · o 1º salto não perde dano |
| Raio | P1 | 🔥 **Garganta de Brasa** | B | +1,6% de dano dos sopros (canalizar e onda) | sopros +10° · deixam chão em chamas por 1 s · +0,5 s de canalização · +10° · a última onda do sopro explode em raio 1 |
| Raio | P2 | 💨 **Panela de Pressão** | C | +3% de dano do **Vapor** | Vapor em raio 2 · Vapor ofusca 1 s · Vapor deixa névoa por 2 s (30% de lentidão) · +1 tile · Vapor devolve 3% da mana |
| Raio | F | 🔁 **Circuito** | G | 3 magias de elementos diferentes em 8 s: a próxima dá +2% e não gasta mana | em 10 s · a próxima também salta 1 vez · 2 elementos bastam · a próxima dura +30% · a próxima recarrega 50% mais rápido |
| Gelo | T | ❄️ **Coração Frio** | — | +1% de duração das lentidões e prisões | lentidão +5% · monstro lento recebe +5% de dano · +5% · prender dá 5% de escudo a você · monstro que morre congelado congela os colados por 1 s |
| Gelo | P1 | 🌨️ **Sopro Glacial** | B | +1,2% de lentidão por segundo de canalização | +1 tile no sopro · 1,5 s seguidos no sopro congelam · +10° · ao congelar, o próximo golpe Estilhaça · o sopro não deixa você lento |
| Gelo | P2 | 💎 **Cristalizar** | C | +3% de dano do **Estilhaço** | Estilhaço em raio 1 · Estilhaço devolve 2% de mana · +0,5 s de congelado · raio 2 · Estilhaço congela de novo por 0,5 s (cadeia) |
| Gelo | F | 🔷 **Reserva Gélida** | G | abaixo de 15% da mana, escudo de gelo de 1,2% da vida (a cada 30 s) | o escudo congela quem bate · a cada 25 s · abaixo de 20% · o escudo devolve 10% da mana ao quebrar · a cada 20 s |
| Trevas | T | 🌑 **Fome Sombria** | — | +0,8% de roubo de vida das magias de trevas | marcas +1 s · matar com magia devolve 1% de mana · +1 s · +1% · as magias de trevas roubam também 2% em mana |
| Trevas | P1 | 👁️ **Lamento Profundo** | — | +1,2% de força dos enfraquecimentos | leques sombrios +10° · enfraquecido recebe +5% de dano · +1 tile · +1 s · o leque sombrio rouba 1% de mana por monstro |
| Trevas | P2 | ☠️ **Sentença Lenta** | C | +3% de dano da **Condenação** | Condenação em raio 2 · Condenação marca quem pega · +1 s de marca · a explosão rouba 3% de vida · Condenação em cadeia (1 vez) |
| Trevas | F | 🦴 **Ossuário** | G | monstro morto por trevas: 1,6% de chance por nível de levantar um esqueleto por 8 s (até 2) | 10 s · até 3 · os esqueletos marcam quem atacam · 12 s · o esqueleto explode em Condenação ao sumir |

#### Druida

| Ramo | Pos. | Dom | Tema | Por nível | Marcos |
|---|---|---|---|---|---|
| Matilha | T | 🐺 **Laço da Matilha** | — | +1,2% de vida e dano das criaturas | criaturas +10% de duração · +1 lobo no Chamado da Matilha · criaturas roubam 3% de vida · +10% · a criatura que morre volta uma vez com 30% |
| Matilha | P1 | 📣 **Eco do Rugido** | — | +1,2% do bônus de ataque que os rugidos dão às criaturas | rugidos +10° · o rugido cura as criaturas em 5% · +1 tile · +5% · o rugido chama 1 lobo por 6 s |
| Matilha | P2 | 🦷 **Presa Venenosa** | C | criaturas envenenam; +3% de dano do **Espinheiro** feito por elas | o veneno das criaturas acumula 2 vezes · criaturas prendem 0,5 s no 1º golpe · Espinheiro em raio 1 · +1 s de veneno · criatura que mata pula no mais perto |
| Matilha | F | 🐾 **Instinto** | B | a cada 4º básico, um lobo espectral morde o alvo (0,5× +2%/nível) | e atordoa 0,3 s · a cada 3º · em forma animal, a cada 2º · a mordida envenena · morde 2 vezes |
| Bosque | T | 🌿 **Seiva Antiga** | — | +1% de cura | cura além da vida vira escudo de até 3% · curar tira lentidão · escudo até 6% · +1 tile nas curas em área · curar alguém abaixo de 30% cura 50% a mais |
| Bosque | P1 | 🌸 **Pólen Dourado** | — | +1,2% de cura dos leques de cura | +10° · o leque devolve 1% de mana aos aliados · +1 tile · tira veneno · +3 de armadura nos aliados por 4 s |
| Bosque | P2 | 🍯 **Néctar** | G | curar alguém abaixo de 50% devolve 0,2% de mana por nível | abaixo de 60% · e dá 5% de velocidade por 3 s · abaixo de 70% · e 2% de escudo · a cura também tira o atordoamento |
| Bosque | F | 🌀 **Ciclo** | B | a cada 300 de cura feita, o próximo básico vira uma semente que cura em raio 1 (5% +0,4%/nível) | a cada 250 · raio 2 · a semente prende 1 s quem pisa · a cada 200 · a semente vira escudo de 5% |
| Espinhos | T | 🌵 **Seiva Venenosa** | — | +1,2% de dano dos venenos e sangramentos | veneno +1 s · Toxina (se tiver) +1 acúmulo · envenenado anda 10% mais devagar · +1 s · veneno que mata pula para o mais perto |
| Espinhos | P1 | 🍃 **Rajada de Cardos** | B | +1,2% de dano dos espinhos em leque | +1 espinho · espinhos prendem 0,3 s · +1 espinho · atravessam o 1º monstro · cada espinho que acerta envenena |
| Espinhos | P2 | 🌿 **Espinheiro Antigo** | C | +3% de dano do **Espinheiro** | Espinheiro em raio 1 · +1 s de raiz · o Espinheiro envenena de novo · +1 s de sangramento · o Espinheiro prende quem está colado |
| Espinhos | F | ⛈️ **Céu Fechado** | G | monstro que morre envenenado: 1,2% de chance por nível de um raio cair no mais perto (1,5×) | o raio envenena · +5% de chance · o raio prende 0,5 s · +5% · 2 raios |

---

## 8. Magias novas de slot

Legenda: **S1/S2/S3** = slot; ⌒ = leque; números do nível 0; toda magia nasce com a Maestria do nível 5. Por classe:
2 magias na costela nova de cada ramo (um leque e um combo), 3 Ápices, 6 de especialização e 1 magia de entrada do
slot 3. Preço: costela 300–800 (pela linha), entrada do S3 1.000, Ápice 2.000, S3 de lado 2.500. Nenhuma é grátis.

### 8.1 Cavaleiro — leques curtos e largos, de perto

| Nó | Magia | Slot | O que faz | Maestria |
|---|---|---|---|---|
| Raiz | 🌋 **Fúria do Titã** | S3 de entrada | salta até 3 tiles no ponto mirado (A8) e cai: raio 2, 2,5×, atordoa 1 s | raio 3 |
| Lâmina, costela | 🌬️ **Lâmina do Vendaval** ⌒ | S1 | corte que solta uma onda (L2) de 60°, 3 tiles: 1,4× e empurra 1 | duas ondas (a 2ª com 60%) |
| Lâmina, costela | 🩸 **Corte Hemorrágico** | S2 | 2× no monstro colado e sangra 4 s; em quem já sangrava, a **Hemorragia** sai dobrada | sangra também os colados |
| Bastião, costela | 🔰 **Muro de Escudos** ⌒ | S2 | avança o escudo num leque de 120°, 2 tiles: 1×, empurra 2 e atordoa 0,8 s | escudo de 5% por monstro atingido (até 25%) |
| Bastião, costela | 🔨 **Arremesso** | S1 | empurra o monstro colado 4 tiles; se ele bater em parede ou monstro, os dois ficam atordoados 1,5 s | o impacto fere 1,5× |
| Comando, costela | 📢 **Brado Cortante** ⌒ | S1 | grito em leque de 90°, 4 tiles: 0,6×, provoca e marca (+15% por 5 s) | enfraquece 20% por 4 s (A2) |
| Comando, costela | ⚡ **Golpe Exposto** | S2 | 2,2× no monstro colado e atordoa 1 s; se ele estiver marcado, vira **Exposto** na hora | Exposto em raio 1 |
| Lâmina, Ápice | ⚔️ **Ceifa do Campeão** ⌒ | S3 | varredura (L5) de 180°, 3 tiles, 3 passadas de 1,6× que sangram | 4 passadas |
| Bastião, Ápice | 🏰 **Baluarte** | S3 | escudo de 35% em você e nos aliados a até 3 tiles, +8 de armadura por 8 s, provoca em raio 5 | os aliados ganham a armadura também |
| Comando, Ápice | 🐎 **Carga da Legião** | S3 | aura (A3) de raio 4 por 8 s: aliados com +25% de dano e +20% de velocidade | quem entra na aura ganha escudo de 10% |
| Berserker | 🩸 **Massacre** | S3 | 8 s: o básico corta todos os colados e rouba 30% de vida | cada morte renova 1 s (até +4 s) |
| Duelista | 🗡️ **Tempestade de Lâminas** ⌒ | S3 | 5 lâminas em leque (L3) de 60°, 1,5× cada, que sangram | 7 lâminas |
| Guardião | 🤝 **Juramento do Protetor** | S3 | num aliado mirado por 10 s: 60% do dano dele vem para você e você ganha +10 de armadura | ele também ganha escudo de 20% |
| Inabalável | 🗿 **Montanha** | S3 | 6 s sem ser empurrado nem atordoado, devolvendo 100% do golpe corpo a corpo e cortando 50% do dano | ao acabar, Terremoto grátis em raio 2 |
| Senhor da Guerra | 🎺 **Grito de Reunião** | S3 | cura 30% e escudo de 20% nos aliados a até 6 tiles, que andam 30% mais rápido por 5 s | alcance 8 |
| Desafiante | ⛓️ **Correntes do Desafio** ⌒ | S3 | leque de 90°, 5 tiles: puxa todos para perto (A1) e prende 2 s | os puxados sangram |

### 8.2 Paladino — o leque é de flechas

| Nó | Magia | Slot | O que faz | Maestria |
|---|---|---|---|---|
| Raiz | 🏹 **Flecha Celeste** | S3 de entrada | atira para o alto; 1 s depois (A7) cai no ponto mirado: raio 2, 3× e ofusca 1 s | raio 3 |
| Mira, costela | 🪶 **Leque de Flechas** ⌒ | S1 | 5 flechas (L3) em 45°, 0,9× cada; colado no alvo, todas acertam | 7 flechas |
| Mira, costela | 🎯 **Flecha do Ponto Fraco** | S2 | 2,4× num alvo; em monstro marcado e sangrando, o dano dobra | marca o alvo |
| Luz, costela | ☀️ **Clarão Sagrado** ⌒ | S2 | onda de luz (L2) de 120°, 4 tiles: 1,2×, ofusca 1 s, dobro em mortos-vivos | marca os ofuscados (+15% por 4 s) |
| Luz, costela | 🌅 **Flecha da Aurora** | S1 | 1,4× e queima 3 s; em ofuscado, dispara o **Incandescer** na hora | Incandescer em raio 2 |
| Batedor, costela | 🪤 **Abrolhos** ⌒ | S1 | 3 armadilhas pequenas (A6) espalhadas num leque de 90°, 3 tiles: 50% de lentidão e sangram | 5 armadilhas |
| Batedor, costela | 🛢️ **Barril de Pólvora** | S2 | põe um barril (A12) no ponto mirado; ele explode quando levar flecha ou fogo: raio 2, 2,5× e queima | 2 barris |
| Mira, Ápice | 🎯 **Tiro do Fim do Mundo** | S3 | carrega 1 s (A4) e solta uma linha de 12 tiles que atravessa tudo: 4×, dobro abaixo de 30% da vida | carrega em 0,5 s |
| Luz, Ápice | 👑 **Coroa Solar** | S3 | 8 s: um anel de luz gira em volta de você (A9, raio 2), 0,6× em quem toca a cada 0,5 s e ofusca 0,3 s | dois anéis |
| Batedor, Ápice | 🏹 **Chuva sem Fim** ⌒ | S3 | canaliza (L4) 3 s: leque de 90°, 6 tiles, 0,5× a cada 0,3 s; anda 60% mais devagar | não deixa lento |
| Atirador de Elite | 🦅 **Disparo Fantasma** | S3 | marca os 3 monstros mais perto; 1,5 s depois cada um leva 3× | 5 monstros |
| Caçador Ágil | 🍃 **Dança do Vento** ⌒ | S3 | rola 3 tiles para trás e solta um leque de 5 flechas para a frente; 3 cargas em 6 s | 4 cargas |
| Cruzado | ✝️ **Cruz Flamejante** | S3 | cruz (A5) de 4 linhas de 5 tiles em volta de si: 2,5× e queima | linhas de 7 |
| Guardião da Luz | 🕊️ **Santuário** | S3 | zona de raio 3 por 8 s: aliados dentro levam 40% menos dano, e os monstros que entram são empurrados | raio 4 |
| Artilheiro | 💣 **Bombardeio** ⌒ | S3 | 5 explosões de raio 1 caindo em onda (L2) num leque de 60°, 6 tiles, 1,6× cada | deixam chão em chamas |
| Armadilheiro | 🕸️ **Campo Minado** ⌒ | S3 | 5 armadilhas (A6) num leque de 120°, 4 tiles: prendem 2 s e explodem 1,5× | 7 armadilhas |

### 8.3 Feiticeiro — os sopros, os raios em leque e o vapor

| Nó | Magia | Slot | O que faz | Maestria |
|---|---|---|---|---|
| Raiz | 🌀 **Vórtice Arcano** | S3 de entrada | um orbe lento (A11) anda 6 tiles na direção mirada e fere tudo pelo caminho (0,5× a cada 0,25 s) | puxa 1 tile quem toca |
| Raio, costela | 🔥 **Cusparada de Fogo** ⌒ | S1 (fogo) | onda de fogo (L2) de 60°, 3 tiles: 1,3× e queima 3 s | 90° |
| Raio, costela | ⚡ **Leque de Raios** ⌒ | S2 (energia) | 3 raios (L3) em 60°, 1,4× cada; cada um salta 1 vez | 5 raios |
| Gelo, costela | 🌨️ **Sopro Gélido** ⌒ | S2 (gelo) | canaliza (L4) 2 s: leque de 60°, 4 tiles, 0,4× a cada 0,25 s, lentidão que cresce; 1,5 s seguidos congelam | no fim, Estilhaça os congelados |
| Gelo, costela | 💨 **Choque Térmico** | S1 (fogo e gelo) | 1,2× num alvo: queima **e** deixa lento; em quem já tinha um dos dois, dispara o **Vapor** | Vapor em raio 2 |
| Trevas, costela | 🌑 **Lamento Sombrio** ⌒ | S1 (trevas) | onda (L2) de 120°, 3 tiles: 1,1× e rouba 15% de vida | enfraquece 20% por 3 s (A2) |
| Trevas, costela | 💀 **Sentença** | S2 (trevas) | 1,8× num alvo; em marcado, a **Condenação** sai dobrada | marca os colados |
| Raio, Ápice | 🌩️ **Relâmpago Ramificado** ⌒ | S3 (energia) | linha de 7 tiles que, no fim, se abre em 3 linhas de 4 tiles em leque; 2,4× | 5 linhas |
| Gelo, Ápice | 🧊 **Era do Gelo** | S3 (gelo) | zona de raio 4 por 6 s: 70% de lentidão e congela a cada 2 s; no fim, Estilhaça (2×) | raio 5 |
| Trevas, Ápice | 🕳️ **Buraco Negro** | S3 (trevas) | no ponto mirado, puxa (A1) os monstros a até 3 tiles para o centro por 2 s e explode (3×) | puxa a até 4 tiles |
| Tempestuoso | ⛈️ **Olho da Tempestade** | S3 (energia) | 8 s: suas magias de energia saltam +2, e um raio (1×) cai num monstro perto a cada segundo | 12 s |
| Piromante | 🐉 **Hálito do Dragão** ⌒ | S3 (fogo) | canaliza (L4) 3 s: leque de 90°, 5 tiles, 0,6× a cada 0,25 s, queima e deixa o chão em chamas | 120° |
| Criomante | 🏔️ **Avalanche** ⌒ | S3 (gelo) | onda (L2) de 90°, 6 tiles: 2× e congela 2 s; em quem já estava congelado, Estilhaço | congela 3 s |
| Arcanista | 🌀 **Fenda Arcana** | S3 | teleporta até 5 tiles e explode (1,8×) no ponto de saída e no de chegada; 2 cargas | 3 cargas |
| Necromante | 💀 **Exército dos Mortos** | S3 | 4 esqueletos por 20 s | 6 esqueletos |
| Bruxo | 👁️ **Olhar do Abismo** ⌒ | S3 (trevas) | leque de 60°, 6 tiles: marca +30% e enfraquece 30% (A2) por 6 s | 90° |

### 8.4 Druida — vento, pólen, espinhos e borboletas

| Nó | Magia | Slot | O que faz | Maestria |
|---|---|---|---|---|
| Raiz | 🦋 **Revoada** ⌒ | S3 de entrada | 12 borboletas saem num leque de 120° e voltam (A10): na ida ferem 0,4×, na volta curam 2% cada aliado que tocam | 18 borboletas |
| Matilha, costela | 🐺 **Rugido da Alcateia** ⌒ | S1 | leque de 90°, 3 tiles: 0,8× e empurra 1; suas criaturas atacam 30% mais rápido por 4 s | as criaturas curam 10% |
| Matilha, costela | 🦴 **Caça em Bando** | S2 | marca um monstro: suas criaturas correm até ele com +50% de dano nele; se ele estiver preso, vira **Espinheiro** | dura o dobro |
| Bosque, costela | 🌸 **Brisa de Pólen** ⌒ | S2 | onda (L2) de 120°, 5 tiles: cura 20% os **aliados** no leque e tira veneno; os monstros ficam 30% lentos | +10% de escudo nos aliados |
| Bosque, costela | 🌱 **Broto Duplo** | S1 | semente no chão: o aliado que pisa cura 15%; o monstro que pisa fica preso 1,5 s | 2 sementes |
| Espinhos, costela | 🌵 **Rajada de Espinhos** ⌒ | S1 | 6 espinhos (L3) em 60°, 0,7× cada, que sangram (e envenenam com a Toxina) | 8 espinhos |
| Espinhos, costela | 🌿 **Abraço do Espinheiro** | S2 | prende em raio 2 por 2 s; quem já estava envenenado vira **Espinheiro** | raio 3 |
| Matilha, Ápice | 🐾 **Caçada Selvagem** | S3 | 3 lobos e 1 urso por 12 s, todos com +20% de dano | 15 s |
| Bosque, Ápice | 🌳 **Árvore da Vida** | S3 | planta uma árvore (zona de raio 3 por 12 s) que cura 5% por segundo os aliados dentro | quem entra ganha 10% de escudo |
| Espinhos, Ápice | 🍂 **Furacão de Folhas** ⌒ | S3 | canaliza (L4) 3 s: leque de 90°, 5 tiles, 0,5× a cada 0,3 s e empurra 1 tile | prende 0,5 s a cada pulso |
| Mestre das Feras | 🦁 **Rei da Selva** | S3 | um leão por 25 s que provoca e ruge (atordoa 1 s em raio 2 a cada 6 s) | 2 leões |
| Metamorfo | 🐲 **Forma Primordial** ⌒ | S3 | forma animal por 10 s: o básico vira um sopro em leque de 60°, 3 tiles (6.4) | 90° |
| Círculo da Vida | 🌰 **Floresta Eterna** | S3 | semente (como o Renascer) em todos os aliados a até 5 tiles por 15 s | 25 s |
| Guardião da Natureza | 🌲 **Muralha de Carvalhos** | S3 | parede de 5 tiles por 8 s (a da Muralha Mágica) que cura 3% por segundo os aliados colados | 7 tiles |
| Peste | ☠️ **Pandemia** | S3 | veneno forte num alvo que pula para todos a até 3 tiles a cada 2 s, por 10 s | acumula 2 vezes |
| Tempestade | ⛈️ **Tempestade em Leque** ⌒ | S3 | canaliza (L4) 3 s: um raio (1,4×) a cada 0,3 s num monstro do leque de 90°, 6 tiles | os raios empurram 1 tile |

### 8.5 Contagem

| | Cavaleiro | Paladino | Feiticeiro | Druida | Total |
|---|---|---|---|---|---|
| Magias de costela nova (S1/S2) | 6 | 6 | 6 | 6 | 24 |
| Magias do slot 3 (entrada + Ápices + lados) | 10 | 10 | 10 | 10 | 40 |
| **Magias novas** | **16** | **16** | **16** | **16** | **64** |
| … das quais em leque | 6 | 7 | 7 | 7 | 27 |
| Dons | 12 | 12 | 12 | 12 | 48 |
| Magias por classe (hoje → depois) | 31 → 47 | 27 → 43 | 28 → 44 | 29 → 45 | 115 → 179 |

### 8.6 Ouro que cabe numa classe (só o que é novo)

| Item | Ouro |
|---|---|
| 12 Dons até o 25 | ~96 mil |
| Áureas até o 20 (velocidade até o 6) | ~43 mil |
| 3 Tomos até o 20 | ~65 mil |
| Magias novas (6 de costela, entrada do S3, 3 Ápices, 3 S3 do lado escolhido) | ~18 mil |
| **Total novo por classe** | **~220 mil** (as 4 classes: ~890 mil) |

O total é propositalmente inalcançável: o ouro de qualquer jogador sempre tem destino. O que importa para a validação
é o começo: nas primeiras 20 hunts (~2.200 de ouro), o jogador novo compra ~10 níveis de Dom e 2–3 magias, ou seja,
alguma compra quase toda hunt.

---

## 9. Mudanças técnicas (resumo)

| Onde | Mudança |
|---|---|
| `packages/shared/src/spells.ts` | slot 2; formas L1–L5; peças A1–A12; 64 magias e Maestrias; `spellFacts` descreve as formas |
| `packages/shared/src/reactions.ts` (novo) | tabela das reações, estado congelado, força base |
| `packages/shared/src/gifts.ts` (novo) | catálogo dos 48 Dons (por nível, marcos, tema); `giftBonuses(ranks)` |
| `packages/shared/src/talents.ts` | `kind: "gift"`; lanes e linhas novas (até X); regra dos 20 níveis de Áureas/Tomos; preços do S3 |
| `apps/server/src/hunt.ts` | formas de leque (canalizar com tique de 250 ms), reações, gatilhos, básico transformado, Dons lidos ao entrar; estado novo da canalização e das reações em `INTERNALS` (troca de anfitrião); nada de `process`/`node:*` |
| `apps/server/src/state.ts` | `Player.spell3`, `Player.channel` (para o cliente desenhar o sopro), estado congelado no monstro |
| `apps/client/src/fx.ts`, `aim.ts`, `DungeonScene.ts` | família sopro, mira com ângulo, desenho das reações (ícone curto sobre o monstro) |
| `apps/client/src/menu.ts` | linhas até X, hexágono do Dom, ficha com "Nv x/25" e marcos, botões +1/+5 |
| Supabase | migration por fase: Dons, magias, `max_rank`/`cost_growth` de Áureas e Tomos, `buy_talent_levels`, `record_spell_xp` com 3 magias; advisors depois de cada uma |
| Telemetria | `reactions`, `channelMs`, `coneHits` (monstros por leque), `gifts` (níveis da conta na hunt), `giftDamage`/`giftHeal`, `slot3Casts`; view `telemetry_grimoire` com chegada ao nível 12 |
| Testes | arena (`scripts/arena.ts`) para as formas, reações, gatilhos e Dons (`efeitos.ts` e teste novo `dons`); `ativas`, `magiaxp`, `bots` com o 3º slot; testes novos entram em `SUITES` |

---

## 10. Fases

Cada fase é um PR que vai sozinho para produção (`npm run check` e CI verdes). Ordem pensada para entregar valor ao
jogador em cada passo e não deixar código sem uso.

| Fase | Entrega | Depende de | Tam. | Por que nesta ordem |
|---|---|---|---|---|
| **1. Passivas de ouro** ✅ | `kind: "gift"`, os **12 Dons do topo** com o efeito por nível, Áureas e Tomos até 20, `buy_talent_levels`, menu, migration, teste `dons` | — | M–G | resolve o ouro parado já; não depende de nada |
| **2a. Motor de leque** ✅ | L1 (abertura), L2 (onda), L3 (projéteis em leque), desenho de sopro, mira com ângulo, o desenho novo das 3 magias de leque atuais e as **11 magias em leque** das costelas novas que só dependem disso | — | G | é o pedido mais visível; as magias dão uso ao motor desde o primeiro PR |
| **2b. Canalizar** ✅ | L4 (canalizar, o "cuspir fogo" de segurar e arrastar), A6 (várias armadilhas), Sopro Gélido e Abrolhos | 2a | M | completa as 13 magias de leque das costelas |
| **3a. Slot 3** ✅ | abrir o slot (5.2) e as 4 magias de entrada | 2 | M | o botão já estava reservado |
| **3b. Ápices e Dons do fundo** ✅ | os 12 Ápices (peças A1, A3, A4, A5, A9 e a varredura L5 que eles usam) e os 12 **Dons do fundo** (pedem o Ápice) | 3a | G | os Ápices de leque precisam da fase 2 |
| **4. Reações e gatilhos** (4a ✅: reações, congelado e os 120 marcos) | reações, estado congelado, gatilhos, básico transformado, os 24 **Dons da costela de passivas** e os **marcos** dos 48 Dons | 1 | G | os marcos e as magias de combo dependem disso |
| **5. Costelas novas** | as 24 magias de costela (leque + combo), peças A6, A10, A12 | 2, 4 | M | combos precisam das reações |
| **6. S3 de especialização** | as 24 (6 por classe), nas 4 classes juntas e com os dois lados de cada ramo juntos (escolha permanente) | 3 | G | por sistema, como as outras fases |
| **7. Balanceamento** | `/balanceamento` com a telemetria nova: preço dos Dons e números das magias | 1, 3 | contínuo | — |

**Fase 1, como foi entregue:** entraram os 12 Dons do topo (um por ramo), não os 48. Os outros 36 dependem de peças que
ainda não existem e ficariam à venda sem fazer nada: os da costela de passivas são de combo (reações), de gatilho ou de
ataque básico transformado (fase 4), e os do fundo pedem o Ápice como pai (fase 3). Diferenças em relação ao resto do
plano:
- o Dom do topo fica na **linha II, do lado oposto ao Tomo** (o Dom e o Tomo saem do mesmo nó do tronco), em vez da
  linha I: no mesmo nível do pai, o galho do desenho dava uma volta para cima;
- Couro Curtido dá +0,6 de armadura por nível (não 0,8);
- Voz de Comando: entre vários heróis com o Dom, vale a voz mais forte (não somam), como a Liderança;
- no modo de testes com o Grimório inteiro (`KUSA_ALL_SPELLS`), as passivas de gold ficam no teto de antes (áureas e
  Tomos no 3, sem Dons), para os números dos testes antigos não mudarem;
- telemetria: `stats.passives` (níveis dos Dons, áureas e Tomos que o herói levou); o dano que vem de cada Dom ainda
  não é separado (fica para o balanceamento, se precisar);
- banco: `20261102000000_dons_e_passivas_20_niveis.sql` (Dons, `max_rank`/`cost_growth` de áureas e Tomos e
  `buy_talent_levels`); os marcos ficam para a fase 4.

**Fase 2a, como foi entregue:** o motor de leque entrou junto com as 11 magias das costelas novas que só dependem dele
(sem código sem uso). Diferenças em relação à seção 8:
- só a magia em leque de cada costela nova; a magia de combo da mesma costela entra com as reações (fase 5);
- posições: Lâmina do Vendaval sai do Golpe Esmagador, Muro de Escudos do Escudo da Fé, Brado Cortante da Áurea da
  Disciplina, Leque de Flechas do Disparo Perfurante, Clarão Sagrado da Luz Curativa, Cusparada de Fogo do Relâmpago (e o
  Leque de Raios dela), Lamento Sombrio da Áurea da Égide, Rugido da Alcateia do Lobo Espiritual, Brisa de Pólen da
  Mariposa Curandeira, Rajada de Espinhos do Espinho Venenoso;
- Maestrias trocadas por efeitos que já existem: Muro de Escudos dá escudo de 20% (não 5% por monstro), Brado Cortante e
  Lamento Sombrio não enfraquecem (A2 ainda não existe): lentidão de 30% e roubo de 25%; Brisa de Pólen cura 30%;
- onda: cada passo atinge todos os anéis por onde a onda já passou (o monstro que vinha na direção do herói escapava);
- telemetria: `stats.fanHits`; teste novo `leque`; migration `20261102030000_magias_em_leque.sql`.

**Fase 2b, como foi entregue:** canalizar (L4) e várias armadilhas (A6), com o Sopro Gélido e os Abrolhos. A varredura
(L5) foi para a fase 3, junto com a única magia que a usa (Ceifa do Campeão). Diferenças:
- mensagem nova `MSG.channel` (girar o leque e soltar): muda `messages.ts`, então a `RULES_VERSION` muda e os clientes
  antigos recarregam;
- Sopro Gélido: em vez de "lentidão que cresce", 40% de lentidão a cada pulso e congelar depois de 6 pulsos seguidos
  (Maestria: 4); o Estilhaçar do Criomante solta o congelado no pulso seguinte (combo de propósito);
- Abrolhos saem da Áurea Sagrada (Batedor), não da Chuva de Flechas;
- migration `20261102040000_canalizar_e_abrolhos.sql`.

**Fase 3a, como foi entregue:** o slot 3 abre no nível 12 com as 4 magias de entrada. Diferenças:
- três delas usam peças que já existiam: Fúria do Titã (salto + área no pouso), Vórtice Arcano (linha em onda, em vez do
  projétil lento A11) e Revoada (leque em onda com cura nos aliados e roubo de vida, em vez do bumerangue A10); só a
  Flecha Celeste pediu peça nova, pequena (`delayMs`, a A7);
- sem nenhuma magia do slot 3 comprada, o botão mostra 📖 "Grimório" e não abre uma escolha vazia;
- o **Xamã Orc** (classe que entrou hoje, fora deste plano) ainda não tem magia de slot 3: o slot fica com o aviso;
- banco: `record_spell_xp` guarda 3 magias por hunt; migration `20261102050000_slot_3.sql`; teste novo `slot3`.

**Fase 3b-1, como foi entregue:** 10 Ápices e a magia de entrada do slot 3 do Xamã (Totem Ancestral). Peças novas:
varredura (L5, `sweep`), aura que anda (A3, `aura`, que renova o `rally` do Xamã a cada 0,5 s em quem está perto),
puxar para o centro (A1, `pullIn`), galhos no fim da linha (`fork`), segunda invocação (`alsoSummon`) e lentidão nos
campos. Diferenças: Baluarte provoca no raio do escudo (4) e a Maestria aumenta o escudo (a armadura nos aliados pede
outra peça); Carga da Legião dá ritmo de ataque, não velocidade de movimento (é o bônus do Tambor); Era do Gelo não
estilhaça no fim; Caçada Selvagem não tem o +20% de dano (a Maestria aumenta a duração). Os Ápices ficam na linha VI,
lane 2, e pedem só a última magia do tronco (os Dons da costela de passivas, que o plano punha como pai, são da fase 4).
Ficam para a 3b-2: Tiro do Fim do Mundo (A4), Coroa Solar (A9) e os 12 Dons do fundo.

**Fase 3b-2, como foi entregue:** os Ápices de Mira e Luz do Paladino. Tiro do Fim do Mundo: o "carregar" (A4) saiu
da soma de duas peças que já existiam, o atraso (`delayMs`) e ficar parado (`selfBuff.rooted`), que agora vale já na
carga. Coroa Solar: peça nova órbita (A9, `orbit`), um anel que pulsa em volta do herói e anda com ele; pega de 1 a 2
tiles (o plano dizia raio 2, mas o monstro colado no paladino escapava), Maestria até 3 tiles. Os 12 Dons do fundo
viram a fase 3b-3 (cada um é um gatilho próprio no servidor).

**Fase 3b-3, como foi entregue:** os 12 Dons do fundo, na linha VII embaixo de cada Ápice (mesma lane), pedindo o
Ápice no nível 1 (como todo nó; a magia comprada fica no nível 0 até ser usada). Seguem a tabela da seção 7 no gatilho
e no número por nível, com estas diferenças: Estandarte Vivo é uma aura fixa de 3 tiles (soma com o Tambor, vale o maior
entre os cavaleiros), sem a peça A3; Mão Rápida queima por 0,4× do básico por segundo (o plano não dava o número);
Reserva Gélida confere a mana depois de cada magia; Instinto soma a mordida no próprio golpe (sem lobo desenhado);
Ciclo cura na hora em volta do druida (raio 1), sem a semente no básico, que é o básico transformado da fase 4. O
Ossuário levanta esqueletos que contam como criaturas do Buraco Negro (força pelo nível dele). Telemetria nova:
`stats.giftProcs`. Os marcos continuam para a fase 4.

**Fase 4a-1, como foi entregue:** a fase 4 saiu em partes: 4a-1 (reações e estado congelado), 4a-2 (marcos dos Dons que
já existem) e 4b (básico transformado e os 24 Dons da costela de passivas). Entraram as 8 reações da seção 6.2 em
`packages/shared/src/reactions.ts`, conferidas em `Hunt.damageMonster` a cada golpe direto (o pulso do dano contínuo e a
explosão de outra reação não reagem: sem cadeia), e dois estados novos no monstro: **congelado** (preso por magia de
gelo, desenhado como bloco de gelo) e **ofuscado** (atordoado por magia de luz, sem desenho próprio). A magia que prende
e fere passa os estados de antes dela, para não reagir consigo mesma. Diferenças: Espinheiro sangra na hora (3 pulsos
do veneno) em vez de 3 s, porque o monstro só guarda um dano contínuo e o sangramento apagaria o veneno; a Brasa Tóxica
queima os vizinhos (0,25× do golpe por segundo, 2 s) em vez de uma nuvem no chão; Hemorragia dispara em todo empurrão
e atordoamento de herói ou criatura. As explosões usam o golpe que disparou como base (0,8× ou 1×), não o dano do
herói: assim vale igual para magia, básico, criatura e campo. Telemetria: `stats.reactions`. Regras em Configurações ›
Regras › Reações.

**Fase 4a-2 (Cavaleiro), como foi entregue:** os marcos saem por classe, um PR por classe. Os 30 do Cavaleiro seguem a
tabela da seção 7.5, com estas diferenças: Voz de Comando, marco 2, "provocar dura +1 s" virou "magias de área que
provocam alcançam +1 tile" (a provocação não tem duração no motor: o monstro segue quem provocou até outro provocar);
o 4º golpe do Fio Temperado conta golpes corpo a corpo dados, acertando ou não o mesmo alvo; o leque do Fio Temperado tem
1 tile de alcance (o corte em volta do alvo); os escudos +10% do Couro Curtido valem como absorção (cada ponto de escudo
segura 1,1), para valer em todo escudo do jogo sem mexer em cada magia. Os Dons do Xamã Orc (iguais aos do Cavaleiro no
efeito) ainda não têm marcos.

**Fase 4a-2 (Paladino), como foi entregue:** os 30 marcos seguem a tabela, com estas diferenças: Olhar Paciente usa
alcance inteiro (+1 tile no marco 1, em vez de +0,5 nos marcos 1 e 3) e o marco 3 encurta a recarga do atordoar (10 s →
6 s); a explosão da Mão Rápida dá 0,5× do básico (o plano não dava o número) e o chão em chamas queima 0,2× por segundo;
o tiro calmo do Passo de Rastreador sai uma vez a cada 3 s sem apanhar; "rolar devolve 10% da recarga do slot 1" tira
10% da recarga inteira da magia do slot 1 (o Rolamento, quando ele está lá).

**Fase 4a-2 (Feiticeiro), como foi entregue:** os 30 marcos seguem a tabela, com estas diferenças: "Estática/Combustão
+5%" soma 5 pontos na chance da Estática e 5% no dano da Combustão; a marca dos esqueletos do Ossuário é de +10% por
3 s (o plano não dava o número) e a explosão ao sumir conta como a reação Condenação (1× do dano do esqueleto, raio 1);
"a próxima dura +30%" do Circuito vale para raiz, atordoar, lentidão, dano contínuo, marca e campo da magia carregada.

**Fase 4a-2 (Druida), como foi entregue:** os 30 marcos seguem a tabela, com estas diferenças: os marcos do Ciclo valem
para a onda de cura da fase 3b-3 (não há semente no básico): a semente que prende vira raiz nos monstros a até o raio da
onda e o escudo de 5% vai para quem a onda cura; "+1 lobo no Chamado da Matilha" vale para toda invocação de lobos;
"criaturas roubam 3% de vida" cura a própria criatura; a mordida do Instinto em forma animal sai depois do golpe da
forma, como um golpe à parte. Com o lote do Druida, a fase 4a-2 fecha os 120 marcos das 4 classes do plano; os Dons do
Xamã Orc continuam sem marcos (entram quando o Grimório dele tiver Ápices).

**Fase 4b (Cavaleiro), como foi entregue:** os 6 Dons da costela de passivas do Cavaleiro, com o efeito por nível e os
5 marcos de cada, um PR por classe como na 4a-2. Ficam nas linhas VI e VII, lane -2 (do outro lado do Ápice): o da VI
pede a ponta do tronco no nível 1, o da VII pede o da VI. Diferenças: o marco 4 da Bigorna ("o impacto conta como
atordoar para a Hemorragia") já valia desde a 4a-1 (todo atordoar dispara a Hemorragia) e virou "atordoa também o monstro
de trás"; o Exposto não tem duração própria (vale enquanto marca e atordoar duram), então o "+1 s" da Ordem de Execução
é um tempo de graça depois do atordoar acabar. O básico transformado (Dons B da costela de outras classes) entra junto
com o lote de cada classe.

**Fase 4b (Paladino), como foi entregue:** os 6 Dons da costela do Paladino. A Aljava Larga é o primeiro básico
transformado: a cada tantos básicos à distância, sai junto um leque de flechas mais fracas (cada uma voa e pode errar,
como o básico). A Vela Votiva é um campo (zona de raio 1) que fere, ofusca e dá armadura aos aliados nos marcos; ela não
conta para os Estrepes Afiados. O Exposto agora só vale para monstro que foi atordoado de fato (o tempo de graça dos
marcos não conta para quem nunca foi atordoado).

As fases 1 e 2 mexem em arquivos diferentes na maior parte (`gifts.ts`/`talents.ts`/menu x `spells.ts`/`fx.ts`/`aim.ts`)
e podem correr em paralelo, cada uma na sua branch, com `git fetch` e merge do `main` antes do PR (regra do `CLAUDE.md`).

---

## 11. Como medir

| Métrica | Meta |
|---|---|
| Ouro parado (mediana do saldo das contas ativas) | cair semana a semana depois da fase 1 |
| Compras por conta nova nas primeiras 10 hunts | ≥ 5 |
| Dom mais comprado por classe | < 30% dos níveis comprados da classe (nenhum Dom obrigatório) |
| Uso do slot 3 em quem chega ao 12 | ≥ 2 lançamentos por hunt |
| Leque | `coneHits` médio ≥ 2 monstros por lançamento (senão o leque não vale a forma) |
| Reações | ≥ 1 reação por hunt em quem tem um Dom de combo no nível 5+ |
| Diferença de dano entre conta nova e veterana na mesma classe e mapa | registrar a partir da fase 1; alvo de ~3× no máximo (7.2) |

---

## 12. Riscos

| Risco | Mitigação |
|---|---|
| **Escopo** (64 magias, 48 Dons, 3 sistemas novos) | 7 fases independentes; a fase 1 sozinha já resolve o ouro; cortes em ordem: Coroa Solar (órbita), Vórtice Arcano (projétil lento), Barril de Pólvora |
| **Veterano 3× mais forte que novato** (decidido) | é a progressão desejada; o risco é o grupo misto: efeitos condicionais, mapas ★ altos para o veterano, métrica de diferença (seção 11) |
| **Reações confusas** | só 8, com ícone curto sobre o monstro quando acontecem; descritas em Configurações › Regras e no Catálogo |
| **Canalizar no celular** | toque rápido sai para a frente; segurar e arrastar gira; canalização curta (2–3 s); testar em 412×915 e 915×412 |
| **Tela poluída e desempenho** | um sopro por herói; rastro de 0,5 s; tique de 250 ms; medir o tick com 4 jogadores (lembrar do #219, lag na Fortaleza) |
| **Árvore não cabe** | linhas até X com rolagem vertical (já existe); lanes ±2 livres nas linhas VI–X; conferir em 360×780 |
| **Preço errado** (7 contas na amostra) | a curva é dado do banco: ajustar é uma migration de `base_cost`/`cost_growth` |
| **Hunt solo lê os Dons no aparelho** | igual ao `spellBonuses` de hoje: muda força, não recompensa |
| **Câmera** | proibido tremer (GDD, "Plataforma"): o peso vem do chão marcado e do recuo dos monstros |

---

## 13. Fora deste plano

- Magias que usam o terreno (água conduz raio, grama pega fogo): ficaram fora por decisão.
- Runas que liberam magias no slot 3: só depois que o slot 3 tiver dados.
- Respec de Dons: não há escolha a desfazer (os Dons não se excluem).

---

## 14. Decisões

Todas as decisões em aberto foram respondidas pelo Leonardo em 01/11/2026 (seção 2, itens 10 a 17). Não há decisão
pendente para começar a fase 1.
