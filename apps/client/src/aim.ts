import type * as Phaser from "phaser";
import {
  AIM_SNAP_TILES,
  TILE_SIZE,
  clampToRange,
  hasLineOfSight,
  isSingleTarget,
  lineEnd,
  tileDistance,
  type CastAim,
  type Dungeon,
  type SpellDef,
} from "@kusa/shared";
import type { DungeonRoom } from "./net.ts";

/** Arrasto (px) a partir do botão abaixo do qual a mira não sai do lugar; voltar para cá cancela. */
const DEADZONE_PX = 16;
/** Arrasto (px) que leva a mira até o alcance máximo da magia. */
const FULL_DRAG_PX = 96;
/** Espaço (px do mundo) entre os pontos da linha pontilhada. */
const DOT_GAP = 7;

const COLORS = { free: 0xd7c8ff, locked: 0xf1c40f, range: 0xd7c8ff, out: 0xe74c3c };
/** Quanto tempo (ms) o alcance pisca em vermelho após um toque fora dele. */
const FLASH_MS = 450;

/** Posição desenhada (px do mundo) de um jogador ou monstro, que anda suave entre os tiles. */
export type BodyAt = (id: string) => { x: number; y: number } | undefined;

/**
 * Mira das magias de alvo único, desenhada no mapa enquanto o polegar segura o botão do slot:
 * linha pontilhada do herói até o ponto, o alcance em volta dele e a área da magia.
 * Parado no botão, a mira mostra o alvo automático (o que o toque rápido acerta); arrastando,
 * o tamanho do arrasto vira distância até o alcance máximo. Magia de alvo único gruda no monstro
 * a até 1 tile do ponto. O servidor confere tudo de novo ao conjurar.
 * Magias de área usam o modo mira (`startPick`): só o alcance aparece, e o toque no mapa conjura.
 */
export class SpellAim {
  private g: Phaser.GameObjects.Graphics;
  private spell: SpellDef | null = null;
  /** Arrasto atual (px da tela) a partir de onde o dedo encostou. */
  private drag = { x: 0, y: 0 };
  /** Já saiu da zona morta uma vez: agora é mira manual (voltar ao centro cancela). */
  private manual = false;
  /** Modo mira de magia de área: mostra só o alcance, esperando o toque no mapa. */
  private picking = false;
  /** Até quando (ms, `performance.now()`) o alcance pisca após um toque fora dele. */
  private flashUntil = 0;

  constructor(scene: Phaser.Scene, private room: DungeonRoom, private dungeon: Dungeon, private bodyAt: BodyAt, depth: number) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  get active() {
    return this.spell !== null;
  }

  start(spell: SpellDef) {
    this.spell = spell;
    this.drag = { x: 0, y: 0 };
    this.manual = false;
    this.picking = false;
  }

  /** Modo mira de uma magia de área: marca o alcance até o toque no mapa. */
  startPick(spell: SpellDef) {
    this.start(spell);
    this.picking = true;
  }

  /** Toque fora do alcance: o alcance pisca em vermelho. */
  flash() {
    this.flashUntil = performance.now() + FLASH_MS;
  }

  move(dx: number, dy: number) {
    this.drag = { x: dx, y: dy };
    if (Math.hypot(dx, dy) > DEADZONE_PX) this.manual = true;
  }

  /** Voltou para perto do botão depois de mirar: soltar agora não lança nada. */
  get cancelled() {
    return this.manual && Math.hypot(this.drag.x, this.drag.y) <= DEADZONE_PX;
  }

  /**
   * Termina a mira. `null` = cancelada; `{}` = toque rápido (alvo automático);
   * `{ aim }` = ponto escolhido no mapa.
   */
  finish(): { aim?: CastAim } | null {
    const result = this.cancelled ? null : this.manual ? { aim: this.target() ?? undefined } : {};
    this.stop();
    return result;
  }

  stop() {
    this.spell = null;
    this.picking = false;
    this.g.clear();
  }

