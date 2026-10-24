# Padrão de arte inspirado no Tibia — especificação

Referência de estilo para heróis, monstros e mapas. Complementa `docs/ARTE_HEROIS_PLANO.md` (que trata do
equipamento vestido) e vale para toda arte nova ou refeita. Nada aqui muda regra de jogo: é só cliente.

**Limite legal:** os sprites do Tibia são da CipSoft. Estudamos o **padrão** (grade, perspectiva, proporção,
luz, paleta, organização do mapa); não copiamos, traçamos nem recolorimos sprite nenhum.

---

## 1. Diagnóstico da arte atual (galeria `arte.html`)

| Área | Como está | Por que não lembra o Tibia |
|---|---|---|
| Proporção dos heróis | Cabeça de 13 px num corpo de 36 (≈36% da altura), cabeça mais larga que os ombros | É proporção *chibi*, leitura de RPG Maker. No Tibia a cabeça tem ≈25–28% e os ombros são mais largos que ela |
| Rosto | Olhos de 2 px com branco, boca desenhada | Rosto "fofo" e grande. No Tibia o rosto é quase só sombra: olhos de 1 px escuro, sem boca |
| Pose | Frente rígida e simétrica, braços colados, pés juntos | Tibia mostra peso: pernas afastadas, ombro de lá aparecendo, arma para fora da silhueta |
| Pintura | Luz calculada pela forma + Scale2x + bandas automáticas | Superfície lisa, "plástica". Tibia é pintado à mão: textura de material (malha, couro, pelo), dither, contorno quase preto |
| Cor | Cada classe é um bloco de uma cor (vermelho, amarelo, roxo, verde) | Tibia usa 4 zonas de cor por personagem (cabeça, tronco, pernas, detalhe) com tons médios e terrosos |
| Monstros | Três estilos lado a lado: pack Dungeon Crawl (CC0), arte própria do Pântano, orcs/ogros do Kosaradius | A tela mistura dialetos: sombra projetada em uns, sem em outros; contornos e saturação diferentes |
| Paredes | Face de 16 px (meio tile), tampa lisa | No Tibia a parede tem 1 tile de altura visível e "fecha" o corredor; é ela que dá a sensação de masmorra |
| Chão | Uma textura de terra por mapa, decoração esparsa e solta | Tibia tem variações de piso, **bordas** de transição entre terrenos e muito objeto pequeno agrupado |

O que já está bom e fica: grade de 32 px por tile, luz de cima à esquerda, decoração com variação por hash,
tochas com poça de luz na Cripta, equipamento visível (é decisão de jogo do Kusa, não existe no Tibia).

---

## 2. O que define o padrão Tibia

### 2.1 Grade e escala
- **32×32 px por tile**, 1 pixel de arte = 1 pixel na escala base. Tudo na tela tem a mesma densidade.
- Ampliação só **inteira e sem filtro** (vizinho mais próximo). Não existe pixel "meio tamanho".
- Objeto ou criatura grande ocupa 2 ou 4 tiles (32×64, 64×32, 64×64), ancorado no **tile de baixo à direita**
  e crescendo para cima e para a esquerda.

### 2.2 Perspectiva (oblíqua fixa)
- O chão é visto de cima. Tudo que tem altura (parede, pessoa, barril, árvore) é desenhado **em pé**, mostrando
  a face sul, e "sobe" para o tile de cima.
- Personagens e criaturas são desenhados com **deslocamento de ≈8 px para cima e para a esquerda** em relação
  ao tile. Isso cria a profundidade característica sem sombra projetada.
- **Não há sombra no chão** debaixo dos personagens. A profundidade vem do deslocamento e da ordem de desenho
  (de cima para baixo, da esquerda para a direita).

### 2.3 Luz, contorno e pintura
- Luz de **cima à esquerda**; sombra embaixo à direita (consenso da comunidade de *spriting*).
- **Contorno escuro** (quase preto, levemente quente) em volta da figura; linhas internas mais claras que o
  contorno externo.
- **3 a 5 tons por material**, sem degradê. Textura vem de padrão de pixel: malha em xadrez de 2 tons, couro
  com pontos, pelo com traços curtos, pedra com manchas.
- Saturação média e cores terrosas; cor viva só em acento (gema, olho, fogo, magia).

### 2.4 Personagens (outfits)
- Corpo de adulto atarracado: cabeça ≈1/4 da altura, ombros largos, mãos e pés grandes.
- **4 zonas de cor** (cabeça, primária, secundária, detalhe), aplicadas por máscara sobre o sprite em tons de
  cinza. A paleta do Tibia tem 133 cores (19 matizes × 7 tons). A identidade de quem é quem vem do outfit e
  dos *addons* (peças extras, ex.: chapéu, capa, arma nas costas).
