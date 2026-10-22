# Bestiário 2.0 — revisão dos inimigos e plano de expansão

Estudo para revisar os 12 monstros atuais e ampliar muito o leque de inimigos, com base quase só em Dungeons &
Dragons 5e (Monster Manual e SRD 5.1). Cobre balanceamento, mecânicas, arte e a ordem de entrega.
Documento de planejamento: quando uma fase for entregue, o `GDD.md` passa a descrever o que vale e este arquivo marca
a fase como feita. As decisões em aberto estão na seção 10.

**Andamento:** nenhuma fase começou.

---

## 1. Resumo executivo

| | Hoje | Proposta |
|---|---|---|
| Monstros | 12 (4 comuns + 1 mini-boss + 1 boss por mapa) | ~65 em 5 mapas (8–9 comuns, 3 mini-bosses e 1–2 bosses por mapa) |
| Comportamentos | 1: anda até o alvo e bate corpo a corpo | 8 papéis: bruto, escaramuçador, artilheiro, controlador, líder, enxame, emboscador, sentinela |
| Ataque à distância | só os bosses (alcance 2) | artilheiros e conjuradores comuns, com projétil visível e desviável |
| Habilidades | 1 especial por mini-boss/boss, sem aviso | lista de habilidades por monstro, com **aviso no chão** (telegraph) e recarga variável (a "Recarga 5–6" do D&D) |
| Tipos de criatura | só o flag `undead` | 14 tipos do D&D (morto-vivo, constructo, limo, aberração...) com resistências e imunidades |
| Elementos | só nas magias do Feiticeiro | todo dano tem elemento; monstros resistem ou são vulneráveis (o Troll só para de regenerar com fogo ou ácido) |
| Salas | lista fixa por profundidade: toda hunt tem a mesma composição | **encontros** sorteados pela seed com orçamento de ameaça (como o "XP budget" do D&D) |
| Tamanho da equipe | não muda os monstros | **continua não mudando** (princípio do jogo, ver 3); as fases do boss saem por % de vida, então aparecem também em equipe |
| Arte | 12 sprites estáticos do pack DCSS (CC0) | +50 sprites do mesmo pack ou arte própria, animação procedural, morte por tipo |

**Ordem recomendada:** medir e preparar o código (fase 0), construir o motor de comportamentos e habilidades
(fase 1), retrabalhar os 12 atuais (fase 2), expandir os dois mapas existentes (fases 3 e 4), trocar as listas fixas
por encontros (fase 5) e só então abrir mapas novos (fases 6 a 8). Cada fase é jogável sozinha.

---

## 2. Análise crítica do bestiário atual

### 2.1 O que funciona

- **Progressão de ameaça clara dentro de cada mapa:** rato → goblin → esqueleto → orc, cada um ~1,55× mais vida que o anterior.
- **XP proporcional à vida** (~0,78 XP por HP em todos os comuns): previsível e justo.
- **As habilidades especiais têm sabor de D&D:** Sopro Infernal em faixa, Chuva Ácida da Hidra, Pisão do Ogro.
- **O motor já tem as peças básicas:** dano contínuo (veneno, queimadura, sangramento), lentidão, enfurecer do boss,
  áreas por formato (`target`, `self`, `line`) e o flag de morto-vivo que conversa com o Paladino.
- **A simulação é única** (`Hunt` em `hunt.ts`) e roda igual no servidor e na hunt solo: tudo que for feito aqui vale para os dois.

### 2.2 Problemas, em ordem de impacto

1. **Todos os monstros jogam igual.** Os 12 andam até o alvo e batem quando colam. Nenhum comum ataca à distância,
   foge, cerca, cura aliado, prende ou embosca. A diferença entre eles é só número; o jogador não precisa mudar de
   tática em nenhuma sala. É o maior problema: o leque é pequeno **e** raso.

2. **O Pântano é a Cripta com números maiores.** Sapo = rato, cobra = goblin, afogado = esqueleto, naga = orc,
   troll = ogro. Mesmo papel, mesma IA, mais vida.

3. **Anomalias de balanceamento (dano por segundo efetivo, já com o bônus de comum, na profundidade 0):**

   | Monstro | Tier no mapa | HP | DPS | Observação |
   |---|---|---|---|---|
   | Ratazana | 1 | 31 | 3,0 | |
   | Goblin | 2 | 56 | 5,0 | |
   | Esqueleto | 3 | 88 | 6,5 | |
   | Orc guerreiro | 4 | 138 | 7,7 | |
   | **Ogro** (mini-boss) | — | 260 | 8,8 (+3,7 do especial) | bate quase igual a um orc da sala 3 (7,7 × 1,36 = 10,5) |
   | Sapo gigante | 1 | 63 | 5,5 | |
   | **Cobra-d'água** | 2 | 88 | **9,6** | bate mais que o Afogado, que é o tier 3 |
   | Afogado | 3 | 150 | 9,4 | |
   | Naga guerreira | 4 | 200 | 12,0 | |
   | **Troll do brejo** (mini-boss) | — | 520 | 12,5 (+5 do especial) | uma naga da sala 6 (12 × 1,72 = 20,6) bate mais forte |

   - **Mini-bosses são comuns gordos.** Como só os comuns ganham +20% de dano e +25% de vida, e os mini-bosses ficam
     nas salas laterais (profundidade média), o DPS básico deles empata ou perde para os comuns do fundo. A ameaça vem
     só do especial a cada 8 s.
   - **A Cobra-d'água está fora da curva** (recarga de 1,0 s, a menor do jogo). Se a cobra matar mais que o Afogado na
     telemetria (`telemetry_deaths`), é isso.

4. **Especial sem aviso é injusto no celular.** O golpe sai "na hora, sem aviso" (GDD). No toque, com polegar no
   joystick, o jogador não tem como reagir: o dano vira imposto, não desafio. O D&D resolve com a Recarga (o jogador
   sabe que o sopro voltou) e os jogos de ação com o telegraph. O cliente já tem cor de aviso no `MonsterSpecial`, mas não usa.

5. **Em equipe, o boss cai antes de mostrar o que tem.** A dificuldade não muda com o número de jogadores, e isso é
   princípio do jogo (jogar em equipe tem que ser mais fácil, para estimular a equipe). O efeito colateral: com 4 heróis
   o Dragão (900 HP) cai em ~1/4 do tempo, e mecânica de boss presa a tempo (recarga longa) não chega a sair. O
   plano resolve pelo desenho do boss, não pela vida dele (ver 4.4).

