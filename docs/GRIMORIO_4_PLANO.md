# Grimório 4.0 — leques, slot 3 e Dons (passivas de ouro)

Plano para (1) dar ao ouro um destino que nunca acaba, (2) criar as magias do **slot 3**, (3) trazer as magias em
**leque** a partir do herói e (4) aprofundar e ramificar a árvore das 4 classes. Continua o `GRIMORIO_PLANO.md` (2.0,
especializações) e o `GRIMORIO_GALHOS.md` (3.0, costelas, sinergias, Tomos): nada do que existe é removido e os ids
comprados no banco continuam valendo. Quando uma fase for entregue, o `GDD.md` passa a descrever o que vale e este
arquivo marca a fase como feita.

**Andamento:** só planejamento. Decisões em aberto na seção 10.

---

## 1. Resumo executivo

| | Hoje | Proposta |
|---|---|---|
| Magias por classe | 27–31 (115 no jogo) | 39–43 (+12 ou 13 por classe, 49 no jogo) |
| Magias em leque | 3 (Corte Largo, Barragem, Cone de Frio), desenhadas como tiles acesos | +26 (13 nos slots 1 e 2, 13 no slot 3), com 5 formas novas de leque e um desenho de sopro |
| Magias do slot 3 | 0 (o slot ainda não existe) | 9 por classe (3 do tronco + 6 das especializações, das quais o jogador fica com 6) |
| Passivas que não ocupam slot | Áureas (2–3 níveis), Tomos (3), Traços (1) | + **Dons**: 6 por classe, **25 níveis** cada, comprados só com ouro |
| Ouro para fechar o Grimório de uma classe | ~28–31 mil, quase tudo de compra única | + ~48 mil em Dons por classe (~190 mil nas 4) |
| Nível das magias de slot | sobe com o uso (XP), 0 a 5 | **não muda**: continua só por XP |

**Regra de ouro do plano:** ouro compra **acesso** (magia nova, uma vez) e **passiva** (Dons, muitos níveis); a
**força da magia de slot** vem só do uso (XP). Assim, gastar ouro nunca substitui jogar com a magia.

**Ordem recomendada:** Dons primeiro (resolvem o ouro parado e não dependem do slot 3), depois o motor de leque com as
magias de leque dos slots 1 e 2, e por último as magias do slot 3, uma classe por PR, quando o slot estiver no `main`.

---

## 2. Diagnóstico com os dados de produção (01/11/2026)

### 2.1 Por que sobra ouro

| Dado | Valor |
|---|---|
| Hunts registradas | 560 (321 em sala, 239 solo) |
| Ouro por hunt | média ~110, p90 ~450 |
| Contas com ouro | 7 perfis; a maior tem **7.888** de ouro e 438 hunts |
| Nós comprados pela maior conta | 51 de 167 (as 4 classes) |
| O que essa conta **poderia** comprar agora | 28 nós, ~6.600 de ouro só em nós novos |

Leitura: o ouro não sobra por falta de coisa para comprar. Sobra porque **o que falta comprar não parece valer a pena**:

1. **Magia nova vai para o banco de reservas.** Com 2 slots e até 3 magias ativas por slot, a 10ª magia de um slot quase
   nunca entra na hunt. Comprar mais uma delas é gastar em algo que não aparece (o mesmo problema que o
   `GRIMORIO_GALHOS.md` 3.1 já apontava).
2. **O resto está travado por XP.** Cada nó pede o pai no nível 1 de uso; os nós fundos esperam a magia de cima ser
   usada, e o ouro espera junto.
3. **Tudo o que vale sempre (Áureas, Tomos, Traços) é curto:** 2 a 3 níveis e acaba. Depois disso, não há onde pôr
   ouro que deixe o herói mais forte em toda hunt.

Consequência para o design: **mais magias de slot, sozinhas, não resolvem o ouro.** O ralo de ouro precisa ser passivo
(vale em toda hunt, sem slot) e longo (muitos níveis). Por isso os Dons são a primeira fase.

Ressalva: a amostra é pequena e quase todo o ouro parado é de uma conta (provavelmente de teste e desenvolvimento). A
curva de preço dos Dons (seção 5.3) foi feita para o jogador **médio** (~110 por hunt), não para essa conta.

### 2.2 As magias em leque já existem, mas não parecem leque

O motor tem `shape: "cone"` (`coneTiles` em `packages/shared/src/spells.ts`: 90° de abertura, cortado por parede) e
três magias o usam: **Corte Largo** (Cavaleiro, costela, 2 tiles), **Barragem** (Paladino, só o Artilheiro) e **Cone de
Frio** (Feiticeiro, só o Criomante). Por que ninguém percebe:

- duas das três ficam atrás de uma especialização permanente, e a terceira tem só 2 tiles;
- o efeito na tela (`showCone` em `DungeonScene.ts`) só acende os tiles do leque de uma vez: não há nada **saindo** do
  herói, então o leque parece uma área qualquer no chão;
- a abertura é sempre 90° e o efeito é instantâneo: não existe sopro, rajada nem varredura.

Conclusão: o caminho é barato. O cálculo dos tiles existe; faltam **formas** de leque (abertura, ondas, projéteis
espalhados, canalizar) e um **desenho** que saia do herói.

---

## 3. Formas de leque novas (motor)

