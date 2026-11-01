# Arte esculpida por código — protótipo (Escorpião da Areia)

Teste de até onde a arte de monstro feita **só por código** chega, como alternativa às folhas geradas por IA
(`docs/arte/cripta/`). Só na Arte nova (`Settings.newArt`); com ela desligada fica a arte antiga.

| Monstro | Modelo | Comparação |
|---|---|---|
| Escorpião da Areia e Escorpião Negro Gigante (mesmo modelo, outra casca) | `proto/scorpion.ts` | `docs/arte/escorpiao-escultura.png` |
| Abutre Gigante (voa: pena, asa e voo) | `proto/vulture.ts` | `docs/arte/abutre-escultura.png` |
| Múmia (humanoide: ataduras, ouro e lápis, olhos que acendem) | `proto/mummy.ts` | `docs/arte/mumia-escultura.png` |
| Sacerdote Mumificado (o modelo da múmia com toucado, saiote e cajado com ankh) | `proto/mummy.ts` | `docs/arte/mar-de-areia-escultura.png` |
| Elemental de Areia (funil de vento em espiral, pedras orbitando, desmorona em monte) | `proto/elemental.ts` | idem |
| Verme da Areia, chefe (sai da areia, goela de três lábios e dois anéis de dentes) | `proto/sandWorm.ts` | idem |

| Bosque Velho: Lobo Atroz, Pantera das Sombras e Centauro Renegado (um modelo de quadrúpede com as medidas de cada um; o centauro leva o tronco de homem e o arco) | `proto/forestBeasts.ts` | `docs/arte/bosque-velho-escultura.png` |
| Bosque Velho: Sátiro Flautista, Dríade Corrompida, Galhudo, Espinheiro, Guardião do Menir e Urso-coruja (o esqueleto da múmia com o corpo de cada um) | `proto/forestFolk.ts` | idem |
| Dragão Verde Jovem, chefe do Bosque Velho (asas de membrana em leque, pescoço e cauda em gomos, o sopro de gás) | `proto/greenDragon.ts` | idem |

| Charco Cinzento: os 10 inimigos (pele do charco nos modelos do verme, abutre, múmia, sacerdote, pantera, dríade, menir, guardião e Rei Galhado; o Lodo de Cinza é modelo novo) | `proto/charcoArt.ts`, `proto/ooze.ts` | `docs/arte/charco-cinzento-escultura.png` |
| Ermos Rubros: os 10 inimigos (pele dos ermos nos modelos do lobo, centauro, múmia, sacerdote, elemental, menir e Vorgak; o Escaravelho e o Lagarto-Couraça são modelos novos; Kragmor é o Vorgak na variante gigante) | `proto/ermosArt.ts`, `proto/beetle.ts`, `proto/forestBeasts.ts` (`lizard`), `proto/warlord.ts` (`"giant"`) | `docs/arte/ermos-rubros-escultura.png` |

Com isso o Mar de Areia inteiro está esculpido, menos os quatro que vêm da arte de IA da Cripta (esqueleto, arqueiro,
aranha e gnoll).

**Movimento fino**: cada clipe tem as poses-chave e `tween` (`sculpt.ts`) gera as do meio, suavizadas (entra e sai
devagar em cada pose-chave). Parado com 6 quadros, andar com 8, golpe e especial com 6, morte com 5; o número de
quadros vem do número de poses, e `sculptArt` acerta o ritmo (o golpe dura o mesmo com mais quadros) e o passo por
tile. A 2ª habilidade pode ter clipe próprio (`ClipPoses.skill`, o `skill` do jogo): a Rajada do Elemental e o Engolir
do Verme. Ciclos que se repetem (giro do Elemental, passo do escorpião) saem direto da fase, sem `tween`.

**Memória**: cada figura distinta fica na memória do celular. Andando de frente e de costas cada pose dura 2 quadros
(metade das figuras); parado de frente e de costas são 2 figuras. Fica em ≈ 3,3 MB por monstro de 144 px (≈ 5 MB o
Verme, de 176 px) e ≈ 25 MB os 7 esculpidos do mapa, carregados só na hunt do Mar de Areia (`warmMapMonsters`). Se o
celular reclamar, o primeiro corte é o parado de perfil (6 → 4) e o andar de frente e de costas (4 → 2 figuras).

As folhas saem por `proto/sculptArt.ts` (`sculptArt(poses, shoot)`): para um bicho novo, basta o modelo, a câmera e as
poses de cada clipe.

**Humanoides** (múmia): esqueleto por ângulos (quadril, joelho, ombro, cotovelo), e o pé mais baixo encosta sozinho no
chão; a linha do chão fica mais baixa no quadro (`sculptArt(..., feet)`), porque nada desce abaixo dela.

