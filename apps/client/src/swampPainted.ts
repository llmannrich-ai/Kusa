import * as Phaser from "phaser";
import { TILE_SIZE, Tile, tileAt, type Dungeon, type Rect } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import type { MapAmbience } from "./mapShared.ts";

/**
 * Pântano das Ruínas em arte pintada (teste de estilo): no lugar dos ladrilhos de pixel art, o chão é pintado
 * como uma ilustração, com formas orgânicas, gradientes suaves e pontos de luz, na mesma linguagem do Grimório
 * do menu (castanhos quentes, dourado e brilhos). O mapa é pintado em blocos de 8×8 tiles com 64 px por tile,
 * só perto da câmera, e desenhado suavizado (sem o filtro de pixel do resto do jogo). Tudo vem de `hash(x, y)`:
 * todos os jogadores veem o mesmo mapa, e nada disso muda a jogabilidade.
 */

/** Pixels por tile na pintura (a câmera mostra cada tile com ~130 px no celular; o resto é suavização). */
const RES = 64;
/** Lado do bloco pintado, em tiles. */
const CHUNK = 8;
/** Folga (tiles) em volta da tela: blocos nessa faixa são pintados antes de aparecer. */
const PREFETCH = 3;
/** Blocos além desta folga (tiles) voltam para a reserva. */
const KEEP = 6;

const enum Ground { Grass, Mud, Stone, Water, Forest }

/** Paleta: verdes oliva e azulados puxados para o castanho do Grimório; dourado nas luzes. */
const C = {
  grass: "#2b3d21",
  grassTones: ["#3f5a2c", "#4d6634", "#22331c", "#1a2a1a", "#5a5e2e", "#334a28"],
  blades: ["#6f8a45", "#58773a", "#2a3f1f", "#869a50", "#3c5a2a"],
  mud: "#3a2d1e",
  mudLight: "#54412a",
  mudDark: "#261d14",
  stoneGrout: "#2a241c",
  stones: ["#756a56", "#6a604e", "#80755e", "#62594a"],
  moss: "#4f6a2e",
  bank: "#21190f",
  rim: "#a7c7b8",
  water: "#1d3d48",
  waterDeep: "#10243a",
  waterLight: "#9fd2cc",
  forestFloor: "#0d170c",
  canopy: [
    { dark: "#142313", mid: "#2b4422", light: "#5d7c37" },
    { dark: "#13221a", mid: "#26422c", light: "#4f7a45" },
    { dark: "#1c2312", mid: "#3a4a22", light: "#7a8a3c" },
  ],
  canopyDeep: { dark: "#0a120a", mid: "#152515", light: "#2c4223" },
  trunk: "#3a2a1c",
  trunkLight: "#5a4430",
  gold: "#e8c66a",
  violet: "#b58cff",
} as const;

/** "#rrggbb" + alfa → rgba(). */
function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Mancha macia: gradiente radial da cor até transparente. */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number, rx = 1, ry = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(0.55, rgba(color, a * 0.55));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

/** Mapa já classificado: o que cada tile é, para a pintura decidir chão, margem e mata. */
interface Field {
  d: Dungeon;
  at(x: number, y: number): number;
  ground(x: number, y: number): Ground;
  /** Distância (em tiles, até 4) de um tile de mata até o chão andável mais perto: a mata escurece para dentro. */
  depth(x: number, y: number): number;
  special: Set<number>;
}

function buildField(d: Dungeon): Field {
  const at = (x: number, y: number) => tileAt(d, x, y);
  const ruins = [d.boss, ...d.side];
  const inRuins = (x: number, y: number) => ruins.some((r) => inside(r, x, y));
  const grounds = new Uint8Array(d.width * d.height);
  const depths = new Uint8Array(d.width * d.height).fill(4);
  const nearWater = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === Tile.Water) return true;
    return false;
  };
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++) {
      const t = at(x, y);
      grounds[y * d.width + x] = t === Tile.Water ? Ground.Water : t === Tile.Wall ? Ground.Forest
        : inRuins(x, y) ? Ground.Stone : nearWater(x, y) ? Ground.Mud : Ground.Grass;
    }
  // Profundidade da mata: quantos passos até sair dela (para escurecer o miolo).
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++) {
      if (at(x, y) !== Tile.Wall) { depths[y * d.width + x] = 0; continue; }
      let best = 4;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const t = at(x + dx, y + dy);
          if (t !== Tile.Wall && x + dx >= 0 && y + dy >= 0 && x + dx < d.width && y + dy < d.height)
            best = Math.min(best, Math.max(Math.abs(dx), Math.abs(dy)));
        }
      depths[y * d.width + x] = best;
    }
  const special = new Set([d.portal.y * d.width + d.portal.x]);
  special.add(Math.floor(d.boss.y + d.boss.h / 2) * d.width + Math.floor(d.boss.x + d.boss.w / 2));
  const outside = (x: number, y: number) => x < 0 || y < 0 || x >= d.width || y >= d.height;
  return {
    d,
    at,
    ground: (x, y) => (outside(x, y) ? Ground.Forest : grounds[y * d.width + x]),
    depth: (x, y) => (outside(x, y) ? 4 : depths[y * d.width + x]),
    special,
  };
}