Todas partem do herói, na direção mirada pelo arrasto (no toque rápido, na direção do alvo travado ou do monstro mais
perto), usam a mesma conta de tiles no cliente e no servidor e respeitam parede. Tamanho: **P** = até 1 dia,
**M** = 2–3 dias, **G** = 1 semana ou mais (com o desenho).

| # | Forma | Campo novo no `SpellDef` | O que faz | Tam. |
|---|---|---|---|---|
| L1 | **Abertura variável** | `coneAngle` (graus; padrão 90) | leques de 45° (estreito e longo) a 180° (meia-lua) | P |
| L2 | **Onda** | `wave: { stepMs }` | o leque cresce do herói para fora, um anel de tiles a cada `stepMs`: quem está na ponta é atingido depois, e o desenho é um sopro que avança | P |
| L3 | **Projéteis em leque** | `spread: { count, angle }` | `count` tiros espalhados no ângulo, cada um voa reto e pode errar (`shotPath`); colado no monstro, todos acertam o mesmo (espingarda) | M |
| L4 | **Canalizar** | `channel: { ms, tickMs, moveSlow }` | o efeito do leque se repete a cada `tickMs` por `ms` enquanto o herói anda mais devagar; **o leque segue a direção do arrasto** (ou do alvo travado, no toque rápido). Soltar o dedo ou tocar de novo encerra. É o "cuspir fogo" | M |
| L5 | **Varredura** | `sweep: { ms }` | um golpe que corre de uma borda do leque à outra em `ms` (cada tile é atingido quando a lâmina passa) | P (depois da L2) |

Peças de apoio que algumas magias novas pedem (fora do leque):

| # | Peça | Campo | Tam. | Usado por |
|---|---|---|---|---|
| A1 | Puxar em área | `pull` aceita área (puxa todos para perto de quem conjura ou para o ponto mirado) | M | Correntes do Desafio, Buraco Negro |
| A2 | Enfraquecer | `weaken: { pct, ms }`: monstro causa menos dano | P | Olhar do Abismo, Brado Cortante (Maestria) |
| A3 | Aura que anda com o herói | `aura: { radius, ms, allyDamage?, allyHaste?, allyArmor? }` (como o Estandarte, mas preso ao herói) | M | Carga da Legião, Olho da Tempestade |
| A4 | Carregar antes de soltar | `windupMs` (o herói para, a mira aparece no chão para todos) | M | Tiro do Fim do Mundo |
| A5 | Forma em cruz | `shape: "cross"` (4 linhas) | P | Cruz Flamejante |
| A6 | Várias armadilhas de uma vez | `field.count` espalhadas no leque | P (usa o campo que já existe) | Campo Minado, Abrolhos |
| A7 | Campo que anda | `field.moveTiles` | G | Tornado (**candidato a corte**) |

**Desenho (o gargalo real, como no plano 2.0):** uma família nova no `fx.ts`, **sopro**, parametrizada pela `color` e
pelo `element`: partículas saindo do herói, abrindo no ângulo do leque e avançando com a onda; o tile acende **quando a
onda chega**, não antes. A mesma família desenha as 3 magias de leque que já existem (sem mudar os números delas).
Projéteis em leque usam o desenho de projétil atual, N vezes. Nada de tremor de câmera: o peso vem do chão chamuscado,
congelado ou rachado onde o sopro passou (rastro de 0,5 s).

**Mira no celular (retrato e deitado):** a mira em leque já acende os tiles (`aim.ts`); com a L1 ela passa a usar o
ângulo da magia. Para canalizar (L4): segurar o botão e arrastar gira o leque; soltar encerra. No toque rápido, o leque
segue o alvo travado (ou o monstro mais perto) sozinho, então dá para jogar só com o polegar esquerdo andando. Testar em
412×915 e 915×412.

---

## 4. Estrutura nova da árvore

```
 linha               [ raiz ]
  I     Dom do ramo ◇──●── Áurea / Tomo
  II–V        tronco e costelas de hoje
  IV–V   costela nova:  ● magia em leque ── ◇ Dom de costela
  V–VI   ponta do tronco ──── ★ Ápice do ramo (slot 3, para os dois lados)
  VI–VIII      ✦ Traço A          ✦ Traço B
               ● S1  ● S2         ● S1  ● S2       (já existem)
  IX           ★ S3 do lado A     ★ S3 do lado B   (novo)
```

Por ramo, entram 4 nós novos (+2 na especialização):

| Nó novo | Onde | Pede | Preço |
|---|---|---|---|
| ◇ **Dom do ramo** | linha I, ao lado da Áurea/Tomo | o primeiro nó do tronco (comprado) | curva dos Dons (5.3) |
| ● **Magia em leque** (slot 1 ou 2) | costela nova, linhas IV–V | o nó do tronco onde a costela nasce, no nível 1 de uso | 500–800 (tabela atual) |
| ◇ **Dom de costela** | ponta da costela nova | a magia em leque **comprada** (não pede XP) | curva dos Dons |
| ★ **Ápice do ramo** (slot 3) | costela que nasce na ponta do tronco | a última magia do tronco no nível 1 | 2.000 |
| ★ **S3 de cada lado** | linha IX, embaixo da magia S2 do lado | a S2 do lado no nível 1 | 2.500 |