6. **Composição fixa por sala.** `pathSpawns` é uma lista fixa: a sala 3 da Cripta sempre tem 3 orcs e 2 esqueletos.
   A seed só sorteia a posição. Na décima hunt, não há surpresa.

7. **Elemento não importa.** Só o flag `undead` muda alguma coisa (luz do Paladino). Escolher fogo ou gelo no
   Feiticeiro não muda nada contra nenhum monstro. Em D&D, resistência e vulnerabilidade são metade da graça.

8. **Dados de arte espalhados no cliente.** `FACES_LEFT` e `BLOODLESS` (em `DungeonScene.ts`), `MONSTER_TEXTURE`
   (`textures.ts`), e `shape`/`color` "provisórios" no `MonsterDef` que ninguém usa. Para 65 monstros isso não escala.

9. **Sprites estáticos.** Um quadro por monstro, sem respirar, sem investir no ataque. O boss é o mesmo sprite 2×.

---

## 3. Pilares de design

1. **Fonte: Monster Manual 5e, preferindo o SRD 5.1** (licença CC-BY-4.0). Criaturas que são "Product Identity" da
   Wizards (Beholder, Devorador de Mentes, Besta Deslocadora, Umber Hulk, Yuan-ti, Githyanki, Kuo-toa, Slaad, Carrion
   Crawler) **ficam fora** ou viram criaturas próprias com nome e visual originais (ver 10.2).
2. **Cada monstro tem um papel e uma assinatura.** Papel = como ele joga (tabela 3.1). Assinatura = uma mecânica
   tirada do bloco de estatísticas do D&D (Táticas de Bando do kobold, Regeneração do troll, Fortitude do zumbi).
   Um comum tem no máximo 1 assinatura; mini-boss 2; boss 3 a 4.
3. **Legível em 9 tiles de largura.** Silhueta e cor únicas dentro do mapa, toda habilidade com dano alto tem aviso
   no chão (≥ 600 ms em comuns, ≥ 800 ms em bosses) e projéteis viajam (dá para sair da frente).
4. **Controle no herói é curto.** Nenhum efeito tira o controle do jogador por mais de 2 s, e depois de um controle o
   herói fica imune ao mesmo efeito por 4 s (a "jogada de resistência" do D&D, sem dado).
5. **A dificuldade não depende do tamanho da equipe.** Os monstros são os mesmos com 1 ou 4 heróis: jogar em equipe é
   mais fácil de propósito, para estimular a equipe. Nenhuma regra deste plano escala vida, dano ou quantidade de
   monstros pelo número de jogadores.
6. **Uma novidade por sala.** Monstros novos entram aos poucos: a primeira vez que um tipo aparece numa hunt, o nome
   e a assinatura sobem sobre ele ("Kobold — Táticas de Bando").
7. **Servidor autoritativo e dados no `packages/shared`.** Comportamento e habilidades são dados (`MonsterDef`);
   o `Hunt` interpreta. Nada de lógica por `if (kind === "...")` espalhada.

### 3.1 Papéis (inspirados nos papéis de monstro do D&D 4e e do Monster Manual 5e)

| Papel | Como joga | HP × | DPS × | Exemplo |
|---|---|---|---|---|
| **Bruto** | anda reto e bate forte | 1,4 | 1,0 | Orc, Zumbi, Ogro |
| **Escaramuçador** | rápido, bate e recua, investe | 0,8 | 1,1 | Goblin, Gnoll |
| **Artilheiro** | fica a 3–5 tiles e atira; foge se colarem | 0,6 | 0,9 | Goblin arqueiro, Drow |
| **Controlador** | prende, puxa, deixa lento | 0,8 | 0,6 | Aranha gigante, Carniçal |
| **Líder** | aura nos aliados, fica atrás | 1,0 | 0,6 | Hobgoblin capitão |
| **Enxame** | fraco sozinho, vem em grupo e cerca | 0,4 | 0,5 | Kobold, Estirge |
| **Emboscador** | invisível ou camuflado até atacar; primeiro golpe forte | 0,7 | 1,3 | Crocodilo, Grick |
| **Sentinela** | lento ou parado, muita vida, guarda passagem | 1,6 | 0,7 | Monte Errante, Roper |

---

## 4. Regras gerais (motor do bestiário)

### 4.1 Nível de Desafio (ND) do Kusa

Uma escala única para todos os mapas, calibrada nos monstros atuais (valores da tabela, antes do bônus de comum e da profundidade):

- **HP de referência:** `25 × 1,55^(ND−1)` → ND1 25 · ND2 39 · ND3 60 · ND4 93 · ND5 144 · ND6 223 · ND7 346 · ND8 536 · ND9 831 · ND10 1288
- **DPS de referência:** `2,5 × 1,35^(ND−1)` → ND1 2,5 · ND2 3,4 · ND3 4,6 · ND4 6,2 · ND5 8,3 · ND6 11,2 · ND7 15,1 · ND8 20,4 · ND9 27,6 · ND10 37,2
- **Dano por golpe** = DPS × recarga. Recargas vão de 1,0 s (enxame) a 2,0 s (bruto pesado).
- **Papel** multiplica HP e DPS (tabela 3.1). **Assinatura** conta como +15% de ameaça e entra na XP.
- **XP** = `0,8 × HP × (1 + 0,15 × assinaturas)`; **loot** = `XP / 12` (faixa ±30%).
- **Mini-boss** = ND do topo do mapa +1, HP × 3, DPS × 1,3 (corrige o item 2.2.3) e 2 habilidades.
- **Boss** = ND do topo +2, HP × 8, 3–4 habilidades, Ações Lendárias e de Covil (4.4).

| Mapa | ND dos comuns | Mini-bosses | Boss |
|---|---|---|---|
| Cripta (★1) | 1–4 | ND5 | ND6 |
| Pântano (★2) | 3–6 | ND7 | ND8 |
| Profundezas (★3) | 5–8 | ND9 | ND10 |
| Necrópole (★4) | 6–9 | ND10 | ND10+ |
| Fornalha dos Gigantes (★5) | 7–10 | ND10+ | ND10+ |

A planilha de cálculo vira uma função em `packages/shared/src/monsters.ts` (`statsForCr(cr, role)`), usada como ponto de
partida; cada monstro pode sobrescrever o número final na tabela, com um teste que avisa se ele sair mais de 25% da curva.

### 4.2 Tipos de criatura (D&D) e o que cada um muda