/**
 * Contorno arredondado de um conjunto de tiles: um círculo em cada um e uma "cápsula" ligando vizinhos, mais
 * calombos sorteados na borda. Vira margem de lagoa e beira de mata sem a escada dos ladrilhos.
 */
function blobPath(
  f: Field, x0: number, y0: number, x1: number, y1: number, test: (g: Ground) => boolean, r: number, seed: number,
  keep: (x: number, y: number) => boolean = () => true,
) {
  const p = new Path2D();
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!test(f.ground(x, y)) || !keep(x, y)) continue;
      const cx = x + 0.5;
      const cy = y + 0.5;
      p.moveTo(cx + r, cy);
      p.arc(cx, cy, r, 0, Math.PI * 2);
      if (test(f.ground(x + 1, y))) p.rect(cx, cy - r, 1, r * 2);
      if (test(f.ground(x, y + 1))) p.rect(cx - r, cy, r * 2, 1);
      // Calombos na borda virada para fora: a margem deixa de ser reta.
      const edges = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
      edges.forEach(([dx, dy], k) => {
        if (test(f.ground(x + dx, y + dy))) return;
        const n = hash(x, y, seed + k);
        if (n > 0.55) return;
        const along = (hash(x, y, seed + 7 + k) - 0.5) * 0.8;
        const bx = cx + dx * (r - 0.05) + (dy ? along : 0);
        const by = cy + dy * (r - 0.05) + (dx ? along : 0);
        const br = 0.18 + n * 0.3;
        p.moveTo(bx + br, by);
        p.arc(bx, by, br, 0, Math.PI * 2);
      });
    }
  return p;
}