- **Os Dons só pedem compra, nunca XP.** É de propósito: o ouro sempre tem para onde ir, desde a primeira hunt.
- **O Ápice fica fora da especialização**, para quem ainda não escolheu o lado já ter uma magia de slot 3.
- **Por classe:** +3 magias em leque, +3 Ápices, +6 S3 de especialização, +6 Dons. O jogador tem acesso a 3 + 3 + 3 = 9
  magias novas de slot e aos 6 Dons (o outro lado de cada especialização fica fechado, como hoje).
- **Layout:** as linhas novas (IX) e a costela nova precisam caber nas 5 colunas (lanes −2 a 2) sem cruzar galhos.
  Conferir ramo a ramo antes do PR; onde a costela nova colidir, ela troca de lado.

---

## 5. Dons: passivas de ouro com 25 níveis

### 5.1 Regras

- **Não ocupam slot e valem em toda hunt**, como as Áureas.
- **25 níveis**, comprados um a um com ouro. Cada nível dá um pouco de um efeito com **mecânica** (não é áurea
  genérica); nos **marcos (5, 10, 15, 20 e 25)** o Dom ganha um comportamento novo, como a Maestria das magias.
- **Comprar não pede XP.** O nível do Dom não sobe com o uso e não cai na morte.
- **No menu:** hexágono no desenho (círculo = magia, quadrado = Áurea, losango = Traço, livro = Tomo). A ficha mostra
  "Nv 7/25", o efeito de agora e do próximo, o próximo marco, e dois botões: **+1 nível** e **+5 níveis** (com o preço
  somado). A barra do Dom muda de cor em cada marco.
- **No servidor:** lidos ao entrar na sala, como `spellBonuses`; não mudam durante a hunt. A hunt solo e a sala no
  aparelho do jogador leem do mesmo jeito (força, não recompensa; os limites de `SOLO_LIMITS` não mudam).

### 5.2 Teto de poder (para não virar "quem tem mais ouro ganha")

- Cada Dom no nível 25 vale perto de um Traço (**~+12–15% num eixo**), e o efeito por nível é **condicional** (em
  monstro sangrando, com criatura viva, depois de esquiva...), não dano cru.
- Os 6 Dons de uma classe mexem em **6 eixos diferentes**; nenhum Dom soma dano bruto em todas as magias.
- Os marcos dos níveis 20 e 25 são de **conforto** (alcance, duração, efeito extra), não de multiplicador.
- Primeira conferência pela skill `/balanceamento` quando houver 50 hunts com algum Dom acima do nível 10.

### 5.3 Preço

Usa a fórmula que o `buy_talent` já tem (`base_cost × cost_growth^nível`), então **a função do banco não muda** para
comprar 1 nível: os Dons são linhas novas em `talents`.

Proposta: **base 60, crescimento ×1,12**.

| Níveis | Preço por nível | Acumulado | Hunts no ritmo médio (~110) | Hunts no p90 (~450) |
|---|---|---|---|---|
| 1–5 | 60 → 95 | ~380 | ~3–4 | 1 |
| 6–10 | 106 → 166 | ~1.050 | ~10 | 2–3 |
| 11–15 | 186 → 293 | ~2.240 | ~20 | 5 |
| 16–20 | 328 → 516 | ~4.300 | ~40 | 10 |
| 21–25 | 578 → 910 | ~8.000 | ~73 | 18 |

- Um Dom inteiro: ~8.000. Os 6 de uma classe: ~48.000. As 4 classes: ~190.000.
- A conta com 7.888 de ouro fecharia **um** Dom: ela gasta o que tem e continua com destino para o ouro de centenas
  de hunts.
- O começo é barato (o 1º nível sai numa hunt) e o fim é longo: sempre há um próximo nível perto de dar.
- Se, com dados, o ouro voltar a sobrar, a alavanca é subir o crescimento (×1,14); se ninguém passar do nível 10,
  baixar a base.

### 5.4 Catálogo dos Dons

Formato: **por nível** · marcos (5 / 10 / 15 / 20 / 25). Números de partida para o balanceamento.

**Cavaleiro**

| Ramo | Dom | Por nível | Marcos |
|---|---|---|---|
| Lâmina (ramo) | 🗡️ **Fio Temperado** | +0,6% de dano corpo a corpo em monstro sangrando | 5: o básico tem 10% de chance de sangrar · 10: sangramento +1 s · 15: chance 20% · 20: sangrar dá +1 de velocidade de ataque por 2 s · 25: sangramentos acumulam 2 vezes |
| Lâmina (costela) | 🌬️ **Gume do Vendaval** | +1% de alcance-dano dos seus leques (cada tile a mais da ponta perde menos) | 5: leques +10° · 10: +1 tile · 15: leques empurram 1 tile · 20: +10° · 25: o 1º leque depois de 10 s sem magia sai em dobro |
| Bastião (ramo) | 🛡️ **Couro Curtido** | +0,4 de armadura | 5: escudos duram +10% · 10: +5% de vida máxima · 15: escudos +10% · 20: imune a lentidão · 25: ao quebrar um escudo, ganha 2 s de 30% de corte de dano |
| Bastião (costela) | 🧱 **Parede de Escudos** | +0,6% de força nos empurrões e atordoamentos (duração) | 5: empurrão +1 tile · 10: atordoar +0,2 s · 15: monstro empurrado contra parede fica atordoado · 20: +0,2 s · 25: empurrar dá escudo de 5% |
| Comando (ramo) | 🎖️ **Voz de Comando** | +0,5% de dano para aliados a até 4 tiles | 5: alcance 5 · 10: provocar dura +1 s · 15: aliados +5% de velocidade · 20: alcance 6 · 25: aliado que cai abaixo de 20% da vida ganha escudo de 15% (1 vez a cada 60 s) |
| Comando (costela) | 📢 **Grito que Ecoa** | +0,6% de duração das marcas e provocações | 5: marcas +5% · 10: o leque provoca +1 tile · 15: marcas +5% · 20: provocados andam 15% mais devagar · 25: provocar cura 1% por monstro |