| Tipo | Regra no Kusa |
|---|---|
| Morto-vivo | imune a veneno e sangramento; luz do Paladino fere mais (já existe); não sangra |
| Constructo | imune a veneno e sangramento; não sangra (faísca) |
| Limo (gosma) | imune a sangramento; não sangra (respingo de gosma); alguns se dividem |
| Elemental | imune ao próprio elemento; morre em cinza/vapor |
| Corruptor (demônio/diabo) | resiste a físico 25%; vulnerável à luz |
| Aberração | sangue roxo; alguns resistem a magia |
| Fada | resiste a controle (metade da duração) |
| Planta | vulnerável a fogo |
| Dragão | imune ao elemento do sopro |
| Gigante, Humanoide, Besta, Monstruosidade, Celestial | sem regra fixa (definida por monstro) |

### 4.3 Elementos

Hoje só o Feiticeiro tem `Element` (`energy`, `fire`, `ice`, `dark`). Proposta: todo dano tem elemento.

- **Físico** (`physical`): ataque básico do Cavaleiro e do Paladino, magias de lâmina e flecha.
- **Fogo, Gelo, Energia, Trevas:** como hoje.
- **Luz** (`radiant`): magias sagradas do Paladino (as que hoje têm `undeadBonus`).
- **Natureza/veneno** (`poison`) e **Ácido** (`acid`): Druida e venenos.

O monstro tem `resist`, `vulnerable` e `immune` por elemento (resistência = −50%, vulnerável = +50%, como no D&D).
O número aparece colorido sobre o monstro ("Resiste!" em cinza, "Vulnerável!" em amarelo) para o jogador aprender.

### 4.4 Ações do D&D traduzidas

| D&D | Kusa |
|---|---|
| **Multiataque** | um golpe acerta 2–3 vezes seguidas (efeito repetido), ou acerta alvos diferentes (cabeças da Hidra) |
| **Recarga 5–6** | recarga com variação aleatória de ±30%; o monstro brilha quando a habilidade está pronta |
| **Ações Lendárias** | o boss age fora da vez: um golpe rápido entre os ataques (ex.: batida de cauda quando alguém fica atrás) |
| **Ações de Covil** | a cada 12 s a sala do boss faz algo: estalactites caem (Profundezas), lava sobe (Fornalha), mortos levantam (Necrópole) |
| **Resistência Lendária** | 2 cargas por luta: o boss ignora um controle (atordoar, prender) e mostra "Resiste!" |
| **Fases do boss** | trocas de fase saem por % de vida (75%, 50%, 25%), nunca por tempo: com 1 ou 4 heróis, toda fase aparece. Na troca, o boss usa na hora a habilidade da fase nova |
| **Agarrar** | o herói fica preso (sem andar) até o tempo acabar ou bater 2 vezes no monstro |
| **Engolir/Engolfar** | o herói some dentro do monstro, toma dano por segundo e sai quando o monstro morre, leva X de dano ou o tempo acaba |
| **Invisível/Camuflado** | sprite a 15–35% de opacidade, sem barra de vida e não pode ser alvo até atacar ou levar dano |
| **Voo** | sombra no chão, ignora água e chão difícil; não pode ser empurrado para parede |

### 4.5 Efeitos novos nos heróis

Hoje o herói só sofre dano contínuo (`dot`) e lentidão (`slow`). Entram, cada um com ícone sobre o herói e regra de imunidade de 4 s:

| Efeito | Duração máx. | Quem aplica |
|---|---|---|
| **Preso** (teia, agarrão, adesivo) | 2 s | Aranha, Mímico, Crocodilo |
| **Atordoado** (paralisia, petrificação) | 1,5 s | Carniçal, Basilisco |
| **Empurrado / Puxado** | instantâneo | Sapo (língua), Roper, Ogro |
| **Corroído** (−armadura) | 6 s, acumula até 3× | Pudim Negro, Monstro da Ferrugem |
| **Amaldiçoado** (sem cura) | 5 s | Múmia |
| **Enfraquecido** (−25% de dano) | 4 s | Wight, Dragão adulto (Presença Aterradora) |
| **Engolido** | 3 s | Cubo Gelatinoso, Verme Púrpura |

Fora de propósito no celular (ficam de fora): inverter controles (confusão), forçar movimento por mais de 1 tile
(medo), esconder a tela inteira (cegueira). O medo vira "não ataca por 1,5 s"; a cegueira, "não mira ninguém além de 2 tiles".

### 4.6 Modelo de dados (rascunho)

```ts
// packages/shared/src/monsters.ts
export type CreatureType = "aberration" | "beast" | "celestial" | "construct" | "dragon" | "elemental" | "fey"
  | "fiend" | "giant" | "humanoid" | "monstrosity" | "ooze" | "plant" | "undead";
export type MonsterRole = "brute" | "skirmisher" | "artillery" | "controller" | "leader" | "swarm" | "lurker" | "sentinel";
export type DamageElement = "physical" | "fire" | "ice" | "energy" | "dark" | "radiant" | "poison" | "acid";

export interface MonsterDef {
  kind: MonsterKind; name: string; rank: MonsterRank;
  type: CreatureType; role: MonsterRole; cr: number;      // ND do Kusa
  hp: number; damage: number; attackCooldownMs: number; speed: number; aggroRange: number; attackRange: number;
  element: DamageElement;                                   // elemento do ataque básico
  resist?: DamageElement[]; vulnerable?: DamageElement[]; immune?: (DamageElement | "bleed" | "control")[];
  behavior: { keepDistance?: number; fleeBelowHp?: number; groupWith?: MonsterKind[] };
  traits?: MonsterTrait[];                                  // passivas: regeneração, táticas de bando, fortitude...
  abilities?: MonsterAbility[];                             // substitui `special` (que vira a primeira da lista)
  onDeath?: { burst?: AreaEffect; split?: { into: MonsterKind; count: number } };
  legendary?: { resist: number; lair?: LairAction[] };
  xp: number; loot: [number, number];
  art: { texture: string; facesLeft?: boolean; blood: "red" | "green" | "purple" | "dust" | "slime" | "ash" | "spark"; flies?: boolean; scale?: number };
  /** Frase de lore curta (Bestiário do menu). */
  lore: string;
}

export interface MonsterAbility {
  id: string; name: string;
  shape: SpecialShape | "cone" | "projectile" | "summon" | "dash" | "pull";
  range: number; radius: number; length?: number;
  cooldownMs: number; cooldownJitter?: number;              // Recarga 5–6
  windupMs: number;                                         // aviso no chão antes do golpe
  power: number; element?: DamageElement;
  effects?: HeroEffect[];                                   // preso, atordoado, corroído...
  when?: { belowHp?: number; alliesNear?: number; targetFarther?: number };
}
```

