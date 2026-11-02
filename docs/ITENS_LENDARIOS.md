# Itens lendários

Regras e números: `docs/GDD.md`, seção "Itens lendários". Catálogo: `LEGENDARIES` em `packages/shared/src/items.ts`.

## Ideia

O mágico é "o item com nome" do D&D; o lendário é **a peça que tem história**. Cada uma é única, de Dragão, e
mostra de onde veio no próprio desenho: a espada é um pedaço de céu apagado com borda de fogo, o machado é gelo que não
derrete, a couraça tem um coração em brasa batendo no peito. As peças de classe empurram uma escolha de build: o
Cajado da Geada Eterna faz o feiticeiro de gelo, o Cajado do Carvalho que Sonha faz o druida de lobos.

## Como é desenhado (por código)

Nada é baixado: as duas artes pintam o lendário a partir do desenho do mágico de Dragão da família.

- **Arte nova** (`apps/client/src/art/proto/tibiaHero.ts`, seção "Lendários"): cada função de item (`swordById`,
  `staffArt`, `helmetArt`, `armorTorso`...) chama o desenho de base e, se o slot veste um lendário, olha o que ela
  acabou de pintar (comparação com o quadro antes) e:
  1. repinta por grupo de material: metal, tecido/madeira/couro e brilho viram os 3 materiais da peça
     (`LEGEND_LOOKS`; materiais novos: obsidiana, gelo eterno, ouro, prata do luar, latão, cobre, sombra, asa
     iridescente), e o `accent` troca aros e rebites;
  2. pinta o enfeite próprio no pixel final, proporcional ao tamanho da peça (no ícone ampliado e no herói):

  | Peça | Materiais | Enfeite |
  |---|---|---|
  | Lâmina do Eclipse | obsidiana, sombra, brasa | borda de brasa em todo o fio |
  | Machado do Último Inverno | gelo, osso | borda branca e flocos acesos |
  | Couraça do Coração de Ferro | ferro negro, couro | coração de sangue com brasa no peito |
  | Elmo da Vigília Eterna | ouro, anil | olho de âmbar na testa |
  | Perneiras do Gigante de Pedra | pedra, musgo | musgo e folhas nas juntas |
  | Arco do Amanhecer Partido | ouro, brasa, branco | sol de ouro rachado em brasa no meio do arco |
  | Besta Relojoeira | latão, cobre | engrenagem de 8 dentes |
  | Varinha da Fênix Cinzenta | cinza, brasa | pena de cinza em brasa e fagulhas subindo da ponta |
  | Cajado da Geada Eterna | prata do luar, gelo | cristal de gelo flutuando acima da ponta |
  | Coroa do Olho Tempestuoso | cobre, anil, arcano | olho azul e faíscas (base: chapéu do Arquimago) |
  | Cajado do Carvalho que Sonha | musgo, madeira, folha | folhas e uma lua crescente na copa |
  | Manto de Mil Asas | asa iridescente | escamas âmbar, violeta e verde |
  | Cajado do Totem Rubro | osso, sangue, brasa | três pares de olhos em brasa |
  | Máscara do Grande Chefe | osso, chifre, ferro | presas e pena de corvo (base: elmo do Demônio) |
  | Passos de Ninguém | sombra, violeta | borda violeta |
  | Escudo Espelho da Lua | prata do luar | lua crescente no meio |
  | Calças do Vagante Astral | azul-noite | estrelas brancas e arcanas |

- **Arte antiga** (`apps/client/src/art/hero/legend.ts`): o mesmo mágico de Dragão com uma segunda troca de
  materiais (`Canvas.legend`, depois da troca do mágico). O ícone 16×16 usa a paleta da peça (`LEGEND_ICON` em
  `art/items.ts`) e uma gema laranja dupla no canto.
- **Prévia sem navegador:** `npx tsx apps/client/scripts/lendariosPrevia.ts saida.png 2` (cada lendário ao lado do
  mágico de base, de frente, de lado e de costas). Galeria no navegador: `apps/client/arte.html`, linha "Itens lendários".

## Para criar um lendário novo

1. Entrada em `LEGENDARIES` (chave sem hífen, família, história, propriedades; magias só da classe que veste).
2. `LEGEND_LOOKS` (arte nova), `LOOKS` em `art/hero/legend.ts` e `LEGEND_ICON` em `art/items.ts`.
3. Migration nova com a linha de `npx tsx apps/server/scripts/catalog-sql.ts`.
4. `npx tsx apps/server/scripts/lendarios.ts` (de dentro de `apps/server`) confere catálogo, força, arte e mecânica.