**Paladino**

| Ramo | Dom | Por nível | Marcos |
|---|---|---|---|
| Mira (ramo) | 🦅 **Olhar Paciente** | +0,6% de dano a 4 tiles ou mais | 5: +0,5 tile de alcance no básico · 10: tiro à distância máxima atordoa 0,3 s (10 s de recarga) · 15: +0,5 tile · 20: +5% de chance de flecha dupla · 25: a flecha dupla vale 100% |
| Mira (costela) | 🪶 **Aljava Larga** | +0,6% de dano por flecha dos leques de projéteis | 5: +1 flecha nos leques · 10: flechas atravessam o 1º monstro com 50% · 15: +1 flecha · 20: leque 10° mais fechado (mais flechas no mesmo alvo) · 25: cada flecha que acerta devolve 0,5% de mana |
| Luz (ramo) | ✝️ **Fé Ardente** | +0,8% de dano em mortos-vivos | 5: queimar +1 s · 10: ofuscar +0,2 s · 15: mortos-vivos mortos curam 1% · 20: +0,2 s · 25: luz atravessa o 1º monstro |
| Luz (costela) | ☀️ **Clarão Persistente** | +0,6% de duração dos ofuscamentos | 5: leques de luz +10° · 10: ofuscado recebe +5% de dano · 15: +1 tile · 20: +5% · 25: ofuscar marca o monstro por 3 s |
| Batedor (ramo) | 🧭 **Passo de Rastreador** | +0,4% de velocidade de movimento | 5: armadilhas +10% de duração · 10: +1 armadilha ao mesmo tempo · 15: andar 3 s sem levar dano dá +10% de dano no próximo tiro · 20: +10% · 25: +1 armadilha |
| Batedor (costela) | 🪤 **Estrepes Afiados** | +0,6% de dano dos campos no chão | 5: lentidão dos campos +5% · 10: campos +1 s · 15: sangram · 20: +1 s · 25: o monstro que morre num campo seu deixa estrepes no tile |

**Feiticeiro**

| Ramo | Dom | Por nível | Marcos |
|---|---|---|---|
| Raio (ramo) | ⚡ **Condutor** | +0,6% de dano de energia e fogo | 5: cadeias +1 salto · 10: queimar +1 s · 15: Estática/Combustão (se tiver) +5% · 20: +1 salto · 25: o salto não perde dano no 1º pulo |
| Raio (costela) | 🔥 **Garganta de Brasa** | +0,8% de dano dos sopros (leques canalizados e ondas) | 5: sopros +10° · 10: deixam rastro de chão em chamas por 1 s · 15: +0,5 s de canalização · 20: +10° · 25: a última onda do sopro explode em raio 1 |
| Gelo (ramo) | ❄️ **Coração Frio** | +0,5% de duração das lentidões e prisões | 5: lentidão +5% · 10: monstro lento recebe +5% de dano · 15: +5% · 20: prender dá 5% de escudo a você · 25: monstro que morre preso congela os colados 1 s |
| Gelo (costela) | 🌨️ **Sopro Glacial** | +0,6% de lentidão por segundo de canalização | 5: +1 tile no sopro · 10: 3 s seguidos no sopro prendem · 15: +10° · 20: prender estilhaça (+30% no próximo golpe) · 25: o sopro não deixa você lento |
| Trevas (ramo) | 🌑 **Fome Sombria** | +0,4% de roubo de vida das magias de trevas | 5: marcas +1 s · 10: matar com magia devolve 1% de mana · 15: +1 s · 20: +1% · 25: o 1º golpe que te mataria em cada hunt deixa você com 1 de vida e 1 s invisível |
| Trevas (costela) | 👁️ **Lamento Profundo** | +0,6% de força dos enfraquecimentos | 5: leques sombrios +10° · 10: enfraquecido recebe +5% de dano · 15: +1 tile · 20: +1 s · 25: o leque sombrio rouba 1% de mana por monstro |

**Druida**

| Ramo | Dom | Por nível | Marcos |
|---|---|---|---|
| Matilha (ramo) | 🐺 **Laço da Matilha** | +0,6% de vida e dano das criaturas | 5: criaturas +10% de duração · 10: +1 lobo na Matilha · 15: criaturas roubam 3% de vida · 20: +10% · 25: a criatura que morre volta uma vez com 30% da vida |
| Matilha (costela) | 📣 **Eco do Rugido** | +0,6% de bônus de ataque que os rugidos dão às criaturas | 5: rugidos +10° · 10: rugido cura as criaturas 5% · 15: +1 tile · 20: +5% · 25: o rugido chama 1 lobo por 6 s |
| Bosque (ramo) | 🌿 **Seiva Antiga** | +0,5% de cura | 5: cura além da vida vira escudo de até 3% · 10: curar tira lentidão · 15: escudo até 6% · 20: +1 tile em curas de área · 25: curar alguém abaixo de 30% cura 50% a mais |
| Bosque (costela) | 🌸 **Pólen Dourado** | +0,6% da cura dos leques de cura | 5: +10° · 10: o leque devolve 1% de mana aos aliados · 15: +1 tile · 20: tira veneno · 25: aliados no leque ganham +3 de armadura por 4 s |
| Espinhos (ramo) | 🌵 **Seiva Venenosa** | +0,6% de dano dos venenos e sangramentos | 5: veneno +1 s · 10: Toxina (se tiver) +1 acúmulo · 15: envenenado anda 10% mais devagar · 20: +1 s · 25: veneno que mata pula para o mais perto |
| Espinhos (costela) | 🍃 **Rajada de Cardos** | +0,6% de dano dos espinhos em leque | 5: +1 espinho · 10: espinhos prendem 0,3 s · 15: +1 espinho · 20: atravessam o 1º monstro · 25: cada espinho que acerta envenena |