O `art` sai daqui e fica num registro do cliente (`apps/client/src/art/bestiary.ts`), para não pôr dado visual no
`packages/shared`. O `MonsterDef` fica com o que o servidor precisa; `shape` e `color` provisórios saem.

### 4.7 Aviso no chão (telegraph)

- Mensagem nova `MSG.monsterWindup` `{ id, ability, tiles, until }`: o cliente pinta os tiles em vermelho que enche
  até `until`; o servidor guarda o golpe pendente e resolve no fim (quem saiu da área não toma).
- O monstro fica parado durante o aviso (é a janela para o jogador bater ou sair).
- Atordoar o monstro durante o aviso cancela o golpe (recompensa para Bater com Escudo, Flecha Atordoante, Estática).
- Projéteis de monstro (`MSG.monsterShot`) viajam a 8 tiles/s; o servidor resolve no tile em que o projétil chega.

### 4.8 Encontros sorteados (substitui `pathSpawns`)

Cada mapa troca a lista fixa por **tabelas de encontro por faixa de profundidade**, como o "orçamento de XP" do D&D:

```ts
encounters: [
  { depth: [0, 1], budget: 60,  table: [["kobold", 4], ["rat", 3], ["stirge", 2]] },        // [tipo, peso]
  { depth: [1, 2], budget: 110, table: [["goblin", 4], ["goblinArcher", 2], ["zombie", 2], ["kobold", 2]] },
  { depth: [2, 3], budget: 170, table: [["skeleton", 3], ["skeletonArcher", 2], ["hobgoblin", 1], ["giantSpider", 2]] },
  { depth: [3, 9], budget: 240, table: [["orc", 4], ["gnoll", 3], ["hobgoblin", 1], ["skeleton", 2]] },
]
```

- O sorteio usa o RNG da seed que o `spawnMonsters` já tem (determinístico, sem `Math.random()`).
- Cada monstro custa a XP dele; a sala recebe monstros até gastar o orçamento.
- Limites: no máximo 2 artilheiros e 1 líder por sala; enxames vêm em grupo (`groupWith`).
- Mini-boss das salas laterais e boss podem ter rotação: o mapa lista 2–3 opções e a seed escolhe.
- **O orçamento não muda com o tamanho da equipe** (princípio da seção 3): a sala é a mesma para 1 ou 4 heróis.

### 4.9 Variantes de elite (fase 5)

Com 5% de chance (seed), um comum nasce como **Campeão**: nome dourado, contorno dourado, HP × 2, XP e loot × 2,5 e um
afixo de uma lista curta: *Veloz* (+40% de velocidade), *Vampírico* (rouba 20%), *Ígneo* (deixa chão em chamas),
*Escudado* (resiste a físico), *Comandante* (aura +15% de dano). Dá variedade com pouco conteúdo novo.

---

## 5. Revisão dos 12 monstros atuais

Os ids (`rat`, `goblin`...) **não mudam**, para não quebrar a telemetria (`killed_by`, `stats.kills`).

### 5.1 Cripta

| Monstro | Base D&D | Papel | Ajuste de número | Assinatura nova |
|---|---|---|---|---|
| Ratazana | Giant Rat | enxame | HP 25 → 20, vem em grupos de 3 | **Táticas de Bando:** +40% de dano se outro monstro estiver colado no mesmo alvo |
| Goblin | Goblin | escaramuçador | velocidade 3 → 3,4 | **Fuga Ágil:** depois de acertar, recua 1 tile (recarga 4 s); obriga a perseguir |
| Esqueleto | Skeleton | bruto | sem mudança | tipo morto-vivo: **imune a veneno e sangramento**, vulnerável a luz (já) |
| Orc guerreiro | Orc | bruto | sem mudança | **Agressivo:** com o alvo a 3–5 tiles, avança 2 tiles de uma vez (recarga 6 s) |
| Ogro (mini-boss) | Ogre | bruto | dano 14 → 18, recarga 1,6 → 1,8 s | Pisão Sísmico ganha aviso de 700 ms; nova: **Arremesso de Pedra** (alvo a 3–6 tiles, área 1, empurra 1) |
| Dragão jovem (boss) | Young Red Dragon | — | sem mudança; fases por % de vida | Sopro Infernal vira **cone** com aviso de 900 ms e Recarga 5–6; **Multiataque** (mordida + 2 garras); **imune a fogo**; abaixo de 50%: **Voo** (some 2 s e cai sobre um herói, área 2 com aviso) |

### 5.2 Pântano das Ruínas

| Monstro | Base D&D | Papel | Ajuste de número | Assinatura nova |
|---|---|---|---|---|
| Sapo gigante | Giant Frog | controlador | sem mudança | **Língua:** puxa um herói a até 3 tiles para colado (recarga 7 s, aviso de linha) |
| Cobra-d'água | Giant Poisonous Snake | escaramuçador | dano 8 → 6, recarga 1,0 → 1,2 s (corrige 2.2.3) | **Picada Venenosa:** veneno de 3 s no golpe |
| Afogado | Zombie (afogado) | bruto | velocidade 2,6 → 2,0, HP 120 → 140 | **Fortitude Morta-viva:** o primeiro golpe que o mataria o deixa com 1 HP, exceto dano de luz ou fogo |
| Naga guerreira | Guardian Naga (versão menor) | sentinela | sem mudança | **Constrição:** golpe que prende 1,5 s (recarga 6 s) |
| Troll do brejo (mini-boss) | Troll | bruto | dano 20 → 24 | **Regeneração** passiva de 2% por segundo, que **para por 5 s se levar fogo ou ácido** (troca a Fúria Regenerante); **Dilacerar** (multiataque com sangramento) |
| Hidra do pântano (boss) | Hydra | — | sem mudança; fases por % de vida | **Cabeças:** começa com 3 (cada cabeça morde um alvo diferente); a cada 20% de vida perdida, perde uma; se não levar fogo em 6 s, nascem 2 no lugar (máx. 5) e cura 5%. Chuva Ácida ganha aviso. **Mergulho:** some na água e surge longe |

O Troll e a Hidra são os exemplos mais famosos de "resistência como quebra-cabeça" do D&D, e hoje são números.
Com elementos (4.3), o Feiticeiro de fogo e o Druida de veneno/ácido passam a ser a resposta, e a equipe sente isso.