- 4 direções, caminhada animada (8 quadros nos outfits modernos), alguns com animação parado.
- Ação (golpe, magia) quase não muda a pose: quem conta a ação é o **efeito** (projétil, explosão, número de dano).

### 2.5 Criaturas
- Mesmo dialeto dos personagens: mesma luz, contorno e densidade.
- Tamanho conta a ameaça: rato e inseto em 32×32; dragão e demônio em 64×64 (4 tiles).
- Silhueta reconhecível em preto; **2 cores dominantes + 1 acento**.
- Ao morrer, deixam **cadáver** que se decompõe em estágios (fresco → podre → ossos) e some. É uma das marcas
  visuais do jogo e enche o mapa de história da luta.

### 2.6 Mapa
- Piso com várias variações do mesmo terreno, sorteadas.
- **Bordas**: entre dois terrenos (grama e terra, terra e água) entram peças de transição (lados, cantos de
  dentro e de fora), em vez de corte reto de tile.
- Paredes com **1 tile de altura visível** e espessura; cantos e pontas próprios; tochas e adornos presos nelas.
- Muita "tralha" pequena (pedras, ossos, poças, teia, caixas, barris), sempre **agrupada** perto de paredes e
  cantos, nunca espalhada por igual.
- Escuridão ambiente com **raios de luz** (tocha, personagem, magia) nas áreas subterrâneas.

---

## 3. Especificação para o Kusa

### 3.1 Regras globais (valem para tudo)

| # | Regra | Valor |
|---|---|---|
| G1 | Densidade | **128 px de arte por tile** (4× o Tibia, decidido no protótipo para caber detalhe fino; é o limite em que 1 pixel de arte ainda vira ≈1 pixel de tela no celular) em toda arte nova. A arte de 32 px por tile que fica entra ampliada 4× até ser refeita |
| G2 | Refinamento | Sem Scale2x nem luz automática na arte nova: tons e textura pintados na grade. O `refine.ts` fica só para a arte antiga até ser trocada |
| G3 | Luz | Cima à esquerda, em todos os sprites e na decoração |
| G4 | Contorno | Externo `#1a1210` (1 px, igual em todas as figuras); interno no tom 0 do material vizinho |
| G5 | Tons | 4 por material (luz, base, sombra, fundo); 5 só em metal (com brilho) |
| G6 | Sombra projetada | Nenhuma no sprite. Se precisar destacar a figura do chão, uma elipse única do motor, igual para todos |
| G7 | Saturação | Base terrosa (S ≤ 55%); acima disso só gema, olho, fogo, magia e efeito |
| G8 | Ancoragem | Pés/base no tile; o que passa de 32 px sobe e vai para a esquerda (deslocamento de 6–8 px) |

### 3.2 Heróis

| # | Item | Hoje | Novo padrão |
|---|---|---|---|
| H1 | Altura do corpo | 36 px no quadro de 48 | 30–32 px de corpo (pés à cabeça), quadro de 48 para sobra de arma e chapéu |
| H2 | Cabeça | 13 px (≈36%) | 8–9 px de altura, ≈27% do corpo; largura menor que a dos ombros |
| H3 | Ombros | Mais estreitos que a cabeça | 12–14 px de largura, a parte mais larga da figura |
| H4 | Rosto | Olho de 2 px com branco, boca | Olho de 1 px escuro, sobrancelha/sombra de 1 px, sem boca; barba e cabelo fazem a expressão |
| H5 | Pose parada | Simétrica, pés juntos | Pés afastados 2–3 px, mão da arma à frente, quadril levemente virado; de lado, ombro de lá visível |
| H6 | Vista | Frente pura | Leve visão de cima: topo da cabeça e dos ombros aparecem (1–2 px), sola do pé não |
| H7 | Cor da classe | Bloco de uma cor | 4 zonas fixas por classe: **cabeça** (cabelo/capuz), **primária** (tronco), **secundária** (pernas), **detalhe** (cinto, botas, debrum). Tons médios |
| H8 | Equipamento | Repinta a peça inteira no material | Mantém o sistema atual de item vestido, mas a peça cobre a sua zona e deixa as outras zonas da classe à mostra (ex.: armadura cobre a primária; a secundária e o detalhe continuam na cor da classe) |
| H9 | Textura | Lisa | Cota de malha em xadrez, couro com pontos, tecido com dobra vertical de 1 px, metal com 1 brilho de 1–2 px |
| H10 | Caminhada | 3 quadros | 4 quadros (contato, passagem, contato, passagem) com balanço de 1 px |
| H11 | Ação | Herói parado + efeito | Continua assim (padrão Tibia). Opcional: 1 quadro de golpe/conjuração por classe |