---

## 6. Magias novas de slot

Legenda: **S1/S2/S3** = slot. Números do nível 0. ⌒ = leque (forma da seção 3). Toda magia nasce com a Maestria do
nível 5. As magias de slot **continuam subindo só por XP** (`spellxp.ts`), sem mudança nas regras.

**Regras gerais do slot 3** (valem para todas as classes): recarga de 25 a 45 s, mana alta, um efeito que muda a
luta (não só "mais dano"). XP por lançamento continua igual à recarga em segundos, então as magias do S3 sobem de nível
no mesmo ritmo que as outras para quem as usa sempre. Preço: 2.000 (Ápice) e 2.500 (especialização).

### 6.1 Cavaleiro — leques curtos e largos, de perto

| Nó | Magia | Slot | O que faz | Maestria |
|---|---|---|---|---|
| Lâmina, costela | 🌬️ **Lâmina do Vendaval** ⌒ | S1 | corte que solta uma onda (L2) de 60°, 3 tiles, 1,4×, empurra 1 | duas ondas (a 2ª com 60%) |
| Bastião, costela | 🔰 **Muro de Escudos** ⌒ | S2 | avança o escudo num leque de 120°, 2 tiles: 1×, empurra 2 e atordoa 0,8 s | escudo de 5% por monstro atingido (até 25%) |
| Comando, costela | 📢 **Brado Cortante** ⌒ | S1 | grito em leque de 90°, 4 tiles: 0,6×, provoca e marca (+15% por 5 s) | enfraquece 20% por 4 s (A2) |
| Lâmina, Ápice | ⚔️ **Ceifa do Campeão** ⌒ | S3 | varredura (L5) de 180°, 3 tiles, 3 passadas de 1,6× que sangram | 4 passadas |
| Bastião, Ápice | 🏰 **Baluarte** | S3 | escudo de 35% em você e nos aliados a até 3 tiles, +8 de armadura por 8 s e provoca em raio 5 | os aliados também ganham a armadura |
| Comando, Ápice | 🐎 **Carga da Legião** | S3 | aura (A3) de raio 4 por 8 s: aliados com +25% de dano e +20% de velocidade | aliados que entram na aura ganham escudo de 10% |
| Berserker | 🩸 **Massacre** | S3 | 8 s em que o básico corta todos os colados e rouba 30% de vida | matar renova 1 s (até +4 s) |
| Duelista | 🗡️ **Tempestade de Lâminas** ⌒ | S3 | 5 lâminas em leque (L3) de 60°, 1,5× cada, sangram | 7 lâminas |
| Guardião | 🤝 **Juramento do Protetor** | S3 | num aliado mirado por 10 s: 60% do dano dele vem para você e você ganha +10 de armadura | o aliado também fica com 20% de escudo |
| Inabalável | 🗿 **Montanha** | S3 | 6 s sem ser empurrado nem atordoado, devolvendo 100% do golpe corpo a corpo e cortando 50% do dano | ao acabar, Terremoto grátis em raio 2 |
| Senhor da Guerra | 🎺 **Grito de Reunião** | S3 | cura 30% e escudo de 20% nos aliados a até 6 tiles; eles andam 30% mais rápido por 5 s | alcance 8 |
| Desafiante | ⛓️ **Correntes do Desafio** ⌒ | S3 | leque de 90°, 5 tiles: puxa todos para perto (A1) e prende 2 s | puxados sangram |

### 6.2 Paladino — o leque é de flechas