  /** Redesenha a cada quadro: o herói e os monstros andam enquanto o polegar mira. */
  update() {
    const g = this.g.clear();
    const spell = this.spell;
    const me = this.room.state.players.get(this.room.sessionId);
    const from = this.bodyAt(this.room.sessionId);
    if (!spell || !me || !from || this.cancelled) return;

    // Alcance: os tiles a até `range` do herói (a distância do jogo conta a diagonal como 1).
    const reach = (spell.range * 2 + 1) * TILE_SIZE;
    if (this.picking) {
      // No modo mira, o que fica fora do alcance escurece (vermelho logo após um toque fora):
      // o alcance costuma ser mais largo que a tela, então só a borda não bastaria.
      const out = performance.now() < this.flashUntil;
      const color = out ? COLORS.out : COLORS.range;
      const x0 = from.x - reach / 2;
      const y0 = from.y - reach / 2;
      const far = 1000;
      g.fillStyle(out ? COLORS.out : 0x000000, out ? 0.3 : 0.45);
      g.fillRect(x0 - far, y0 - far, reach + far * 2, far);
      g.fillRect(x0 - far, y0 + reach, reach + far * 2, far);
      g.fillRect(x0 - far, y0, far, reach);
      g.fillRect(x0 + reach, y0, far, reach);
      dashedRect(g, x0, y0, reach, reach, color, 0.9);
      return;
    }
    g.fillStyle(COLORS.range, 0.06).fillRect(from.x - reach / 2, from.y - reach / 2, reach, reach);
    dashedRect(g, from.x - reach / 2, from.y - reach / 2, reach, reach, COLORS.range, 0.35);

    const aim = this.target();
    if (!aim) return;
    const locked = aim.targetId !== undefined;
    const to = (aim.targetId && this.bodyAt(aim.targetId)) || { x: toPx(aim.x), y: toPx(aim.y) };
    const color = locked ? COLORS.locked : COLORS.free;
    dottedLine(g, from.x, from.y, to.x, to.y, color);

    const area = (spell.radius * 2 + 1) * TILE_SIZE;
    g.fillStyle(color, 0.14).fillRect(to.x - area / 2, to.y - area / 2, area, area);
    dashedRect(g, to.x - area / 2, to.y - area / 2, area, area, color, 0.85);
  }

  /** Ponto (e monstro) para onde a magia vai agora, ou nulo se não há nada para acertar. */
  private target(): CastAim | null {
    const spell = this.spell;
    const me = this.room.state.players.get(this.room.sessionId);
    if (!spell || !me) return null;
    if (!this.manual) {
      const id = this.autoTarget(me.x, me.y, spell.range);
      const m = id ? this.room.state.monsters.get(id) : undefined;
      return m ? { x: m.x, y: m.y, targetId: id! } : null;
    }

    // O arrasto vira deslocamento em tiles: na borda do arrasto, a mira chega ao alcance máximo
    // (medido como no jogo, em que a diagonal conta 1).
    const len = Math.hypot(this.drag.x, this.drag.y);
    const t = Math.min(1, (len - DEADZONE_PX) / (FULL_DRAG_PX - DEADZONE_PX)) * spell.range;
    const ux = this.drag.x / len;
    const uy = this.drag.y / len;
    const edge = Math.max(Math.abs(ux), Math.abs(uy));
    const raw = clampToRange(me.x, me.y, me.x + Math.round((ux / edge) * t), me.y + Math.round((uy / edge) * t), spell.range);
    const point = lineEnd(this.dungeon, me.x, me.y, raw.x, raw.y);
    if (!isSingleTarget(spell)) return point;

    // Alvo único: gruda no monstro mais perto do ponto, se estiver a até 1 tile e ao alcance.
    let best: string | undefined;
    let bestDist = Infinity;
    this.room.state.monsters.forEach((m, id) => {
      const dist = tileDistance(point.x, point.y, m.x, m.y);
      if (dist > AIM_SNAP_TILES || dist >= bestDist || !this.canHit(me.x, me.y, m.x, m.y, spell.range)) return;
      best = id;
      bestDist = dist;
    });
    const m = best ? this.room.state.monsters.get(best) : undefined;
    return m ? { x: m.x, y: m.y, targetId: best } : point;
  }

  /** O mesmo alvo que o servidor usa no toque rápido: o travado, se ao alcance; senão, o mais próximo. */
  private autoTarget(x: number, y: number, range: number): string | null {
    const me = this.room.state.players.get(this.room.sessionId);
    const current = me?.target ? this.room.state.monsters.get(me.target) : undefined;
    if (current && this.canHit(x, y, current.x, current.y, range)) return me!.target;
    let best: string | null = null;
    let bestDist = Infinity;
    this.room.state.monsters.forEach((m, id) => {
      const dist = tileDistance(x, y, m.x, m.y);
      if (dist >= bestDist || !this.canHit(x, y, m.x, m.y, range)) return;
      best = id;
      bestDist = dist;
    });
    return best;
  }

  private canHit(x: number, y: number, mx: number, my: number, range: number) {
    return tileDistance(x, y, mx, my) <= range && hasLineOfSight(this.dungeon, x, y, mx, my);
  }
}

function toPx(tile: number) {
  return tile * TILE_SIZE + TILE_SIZE / 2;
}

function dottedLine(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, color: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.floor(len / DOT_GAP);
  g.fillStyle(color, 0.8);
  // Começa um pouco fora do herói, para não cobrir o sprite.
  for (let i = 2; i <= steps; i++) {
    const t = (i * DOT_GAP) / len;
    g.fillCircle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 1.6);
  }
}

/** Contorno tracejado de um retângulo. */
function dashedRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha: number) {
  const dash = 4;
  g.fillStyle(color, alpha);
  for (let i = 0; i < w; i += dash * 2) {
    const len = Math.min(dash, w - i);
    g.fillRect(x + i, y, len, 1);
    g.fillRect(x + i, y + h - 1, len, 1);
  }
  for (let i = 0; i < h; i += dash * 2) {
    const len = Math.min(dash, h - i);
    g.fillRect(x, y + i, 1, len);
    g.fillRect(x + w - 1, y + i, 1, len);
  }
}