Zonas sugeridas por classe (tons médios, ajustar no protótipo):

| Classe | Cabeça | Primária | Secundária | Detalhe | Marca que nenhum item cobre |
|---|---|---|---|---|---|
| Cavaleiro | castanho | vermelho-tijolo | cinza-aço | couro escuro | cicatriz, tabardo vermelho por cima da armadura |
| Paladino | loiro | ocre | marrom-oliva | couro claro | aljava nas costas, faixa na testa |
| Feiticeiro | branco (barba) | violeta escuro | cinza-azulado | dourado | barba longa, gola alta |
| Druida | castanho com folhas | verde-musgo | marrom | cobre | broche de folha, pintura no rosto |

Bônus: as 4 zonas são exatamente o que um **cosmético de cor** troca (`buy_cosmetic`), como o outfit do Tibia.

### 3.3 Monstros

| # | Regra |
|---|---|
| M1 | Um dialeto só. Os sprites do pack Dungeon Crawl são trocados por arte própria no padrão, começando pelos mais vistos (rato, goblin, esqueleto, orc, zumbi) |
| M2 | Tamanho por papel: comum 32×32 (cabe num tile); mini-boss 48×48; boss 64×64. Base no tile, sobe para cima e esquerda |
| M3 | Silhueta testada em preto: tem que dar para dizer o que é sem cor |
| M4 | 2 cores dominantes + 1 acento (olho, arma, veneno) |
| M5 | Mesmo contorno, luz e tons dos heróis (G3–G5); sem sombra própria no sprite |
| M6 | Parado com respiração de 2 quadros; andar de 2–4 quadros; golpe de 1–2 quadros |
| M7 | **Cadáver** em 3 estágios (fresco, podre, ossos) por família de corpo (humanoide, fera, inseto, morto-vivo), só visual no cliente |
| M8 | Variações do mesmo bicho (arqueiro, capitão, xamã) mudam **um acessório** (arco, elmo, cajado), não o corpo |

### 3.4 Mapas

| # | Regra |
|---|---|
| P1 | Piso: 4–8 variações por terreno + 1 detalhe raro (≈1 a cada 20 tiles), sorteados por `hash` |
| P2 | Bordas de transição entre terrenos (lados, cantos de dentro e de fora: 12 peças por par) |
| P3 | Parede com 32 px de face (hoje `WALL_RISE = 16`), tampa com espessura, ponta e canto próprios |
| P4 | Decoração em **grupos**: 60% do chão limpo, 30% com detalhe pequeno, 10% com objeto grande; grupos encostados em parede e canto |
| P5 | Paleta de 8–12 cores base por mapa (Cripta fria e cinza, Pântano verde-oliva, Deserto ocre), com monstros e heróis contrastando com ela |
| P6 | Luz: escuridão ambiente nos mapas subterrâneos, raio de luz no herói e nas tochas (a Cripta já faz; estender) |
| P7 | Marcas de luta: sangue, cadáver (M7) e item no chão ficam por um tempo e somem |

### 3.5 Legibilidade no celular (não negociável)
- O tile tem ≈46 px CSS em retrato. Todo detalhe de 1 px precisa ser **acento**, não informação: a classe e o
  monstro têm que ser reconhecíveis pela silhueta e pelas zonas de cor na tela real (`tamanho real` do provador).
- Testar sempre em 412×915 e 915×412 (Jogar deitado).

---

## 4. Checklist de aceitação de um sprite
- [ ] 128 px de arte por tile, sem refinamento automático (Scale2x).
- [ ] Contorno `#1a1210`, luz de cima à esquerda, 4 tons por material.
- [ ] Silhueta reconhecível em preto, no tamanho real do celular.
- [ ] Herói: cabeça ≈27% do corpo, ombros mais largos que a cabeça, 4 zonas de cor visíveis.
- [ ] Monstro: 2 cores + 1 acento, tamanho conforme o papel (M2), sem sombra própria.
- [ ] Nenhuma cor com saturação alta fora de acento.
- [ ] Lado a lado com 3 sprites já aprovados: parece do mesmo jogo.
- [ ] Nada traçado ou recolorido de sprite do Tibia.

---

## 5. Plano de execução