---

## 6. Novos inimigos

Formato: **HP / dano por golpe / recarga (s) / velocidade (tiles/s) / alcance**, valores da tabela antes do bônus de
comum e da profundidade. "SRD" = criatura do SRD 5.1. Arte: arquivo candidato no pack Dungeon Crawl (`crawl/tiles`, CC0;
**conferir o nome exato na fase 0**) ou "própria" (grade de pixels + `refine.ts`, como o Guardião do Bosque).

### 6.1 Cripta (★1) — goblinoides, kobolds e mortos-vivos menores

| Monstro | D&D | ND | Papel | Números | Assinatura | Contra-jogo | Arte |
|---|---|---|---|---|---|---|---|
| Kobold | Kobold (SRD) | 1 | enxame | 16 / 3 / 1,0 / 3,2 / 1 | **Táticas de Bando** (+40% com aliado colado no alvo); grupos de 3–4 | área (Giro, Bola de Fogo) | `monster/kobold` |
| Estirge | Stirge (SRD) | 1 | emboscador (voa) | 12 / 2 / 1,0 / 4,5 / 1 | **Drenar Sangue:** gruda no herói, sangramento 2/s e se cura; solta ao drenar 12 ou ao morrer | matar rápido; aliado tira | `monster/animals/vampire_mosquito` |
| Goblin arqueiro | Goblin (arco curto) | 2 | artilheiro | 28 / 5 / 1,6 / 3,0 / 4 | mantém 3 tiles; **Fuga Ágil** | investida, magia de alcance | goblin + arco (própria, recolor) |
| Zumbi | Zombie (SRD) | 2 | bruto lento | 70 / 6 / 1,8 / 1,6 / 1 | **Fortitude Morta-viva** | luz ou fogo; fugir é fácil | `monster/undead/zombies/zombie_human` |
| Esqueleto arqueiro | Skeleton (arco) | 3 | artilheiro | 45 / 7 / 1,8 / 2,6 / 5 | morto-vivo; flecha atravessa 2 alvos em linha | sair da linha | esqueleto + arco (própria) |
| Aranha gigante | Giant Spider (SRD) | 3 | controlador | 55 / 6 / 1,5 / 3,0 / 1 | **Teia** (projétil, alcance 5, prende 1,5 s, Recarga 5–6); picada com veneno | quebrar a teia batendo 2× | `monster/animals/wolf_spider` |
| Hobgoblin capitão | Hobgoblin (SRD) | 3 | líder | 70 / 6 / 1,4 / 2,8 / 1 | **Comando:** aliados a até 3 tiles +15% de dano e atacam 15% mais rápido; fica atrás | focar o líder primeiro | `monster/hobgoblin` |
| Gnoll | Gnoll (SRD) | 4 | escaramuçador | 90 / 9 / 1,3 / 3,4 / 1 | **Rompante:** abaixo de 50% da vida, ataca 40% mais rápido; ao matar uma criatura invocada, avança 3 tiles | controle, burst | `monster/gnoll` |

**Mini-bosses (rotação nas salas laterais):**

| Monstro | D&D | Habilidades | Arte |
|---|---|---|---|
| Ogro | Ogre | (5.1) | atual |
| **Mímico** | Mimic (SRD) | Disfarçado de baú: 1 em 3 salas laterais (seed) não tem baú, tem o Mímico. Ao chegar a 1 tile, abre a boca: **Adesivo** (prende quem estiver colado 2 s), mordida ácida. Morto, **vira o baú** com o loot de sempre | baú do pack + boca e dentes (própria) |
| **Cubo Gelatinoso** | Gelatinous Cube (SRD) | Quase transparente (35%), ocupa 2×2, anda devagar pelos corredores. **Engolfar** (aviso de 800 ms): quem fica no caminho é engolido 3 s com ácido; aliados batendo no cubo soltam antes. Itens e ossos visíveis dentro | própria (semitransparente) |
| Bugbear chefe | Bugbear (SRD) | **Ataque Surpresa:** o primeiro golpe em quem não estava na mira dele causa 2,5×; **Braços Longos:** alcance 2 | `monster/bugbear` (conferir) ou própria |

**Boss:** Dragão jovem vermelho (5.1). Alternativa futura: **Rei Goblin** (Goblin Boss, SRD) com ondas de goblins e arqueiros.

### 6.2 Pântano (★2) — homens-sapo, répteis, limos e bruxas

| Monstro | D&D | ND | Papel | Números | Assinatura | Contra-jogo | Arte |
|---|---|---|---|---|---|---|---|
| Bullywug | Bullywug | 3 | escaramuçador | 55 / 6 / 1,3 / 3,2 / 1 | **Salto Parado:** salta 3 tiles até o alvo (aviso de 500 ms); camuflado na água até notar alguém | sair do ponto de pouso | própria (sapo humanoide) |
| Enxame de estirges | Swarm (Stirge) | 3 | enxame | 3× Estirge da Cripta, ND ajustado | ver Estirge | área | `vampire_mosquito` |
| Homem-lagarto | Lizardfolk (SRD) | 4 | bruto | 120 / 9 / 1,5 / 2,8 / 1 | **Couraça Natural:** −20% de dano físico; **Multiataque** (mordida + clava) | magia | `monster/lizardfolk` (conferir) ou própria |
| Carniçal afogado | Ghoul (SRD) | 4 | controlador | 85 / 7 / 1,4 / 3,2 / 1 | morto-vivo; **Garras Paralisantes:** 25% de chance de atordoar 1 s | luz, distância | `monster/undead/ghoul` |
| Pudim Negro | Black Pudding (SRD) | 5 | bruto (limo) | 150 / 10 / 1,6 / 2,0 / 1 | **Divisão:** golpe físico ou de energia de 15+ divide em 2 pudins com metade da vida (até 4); **Corrosão** (−2 de armadura, acumula 3×) | fogo, gelo, não bater com lâmina | `monster/jellies/...` (conferir) |
| Crocodilo gigante | Giant Crocodile (SRD) | 5 | emboscador | 130 / 14 / 1,8 / 2,4 / 1 | submerso (invisível na água); **Mordida que Prende** (2 s) + **Rabada** (empurra 2 tiles quem está atrás) | não andar na água | `monster/animals/crocodile` |
| Fogo-fátuo | Will-o'-Wisp (SRD) | 5 | controlador | 60 / 9 / 1,5 / 4,0 / 2 | some por 2 s a cada 6 s; **Choque** de energia; imune a veneno e sangramento | área; esperar reaparecer | `will_o_the_wisp` recolorido em azul frio (o do druida é dourado) |
| Monte Errante | Shambling Mound (SRD) | 6 | sentinela (planta) | 260 / 12 / 1,8 / 1,6 / 1 | **Absorver Raio:** energia cura em vez de ferir; **Engolfar** (3 s); vulnerável a fogo | fogo; não usar energia | própria |