**Recursos do motor** (por material ou por `Look`):
- `Material.wrap`: ataduras em espiral, cada faixa num tom, com o vinco entre elas e pedaços faltando (mostra o
  material de baixo, a carne seca);
- `Material.emit`: brilho próprio (os olhos verdes do Olhar Pavoroso), sem luz nem sombra;
- `Look.shadow`: sombra projetada de uma parte na outra (braço no tronco), por mapa de sombra visto da luz;
- `Look.rim`: luz de contorno do lado oposto à luz, que destaca o bicho da areia;
- `Material.wrap.stripe`: listras alternadas (o toucado do sacerdote);
- `Shot.ground`: corta no chão (o que está abaixo da areia some: o verme entrando e saindo dela).
A sombra projetada e a luz de contorno são o padrão (`DEFAULT_SHADOW`, `DEFAULT_RIM`): todo monstro esculpido as
recebe, e quem precisa ajusta no `Look` (a múmia usa sombra mais forte; `shadow: 0` ou `rim: null` desligam).

**Voadores** (abutre): o corpo é desenhado já pairando acima do chão (o jogo só balança 3 px) e o perfil fica em
três-quartos (giro de 40°): de lado, a asa aberta vira uma faixa vertical. As asas são montadas pena a pena (cobertas,
secundárias e primárias em leque); `Material.lineDepth` baixo separa as penas finas umas das outras.

## Como funciona

1. **Escultura** (`apps/client/src/art/proto/sculpt.ts`): o bicho é montado com formas 3D simples — elipsoides e
   cones arredondados (que dão esferas e cápsulas). Anatomia em `proto/scorpion.ts`: carapaça, olhos, quelíceras,
   pinças com o dedo móvel, 8 patas por cinemática inversa, 7 placas, 5 gomos de cauda, vesícula e ferrão.
2. **Pose**: cada quadro é só um conjunto de ângulos (`Pose`): passo das patas (marcha tetrápode), curva da cauda,
   abertura das pinças, inclinação, rolar o corpo na morte.
3. **Foto em pixel art**: raio por pixel com interseção exata, luz de cima à esquerda (como o resto do jogo), oclusão
   pela profundidade, luz quente rebatida da areia, brilho na quitina, granulado em relevo preso à forma, rampas de cor
   à mão com matiz deslocado, pontilhado só nas transições, contorno colorido por fora e linhas onde uma parte passa
   na frente da outra.
4. **No jogo** (`proto/sculptArt.ts`, `bestiary.ts`): mesma ordem de quadros das folhas da Cripta (parado, andar,
   golpe, especial, morte, frente e costas). Cada figura é desenhada no aparelho quando a hunt pede, uma por vez
   (`hdStep`), e só nos mapas que têm o bicho. `MonsterAnim.origin` diz onde fica o apoio no quadro (a vista é de
   cima: as pinças de frente descem abaixo da base do tile).

## Números

| | Esculpido (código) | Folha de IA (Cripta) |
|---|---|---|
| Download | 0 (≈ 20 KB de código no bundle) | 100–570 KB de PNG por monstro |
| Figuras por monstro | 42 (55 quadros: movimento fino) | 21 |
| Tempo por figura, PC | ≈ 9 ms | decodificar o PNG |
| Tempo por figura, celular simulado (CPU 4× mais lenta) | ≈ 20–30 ms por figura (≈ 56 ms o Verme, maior), ≈ 0,9–1,4 s por monstro (≈ 2,6 s o Verme), uma por vez | — |
| Memória (textura) | ≈ 3,3 MB (≈ 5 MB o Verme) | ≈ 1,7–3 MB |
| Variante (outra cor, outro tamanho) | trocar a paleta: 0 KB | outra folha |
| Consistência entre quadros | exata (mesmo modelo) | varia (a IA redesenha) |

## 2º piloto: Orc batedor (o primeiro humanoide)

`apps/client/src/art/proto/orc.ts` (modelo e poses) e `orcArt.ts` (quadros no jogo), a partir do desenho da folha de
IA `docs/arte/pantano-do-kosaradius/orcScout-A.png` (que saiu do jogo: o batedor não baixa mais PNG nenhum). Folha:
`docs/arte/orc-batedor-escultura.png`.

- **Esqueleto em hierarquia**: pelve → tronco → cabeça (mandíbula, orelhas, moicano) e braços (ombro → cotovelo →
  punho → faca); pernas por cinemática inversa (o pé fica no chão, o joelho dobra para a frente). Cada pose é uma
  lista de ângulos (`OrcPose`).