| Fase | Entrega | Custo | Impacto |
|---|---|---|---|
| 0. Protótipo | Cavaleiro sem equipamento no novo padrão (frente, lado, costas, 4 quadros), no provador ao lado do atual | baixo | decide se o padrão serve antes de refazer tudo |
| 1. Manequim | Novo esqueleto (`hero/rig.ts`) com as proporções H1–H6 e as 4 zonas; corpos das 4 classes | médio | resolve a maior parte do incômodo com os heróis |
| 2. Itens | Reencaixar armaduras, elmos e armas no manequim novo (o teste `arte.ts` aponta o que sair do quadro) | alto (≈3.300 linhas em `art/hero/`) | equipamento coerente com o corpo novo |
| 3. Monstros comuns | Trocar os 5 mais vistos do pack CC0 + cadáver (M7) | médio | acaba a mistura de estilos no começo do jogo |
| 4. Mapas | Parede de 32 px (P3), bordas (P2), grupos de decoração (P4) | médio | sensação de masmorra "tibiana" |
| 5. Resto | Demais monstros e bosses no padrão | alto | consistência total |

### Fase 0: protótipo (feito)

Código em `apps/client/src/art/proto/tibiaHero.ts`, só na galeria (`arte.html`, seções "Protótipo"); o jogo
continua com `heroes.ts`. Cavaleiro sem equipamento, frente, lado e costas, 4 quadros de caminhada, com 3 variações
de cor de exemplo.

- **1ª versão (32 px por tile, grades de letras):** proporção certa, mas pouco detalhe. Recusada: "precisa de
  mais detalhe fino, pixel menor".
- **2ª versão (64 px por tile):** formas com volume (esfera, cilindro, membro) e detalhe à mão. Recusada:
  "ainda mais detalhes, dobre mais uma vez".
- **3ª versão (128 px por tile, atual):** quadro 192×192, corpo de 128 px. As formas são desenhadas em unidades
  de projeto (o quadro de 96 da 2ª versão) e amostradas na resolução final; texturas e detalhes são pixel a pixel
  nela. Luz de cima à esquerda em 4 faixas com pontilhado na fronteira, linha escura onde uma peça passa na frente
  de outra, contorno quase preto na sombra e suave na luz. Detalhe novo: olho com pálpebra, íris, pupila e brilho;
  sobrancelha afinando; nariz com narina; lábios; barba por fazer; cicatriz; orelha com a curva de dentro; brilho
  em arco e redemoinho no cabelo; gibão com canais de 8 px e pontos de costura; manga acolchoada; punho bordado;
  dedos; cinto com costura, furos e fivela com pino; barra com losangos; sarja e dobra da calça; bota com poros,
  dobra do cano, cadarço e sola costurada; espada com gume, sulco, riscos, guarda gravada e cabo trançado.

![Atual × novo na mesma escala](arte/prototipo-tibia-comparacao.png)
![Detalhe ampliado 3×](arte/prototipo-tibia-detalhe.png)
![Quadros do protótipo](arte/prototipo-tibia-quadros.png)
![No chão com os monstros](arte/prototipo-tibia-cena.png)

Leitura da 3ª versão:
- É o limite útil: num celular com o tile de ≈120 px de tela, 128 px por tile já põe ≈1 pixel de arte por pixel
  de tela. Dobrar de novo não aparece no aparelho, só na galeria ampliada.
- Deixa de ser pixel art "de Tibia" e vira ilustração em pixel fino: o estilo se aproxima de jogos 2D de alta
  resolução. Os monstros e o chão (32 px por tile) ficam muito mais grossos ao lado.
- Custo: cada monstro, item vestido e enfeite de mapa no mesmo nível de detalhe custa várias vezes o atual. Arte
  por código nesse nível tende a ficar cara; vale avaliar desenhar em editor (Aseprite) e carregar PNG.
- Falta: aprovar o visual e decidir a Fase 1.

### Riscos
- **Retrabalho do sistema de itens:** mudar o manequim obriga a reencaixar cada item. Mitigação: manter a API de
  `rig.ts` (mesmos nomes de pontos e máscaras) e mudar só as medidas.
- **Herói menor na tela:** cabeça menor pode perder leitura no celular. Mitigação: a fase 0 é validada no tamanho real
  antes de seguir; se precisar, o herói continua em `HERO_SCALE` > 1.
- **Custo de arte por código:** pintar textura à mão em grade de código é lento. Alternativa a avaliar: desenhar no
  Aseprite/Pixelorama no padrão deste documento e carregar como PNG, mantendo por código só o recolorir das zonas.