**Mini-bosses:** Troll do brejo (5.2) · **Bruxa Verde** (Green Hag, SRD): **Ilusão** (cria 2 cópias de 1 HP e fica
invisível 3 s), **Nuvem Venenosa** com aviso, ri quando um herói cai · **Naga Espiritual** (Spirit Naga, SRD):
conjuradora, **Raio** em linha, **Rejuvenescimento** (se ninguém matar o baú-ninho dela em 20 s, volta com 30% da vida).

**Bosses:** Hidra (5.2) · alternativa: **Dragão negro jovem** (Young Black Dragon, SRD): sopro ácido em linha que deixa
o chão corrosivo, mergulha e reaparece, **Escuridão** (área onde ninguém mira de longe).

### 6.3 Profundezas (★3, mapa novo) — o Subterrâneo (Underdark)

Cavernas escuras com fungos luminosos, pontes sobre abismos e cidades drow em ruínas. Visão curta (luz em volta de cada
herói), monstros que caem do teto e saem da pedra. Duração sugerida: 9 min.

| Monstro | D&D | ND | Papel | Assinatura |
|---|---|---|---|---|
| Drow | Drow (SRD) | 5 | artilheiro | Besta de mão com **veneno de sono** (atordoa 1 s se o herói estiver acima de 50% da vida); **Globo de Escuridão** |
| Duergar | Duergar (SRD) | 5 | bruto | **Aumentar** (aviso: cresce, 6 s com dano 2×); **Invisibilidade** ao ficar abaixo de 30% |
| Grick | Grick (SRD) | 5 | emboscador | camuflado na pedra; tentáculos + bico (multiataque); resiste a físico |
| Manto Sombrio | Darkmantle (SRD) | 5 | emboscador (voa) | cai do teto num herói e o **cega** (não mira além de 2 tiles por 2 s) |
| Monstro da Ferrugem | Rust Monster (SRD) | 6 | controlador | **Corrosão** forte (−armadura 3×). Não destrói item (ver 10.4) |
| Fungo Violeta | Violet Fungus (SRD) | 6 | sentinela parado | 4 tentáculos de alcance 2 que apodrecem (dano contínuo); fica no caminho |
| Bocarra Tagarela | Gibbering Mouther (SRD) | 7 | controlador | **Balbucio:** aura de raio 2 com chão lento; **Cuspe Cegante** |
| Chuul | Chuul (SRD) | 7 | bruto | **Pinças** que prendem; tentáculos que atordoam quem já está preso |
| Otyugh | Otyugh (SRD) | 8 | sentinela | **Batida** que atordoa; mordida com doença (sem regeneração por 8 s) |

**Mini-bosses:** **Drider** (SRD: teia + arco + veneno) · **Basilisco** (SRD: **Olhar Petrificante** em cone com aviso;
quem fica dentro vira pedra 1,5 s: atordoado, mas com +10 de armadura) · **Roper** (SRD: parado, puxa com 4 gavinhas de 6 tiles).

**Boss:** **Verme Púrpura** (Purple Worm, SRD, 4×4): **Escavar** (some, um tremor anda pelo chão até um herói e ele
emerge com aviso de 1 s), **Engolir** (3 s), **Ferrão** venenoso na cauda. Ação de Covil: estalactites caem em 3
pontos com aviso. Alternativa: **Aboleth** (SRD) com **Escravizar** (o herói fica 3 s andando sozinho até o aboleth;
sem dano em aliados, para não virar PvP).

### 6.4 Necrópole (★4, mapa novo) — a Torre do Lich

Mausoléus, criptas nobres e um laboratório no topo. Muitos mortos-vivos: aqui o Paladino brilha.

| Monstro | D&D | ND | Papel | Assinatura |
|---|---|---|---|---|
| Ghast | Ghast (SRD) | 6 | controlador | **Fedor:** aura raio 1, −20% de dano em quem está dentro; garras paralisantes |
| Cria vampírica | Vampire Spawn (SRD) | 7 | escaramuçador | **Mordida** que rouba vida; regenera 1%/s fora da luz sagrada |
| Wight | Wight (SRD) | 7 | líder | **Dreno de Vida** (enfraquece); **ergue zumbis** dos cadáveres próximos |
| Espectro | Specter/Wraith (SRD) | 7 | emboscador | **Incorpóreo:** atravessa paredes, resiste a físico 50% |
| Múmia | Mummy (SRD) | 8 | bruto | **Podridão de Múmia:** amaldiçoado (sem cura) 5 s; **Olhar Aterrador**; vulnerável a fogo |
| Banshee | Banshee (SRD) | 8 | controlador | **Lamento** (aviso de 1 s, raio 4): dano de 40% da vida atual; incorpórea |

**Mini-bosses:** **Vampiro** (SRD: vira névoa, invoca morcegos, Recarga de mordida) · **Senhor Múmia** (SRD:
Redemoinho de Areia, Palavra Blasfema) · **Cavaleiro Sepulcral** (próprio, inspirado no Death Knight: Bola de Fogo Infernal).

**Boss:** **Lich** (SRD). Fase 1: Raio de Frio, Paralisar Pessoa, Escudo; fase 2 (50%): **Círculo da Morte** com aviso,
Ações de Covil (mortos levantam). **Filactério:** fica numa sala lateral; se não for quebrado antes do Lich cair, ele
volta uma vez com 30% da vida. Dá motivo para a equipe se dividir, como em D&D.

### 6.5 Fornalha dos Gigantes (★5, mapa novo) — forja vulcânica