- **Motor** (`sculpt.ts`), 4 recursos novos e opcionais: pintura presa à forma (`paint`: pintura de guerra, alça,
  sangue na lâmina), brilho próprio (`glow`: os olhos acesos na sombra), luz de recorte (`rim`: a borda de trás
  separa do chão escuro do brejo; hoje é a mesma luz de contorno que todo esculpido recebe por padrão, com a cor e a
  força do orc) e a força das linhas internas (`lineDepth` de cada material).
- **Movimento fino**: o parado respira (peito e ombros), passa o peso de um pé para o outro, pisca, dá um tique na
  orelha e gira a faca na mão; o andar tem os 8 tempos do passo (contato, descida, passagem, subida), a pelve quica e
  gira, os ombros giram ao contrário, a cabeça amortece o quique; o golpe tem antecipação, estocada, exagero, volta e
  assentar; na morte a faca escapa, gira no ar e para no chão. Moicano, rabo de cabelo, orelhas e as tiras da tanga
  seguem com atraso (follow-through) em todos os clipes.
- **Peso**: 43 figuras de 136 px (≈ 3 MB de textura, contra 0,5 MB das 6 figuras da folha de IA, que só tinha parado e
  andar), 0 KB baixados, ≈ 9 ms por figura no PC, desenhadas uma por vez no começo da hunt. Os quadros repetidos
  (o especial usa o golpe; frente e costas paradas vão e voltam) não ocupam memória a mais.
- Prévia: `npx tsx apps/client/scripts/orcPrevia.ts /tmp/orc.png 3`; no jogo:
  `/mapa.html?mapa=marsh&bichos=orcScout,orcGrunt`.

## 3º humanoide: Vorgak, o Senhor da Brasa (boss da Fortaleza Orc)

`apps/client/src/art/proto/warlord.ts` (modelo e poses) e `warlordArt.ts` (quadros no jogo, por `sculptArt`). O primeiro
boss feito só por código, e a única arte dele (vale com a arte nova ligada ou não).

- **Armadura de verdade**: elmo com viseira em fenda, chifres em 5 gomos, ombreiras de duas lâminas com espigões,
  peitoral com friso de latão pintado na forma (`paint`), saiote de placas que balança, joelheiras e grevas.
- **Brasa viva**: o fio do cutelo, as runas da lâmina, as três garras do peitoral e os olhos usam `emit`; a pose tem
  `flicker` (a fase do pulsar: as manchas mais quentes correm pelo fio) e `glow` (na morte, a brasa vira ferro frio e
  os olhos se apagam).
- **Pano e atraso**: o estandarte é um pano em 6 gomos que ondula (`wave`, `flap`) com a caveira chifruda pintada; o
  manto de lobo, a corrente com o gancho, o rabo de cabelo e a haste seguem com atraso em todos os clipes.
- **Movimento fino**: poses-chave com mistura profunda (pés e braços são objetos; `tween` próprio, a partir da pose
  parada completa): parado 8, andar 8, golpe 8, especial 8, salto 8 (o clipe a mais `skill`), morte 5.
- **Peso**: 200 px por figura (57 figuras distintas, ≈ 9 MB de textura, só na hunt da Fortaleza), ≈ 20 ms por figura
  no PC. Folha: `docs/arte/vorgak-escultura.png`; no jogo (412×915, ao lado do Ogro jovem e do Orc berserker): `docs/arte/vorgak-no-jogo.png`. Se o celular reclamar, o primeiro corte é o especial e o salto em 6.
- Prévia: `npx tsx apps/client/scripts/esculturaPrevia.ts /tmp/senhor.png 2 senhor`.
- Efeito próprio no cliente (`fx.ts`, `emberRift`): a fenda no chão abre, fica incandescente e esfria, com labaredas
  e brasas subindo (a câmera não treme).

## Limites (o que a IA ainda faz melhor)

- **Textura pintada**: sujeira, desgaste, pelos, cicatrizes. O esculpido tem granulado e brilho, mas parece mais
  "limpo". Funciona melhor em bichos de casca, osso, pedra, gosma (insetos, esqueletos, golems, elementais).
- **Rostos e roupas** (humanoides): a múmia funciona porque é "roupa justa" (ataduras), e o orc batedor mostrou que
  dá para um humanoide de pele à mostra (rosto pela silhueta: testa, focinho, presas, orelhas e olhos acesos). Tecido
  solto, cota de malha e armadura detalhada ainda ficam melhores na IA.
- **Custo de autoria**: o escorpião levou um modelo de ~250 linhas; cada criatura nova é um modelo, mas o motor e as
  poses-padrão (andar, golpe, morte) se reaproveitam.

## 3º lote: Bosque Velho (os 10 inimigos do mapa)