| Nó | Magia | Slot | O que faz | Maestria |
|---|---|---|---|---|
| Mira, costela | 🪶 **Leque de Flechas** ⌒ | S1 | 5 flechas (L3) em 45°, 0,9× cada; colado no alvo, todas acertam | 7 flechas |
| Luz, costela | ☀️ **Clarão Sagrado** ⌒ | S2 | onda de luz (L2) de 120°, 4 tiles: 1,2×, ofusca 1 s, dobro em mortos-vivos | marca os ofuscados (+15% por 4 s) |
| Batedor, costela | 🪤 **Abrolhos** ⌒ | S1 | espalha 3 armadilhas pequenas (A6) num leque de 90°, 3 tiles: 50% de lentidão e sangram | 5 armadilhas |
| Mira, Ápice | 🎯 **Tiro do Fim do Mundo** | S3 | carrega 1 s (A4) e dispara uma linha de 12 tiles que atravessa tudo: 4×, dobro abaixo de 30% da vida | carrega em 0,5 s |
| Luz, Ápice | ✨ **Juízo Celeste** | S3 | 6 lanças de luz caem nos monstros a até 5 tiles (a nuvem da Fúria dos Céus), 1,6×, dobro em mortos-vivos | 9 lanças |
| Batedor, Ápice | 🏹 **Chuva sem Fim** ⌒ | S3 | canaliza (L4) 3 s: leque de 90°, 6 tiles, 0,5× a cada 0,3 s; anda 60% mais devagar | não deixa lento |
| Atirador de Elite | 🦅 **Disparo Fantasma** | S3 | marca os 3 monstros mais perto; 1,5 s depois cada um leva 3× | 5 monstros |
| Caçador Ágil | 🍃 **Dança do Vento** ⌒ | S3 | rola 3 tiles para trás e solta um leque de 5 flechas para a frente; 3 cargas em 6 s | 4 cargas |
| Cruzado | ✝️ **Cruz Flamejante** | S3 | cruz (A5) de 4 linhas de 5 tiles em volta de si: 2,5× e queima | linhas de 7 tiles |
| Guardião da Luz | 🕊️ **Santuário** | S3 | zona de raio 3 por 8 s: aliados dentro recebem 40% menos dano e monstros que entram são empurrados | raio 4 |
| Artilheiro | 💣 **Bombardeio** ⌒ | S3 | 5 explosões de raio 1 caindo em onda (L2) num leque de 60°, 6 tiles, 1,6× cada | deixam chão em chamas |
| Armadilheiro | 🕸️ **Campo Minado** ⌒ | S3 | 5 armadilhas (A6) espalhadas num leque de 120°, 4 tiles: prendem 2 s e explodem 1,5× | 7 armadilhas |

### 6.3 Feiticeiro — os sopros e os raios em leque

| Nó | Magia | Slot | O que faz | Maestria |
|---|---|---|---|---|
| Raio, costela | 🔥 **Cusparada de Fogo** ⌒ | S1 (fogo) | onda de fogo (L2) de 60°, 3 tiles: 1,3× e queima 3 s | 90° |
| Raio, costela (mesma) | ⚡ **Leque de Raios** ⌒ | S2 (energia) | 3 raios (L3) em 60°, 1,4× cada, e cada um salta 1 vez | 5 raios |
| Gelo, costela | 🌨️ **Sopro Gélido** ⌒ | S2 (gelo) | canaliza (L4) 2 s: leque de 60°, 4 tiles, 0,4× a cada 0,25 s, lentidão que cresce; 1,5 s seguidos prendem | ao fim, estilhaça os presos (1,5×) |
| Trevas, costela | 🌑 **Lamento Sombrio** ⌒ | S1 (trevas) | onda (L2) de 120°, 3 tiles: 1,1× e rouba 15% de vida | enfraquece 20% por 3 s (A2) |
| Raio, Ápice | 🌩️ **Relâmpago Ramificado** | S3 (energia) | linha de 7 tiles que, no fim, se abre em 3 linhas de 4 tiles em leque; 2,4× | 5 linhas |
| Gelo, Ápice | 🧊 **Era do Gelo** | S3 (gelo) | zona de raio 4 por 6 s: 70% de lentidão e prende a cada 2 s; no fim, estilhaça (2×) | raio 5 |
| Trevas, Ápice | 🕳️ **Buraco Negro** | S3 (trevas) | no ponto mirado, puxa (A1) os monstros a até 3 tiles para o centro por 2 s e explode (3×) | puxa a até 4 tiles |
| Tempestuoso | ⛈️ **Olho da Tempestade** | S3 (energia) | 8 s: suas magias de energia saltam +2 e cai um raio (1×) num monstro perto a cada segundo | 12 s |
| Piromante | 🐉 **Hálito do Dragão** ⌒ | S3 (fogo) | canaliza (L4) 3 s: leque de 90°, 5 tiles, 0,6× a cada 0,25 s, queima e deixa o chão em chamas | 120° |
| Criomante | 🏔️ **Avalanche** ⌒ | S3 (gelo) | onda (L2) de 90°, 6 tiles: 2×, prende 2 s; em monstro já preso, +50% (Estilhaçar) | prende 3 s |
| Arcanista | 🌀 **Fenda Arcana** | S3 | teleporta até 5 tiles e explode (1,8×) no ponto de saída e no de chegada; 2 cargas | 3 cargas |
| Necromante | 💀 **Exército dos Mortos** | S3 | 4 esqueletos por 20 s | 6 esqueletos |
| Bruxo | 👁️ **Olhar do Abismo** ⌒ | S3 (trevas) | leque de 60°, 6 tiles: marca +30% e enfraquece 30% (A2) por 6 s | 90° |

O Feiticeiro ganha 4 magias de leque em vez de 3: a costela do Raio tem as duas que você deu de exemplo (cuspir fogo e
raios em leque), uma de cada slot.

### 6.4 Druida — vento, pólen e espinhos