| Monstro | D&D | ND | Papel | Assinatura |
|---|---|---|---|---|
| Magmin | Magmin (SRD) | 7 | enxame | **Explosão** ao morrer (raio 1, fogo); imune a fogo |
| Mefite de magma | Magma Mephit (SRD) | 7 | artilheiro (voa) | cuspe de magma; explode ao morrer |
| Azer | Azer (SRD) | 8 | bruto | **Corpo Ardente:** quem bate colado leva fogo |
| Cão infernal | Hell Hound (SRD) | 8 | escaramuçador | **Táticas de Bando** + **Sopro de Fogo** em cone curto (Recarga 5–6) |
| Salamandra | Salamander (SRD) | 9 | controlador | lança de alcance 2; **Constrição Ardente** (preso + queimadura) |
| Elemental do fogo | Fire Elemental (SRD) | 9 | escaramuçador | atravessa heróis e deixa chão em chamas; gelo fere 2× |
| Golem de ferro | Iron Golem (SRD) | 10 | sentinela | resiste a físico 50%, **fogo o cura**; **Sopro Venenoso** com aviso |

**Mini-bosses:** **Gigante do Fogo** (SRD: arremessa pedras com aviso em círculo, longe) · **Efreeti** (SRD: voa,
Muralha de Fogo, invisível por instantes) · **Quimera** (SRD: três cabeças, sopro de fogo).

**Boss:** **Dragão vermelho adulto** (SRD): **Presença Aterradora** (enfraquece quem estiver a até 6 tiles na primeira
vez que o vê), sopro em cone grande com aviso, **Ações Lendárias** (batida de asa que empurra), **Resistência
Lendária** (2), Ação de Covil: a lava sobe em faixas com aviso.

### 6.6 Contagem

| Mapa | Comuns (atuais + novos) | Mini-bosses | Bosses | Total |
|---|---|---|---|---|
| Cripta | 4 + 8 | 4 | 1 (+1 futuro) | 17–18 |
| Pântano | 4 + 8 | 3 | 2 | 17 |
| Profundezas | 9 | 3 | 2 | 14 |
| Necrópole | 6 | 3 | 1 | 10 |
| Fornalha | 7 | 3 | 1 | 11 |
| **Total** | **46** | **16** | **7** | **~69** (12 hoje) |

---

## 7. Arte gráfica

### 7.1 Fonte dos sprites

- **Pack Dungeon Crawl (CC0), o mesmo de hoje.** Tem quase todo o SRD (kobold, gnoll, hobgoblin, zumbis, ghoul, wight,
  múmia, vampiro, lich, drow, duergar, basilisco, verme, golems, elementais, gigantes, dragões de várias cores, gosmas).
  Mantém o estilo coerente com os 12 atuais. Cada arquivo novo entra no `CREDITS.md`.
- **Arte própria** para o que o pack não tem ou que precisa de mecânica visual (Mímico, Cubo Gelatinoso, arqueiros,
  Bullywug, Monte Errante): grade de pixels + `refine.ts`, como o Guardião do Bosque e a Águia.
- **Bosses em 64×64:** hoje o boss é o sprite de 32 ampliado 2×. Para Verme, Lich e Dragão adulto, vale arte própria
  em 64×64 (ou os sprites grandes do pack, que existem para alguns dragões e o verme).

### 7.2 Animação procedural (todos os monstros, sem arte nova)

Os sprites do pack têm um quadro só. Dá para dar vida com tweens no `DungeonScene`, iguais para todos:

| Momento | Efeito |
|---|---|
| Parado | "respira": escala Y entre 0,97 e 1,0 em 1,2 s, fase aleatória por monstro |
| Andando | pulinho de 2 px por passo; voadores flutuam com sombra no chão |
| Ataque básico | avança 4 px na direção do alvo e volta (80 ms) |
| Aviso de habilidade | brilho pulsando na cor da habilidade + área vermelha enchendo no chão |
| Levou dano | pisca branco 60 ms (já existe o sangue) |
| Morte | por tipo: sangue (vermelho, verde, roxo), poeira (morto-vivo), gosma (limo), cinza (elemental), faísca (constructo) |
| Invisível/camuflado | opacidade 15–35% com distorção leve; sem barra de vida |
| Campeão (elite) | contorno dourado e nome dourado |

### 7.3 Registro visual único

`apps/client/src/art/bestiary.ts` junta textura, olha para a esquerda, sangue, voa, escala e cor do aviso de cada
monstro. Substitui `MONSTER_TEXTURE`, `FACES_LEFT` e `BLOODLESS`. A galeria `arte.html` ganha a seção **Bestiário**
(todos os monstros lado a lado no tamanho do jogo e 4×, para conferir silhueta e cor no celular).

### 7.4 Efeitos novos

Teia (fios brancos), cuspe ácido (verde, poça), raio de gelo, energia necrótica (roxo escuro), pedra arremessada
(arco + sombra), lama/chão lento, chão em chamas (já existe para o Artilheiro), petrificação (herói cinza),
engolido (herói some com bolhas), tremor do verme (rachadura que anda), Ação de Covil (estalactites com sombra crescendo).

### 7.5 Regras de legibilidade

- Dentro de um mapa, nenhum par de monstros com a mesma cor dominante **e** o mesmo tamanho.
- Artilheiros têm a arma visível (arco, besta, cajado).
- Teste com viewport 412×915 e brilho baixo: o monstro precisa ser lido a 4 tiles no chão do mapa.

---

## 8. Validação do balanceamento

### 8.1 Simulador (fase 0)

Script `apps/server/scripts/bestiary-sim.ts` que roda a classe `Hunt` sem rede (ela já não depende de Node nem do
Colyseus) colocando um herói de cada classe, nível típico daquela sala, contra cada monstro sozinho e contra cada
encontro sorteado. Saída em tabela:

- **TTK** (tempo para matar) do herói no monstro e do monstro no herói;
- dano recebido por encontro, em fração da vida do herói;
- quantas poções seriam necessárias.

Metas de partida (ajustar depois com telemetria):

| Medida | Meta |
|---|---|
| TTK de um comum por um herói solo | 2–6 s |
| Um comum sozinho mata um herói do nível esperado em | > 20 s |
| Encontro de sala (solo) | tira 40–70% da vida sem poção |
| Mini-boss solo | 20–40 s |
| Boss solo | 60–120 s (em equipe cai mais rápido, de propósito; toda fase precisa aparecer mesmo assim) |

### 8.2 Telemetria

- `stats.kills`, `killed_by` e `stats.damageTaken` já são por monstro: nada muda para os novos.
- `stats.specialDamage` passa a ser por habilidade (`"dragon:breath"`), não só por monstro.
- Novos contadores em `RunStats`: `ccTaken` (tempo preso/atordoado por efeito), `dodged` (golpes com aviso que o herói
  evitou: mede se o telegraph está justo), `resisted` (dano perdido por resistência) e `encounters` (composição de cada sala).
