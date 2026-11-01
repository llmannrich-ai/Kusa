import type * as Phaser from "phaser";
import {
  AIM_SNAP_TILES,
  TILE_SIZE,
  clampToRange,
  hasLineOfSight,
  isShot,
  isSingleTarget,
  lineEnd,
  lineTiles,
  coneTiles,
  shotAimPoint,
  shotPath,
  tileDistance,
  type CastAim,
  type AimDef,
  type Dungeon,
} from "@kusa/shared";
import type { DungeonRoom } from "./net.ts";

/** Arrasto (px) a partir do botão abaixo do qual a mira não sai do lugar; voltar para cá cancela. */
const DEADZONE_PX = 16;
/** Arrasto (px) que leva a mira até o alcance máximo da magia. */
const FULL_DRAG_PX = 96;
/** Espaço (px do mundo) entre os pontos da linha pontilhada. */
const DOT_GAP = 7;

const COLORS = { free: 0xd7c8ff, locked: 0xf1c40f, range: 0xd7c8ff, ally: 0x7fc8ff };

/** Posição desenhada (px do mundo) de um jogador ou monstro, que anda suave entre os tiles. */
export type BodyAt = (id: string) => { x: number; y: number } | undefined;

/**
 * Mira das magias com alvo (únicas e de área), desenhada no mapa enquanto o polegar segura o botão
 * do slot: linha pontilhada do herói até o ponto, o alcance em volta dele e a área da magia.
 * Parado no botão, a mira mostra o alvo automático (o que o toque rápido acerta); arrastando,
 * o tamanho do arrasto vira distância até o alcance máximo. Magia de alvo único gruda no monstro
 * a até 1 tile do ponto; a de área cai no ponto. Tiro (`isShot`, e o básico à distância pelo ⚔️) é mirado numa
 * direção: a mira acende os tiles da reta até o alcance inteiro, com o primeiro monstro dela em dourado (o tamanho do
 * arrasto não importa, só a direção). O servidor confere tudo de novo ao conjurar.
 */
export class SpellAim {
  private g: Phaser.GameObjects.Graphics;
  private spell: AimDef | null = null;
  /** Arrasto atual (px da tela) a partir de onde o dedo encostou. */
  private drag = { x: 0, y: 0 };
  /** Já saiu da zona morta uma vez: agora é mira manual (voltar ao centro cancela). */
  private manual = false;

  constructor(scene: Phaser.Scene, private room: DungeonRoom, private dungeon: Dungeon, private bodyAt: BodyAt, depth: number) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  get active() {
    return this.spell !== null;
  }

  start(spell: AimDef) {
    this.spell = spell;
    this.drag = { x: 0, y: 0 };
    this.manual = false;
  }

  move(dx: number, dy: number) {
    this.drag = { x: dx, y: dy };
    if (Math.hypot(dx, dy) > DEADZONE_PX) this.manual = true;
  }