/** Pinta o bloco (cx, cy) no contexto (já do tamanho CHUNK·RES). */
function paintChunk(ctx: CanvasRenderingContext2D, f: Field, cx: number, cy: number) {
  const x0 = cx * CHUNK;
  const y0 = cy * CHUNK;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, CHUNK * RES, CHUNK * RES);
  ctx.setTransform(RES, 0, 0, RES, -x0 * RES, -y0 * RES);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  /** Percorre os tiles do bloco com `m` tiles de folga (o que passa da borda do vizinho também aparece aqui). */
  const each = (m: number, fn: (x: number, y: number) => void) => {
    for (let y = y0 - m; y < y0 + CHUNK + m; y++) for (let x = x0 - m; x < x0 + CHUNK + m; x++) fn(x, y);
  };
  const g = (x: number, y: number) => f.ground(x, y);

  // 1. Capim: fundo, manchas grandes de luz e sombra, e pinceladas de folhas.
  ctx.fillStyle = C.grass;
  ctx.fillRect(x0 - 1, y0 - 1, CHUNK + 2, CHUNK + 2);
  each(3, (x, y) => {
    const n = hash(x, y, 101);
    if (n > 0.45) return;
    const tone = C.grassTones[Math.floor(hash(x, y, 102) * C.grassTones.length)];
    glow(ctx, x + hash(x, y, 103), y + hash(x, y, 104), 1.2 + n * 2.6, tone, 0.32);
  });
  each(1, (x, y) => {
    if (g(x, y) !== Ground.Grass && g(x, y) !== Ground.Mud) return;
    // Tufos: algumas folhas abertas em leque a partir do mesmo pé, mais escuras que claras.
    const tufts = g(x, y) === Ground.Grass ? 3 : 1;
    for (let t = 0; t < tufts; t++) {
      const bx = x + hash(x, y, 110 + t);
      const by = y + hash(x, y, 120 + t);
      const blades = 3 + Math.floor(hash(x, y, 125 + t) * 3);
      const color = C.blades[Math.floor(hash(x, y, 150 + t) * C.blades.length)];
      glow(ctx, bx, by, 0.14, "#000000", 0.18, 1.6, 0.6);
      for (let i = 0; i < blades; i++) {
        const spread = (i / (blades - 1) - 0.5) * 0.22;
        const len = 0.08 + hash(x, y, 130 + t * 7 + i) * 0.1;
        ctx.strokeStyle = rgba(color, 0.4 + hash(x, y, 140 + t * 7 + i) * 0.35);
        ctx.lineWidth = 0.028;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + spread * 0.3, by - len * 0.6, bx + spread, by - len);
        ctx.stroke();
      }
    }
  });

  // 2. Lama em volta da água: manchas castanhas que se fundem com o capim.
  each(2, (x, y) => {
    if (g(x, y) !== Ground.Mud) return;
    glow(ctx, x + 0.5, y + 0.5, 1.1, C.mud, 0.9);
    if (hash(x, y, 201) < 0.4) glow(ctx, x + hash(x, y, 202), y + hash(x, y, 203), 0.45, C.mudDark, 0.7, 1.4, 0.8);
  });

  // 3. Lajes das ruínas: rejunte escuro, lajes com luz no alto à esquerda, rachaduras e musgo.
  ctx.save();
  each(1, (x, y) => {
    if (g(x, y) !== Ground.Stone) return;
    ctx.fillStyle = C.stoneGrout;
    ctx.fillRect(x - 0.02, y - 0.02, 1.04, 1.04);
  });
  each(1, (x, y) => {
    if (g(x, y) !== Ground.Stone) return;
    const split = hash(x, y, 301);
    const slabs: [number, number, number, number][] = split < 0.4 ? [[x, y, 1, 1]]
      : split < 0.7 ? [[x, y, 0.5 + (hash(x, y, 302) - 0.5) * 0.3, 1]] : [[x, y, 1, 0.45 + hash(x, y, 303) * 0.2]];
    if (slabs[0][2] < 1) slabs.push([x + slabs[0][2], y, 1 - slabs[0][2], 1]);
    else if (slabs[0][3] < 1) slabs.push([x, y + slabs[0][3], 1, 1 - slabs[0][3]]);
    slabs.forEach(([sx, sy, sw, sh], i) => {
      const base = C.stones[Math.floor(hash(x, y, 310 + i) * C.stones.length)];
      const grad = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
      grad.addColorStop(0, shade(base, 1.18));
      grad.addColorStop(1, shade(base, 0.82));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(sx + 0.04, sy + 0.04, sw - 0.08, sh - 0.08, 0.08);
      ctx.fill();
    });
    if (hash(x, y, 320) < 0.3) {
      ctx.strokeStyle = rgba(C.stoneGrout, 0.8);
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      const sx = x + 0.2 + hash(x, y, 321) * 0.6;
      ctx.moveTo(sx, y + 0.1);
      ctx.lineTo(sx + (hash(x, y, 322) - 0.5) * 0.3, y + 0.45);
      ctx.lineTo(sx + (hash(x, y, 323) - 0.5) * 0.5, y + 0.8);
      ctx.stroke();
    }
  });
  // Musgo e capim tomando a beira das ruínas.
  each(1, (x, y) => {
    if (g(x, y) !== Ground.Stone) return;
    const edge = [g(x + 1, y), g(x - 1, y), g(x, y + 1), g(x, y - 1)].some((v) => v !== Ground.Stone);
    // Terra acumulada entre as lajes.
    if (hash(x, y, 333) < 0.22) glow(ctx, x + hash(x, y, 334), y + hash(x, y, 335), 0.6, C.mudDark, 0.35);
    if (edge || hash(x, y, 330) < 0.18) glow(ctx, x + hash(x, y, 331), y + hash(x, y, 332), edge ? 0.7 : 0.45, C.moss, edge ? 0.75 : 0.5);
  });
  ctx.restore();

  // 4. Lagoas: barranco escuro, borda clara e a água com fundo, reflexos e vitórias-régias.
  const water = (v: Ground) => v === Ground.Water;
  const wx0 = x0 - 2;
  const wy0 = y0 - 2;
  const wx1 = x0 + CHUNK + 1;
  const wy1 = y0 + CHUNK + 1;
  ctx.fillStyle = rgba(C.bank, 0.9);
  ctx.fill(blobPath(f, wx0, wy0, wx1, wy1, water, 0.86, 401));
  ctx.fillStyle = rgba(C.rim, 0.35);
  ctx.fill(blobPath(f, wx0, wy0, wx1, wy1, water, 0.74, 401));
  const pond = blobPath(f, wx0, wy0, wx1, wy1, water, 0.7, 401);
  ctx.fillStyle = C.water;
  ctx.fill(pond);
  ctx.save();
  ctx.clip(pond);
  each(2, (x, y) => {
    if (!water(g(x, y))) return;
    const deep = [g(x + 1, y), g(x - 1, y), g(x, y + 1), g(x, y - 1)].every(water);
    if (deep) glow(ctx, x + 0.5, y + 0.5, 1.4, C.waterDeep, 0.85);
    // Céu refletido: um toque frio de violeta, como os orbes do Grimório.
    if (hash(x, y, 410) < 0.12) glow(ctx, x + 0.5, y + 0.5, 1.6, C.violet, 0.1, 1.6, 0.7);
  });
  each(1, (x, y) => {
    if (!water(g(x, y))) return;
    // Reflexos: traços horizontais claros e finos.
    if (hash(x, y, 420) < 0.45) {
      const rx = x + hash(x, y, 421) * 0.6;
      const ry = y + 0.2 + hash(x, y, 422) * 0.6;
      ctx.strokeStyle = rgba(C.waterLight, 0.22);
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 0.25 + hash(x, y, 423) * 0.35, ry);
      ctx.stroke();
    }
  });
  ctx.restore();
  each(1, (x, y) => {
    if (!water(g(x, y))) return;
    const deep = [g(x + 1, y), g(x - 1, y), g(x, y + 1), g(x, y - 1)].every(water);
    const n = hash(x, y, 430);
    if (deep && n < 0.18) lilyPad(ctx, x + 0.25 + hash(x, y, 431) * 0.5, y + 0.25 + hash(x, y, 432) * 0.5, 0.16 + n, hash(x, y, 433));
  });

  // 5. Juncos na lama da margem: hastes com a espiga castanha.
  each(1, (x, y) => {
    if (g(x, y) !== Ground.Mud || f.special.has(y * f.d.width + x)) return;
    const byWater = [g(x + 1, y), g(x - 1, y), g(x, y + 1), g(x, y - 1)].some(water);
    if (!byWater || hash(x, y, 501) > 0.45) return;
    reeds(ctx, x + 0.2 + hash(x, y, 502) * 0.6, y + 0.85, hash(x, y, 503));
  });

  // 6. Mata: sombra no chão, chão escuro, troncos na beira e copas em camadas.
  const forest = (v: Ground) => v === Ground.Forest;
  const grove = (x: number, y: number) => [g(x + 1, y), g(x - 1, y), g(x, y + 1), g(x, y - 1)].some(forest);
  const fx0 = x0 - 2;
  const fy0 = y0 - 2;
  const fx1 = x0 + CHUNK + 1;
  const fy1 = y0 + CHUNK + 1;
  // Sombra macia que a mata joga no chão (para baixo e um pouco para a direita).
  each(2, (x, y) => {
    if (!forest(g(x, y)) || f.depth(x, y) > 1) return;
    if (!grove(x, y)) return glow(ctx, x + 0.6, y + 0.85, 0.6, "#050a05", 0.5, 1.2, 0.7);
    glow(ctx, x + 0.62, y + 0.85, 0.95, "#050a05", 0.5, 1.1, 0.9);
  });
  // Chão escuro da mata (árvore sozinha no campo fica sem ele, só com a própria sombra).
  ctx.fillStyle = C.forestFloor;
  ctx.fill(blobPath(f, fx0, fy0, fx1, fy1, forest, 0.7, 601, grove));
  each(1, (x, y) => {
    if (!forest(g(x, y)) || forest(g(x, y + 1))) return;
    // Beira de baixo: o tronco aparece por baixo da copa.
    const tx = x + 0.38 + hash(x, y, 610) * 0.24;
    glow(ctx, tx, y + 0.98, 0.32, "#000000", 0.5, 1.4, 0.5);
    const grad = ctx.createLinearGradient(tx - 0.1, 0, tx + 0.1, 0);
    grad.addColorStop(0, C.trunkLight);
    grad.addColorStop(1, C.trunk);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(tx - 0.08, y + 0.4);
    ctx.lineTo(tx + 0.08, y + 0.4);
    ctx.quadraticCurveTo(tx + 0.1, y + 0.85, tx + 0.2, y + 0.98);
    ctx.lineTo(tx - 0.2, y + 0.98);
    ctx.quadraticCurveTo(tx - 0.1, y + 0.85, tx - 0.08, y + 0.4);
    ctx.fill();
  });
  each(2, (x, y) => {
    if (!forest(g(x, y))) return;
    const depth = f.depth(x, y);
    const edgeBelow = !forest(g(x, y + 1));
    const pal = depth >= 3 ? C.canopyDeep : C.canopy[Math.floor(hash(x, y, 620) * C.canopy.length)];
    const puffs = depth >= 3 ? 1 : 3;
    for (let i = 0; i < puffs; i++) {
      const px = x + 0.5 + (hash(x, y, 630 + i) - 0.5) * 0.5;
      const py = y + (edgeBelow ? 0.32 : 0.45) + (hash(x, y, 640 + i) - 0.5) * 0.4 - i * 0.06;
      const r = (depth >= 3 ? 0.72 : 0.42 + hash(x, y, 650 + i) * 0.22) * (i === 0 ? 1.1 : 1);
      canopyPuff(ctx, px, py, r, pal, depth);
    }
  });

  // 7. Muros e colunas caídas das ruínas.
  each(1, (x, y) => {
    if (f.at(x, y) !== Tile.Ruin) return;
    const joined = [f.at(x - 1, y), f.at(x + 1, y), f.at(x, y - 1), f.at(x, y + 1)].includes(Tile.Ruin);
    if (joined) ruinWall(ctx, f, x, y);
    else column(ctx, x, y, hash(x, y, 701));
  });

  // 8. Enfeites do chão: flores, pedrinhas e cogumelos que brilham perto das árvores.
  each(1, (x, y) => {
    const v = g(x, y);
    if (f.special.has(y * f.d.width + x) || f.at(x, y) === Tile.Ruin) return;
    const n = hash(x, y, 801);
    const px = x + 0.2 + hash(x, y, 802) * 0.6;
    const py = y + 0.2 + hash(x, y, 803) * 0.6;
    if (v === Ground.Grass) {
      const byTrees = [g(x + 1, y), g(x - 1, y), g(x, y + 1), g(x, y - 1)].some(forest);
      if (byTrees && n < 0.22) mushrooms(ctx, px, py, hash(x, y, 804) < 0.6 ? C.gold : C.violet);
      else if (n < 0.06) flowers(ctx, px, py, hash(x, y, 805) < 0.5 ? "#f2ead2" : "#c9a8ff", hash(x, y, 806));
      else if (n < 0.09) pebbles(ctx, px, py, hash(x, y, 807));
    } else if (v === Ground.Stone && n < 0.06) pebbles(ctx, px, py, hash(x, y, 808));
  });

  // 9. Luz: poças de luz dourada caindo pelas copas e sombras largas, para o chão não ficar chapado.
  each(3, (x, y) => {
    const n = hash(x, y, 901);
    if (n < 0.035) glow(ctx, x + 0.5, y + 0.5, 2.6 + n * 20, "#f0d48a", 0.12);
    else if (n > 0.965) glow(ctx, x + 0.5, y + 0.5, 3, "#000000", 0.16);
  });
}

