import { TILE_SIZE, type ClassId } from "@kusa/shared";
import { makeCanvas } from "./pixels.ts";
import { ART_SCALE, HERO_SCALE, HERO_SPRITE_SCALE, scale2x } from "./refine.ts";
import { NO_OUTFIT, type Outfit } from "./outfit.ts";
import { heroFrame } from "./hero/hero.ts";
import { HERO_DIRS, HERO_FRAMES, type HeroDir } from "./hero/rig.ts";
import { S as CELL } from "./hero/raster.ts";
import type { ProtoGear } from "./proto/tibiaHero.ts";
import { NEW_ART, NEW_ART_ZOOM, protoHero as proto, protoItemOf } from "./newArt.ts";

/**
 * Folhas de sprites dos heróis. A arte é pintada em 48×48 por `hero/` (corpo da classe + um desenho por
 * item vestido, com luz e contorno calculados) e ampliada 2× com Scale2x, que arredonda as diagonais.
 *
 * 3 direções (a direita é a esquerda espelhada) × 3 quadros de caminhada (parado e dois passos; a
 * animação toca `1, 0, 2, 0`). A folha tem 9 quadros em linha: `direção * 3 + quadro`.
 */

export { HERO_DIRS, HERO_FRAMES, type HeroDir };
/** Quadro da textura final. */
export const HERO_SIZE = CELL * ART_SCALE;

export { NEW_ART };
/** 128 px por tile e o quadro de 192 px com os pés na linha 184 (`tibiaHero.ts`). */
const PROTO_TILE = 128, PROTO_SIZE = 192, PROTO_FEET = 184;


/** Escala do sprite do herói no jogo. */
export const heroSpriteScale = () => (NEW_ART ? (TILE_SIZE / PROTO_TILE) * NEW_ART_ZOOM : HERO_SPRITE_SCALE);

/** O equipamento do jogo no desenho novo. O raro usa o desenho do comum (o "+1" fica só no nome). */
export function protoGear(outfit: Outfit): ProtoGear {
  const gear: Record<string, string> = {};
  for (const [slot, id] of Object.entries(outfit)) {
    const proto = id ? protoItemOf(id) : undefined;
    if (proto) gear[slot] = proto;
  }
  return gear as ProtoGear;
}

/**
 * Quadros da arte nova no lugar dos antigos: parado = passagem, passos = os dois passos. O jogo prende o sprite pela
 * base do quadro, então os pés ficam à mesma distância da base que no herói antigo; sobra folga em cima para os
 * chapéus altos e as asas.
 */
const PROTO_STEPS = [1, 0, 2];
const PROTO_CELL = PROTO_SIZE - 8;
/** Espaço entre os pés e a base do quadro no herói antigo, em tiles (pés na linha 45 de 48). */
const OLD_GAP = (3 / 48) * HERO_SCALE;
const PROTO_DY = Math.round(PROTO_CELL - (OLD_GAP * PROTO_TILE) / NEW_ART_ZOOM - PROTO_FEET);
/** Lado de cada quadro da folha dos movimentos de ação (o mesmo da caminhada da arte nova). */
export const HERO_ACTION_SIZE = PROTO_CELL;

function protoSheet(classId: ClassId, outfit: Outfit) {
  const gear = protoGear(outfit);
  const { canvas, ctx } = makeCanvas(PROTO_CELL * HERO_DIRS.length * HERO_FRAMES, PROTO_CELL);
  HERO_DIRS.forEach((dir, d) => PROTO_STEPS.forEach((step, f) => {
    ctx.drawImage(proto!.protoFrame(dir, step, classId, undefined, gear), (d * HERO_FRAMES + f) * PROTO_CELL + (PROTO_CELL - PROTO_SIZE) / 2, PROTO_DY);
  }));
  return canvas;
}

/**
 * Movimentos de ação da arte nova (golpe, tiro, cajado e magia, `protoActionData`): um desenho por quadro, na ordem
 * `(ação × 3 + direção) × 3 + quadro`, no mesmo enquadramento da folha de caminhada. Cada função desenha um quadro
 * (a folha é montada aos poucos, `heroActionArt`). Sem a arte nova, nada: o herói só dá o tranco.
 */
export function heroActionJobs(classId: ClassId, outfit: Outfit = NO_OUTFIT): (() => HTMLCanvasElement)[] | null {
  const p = proto;
  if (!NEW_ART || !p) return null;
  const gear = protoGear(outfit);
  return p.HERO_ACTIONS.flatMap((action) => HERO_DIRS.flatMap((dir) => [...Array(p.HERO_ACTION_FRAMES).keys()].map((k) => () => {
    const frame = makeCanvas(PROTO_SIZE, PROTO_SIZE);
    const image = frame.ctx.createImageData(PROTO_SIZE, PROTO_SIZE);
    image.data.set(p.protoActionData(dir, action, k, classId, gear));
    frame.ctx.putImageData(image, 0, 0);
    const { canvas, ctx } = makeCanvas(PROTO_CELL, PROTO_CELL);
    ctx.drawImage(frame.canvas, (PROTO_CELL - PROTO_SIZE) / 2, PROTO_DY);
    return canvas;
  })));
}

/** Folha da classe vestindo `outfit`: 9 quadros em linha, virados para a esquerda no lado. */
export function heroSheet(classId: ClassId, outfit: Outfit = NO_OUTFIT): HTMLCanvasElement {
  if (NEW_ART) return protoSheet(classId, outfit);
  const { canvas, ctx } = makeCanvas(CELL * HERO_DIRS.length * HERO_FRAMES, CELL);
  HERO_DIRS.forEach((dir, d) => {
    for (let f = 0; f < HERO_FRAMES; f++) {
      const image = ctx.createImageData(CELL, CELL);
      image.data.set(heroFrame(classId, outfit, dir, f));
      ctx.putImageData(image, (d * HERO_FRAMES + f) * CELL, 0);
    }
  });
  return scale2x(canvas);
}

/**
 * Retrato de busto do herói para o menu (medalhões, sala de espera): a mesma figura do jogo, vestida, redesenhada
 * maior em volta do rosto (`protoPortraitData`), para o rosto e o elmo aparecerem num medalhão de 44 a 80 px. Sem a
 * arte nova, o quadro parado de frente.
 */
export function heroPortrait(classId: ClassId, outfit: Outfit = NO_OUTFIT): HTMLCanvasElement {
  const p = proto;
  if (!NEW_ART || !p) return heroPoses(classId, outfit, ["down"]);
  const { canvas, ctx } = makeCanvas(p.PORTRAIT_SIZE, p.PORTRAIT_SIZE);
  const image = ctx.createImageData(p.PORTRAIT_SIZE, p.PORTRAIT_SIZE);
  image.data.set(p.protoPortraitData(classId, protoGear(outfit)));
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Quadro parado de cada direção pedida, lado a lado (retratos e prévia do equipamento). */
export function heroPoses(classId: ClassId, outfit: Outfit = NO_OUTFIT, dirs: HeroDir[] = ["down", "side", "up"]) {
  const sheet = heroSheet(classId, outfit);
  const size = sheet.height;
  const { canvas, ctx } = makeCanvas(size * dirs.length, size);
  dirs.forEach((dir, i) => {
    const frame = HERO_DIRS.indexOf(dir) * HERO_FRAMES;
    ctx.drawImage(sheet, frame * size, 0, size, size, i * size, 0, size, size);
  });
  return canvas;
}