  /** Já saiu da zona morta: é mira à mão (soltar vai no ponto, não no alvo automático). */
  get aimed() {
    return this.manual;
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
    g.fillStyle(COLORS.range, 0.06).fillRect(from.x - reach / 2, from.y - reach / 2, reach, reach);
    dashedRect(g, from.x - reach / 2, from.y - reach / 2, reach, reach, COLORS.range, 0.35);

    const aim = this.target();
    if (!aim) return;
    const locked = aim.targetId !== undefined;
    const to = (aim.targetId && this.bodyAt(aim.targetId)) || { x: toPx(aim.x), y: toPx(aim.y) };
    const color = locked ? COLORS.locked : COLORS.free;
    if (spell.aim === "ally") {
      // Aliado: linha até ele e um círculo azul nos pés (sem aliado no ponto, a mira some).
      dottedLine(g, from.x, from.y, to.x, to.y, COLORS.ally);
      g.lineStyle(2, COLORS.ally, 0.9).strokeEllipse(to.x, to.y + TILE_SIZE / 2 - 3, TILE_SIZE + 4, 14);
      return;
    }
    if (spell.shape === "cone") {
      // Leque: os tiles que a rajada cobre na direção mirada.
      const size = TILE_SIZE - 2;
      for (const t of coneTiles(this.dungeon, me.x, me.y, aim.x, aim.y, spell.range)) {
        g.fillStyle(COLORS.free, 0.14).fillRect(toPx(t.x) - size / 2, toPx(t.y) - size / 2, size, size);
        dashedRect(g, toPx(t.x) - size / 2, toPx(t.y) - size / 2, size, size, COLORS.free, 0.6);
      }
      return;
    }
    if (isShot(spell)) {
      // Tiro: a reta inteira na direção mirada; o primeiro monstro nela (quem leva o tiro se ninguém se mexer) em dourado.
      const size = TILE_SIZE - 2;
      let first = true;
      for (const t of shotPath(this.dungeon, me.x, me.y, aim.x, aim.y, spell.range)) {
        let monster = false;
        if (first) this.room.state.monsters.forEach((m) => { if (m.x === t.x && m.y === t.y) monster = true; });
        const c = monster ? COLORS.locked : COLORS.free;
        if (monster) first = false;
        g.fillStyle(c, monster ? 0.3 : 0.16).fillRect(toPx(t.x) - size / 2, toPx(t.y) - size / 2, size, size);
        dashedRect(g, toPx(t.x) - size / 2, toPx(t.y) - size / 2, size, size, c, 0.7);
      }
      return;
    }
    if (spell.shape === "line") {
      // Linha: os tiles que a flecha atravessa até o alcance inteiro, na direção mirada.
      const size = TILE_SIZE - 2;
      for (const t of lineTiles(this.dungeon, me.x, me.y, aim.x, aim.y, spell.range)) {
        g.fillStyle(COLORS.free, 0.16).fillRect(toPx(t.x) - size / 2, toPx(t.y) - size / 2, size, size);
        dashedRect(g, toPx(t.x) - size / 2, toPx(t.y) - size / 2, size, size, COLORS.free, 0.7);
      }
      return;
    }
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
    if (spell.aim === "ally") return this.allyAim(me.x, me.y, spell.range);
    if (!this.manual) {
      const id = this.autoTarget(me.x, me.y, spell.range);
      const m = id ? this.room.state.monsters.get(id) : undefined;
      return m ? { x: m.x, y: m.y, targetId: id! } : null;
    }

    // Tiro: só a direção do arrasto importa (um ponto bem longe nela).
    if (isShot(spell)) return shotAimPoint(me.x, me.y, this.drag.x, this.drag.y);

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

  /**
   * Aliado da mira (a mesma regra do servidor): arrastando, o herói vivo a até 1 tile do ponto; parado no botão,
   * o mais ferido ao alcance (contando você). `targetId` é o sessionId dele, só para o desenho.
   */
  private allyAim(x: number, y: number, range: number): CastAim | null {
    const point = this.manual ? this.dragPoint(x, y, range) : null;
    let best: string | undefined;
    let score = Infinity;
    this.room.state.players.forEach((p, id) => {
      if (p.status !== "playing" || !this.canHit(x, y, p.x, p.y, range)) return;
      const value = point ? tileDistance(point.x, point.y, p.x, p.y) : p.hp / p.maxHp + (id === this.room.sessionId ? 0.001 : 0);
      if ((point && value > 1) || value >= score) return;
      best = id;
      score = value;
    });
    const ally = best ? this.room.state.players.get(best) : undefined;
    return ally ? { x: ally.x, y: ally.y, targetId: best } : null;
  }

  /** O ponto do arrasto em tiles (até o alcance, parando na parede). */
  private dragPoint(x: number, y: number, range: number) {
    const len = Math.hypot(this.drag.x, this.drag.y);
    const t = Math.min(1, (len - DEADZONE_PX) / (FULL_DRAG_PX - DEADZONE_PX)) * range;
    const ux = this.drag.x / len;
    const uy = this.drag.y / len;
    const edge = Math.max(Math.abs(ux), Math.abs(uy));
    const raw = clampToRange(x, y, x + Math.round((ux / edge) * t), y + Math.round((uy / edge) * t), range);
    return lineEnd(this.dungeon, x, y, raw.x, raw.y);
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