- **Metas no mapa:** nenhum monstro com mais de 35% das mortes; taxa de chegada ao boss entre 40% e 70%; `dodged`
  entre 30% e 70% (abaixo, o aviso é curto; acima, é fácil demais).
- Views: `telemetry_bestiary` (por monstro: abates, mortes causadas, dano médio, TTK médio) e a aba "O que mais mata" do
  painel passa a mostrar a habilidade.

### 8.3 Testes

- Teste unitário que confere todo `MonsterDef` contra a curva de ND (±25%) e se toda habilidade com `power ≥ 1,5` tem `windupMs`.
- Teste de fumaça por mecânica nova (agarrar, engolir, dividir, regenerar com fogo, mímico) na lista `SUITES` de
  `apps/server/scripts/all.ts`.

---

## 9. Plano de entrega (fases e PRs)

Cada fase é um ou mais PRs que mantêm o jogo jogável. Toda mudança em `maps.ts` sobe `RULES_VERSION`.

| Fase | Conteúdo | PRs | Depende de |
|---|---|---|---|
| **0. Preparação** | Registro visual `bestiary.ts`; tirar `shape`/`color` provisórios; simulador; levantar no pack os arquivos de cada monstro novo; ler `telemetry_deaths` e `telemetry_classes` por mapa e por `party_size` | 1–2 | — |
| **1. Motor** | `abilities[]` (com `special` migrado), aviso no chão, projétil de monstro, comportamentos (manter distância, recuar, fugir, investir), elementos em todo dano, resistências, efeitos novos no herói com imunidade de 4 s, Recarga 5–6 | 3–4 | 0 |
| **2. Retrabalho dos 12** | Seção 5 inteira; correção da Cobra e dos mini-bosses; fases dos bosses por % de vida | 2 (um por mapa) | 1 |
| **3. Cripta 2.0** | 8 comuns + Mímico, Cubo e Bugbear (6.1); animação procedural (7.2) | 2–3 | 2 |
| **4. Pântano 2.0** | 8 comuns + Bruxa e Naga Espiritual; Dragão negro como 2º boss (6.2) | 2–3 | 2 |
| **5. Encontros** | Orçamento de ameaça e tabelas por profundidade (4.8); rotação de mini-boss e boss; Campeões (4.9); `SOLO_LIMITS` e funções do banco atualizados | 1–2 | 3, 4 |
| **6. Profundezas** | Mapa novo (gerador, decoração, luz), 9 comuns, 3 mini-bosses, Verme Púrpura | 3–4 | 5 |
| **7. Necrópole** | Mapa novo, Lich com filactério | 3 | 6 |
| **8. Fornalha** | Mapa novo, Dragão vermelho adulto com Ações Lendárias e de Covil | 3 | 7 |
| **9. Bestiário no menu** | Aba "Bestiário" (estilo Monster Manual): monstros vistos, abates, lore, fraquezas descobertas | 1 | 3 |

**Primeiro passo concreto:** a fase 0 e a fase 1 juntas destravam tudo. As fases 3 e 4 entregam o "muito mais
inimigos" que o jogador sente; os mapas novos são a parte cara e devem esperar a telemetria das fases 2–5.

### 9.1 Pontos de atenção técnica

- **Hunt solo e banco:** monstros com mais loot mudam o máximo teórico por mapa. `SOLO_LIMITS.maxLoot` (shared) e as
  funções `start_solo_run`/`finish_solo_run` (banco) mudam juntos, em migration nova, com os advisors de segurança.
- **Mapa novo** = `MapId` novo no `packages/shared`, no banco (checagens de `map_id`, `SOLO_LIMITS`) e na telemetria
  (`map_id`), gerador próprio em `dungeon.ts` e `RULES_VERSION`.
- **Schema sincronizado:** `Monster` ganha poucos campos (`invisible`, `windup`, `champion`); efeitos do herói entram no
  `Player` como um campo de texto com os efeitos ativos (como o `dot` de hoje), para não inflar o estado.
- **Desempenho no celular:** encontros por orçamento limitam o número de monstros por sala (máx. 7); projéteis e avisos
  são efeitos locais do cliente, não estado sincronizado.
- **`hunt.ts` já tem 2.800 linhas.** A IA e as habilidades dos monstros saem para `apps/server/src/monsterAi.ts` na fase 1,
  com as mesmas restrições (sem Node, sem Colyseus, sem Supabase).

---

## 10. Riscos e decisões para o Leonardo

1. **Aviso no chão (telegraph) troca a regra do GDD** ("sem aviso"). Recomendo trocar: no celular o golpe sem aviso é
   dano que o jogador não consegue evitar. Contraponto: deixa os bosses mais fáceis, então o dano das habilidades com
   aviso sobe ~20% para compensar.
2. **Propriedade intelectual.** O SRD 5.1 é CC-BY-4.0 (pode usar com crédito). Beholder, Devorador de Mentes, Besta
   Deslocadora, Umber Hulk e Yuan-ti **não estão no SRD** e são marcas da Wizards. Para um jogo entre amigos o risco é
   baixo; se o Kusa for publicado ou monetizado, é real. Recomendo ficar no SRD e, se quiser um "olho flutuante",
   criar uma criatura própria com nome e visual diferentes.
3. **Tamanho da equipe (decidido): a dificuldade não muda.** Jogar em equipe é mais fácil de propósito. O plano não
   escala monstros pela equipe; as fases dos bosses saem por % de vida para aparecerem também em grupo.
4. **Monstro da Ferrugem destrói item?** No D&D, sim. No Kusa, perder item já é a punição da morte; recomendo só a
   corrosão temporária de armadura.
5. **Elementos em todo dano mexem no equilíbrio das classes.** O Cavaleiro (só físico) sofre contra limos e golems.
   Mitigação: cada mapa tem no máximo 2 monstros que resistem a físico, e o Cavaleiro ganha uma opção de dano de luz
   ou fogo no Grimório numa fase futura.
6. **Mapas novos custam caro** (gerador, decoração, arte de chão, balanceamento). Se o tempo for curto, as fases 3–5
   sozinhas já levam de 12 para ~38 monstros e dão rotação de mini-boss e boss, sem mapa novo.
7. **Nomes:** "Afogado" e "Naga guerreira" não são criaturas do D&D como estão. Proposta: o Afogado vira um Zumbi
   afogado (mesmo nome, regra do zumbi) e a Naga guerreira fica como versão menor da Guardian Naga. Os ids não mudam.