Três modelos cobrem o elenco inteiro, cada um com as medidas e materiais por bicho:
- **Quadrúpede** (`forestBeasts.ts`): peito, barriga e anca numa parte só (sem linha entre eles), pescoço, cabeça com
  focinho e mandíbula que abre, cauda em gomos e 4 pernas por cinemática inversa (cotovelo da frente e jarrete de trás
  dobrando para o lado certo); andar em trote, as diagonais juntas. O centauro usa o corpo de cavalo do mesmo modelo,
  com o tronco de homem em escala maior (`Z`), a pele de lobo, a aljava e o arco recurvo que puxa e solta.
- **Bípede** (`forestFolk.ts`): o esqueleto por ângulos da múmia; o corpo muda por bicho (pernas de bode de 3 partes e
  cascos, casca de bétula com rachaduras pintadas na forma, feixe de gravetos, moita de amora com espinhos que voam,
  pedras de menir com a espiral acesa pintada na forma, o urso com o disco facial e o peito de penas em faixas).
- **Dragão** (`greenDragon.ts`): quadro de 192 px; asas de morcego com 3 dedos e a membrana em lâminas finas entre eles.
- Luz da mata: a rebatida do chão é verde (`bounce` `#9ab860`) e a luz de contorno, verde-clara, para separar o bicho
  do capim. Tamanho na tela em `bestiary.ts` (o lobo é do tamanho de um pônei, o Guardião e o Urso-coruja os maiores).
- **Coração da Mata** (os mesmos dois modelos): o quadrúpede ganha o Javali-Espinho (focinho de disco, presas, cerdas
  com espinhos) e o Cervo Corrompido (galhada com musgo, manchas de podridão); o bípede ganha o Fungóide (o chapéu de
  pintas pintado na forma, a nuvem de esporos acesa), a Sombra Élfica (material com brilho próprio baixo, o arco de
  luz), o Cipó Estrangulador (feixe de cipós em espiral), a Árvore Desperta (tronco e copa de folhas), o Guardião Élfico
  Caído (placas e lâminas de luz) e o Rei Galhado (pernas de bode do sátiro em casca, a galhada e o anel de raízes da
  Fúria da Mata). Referência: `docs/arte/coracao-da-mata-escultura.png`.
- Prévia: `npx tsx apps/client/scripts/esculturaPrevia.ts /tmp/bicho.png 3 lobo` (e `pantera`, `centauro`, `satiro`,
  `driade`, `galhudo`, `espinheiro`, `menir`, `urso`, `dragao`, `javali`, `cervo`, `fungoide`, `sombra`, `cipo`, `arvore`,
  `guardiao`, `rei`); no jogo:
  `/mapa.html?mapa=oldwood&bichos=twigling,direWolf,satyr,thornSpitter,shadowPanther,owlbear,corruptedDryad,renegadeCentaur,menhirGuardian,greenDragon`.

## Ver e testar

- Folha em PNG, sem navegador: `npx tsx apps/client/scripts/esculturaPrevia.ts /tmp/bicho.png 3 [escorpiao|negro|abutre|mumia|sacerdote|elemental|verme]`
  (mostra também o tempo por quadro).
- No jogo, com o cenário de verdade e o mesmo posicionamento da hunt:
  `npm run dev:client` → `/mapa.html?mapa=desert&bichos=sandWorm,sandElemental,mummyPriest,mummy,zombie,giantVulture,sandScorpion,blackScorpion,goblin,giantSpider,stirge&antigo=1`.

## Peles: o mesmo modelo noutra cor (Charco Cinzento)

`Skin` e `applySkin` (`sculpt.ts`): cada cor da rampa de cada material vai para um tom-alvo mantendo o claro e o escuro
dela, então volume, luz e contorno ficam iguais; o que brilha (`emit`/`glow`) tem tom próprio e `ramps` troca a rampa
de um material pelo índice. Todo `shoot*` reaproveitado aceita a pele. Com isso o Charco ganhou 9 inimigos sem modelo
novo (só o Lodo é novo) e 0 KB baixados.

Nos Ermos Rubros, cada pele troca também a luz rebatida (`bounce`) e o contorno de luz (`rim`): os modelos da mata
vinham com a luz verde que sobe do chão; no barro vermelho ela é vermelha. Cuidado com o matiz: a pele leva cada cor
pelo caminho mais curto do círculo, então um modelo azulado (o centauro) com `amount` menor que 1 passa pelo roxo a
caminho do vermelho; use `amount: 1`. Os materiais com cor própria que não combinam (o líquen e o musgo do menir no
Golem de Minério) trocam de rampa inteira por `ramps`.