/** Escurece ou clareia uma cor "#rrggbb" (k < 1 escurece). */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function canopyPuff(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pal: { dark: string; mid: string; light: string }, depth: number) {
  // Sombra própria embaixo, corpo em gradiente com luz no alto à esquerda e folhas mais claras na borda de cima.
  if (depth < 3) glow(ctx, x + r * 0.1, y + r * 0.3, r * 1.05, "#000000", 0.3);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, pal.light);
  g.addColorStop(0.45, pal.mid);
  g.addColorStop(1, pal.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  // Contorno de copa: círculo com recortes de folhagem.
  const lobes = 9;
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const rr = r * (0.9 + 0.1 * Math.sin(i * 2.7 + x * 3.1 + y * 1.7));
    const ax = x + Math.cos(a) * rr;
    const ay = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(ax, ay);
    else {
      const m = a - Math.PI / lobes;
      ctx.quadraticCurveTo(x + Math.cos(m) * rr * 1.12, y + Math.sin(m) * rr * 1.12, ax, ay);
    }
  }
  ctx.fill();
  if (depth >= 3) return;
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI * 0.75 + (i - 1.5) * 0.45;
    glow(ctx, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.35, pal.light, 0.35);
  }
}

function lilyPad(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number) {
  const start = n * Math.PI * 2;
  glow(ctx, x + 0.03, y + 0.05, r * 1.2, "#000000", 0.35);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, "#7fae55");
  g.addColorStop(1, "#2f5a2a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, start + 0.35, start + Math.PI * 2 - 0.05);
  ctx.closePath();
  ctx.fill();
  if (n < 0.3) {
    // Flor de lótus com um brilho leve.
    glow(ctx, x, y, r * 1.4, "#ffc9e0", 0.25);
    ctx.fillStyle = "#f4c8da";
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25, r * 0.28, r * 0.12, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function reeds(ctx: CanvasRenderingContext2D, x: number, y: number, n: number) {
  glow(ctx, x, y, 0.3, "#000000", 0.3, 1.5, 0.5);
  const count = 3 + Math.floor(n * 3);
  for (let i = 0; i < count; i++) {
    const bx = x + (i - count / 2) * 0.07;
    const h = 0.45 + hash(i, n * 1000, 1) * 0.35;
    const lean = (hash(i, n * 1000, 2) - 0.5) * 0.2;
    ctx.strokeStyle = i % 2 ? "#7a8a45" : "#5a6b32";
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(bx, y);
    ctx.quadraticCurveTo(bx + lean * 0.2, y - h * 0.6, bx + lean, y - h);
    ctx.stroke();
    if (i % 2 === 0) {
      ctx.fillStyle = "#5a3a22";
      ctx.beginPath();
      ctx.ellipse(bx + lean * 0.85, y - h * 0.85, 0.035, 0.09, lean, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function mushrooms(ctx: CanvasRenderingContext2D, x: number, y: number, light: string) {
  // Cogumelos que brilham de leve: o dourado e o violeta do Grimório dentro da mata.
  glow(ctx, x, y, 0.55, light, 0.22);
  for (const [dx, dy, r] of [[0, 0, 0.09], [0.13, 0.06, 0.065], [-0.1, 0.08, 0.05]] as const) {
    ctx.fillStyle = "#d9cfb4";
    ctx.fillRect(x + dx - 0.012, y + dy, 0.024, r * 1.1);
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, r, r * 0.6, 0, Math.PI, 0);
    ctx.fill();
  }
}

function flowers(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, n: number) {
  for (let i = 0; i < 4; i++) {
    const fx = x + (hash(i, n * 997, 3) - 0.5) * 0.4;
    const fy = y + (hash(i, n * 997, 4) - 0.5) * 0.4;
    glow(ctx, fx, fy, 0.08, color, 0.4);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(fx, fy, 0.03, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pebbles(ctx: CanvasRenderingContext2D, x: number, y: number, n: number) {
  for (let i = 0; i < 2 + Math.floor(n * 3); i++) {
    const px = x + (hash(i, n * 991, 5) - 0.5) * 0.4;
    const py = y + (hash(i, n * 991, 6) - 0.5) * 0.3;
    const r = 0.04 + hash(i, n * 991, 7) * 0.05;
    glow(ctx, px + 0.01, py + r * 0.7, r * 1.4, "#000000", 0.35);
    const g = ctx.createRadialGradient(px - r * 0.4, py - r * 0.4, 0, px, py, r);
    g.addColorStop(0, "#b3aa95");
    g.addColorStop(1, "#5a5346");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, py, r * 1.2, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ruinWall(ctx: CanvasRenderingContext2D, f: Field, x: number, y: number) {
  const front = f.at(x, y + 1) !== Tile.Ruin;
  const topH = front ? 0.45 : 1;
  // Sombra no chão para baixo e para a direita.
  if (front) glow(ctx, x + 0.6, y + 1.05, 0.7, "#000000", 0.4, 1.3, 0.5);
  // Face da frente (escura) e o topo (claro), com fiadas de pedra e musgo pingando.
  if (front) {
    const g = ctx.createLinearGradient(0, y + topH, 0, y + 1);
    g.addColorStop(0, "#5f5546");
    g.addColorStop(1, "#3a3329");
    ctx.fillStyle = g;
    ctx.fillRect(x, y + topH, 1.001, 1 - topH);
    ctx.strokeStyle = "rgba(26,21,15,0.7)";
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(x, y + topH + 0.27);
    ctx.lineTo(x + 1, y + topH + 0.27);
    const off = hash(x, y, 711) * 0.5;
    ctx.moveTo(x + off + 0.2, y + topH);
    ctx.lineTo(x + off + 0.2, y + topH + 0.27);
    ctx.moveTo(x + off + 0.45, y + topH + 0.27);
    ctx.lineTo(x + off + 0.45, y + 1);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(x, y, x + 1, y + topH);
  g.addColorStop(0, "#a69a80");
  g.addColorStop(1, "#7d7260");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, 1.001, topH + 0.001);
  ctx.strokeStyle = "rgba(255,240,210,0.25)";
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(x, y + 0.01);
  ctx.lineTo(x + 1, y + 0.01);
  ctx.stroke();
  if (hash(x, y, 712) < 0.5) glow(ctx, x + hash(x, y, 713), y + topH, 0.35, C.moss, 0.8, 1.2, 0.7);
  // Runa antiga ainda acesa em algumas pedras: o dourado do Grimório.
  if (front && hash(x, y, 714) < 0.18) {
    const rx = x + 0.5;
    const ry = y + topH + (1 - topH) / 2;
    glow(ctx, rx, ry, 0.35, C.gold, 0.45);
    ctx.strokeStyle = "#ffe7a0";
    ctx.lineWidth = 0.025;
    ctx.beginPath();
    ctx.moveTo(rx, ry - 0.14);
    ctx.lineTo(rx, ry + 0.14);
    ctx.moveTo(rx - 0.09, ry - 0.05);
    ctx.lineTo(rx + 0.09, ry + 0.05);
    ctx.stroke();
  }
}

function column(ctx: CanvasRenderingContext2D, x: number, y: number, n: number) {
  const cx = x + 0.5;
  const broken = n < 0.5;
  const top = broken ? y + 0.25 + n * 0.3 : y - 0.25;
  // Sombra, base quadrada, fuste com luz à esquerda e capitel (ou o toco quebrado).
  glow(ctx, cx + 0.2, y + 0.92, 0.55, "#000000", 0.45, 1.4, 0.5);
  ctx.fillStyle = "#6e6452";
  ctx.beginPath();
  ctx.roundRect(cx - 0.34, y + 0.72, 0.68, 0.22, 0.04);
  ctx.fill();
  const g = ctx.createLinearGradient(cx - 0.22, 0, cx + 0.22, 0);
  g.addColorStop(0, "#cfc5ab");
  g.addColorStop(0.45, "#a49a82");
  g.addColorStop(1, "#5e5546");
  ctx.fillStyle = g;
  ctx.fillRect(cx - 0.22, top + 0.08, 0.44, y + 0.76 - top - 0.08);
  ctx.fillStyle = broken ? "#8f866f" : "#b8ae94";
  ctx.beginPath();
  if (broken) {
    ctx.moveTo(cx - 0.22, top + 0.1);
    ctx.lineTo(cx - 0.05, top);
    ctx.lineTo(cx + 0.08, top + 0.08);
    ctx.lineTo(cx + 0.22, top + 0.03);
    ctx.lineTo(cx + 0.22, top + 0.14);
    ctx.lineTo(cx - 0.22, top + 0.16);
  } else {
    ctx.roundRect(cx - 0.3, top, 0.6, 0.12, 0.03);
  }
  ctx.fill();
  if (broken) {
    pebbles(ctx, cx + 0.32, y + 0.85, n + 0.3);
  }
}

/** Reserva de telas pintadas: um bloco que sai de perto da câmera devolve a sua para outro usar. */
interface Painted { key: string; tex: Phaser.Textures.CanvasTexture; img: Phaser.GameObjects.Image }

/** Desenha o Pântano das Ruínas pintado; devolve o ambiente (pintura dos blocos, vaga-lumes, névoa e ondas). */
export function drawSwampPainted(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  const field = buildField(d);
  const cols = Math.ceil(d.width / CHUNK);
  const rows = Math.ceil(d.height / CHUNK);
  const live = new Map<number, Painted>();
  const free: Painted[] = [];
  let made = 0;

  const paint = (cx: number, cy: number) => {
    let slot = free.pop();
    if (!slot) {
      const key = `swamp-painted-${made++}`;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const tex = scene.textures.createCanvas(key, CHUNK * RES, CHUNK * RES)!;
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      const img = scene.add.image(0, 0, key).setOrigin(0).setScale(TILE_SIZE / RES).setDepth(floorDepth);
      slot = { key, tex, img };
    }
    paintChunk(slot.tex.getContext(), field, cx, cy);
    slot.tex.refresh();
    slot.img.setPosition(cx * CHUNK * TILE_SIZE, cy * CHUNK * TILE_SIZE).setVisible(true);
    live.set(cy * cols + cx, slot);
  };

  const range = (v: Phaser.Geom.Rectangle, margin: number) => {
    const span = CHUNK * TILE_SIZE;
    const m = margin * TILE_SIZE;
    return {
      x0: Math.max(0, Math.floor((v.x - m) / span)),
      y0: Math.max(0, Math.floor((v.y - m) / span)),
      x1: Math.min(cols - 1, Math.floor((v.right + m) / span)),
      y1: Math.min(rows - 1, Math.floor((v.bottom + m) / span)),
    };
  };

  const ambience = createAmbience(scene, d, uiDepth);
  return {
    update(time: number) {
      const v = scene.cameras.main.worldView;
      if (v.width === 0) return;
      // Devolve os blocos longe da câmera.
      const keep = range(v, KEEP);
      for (const [k, slot] of live) {
        const cx = k % cols;
        const cy = Math.floor(k / cols);
        if (cx < keep.x0 || cx > keep.x1 || cy < keep.y0 || cy > keep.y1) {
          slot.img.setVisible(false);
          live.delete(k);
          free.push(slot);
        }
      }
      // O que está na tela é pintado já; a folga em volta, um bloco por quadro (o mais perto primeiro).
      const now = range(v, 0);
      for (let cy = now.y0; cy <= now.y1; cy++) for (let cx = now.x0; cx <= now.x1; cx++) if (!live.has(cy * cols + cx)) paint(cx, cy);
      const pre = range(v, PREFETCH);
      let next: [number, number] | undefined;
      let best = Infinity;
      const mx = v.centerX / (CHUNK * TILE_SIZE) - 0.5;
      const my = v.centerY / (CHUNK * TILE_SIZE) - 0.5;
      for (let cy = pre.y0; cy <= pre.y1; cy++)
        for (let cx = pre.x0; cx <= pre.x1; cx++) {
          if (live.has(cy * cols + cx)) continue;
          const dist = Math.hypot(cx - mx, cy - my);
          if (dist < best) { best = dist; next = [cx, cy]; }
        }
      if (next) paint(next[0], next[1]);
      ambience.update(time);
    },
  };
}

const TEX = { firefly: "swamp-painted-firefly", mist: "swamp-painted-mist", ring: "swamp-painted-ring" };
const MIST_COUNT = 7;
const RIPPLE_EVERY_MS = 320;

/** Texturas do ambiente: vaga-lume (ponto dourado com halo), névoa e anel de onda, todas suaves. */
function createAmbienceArt(scene: Phaser.Scene) {
  const make = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, w, h)!;
    draw(tex.getContext());
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  };
  make(TEX.firefly, 32, 32, (ctx) => {
    glow(ctx, 16, 16, 16, "#f3d77a", 0.55);
    glow(ctx, 16, 16, 4, "#fff6d0", 1);
  });
  make(TEX.mist, 256, 112, (ctx) => glow(ctx, 128, 56, 56, "#cfdccf", 0.3, 2.2, 0.95));
  make(TEX.ring, 64, 64, (ctx) => {
    ctx.strokeStyle = "rgba(190,225,220,0.8)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(32, 32, 28, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** Vaga-lumes dourados, névoa baixa e ondinhas que se abrem na água à vista. */
function createAmbience(scene: Phaser.Scene, d: Dungeon, uiDepth: number): MapAmbience {
  createAmbienceArt(scene);
  const cam = scene.cameras.main;
  const fireflies = scene.add.particles(0, 0, TEX.firefly, {
    lifespan: { min: 3500, max: 7000 },
    speed: { min: 3, max: 12 },
    angle: { min: 0, max: 360 },
    alpha: { values: [0, 1, 0.25, 0.9, 0.15, 1, 0], interpolation: "linear" },
    scale: { min: 0.25, max: 0.45 },
    frequency: 260,
    quantity: 1,
    maxAliveParticles: 22,
    blendMode: Phaser.BlendModes.ADD,
    emitZone: {
      type: "random",
      source: new Phaser.Geom.Rectangle(0, 0, 1, 1),
      quantity: 1,
    } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const zone = (fireflies.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;
  const mists = Array.from({ length: MIST_COUNT }, (_, i) =>
    scene.add.image(0, 0, TEX.mist)
      .setScale(0.8 + hash(i, 51) * 0.6)
      .setAlpha(0.35 + hash(i, 52) * 0.3)
      .setDepth(uiDepth - 5)
      .setData("speed", 4 + hash(i, 53) * 6));
  let mistPlaced = false;
  let nextRipple = 0;
  return {
    update(time: number) {
      const v = cam.worldView;
      zone.setTo(v.x, v.y, v.width, v.height);
      const dt = scene.game.loop.delta / 1000;
      mists.forEach((m, i) => {
        if (!mistPlaced) m.setPosition(v.x + hash(i, 54) * v.width, v.y + hash(i, 55) * v.height);
        m.x += m.getData("speed") * dt;
        const margin = m.displayWidth / 2;
        if (m.x - margin > v.right) m.x = v.x - margin;
        else if (m.x + margin < v.x) m.x = v.right + margin;
        if (m.y - m.displayHeight / 2 > v.bottom) m.y = v.y - m.displayHeight / 2;
        else if (m.y + m.displayHeight / 2 < v.y) m.y = v.bottom + m.displayHeight / 2;
      });
      mistPlaced = true;

      if (time < nextRipple) return;
      nextRipple = time + RIPPLE_EVERY_MS;
      const x = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE);
      const y = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
      if (tileAt(d, x, y) !== Tile.Water) return;
      const ring = scene.add.image(x * TILE_SIZE + 6 + Math.random() * 20, y * TILE_SIZE + 6 + Math.random() * 20, TEX.ring)
        .setScale(0.05).setAlpha(0.7).setDepth((y + 1) * TILE_SIZE - 0.5);
      scene.tweens.add({ targets: ring, scale: 0.4, alpha: 0, duration: 1600, ease: "Sine.easeOut", onComplete: () => ring.destroy() });
    },
  };
}

function inside(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