| Nó | Magia | Slot | O que faz | Maestria |
|---|---|---|---|---|
| Matilha, costela | 🐺 **Rugido da Alcateia** ⌒ | S1 | leque de 90°, 3 tiles: 0,8×, empurra 1; suas criaturas atacam 30% mais rápido por 4 s | as criaturas também curam 10% |
| Bosque, costela | 🌸 **Brisa de Pólen** ⌒ | S2 | onda (L2) de 120°, 5 tiles: cura 20% os **aliados** no leque e tira veneno; monstros ficam 30% lentos | +10% de escudo nos aliados |
| Espinhos, costela | 🌵 **Rajada de Espinhos** ⌒ | S1 | 6 espinhos (L3) em 60°, 0,7× cada, que sangram (e envenenam com a Toxina) | 8 espinhos |
| Matilha, Ápice | 🐾 **Caçada Selvagem** | S3 | 3 lobos e 1 urso por 12 s, todos com +20% de dano | 15 s |
| Bosque, Ápice | 🌳 **Árvore da Vida** | S3 | planta uma árvore (zona de raio 3 por 12 s) que cura 5% por segundo os aliados dentro | dá 10% de escudo a quem entra |
| Espinhos, Ápice | 🍂 **Furacão de Folhas** ⌒ | S3 | canaliza (L4) 3 s: leque de 90°, 5 tiles, 0,5× a cada 0,3 s e empurra 1 tile | prende 0,5 s a cada pulso |
| Mestre das Feras | 🦁 **Rei da Selva** | S3 | invoca um leão por 25 s que provoca e ruge (atordoa 1 s em raio 2 a cada 6 s) | 2 leões |
| Metamorfo | 🐲 **Forma Primordial** ⌒ | S3 | forma animal por 10 s: o básico vira um sopro em leque de 60°, 3 tiles | 90° |
| Círculo da Vida | 🌰 **Floresta Eterna** | S3 | semente (como o Renascer) em todos os aliados a até 5 tiles por 15 s | 25 s |
| Guardião da Natureza | 🌲 **Muralha de Carvalhos** | S3 | parede de 5 tiles por 8 s (a da Muralha Mágica) que cura 3% por segundo os aliados colados | 7 tiles |
| Peste | ☠️ **Pandemia** | S3 | veneno forte num alvo que pula para todos a até 3 tiles a cada 2 s, por 10 s | acumula 2 vezes |
| Tempestade | 🌪️ **Tornado** ⌒ | S3 | um tornado (A7) que anda 6 tiles na direção mirada, 1× por segundo em quem toca e empurra | **candidato a corte**: é a única peça G; troca natural: nuvem de raios em leque (usa peças que existem) |

### 6.5 Contagem

| | Cavaleiro | Paladino | Feiticeiro | Druida | Total |
|---|---|---|---|---|---|
| Magias em leque (S1/S2) | 3 | 3 | 4 | 3 | **13** |
| Magias do slot 3 (Ápice + lados) | 9 | 9 | 9 | 9 | **36** |
| … das quais em leque | 3 | 4 | 3 | 3 | 13 |
| Dons (25 níveis) | 6 | 6 | 6 | 6 | **24** |
| Magias por classe (hoje → depois) | 31 → 43 | 27 → 39 | 28 → 41 | 29 → 41 | 115 → 164 |

---

## 7. Mudanças técnicas

| Onde | Mudança |
|---|---|
| `packages/shared/src/spells.ts` | `SpellSlot` ganha o 2 (vem do trabalho do slot 3); campos `coneAngle`, `wave`, `spread`, `channel`, `sweep` e as peças A1–A6; `coneTiles` recebe o ângulo; magias novas e Maestrias; `spellFacts` descreve as formas novas |
| `packages/shared/src/talents.ts` | `kind: "gift"` (Dom) com `gift: { id, perRank, milestones }`; lanes da costela nova e linha IX; `SPELL_COST_BY_ROW`/`SIDE_SPELL_COST` ganham os preços do S3 |
| `packages/shared/src/gifts.ts` (novo) | catálogo dos Dons: texto, efeito por nível, marcos; `giftBonuses(ranks)` (como `spellBonuses`) |
| `apps/server/src/hunt.ts` | as formas de leque (canalizar com tique de 250 ms, não por frame), as peças A1–A6, os efeitos dos Dons lidos ao entrar; nada de `process`/`node:*` (regra do `CLAUDE.md`). Estado novo da canalização entra em `INTERNALS` (troca de anfitrião) |
| `apps/server/src/state.ts` | `Player.channel` (magia, direção, fim) para o cliente desenhar o sopro; `Player.gifts` se o cliente precisar mostrar efeito |
| `apps/client/src/aim.ts`, `fx.ts`, `DungeonScene.ts` | mira com ângulo; família **sopro**; refazer o desenho das 3 magias de leque que já existem |
| `apps/client/src/menu.ts` | nó hexagonal do Dom, ficha com "Nv x/25", marcos, botões +1/+5 |
| Supabase | migration: Dons em `talents` (`max_rank` 25, `base_cost` 60, `cost_growth` 1,12) e magias novas; função nova `buy_talent_levels(p_talent_id, p_count)` (compra até 5 níveis numa transação, mesmas regras do `buy_talent`); advisors depois |
| Telemetria (`runStats.ts`, `TELEMETRIA.md`) | `damageDealt` por magia já cobre as novas; novos contadores `channelMs` (tempo canalizando), `coneHits` (monstros por leque, para medir se o leque acerta mais de um), `gifts` (níveis de Dom da conta na hunt) e `giftDamage`/`giftHeal` (o que veio dos Dons) |
| Testes | `efeitos.ts` ganha as formas L1–L5 e A1–A6 pela arena (`scripts/arena.ts`); teste novo `dons` (preço, compra de 5 níveis, marcos, teto) entra em `SUITES` |
| `catalog.ts` | lê sozinho do `packages/shared` (nada a fazer, conferir os Dons) |

