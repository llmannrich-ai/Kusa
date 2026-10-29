# Gera um molde de posições por item (41 a 60) e grava a especificação em moldes.json.
import json, sys
from PIL import Image, ImageDraw, ImageFont
OUT = sys.argv[1]
F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
FB = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
GRID, BOX, BASE, EMPTY = (200, 200, 200), (40, 110, 220), (220, 40, 40), (170, 170, 170)

def dashed_rect(d, x0, y0, x1, y1, col, dash=12, w=3):
    for (a, b, c, e) in ((x0, y0, x1, y0), (x0, y1, x1, y1), (x0, y0, x0, y1), (x1, y0, x1, y1)):
        L = max(abs(c - a), abs(e - b)); n = int(L // dash)
        for i in range(0, n, 2):
            t0, t1 = i / n, min(1, (i + 1) / n)
            d.line((a + (c - a) * t0, b + (e - b) * t0, a + (c - a) * t1, b + (e - b) * t1), fill=col, width=w)

def sheet(name, W, H, rows, cols, tile, cells, flat=False, row_labels=None):
    """cells: lista por linha de (rótulo, largura_tiles, altura_tiles) ou None (vazio)."""
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    cw, ch = W / cols, H / rows
    spec = []; n = 0
    for r in range(rows):
        for c in range(cols):
            x0, y0 = c * cw, r * ch
            d.rectangle((x0 + 2, y0 + 2, x0 + cw - 2, y0 + ch - 2), outline=GRID, width=2)
            cell = cells[r][c]
            if cell is None:
                d.line((x0 + 20, y0 + 20, x0 + cw - 20, y0 + ch - 20), fill=EMPTY, width=3)
                d.line((x0 + cw - 20, y0 + 20, x0 + 20, y0 + ch - 20), fill=EMPTY, width=3)
                d.text((x0 + 10, y0 + 8), f"r{r+1} c{c+1} EMPTY", font=F, fill=EMPTY)
                spec.append({"linha": r + 1, "coluna": c + 1, "vazio": True}); continue
            label, wt, ht = cell; n += 1
            bw, bh = wt * tile, ht * tile
            assert bw <= cw - 16 and bh <= ch - 50, (name, label, bw, bh, cw, ch)
            bx0 = x0 + (cw - bw) / 2
            if flat:
                by0 = y0 + 40 + (ch - 40 - bh) / 2
            else:
                by0 = y0 + ch - 24 - bh
            dashed_rect(d, bx0, by0, bx0 + bw, by0 + bh, BOX)
            if not flat:
                d.line((x0 + 10, by0 + bh, x0 + cw - 10, by0 + bh), fill=BASE, width=4)
            d.text((x0 + 10, y0 + 8), f"{n}", font=FB, fill=(30, 30, 30))
            d.text((x0 + 10 + FB.getlength(f"{n} "), y0 + 8), label, font=F, fill=(60, 60, 60))
            spec.append({"posicao": n, "linha": r + 1, "coluna": c + 1, "figura": label,
                         "caixa_px": [round(bx0), round(by0), round(bx0 + bw), round(by0 + bh)],
                         "tamanho_tiles": [wt, ht]})
    im.save(f"{OUT}/{name}.png")
    return {"arquivo": f"{name}.png", "tamanho": f"{W}x{H}", "grade": f"{rows} linhas x {cols} colunas",
            "1_tile_px": tile, "vista": "plana, de cima" if flat else "em pé, pés na linha vermelha", "posicoes": spec}

M = {}
L = "(←)"  # olhando para a esquerda
def row(prefix, n, wt, ht, names=None, empty_last=False):
    out = [(f"{prefix} {i+1}" + (f" {names[i]}" if names else "") + f" {L}", wt, ht) for i in range(n)]
    if empty_last: out[-1] = None
    return out

# 41 hydra-B: 5 x 4, retrato
M["hydra-B"] = sheet("molde-41-hydra-B", 1024, 1536, 5, 4, 90, [
    row("walk", 4, 2.3, 2.5), row("attack", 4, 2.3, 2.5), row("acid rain", 4, 2.3, 2.5),
    row("death", 4, 2.3, 2.5, empty_last=True), row("dive", 4, 2.3, 2.5)])
# 42 hydra-C: 4 x 4
M["hydra-C"] = sheet("molde-42-hydra-C", 1024, 1024, 4, 4, 80, [
    row("1 head idle", 4, 2.4, 2.4), row("2 heads idle", 4, 2.4, 2.4),
    row("4 heads idle", 4, 2.4, 2.4), row("5 heads idle", 4, 2.4, 2.4)])
# 43 blackDragon-A: 2 x 6
views = ["front", "3/4 front ←", "profile ←", "3/4 back ←", "back", "3/4 back →"]
M["blackDragon-A"] = sheet("molde-43-blackDragon-A", 1536, 1024, 2, 6, 90, [
    [(f"idle {v}", 2.5, 2.5) for v in views], [(f"walk {v}", 2.5, 2.5) for v in views]])
# 44 blackDragon-B: 6 x 4
M["blackDragon-B"] = sheet("molde-44-blackDragon-B", 1024, 1536, 6, 4, 80, [
    row("walk", 4, 2.6, 2.2), row("attack", 4, 2.6, 2.2), row("acid breath", 4, 2.6, 2.2),
    row("death", 4, 2.6, 2.2, empty_last=True), row("darkness", 4, 2.6, 2.2, empty_last=True), row("dive", 4, 2.6, 2.2)])
# 45 a 48 árvores: 1 x 3
for o, id_, nm in ((45, "arv-cipreste", "cypress"), (46, "arv-salgueiro", "willow"), (47, "arv-mangue", "mangrove"), (48, "arv-morta", "dead tree")):
    M[id_] = sheet(f"molde-{o}-{id_}", 1536, 1024, 1, 3, 230,
                   [[(f"{nm} A", 2, 3), (f"{nm} B", 2, 2.6), (f"{nm} C", 2, 2.3)]])
# 49 e 50 plantas: 2 x 4 (1 tile = 300 px)
p1 = [("cattails", .8, 1), ("cattails seeding", .8, 1), ("big fern", 1, .7), ("tall reeds", .7, 1),
      ("blue iris", .7, .6), ("pitcher plants", .8, .6), ("giant toadstool", .8, .9), ("stump + fungus", 1, .7)]
p2 = [("thorny bush", 1, .7), ("dead snag", .8, .9), ("sedge", .7, .5), ("sedge B", .7, .5),
      ("bulrushes", .7, 1), ("bog myrtle", .9, .7), ("pale mushrooms", .7, .5), ("reeds + nest", .8, .9)]
M["plantas-altas-1"] = sheet("molde-49-plantas-altas-1", 1536, 1024, 2, 4, 300, [p1[:4], p1[4:]])
M["plantas-altas-2"] = sheet("molde-50-plantas-altas-2", 1536, 1024, 2, 4, 300, [p2[:4], p2[4:]])
# 51 a 55 decalques planos: 2 x 4, 1 tile = 300 px
dec = {
 (51, "chao-brejo-1"): ["leaf pile", "scattered leaves", "brown mushrooms", "red mushrooms", "twigs", "mud puddle", "bird tracks", "roots"],
 (52, "chao-brejo-2"): ["bones + ribcage", "mossy stone", "fairy ring", "moss", "moss B", "moss + flowers", "blood + rag", "rusted sword"],
 (53, "agua-enfeites"): ["lily pads", "lily pad", "water lily", "duckweed", "duckweed B", "cypress knees", "rotten log", "ripple ring"],
 (54, "ruinas-chao-1"): ["rubble", "rubble B", "long crack", "branching crack", "puddle", "missing slab", "weeds", "glyph"],
 (55, "ruinas-chao-2"): ["shards", "moss", "moss B", "skull + bones", "spear + shield", "offering bowl", "snake skin", "acid burn"]}
for (o, id_), names in dec.items():
    cells = [(n, 1, 1) for n in names]
    M[id_] = sheet(f"molde-{o}-{id_}", 1536, 1024, 2, 4, 300, [cells[:4], cells[4:]], flat=True)
# 56 ruínas em pé: 2 x 4, 1 tile = 220 px
ra = [("column drum", 1.5, .8), ("statue head", 1.3, 1.1), ("urn", .7, 1), ("pedestal", .9, 1.1),
      ("tilted slab", 1.2, .9), ("column stub", .9, 1), ("boulder", 1.2, .8), ("headless statue", .9, 1.9)]
M["ruinas-altas"] = sheet("molde-56-ruinas-altas", 1536, 1024, 2, 4, 220, [ra[:4], ra[4:]])
# 57 colunas: 1 x 4, 1 tile = 300 px
M["colunas"] = sheet("molde-57-colunas", 1536, 1024, 1, 4, 300,
                     [[("intact", 1, 2.5), ("broken mid", 1, 1.6), ("stump", 1.1, .7), ("ivy column", 1, 2.5)]])
# 58 muros: 2 x 4, 1 tile = 220 px
mw = [("wall L-R", 1, 1.1), ("wall up-down", .6, 1.6), ("outer corner", 1.2, 1.4), ("T-junction", 1.5, 1.4),
      ("cross", 1.5, 1.6), ("crumbling end", 1, 1.1), ("single block", .6, .8), ("low wall + gap", 1.5, .8)]
M["muros-kit"] = sheet("molde-58-muros-kit", 1536, 1024, 2, 4, 220, [mw[:4], mw[4:]])
# 59 mosaico: círculo de 5 tiles
im = Image.new("RGB", (1024, 1024), "white"); d = ImageDraw.Draw(im)
d.ellipse((42, 42, 982, 982), outline=BOX, width=4); d.ellipse((312, 312, 712, 712), outline=GRID, width=3)
d.text((20, 10), "1 mosaic: circle 5 tiles wide, hydra in the inner circle", font=F, fill=(60, 60, 60))
im.save(f"{OUT}/molde-59-mosaico-hidra.png")
M["mosaico-hidra"] = {"arquivo": "molde-59-mosaico-hidra.png", "tamanho": "1024x1024", "grade": "1 peça",
    "1_tile_px": 188, "vista": "plana, de cima",
    "posicoes": [{"posicao": 1, "figura": "mosaico circular", "caixa_px": [42, 42, 982, 982], "tamanho_tiles": [5, 5],
                  "nota": "hidra no círculo de dentro (312–712 px); fora do círculo, transparente"}]}
# 60 baús e portais: 2 x 3, 1 tile = 220 px
M["comum-baus-portais"] = sheet("molde-60-comum-baus-portais", 1536, 1024, 2, 3, 220, [
    [("chest closed", 1, .8), ("chest locked", 1, .9), ("chest open + gold", 1, 1)],
    [("chest open empty", 1, 1), ("boss portal (red)", 1.4, 2), ("escape portal (blue)", 1.4, 2)]])
json.dump(M, open(f"{OUT}/moldes.json", "w"), ensure_ascii=False, indent=1)
print(len(M))