`RULES_VERSION` é calculada sozinha: mudar `messages.ts` (mensagem de canalizar) já força o recarregamento do cliente.

---

## 8. Plano de execução

Cada fase é um PR que pode ir sozinho para produção, com `npm run check` e CI verdes.

| Fase | Entrega | Depende de | Tam. | Impacto |
|---|---|---|---|---|
| **G1. Dons (estrutura + números por nível)** | `kind: "gift"`, os 24 Dons com o efeito por nível, menu, `buy_talent_levels`, migration, teste `dons` | — | M | **alto**: dá destino ao ouro já na semana em que entrar |
| **G2. Marcos dos Dons** | os 5 marcos de cada Dom (vários reusam ganchos dos Traços) | G1 | M | médio: dá motivo para os níveis altos |
| **L1. Motor de leque + desenho** | formas L1–L5, família sopro, mira com ângulo, refazer as 3 magias de leque atuais | — (pode ir junto da G1, arquivos diferentes) | G | alto: é o pedido mais visível |
| **L2. Magias de leque S1/S2** | as 13 magias das costelas novas, com Maestria; a costela nova na árvore (sem os Dons de costela, se a G1 não tiver entrado) | L1 | M | alto |
| **S0. Slot 3 no `main`** | trabalho em andamento de outra sessão (`SpellSlot = 0 \| 1 \| 2`, nível de abertura, botão `data-slot="2"`) | — | — | pré-requisito |
| **S1–S4. Magias do slot 3 por classe** | 9 magias por classe (Ápices + lados), peças A1–A6 que a classe usar, um PR por classe | S0, L1 | M–G cada | alto |
| **B. Balanceamento** | `/balanceamento` com a telemetria nova; ajustar preço dos Dons e números das magias | G1, L2 | contínuo | — |

**Ordem das classes no S1–S4:** Feiticeiro (classe mais jogada e dona dos dois exemplos do pedido) → Paladino →
Druida → Cavaleiro. Os dois lados de cada especialização saem no mesmo PR (a escolha é permanente; mesma regra do 2.0).

**Para não duplicar trabalho com a sessão do slot 3:** antes de cada fase S, `git fetch` e ler como o slot 3 chegou no
`main` (nível de abertura, regra de magias ativas do slot, botão). Este plano não mexe no slot em si.

---

## 9. Riscos e como reduzir

| Risco | Por quê | Mitigação |
|---|---|---|
| **Veterano muito mais forte que o novato na mesma sala** | Dons são poder comprado com tempo de jogo | teto da 5.2 (Dom ≈ Traço, efeitos condicionais, eixos diferentes); medir dano por jogador em sala mista |
| **Curva de preço errada** | amostra pequena (7 contas) | a curva usa a fórmula do banco: ajustar é uma migration de `base_cost`/`cost_growth`, sem código |
| **Banco de reservas maior** | +12 magias por classe | 9 das 12 são do slot 3, que começa vazio; as 3 de leque têm forma que nenhuma outra tem. As Sinergias e os Dons de costela fazem a magia comprada valer mesmo fora do slot |
| **Canalizar no celular** | segurar o botão e arrastar ao mesmo tempo que anda com o outro polegar | toque rápido mira sozinho (segue o alvo); canalização curta (2–3 s); testar em 412×915 e 915×412 antes do PR |
| **Tela poluída** | sopros, campos e flechas em 9 tiles de largura | sopro com transparência e rastro curto (0,5 s); no máximo um sopro por herói ao mesmo tempo |
| **Celular fraco e servidor** | canalizar gera dano a cada 250 ms | tique fixo de 250 ms, não por frame; medir o tick com 4 jogadores canalizando |
| **Escopo** | 49 magias e 24 Dons | fases independentes; G1 sozinha já resolve o ouro; Tornado e Fenda Arcana são os primeiros cortes se o prazo apertar |
| **Hunt solo lê os Dons no aparelho** | o jogador poderia forjar níveis | igual ao `spellBonuses` de hoje: muda força, não recompensa (`SOLO_LIMITS` continuam valendo) |
| **Câmera** | sopros grandes pedem "impacto" | proibido tremer (GDD, "Plataforma"): o peso vem do chão marcado e do recuo dos monstros |

---

## 10. Decisões em aberto (para o Leonardo)

| # | Pergunta | Recomendação |
|---|---|---|
| 1 | Em que nível o slot 3 abre? | nível 9 (o slot 2 chega aos ~105 s; o 3 precisa aparecer nas hunts que concluem) — confirmar com a sessão do slot 3 |
| 2 | Quantos níveis cada Dom tem? | **25** (marcos a cada 5). 50 níveis dobram o ralo, mas cada nível vira um número sem graça |
| 3 | Os Dons são por classe ou da conta? | **por classe** (dão identidade; quem joga 4 classes tem 4× o ralo). Da conta seria mais simples, mas fica genérico como as Áureas |
| 4 | Dá para devolver níveis de Dom (respec)? | **não** no começo: os Dons não se excluem, então não há escolha errada para desfazer |
| 5 | Cortar o Tornado (única peça G)? | **sim**, trocar por uma nuvem de raios em leque com peças que existem |
| 6 | Começar pela G1 (Dons) ou pela L1 (leques)? | **G1**: resolve o problema de ouro que motivou o pedido e não depende do slot 3; a L1 pode correr em paralelo |
