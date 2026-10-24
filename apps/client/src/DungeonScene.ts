import * as Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import {
  ITEMS,
  MONSTERS,
  MSG,
  MOVE_RESEND_MS,
  POTIONS,
  RUNES,
  DOT_KINDS,
  SPELLS,
  lineTiles,
  coneTiles,
  SUMMONS,
  itemColor,
  TILE_SIZE,
  blocksSight,
  centerOf,
  generateDungeon,
  hasLineOfSight,
  isPotion,
  isRune,
  mapIdOf,
  CHAMPION_AFFIXES,
  tileDistance,
  type AttackMessage,
  type ClassId,
  type DamageMessage,
  type MonsterStrikeMessage,
  type DrankMessage,
  type Dungeon,
  type MonsterKind,
  type ChampionAffix,
  type NoticeMessage,
  type ChainMessage,
  type CooldownMessage,
  type DotKind,
  type SpellDef,
  type SpellId,
  type ScreenMessage,
  type SpellMessage,
  type SummonKind,
} from "@kusa/shared";
import { CombatFx } from "./fx.ts";
import { CombatFx as HitFx, type Lunge } from "./CombatFx.ts";
import { PotionBar } from "./potionbar.ts";
import { BagBar } from "./bagbar.ts";
import { SpellBar, rankedSpell } from "./spellbar.ts";
import { PerkChoice } from "./perkchoice.ts";
import { RuneChoice } from "./runechoice.ts";
import { SpellAim } from "./aim.ts";
import { AttackButton } from "./attack.ts";
import { FX } from "./art/combat.ts";
import { MoveInput } from "./input.ts";
import { Minimap } from "./minimap.ts";
import { drawCrypt } from "./cryptMap.ts";
import type { MapAmbience } from "./mapShared.ts";
import { SWAMP_VOID, drawSwamp } from "./swampMap.ts";
import { DESERT_VOID, drawDesert } from "./desertMap.ts";
import { MARSH_VOID, drawMarsh } from "./marshMap.ts";
import { loadSettings } from "./settings.ts";
import type { ChestView, DungeonRoom, FieldView, GroundItemView, MonsterView, PlayerView, SummonView } from "./net.ts";
import type { HeroDir } from "./art/heroes.ts";
import { outfitOf } from "./art/outfit.ts";
import { BESTIARY_ART, BLOOD_TINT, monsterAnimKey, monsterTexture, type MonsterAnim } from "./art/bestiary.ts";
import type { Clip } from "./art/rig.ts";
import { gearFx, gearKey, gearSigns } from "./gearFx.ts";
import { CREATURE_SPRITE_SCALE, HERO_SPRITE_SCALE } from "./art/refine.ts";
import {
  CHEST_TEXTURE,
  PORTAL_TEXTURE,
  SUMMON_ANIMS,
  SUMMON_TEXTURE,
  heroArt,
  heroIdleFrame,
  heroWalkAnim,
  itemTexture,
} from "./art/textures.ts";

/**
 * Campo de visão: 9 tiles no lado curto da tela e pelo menos 13 no lado longo (em pé, 9 de largura).
 * Deitado, o tile tem o mesmo tamanho que teria em pé no mesmo celular: no iPhone, as barras do Safari deixam a
 * tela deitada baixa (uns 330 px) e 9 tiles de altura deixavam herói e monstros pequenos demais. Deitado se vê menos
 * na vertical (uns 7 tiles, nunca menos de `minLandscape`) e mais para os lados.
 */
const VIEW_TILES = { short: 9, long: 13, minLandscape: 6.5 };
/** Salto maior que isto (tiles) é a caverna do deserto: a câmera corta em vez de deslizar. */
const CAVE_CUT_TILES = 12;
/** Ritmo de quem ainda não anunciou o seu (ms por tile). */
const DEFAULT_STEP_MS = 250;
/** Folga (ms) que a fila de passos junta ao começar a andar, contra o atraso irregular dos próximos. */
const GLIDE_BUFFER_MS = 60;
/** Duração de cada passo quando a fila acumulou (lote atrasado chegou de uma vez). */
const GLIDE_CATCH_UP = 0.75;
/** Duração (ms) de um deslocamento de mais de um tile de uma vez (investida, teleporte curto, empurrão). */
const DASH_MS = 150;
/** Salto maior que isso (tiles) não desliza: aparece no destino. */
const SNAP_TILES = 4;
/**
 * Quanto o jogador fica acima do centro da tela, em fração da altura (a parte de baixo é dos polegares). Deitado,
 * os polegares ficam nas laterais e a tela é baixa: o jogador fica no centro.
 */
const FOLLOW_LIFT = 0.12;
/** Até onde a troca de alvo (Tab) procura monstros (tiles). */
const TARGET_CYCLE_RANGE = 8;
/** Quanto tempo o número de dano fica na tela (ms); os demais avisos flutuantes usam 900. */
const DAMAGE_TEXT_MS = 1080;

/**
 * Ordem de desenho: o chão fica embaixo; paredes, baús e personagens são ordenados pela linha
 * de baixo (y em pixels), como no Tibia; barras, nomes e números ficam sempre por cima.
 */
const DEPTH = { floor: 0, ui: 100_000 };


const COLORS = {
  void: 0x0b0908,
  target: 0xe74c3c,
  hpBack: 0x000000,
  hpPlayer: 0x2ecc71,
  hpMonster: 0xe74c3c,
  hpSummon: 0x5dade2,
  barrier: 0x9fd8ff,
  bossPortal: 0xb36bff,
};

/** Cor dos números do veneno e da queimadura (e das bolhas no herói). */
/** Magias com bônus em si (`selfBuff`): cada uma tem sua aura no herói. */
const SELF_BUFFS = (Object.keys(SPELLS) as SpellId[]).filter((id) => SPELLS[id].selfBuff);

const DOT_COLORS: Record<DotKind, number> = { poison: 0x9acd32, burn: 0xff9f43, bleed: 0xc0392b };

/** Criaturas invocadas que voam (balançam no ar em vez de andar). */
const FLYERS = new Set<SummonKind>(["hornet", "moth", "wisp", "eagle"]);
/**
 * Formas animais do Druida: a fera animada das invocações no lugar do herói (a pantera é o lobo espiritual em tons de
 * noite). As folhas olham para a esquerda.
 */
const FORMS = {
  panther: { texture: SUMMON_TEXTURE.wolf, tint: 0x4b4b6b, scale: 1.1 },
  bear: { texture: SUMMON_TEXTURE.bear, tint: 0xffffff, scale: 1.1 },
} as const;

const TEXT_STYLE = {
  fontFamily: "Georgia, serif",
  fontSize: "10px",
  color: "#e8dcc8",
  stroke: "#000",
  strokeThickness: 3,
};

/** Um personagem desenhado: sombra + sprite (ordenados por y) e barra de HP/nome por cima de tudo. */
interface Unit {
  body: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  overlay: Phaser.GameObjects.Container;
  bar: Phaser.GameObjects.Graphics;
  barWidth: number;
  barY: number;
  /** Classe do herói (tem animação de caminhada); monstros só balançam. */
  classId?: ClassId;
  /** Textura do herói com o equipamento vestido (muda quando ele pega ou perde um item). */
  heroKey?: string;
  facesLeft: boolean;
  dir: HeroDir;
  walkUntil: number;
  /** Passos que chegaram do servidor e esperam a vez de serem desenhados, com a hora em que chegaram. */
  steps: { x: number; y: number; at: number; dash: boolean }[];
  /** Passo sendo desenhado agora (posição de saída, destino, início e duração). */
  leg: { fromX: number; fromY: number; x: number; y: number; start: number; ms: number } | null;
  /** Fim do último passo desenhado: o próximo emenda nele, sem parada. */
  legEnd: number;
  /** Destino (px) do último passo recebido. */
  goal: { x: number; y: number };
  /** Ritmo (ms por tile em linha reta): o que o servidor anuncia, ajustado ao intervalo medido entre os passos. */
  stepMs: number;
  serverStepMs: number;
  lastStepAt: number;
  lastStepDiagonal: boolean;
  /** Avanço do golpe (px), somado à posição do sprite. */
  lunge: Lunge;
  /** Se sangra ao apanhar (esqueleto não). */
  bleeds: boolean;
  /** Cor do sangue (sem = vermelho). */
  bloodTint?: number;
  /** Monstro: textura da variante atual (cabeças da Hidra) e se está escondido. */
  texture?: string;
  hidden?: boolean;
  /** Monstro: escala do sprite e fase da respiração (cada um respira num ritmo). */
  baseScale?: number;
  breath?: number;
  /** Campeão: afixo já desenhado (nome e brilho dourados). */
  champion?: string;
  /** Monstro animado (arte em folha): os clipes e até quando o golpe/especial em curso segura o quadro. */
  anim?: MonsterAnim;
  busyUntil?: number;
  dead: boolean;
  /** Efeitos que ficam na unidade enquanto duram: guarda, raízes, atordoamento. */
  statuses: Map<string, Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible>;
  /** Criatura que voa: flutua sobre a sombra. */
  flies?: boolean;
  /** Escudo da Fé (e outros escudos): bolha + brasão, enquanto houver escudo. */
  barrier?: BarrierFx;
  /** Brilho do equipamento raro ou mágico (`gearFx.ts`) e a chave do que ele mostra. */
  gear?: { key: string; fx: Phaser.GameObjects.Container | null };
}

interface BarrierFx {
  root: Phaser.GameObjects.Container;
  dome: Phaser.GameObjects.Graphics;
  crest: Phaser.GameObjects.Image;
  /** Último valor visto, para notar a quebra. */
  value: number;
}

/** Cena da hunt: desenha a dungeon gerada pela seed e o estado (jogadores, monstros, baús) sincronizado pelo servidor. */
export class DungeonScene extends Phaser.Scene {
  private room!: DungeonRoom;
  private dungeon!: Dungeon;
  private avatars = new Map<string, Unit>();
  private monsters = new Map<string, Unit>();
  private summons = new Map<string, Unit>();
  /** Campos no chão (Solo Consagrado, chão em chamas, armadilhas, estacas). */
  private fields = new Map<string, Phaser.GameObjects.Container>();
  private chests = new Map<string, Phaser.GameObjects.Image>();
  private items = new Map<string, Phaser.GameObjects.Container>();
  private targetRing!: Phaser.GameObjects.Graphics;
  private move!: MoveInput;
  /** Ambiente do mapa: vaga-lumes e névoa no pântano, luz das tochas e poeira na cripta. */
  private ambience: MapAmbience | null = null;
  /** Nulo quando o jogador desligou o minimapa nas configurações. */
  private minimap: Minimap | null = null;
  /** Golpes e magias dos heróis (`MSG.attack` e `MSG.spell`). */
  private fx!: CombatFx;
  /** Piscar, sangue, cadáver e o ataque dos monstros (`MSG.damage`). */
  private hits!: HitFx;
  private spellBar!: SpellBar;
  private perkChoice!: PerkChoice;
  private runeChoice!: RuneChoice;
  private potionBar!: PotionBar;
  private bagBar!: BagBar;
  private aim!: SpellAim;
  private attack!: AttackButton;
  /** Monstro que este jogador travou como alvo (o alvo automático não conta). */
  private locked: string | null = null;
  private nextSendAt = 0;
  private sentMove: { dx: number; dy: number } = { dx: 0, dy: 0 };
  /** Resolução dos textos, para continuarem nítidos com o zoom da câmera. */
  private textResolution = 1;
  /** Última orientação avisada ao servidor (`MSG.screen`); a hunt começa contando em pé. */
  private landscape = false;

  constructor() {
    super("dungeon");
  }

  init(data: { room: DungeonRoom }) {
    this.room = data.room;
  }

  /** A arte já foi carregada pela cena `ArtLoader`, desde o lobby. */
  create() {
    this.fx = new CombatFx(this);
    this.hits = new HitFx(this, DEPTH.ui - 2, DEPTH.floor + 1);
    this.dungeon = generateDungeon(this.room.state.seed, mapIdOf(this.room.state.mapId));
    const mapId = this.dungeon.mapId;
    const draw = { crypt: drawCrypt, swamp: drawSwamp, desert: drawDesert, marsh: drawMarsh }[mapId];
    this.ambience = draw(this, this.dungeon, DEPTH.floor, DEPTH.ui);
    this.drawPortal();

    const background = { crypt: COLORS.void, swamp: SWAMP_VOID, desert: DESERT_VOID, marsh: MARSH_VOID }[mapId];
    this.cameras.main.setBackgroundColor(background).setRoundPixels(true);
    // Cantos da tela escurecidos, com o tom de cada mapa (CSS por cima do canvas, abaixo do HUD).
    for (const id of ["crypt", "swamp", "desert", "marsh"] as const) document.getElementById("game")?.classList.toggle(id, id === mapId);
    document.getElementById("game")?.classList.remove("cave");
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);

    const callbacks = Callbacks.get(this.room);
    callbacks.onAdd("players", (player: PlayerView, sessionId: string) => {
      this.addAvatar(sessionId, player);
      callbacks.onChange(player, () => this.syncAvatar(sessionId, player));
    });
    callbacks.onRemove("players", (_player: PlayerView, sessionId: string) => {
      this.destroyUnit(this.avatars.get(sessionId));
      this.avatars.delete(sessionId);
    });

    callbacks.onAdd("monsters", (monster: MonsterView, id: string) => {
      this.addMonster(id, monster);
      callbacks.onChange(monster, () => this.syncMonster(id, monster));
    });
    callbacks.onRemove("monsters", (_monster: MonsterView, id: string) => {
      // Monstros só saem do estado quando morrem.
      const unit = this.monsters.get(id);
      if (unit) this.hits.death(unit.sprite, { x: unit.body.x, y: unit.body.y }, unit.bleeds, unit.bloodTint);
      this.destroyUnit(unit);
      this.monsters.delete(id);
    });

    callbacks.onAdd("summons", (summon: SummonView, id: string) => {
      this.addSummon(id, summon);
      callbacks.onChange(summon, () => this.syncSummon(id, summon));
    });
    callbacks.onAdd("fields", (field: FieldView, id: string) => this.addField(id, field));
    callbacks.onRemove("fields", (_field: FieldView, id: string) => {
      const view = this.fields.get(id);
      this.fields.delete(id);
      if (view) this.tweens.add({ targets: view, alpha: 0, duration: 250, onComplete: () => view.destroy() });
    });
    callbacks.onRemove("summons", (_summon: SummonView, id: string) => {
      // A criatura some quando morre ou quando o tempo dela acaba: some num brilho, sem sangue.
      const unit = this.summons.get(id);
      if (unit) this.fx.vanish({ x: unit.body.x, y: unit.body.y });
      this.destroyUnit(unit);
      this.summons.delete(id);
    });

    callbacks.onAdd("chests", (chest: ChestView, id: string) => {
      const image = this.add.image(this.toPx(chest.x), this.toPx(chest.y), CHEST_TEXTURE.locked)
        .setDepth((chest.y + 1) * TILE_SIZE - 1);
      this.chests.set(id, image);
      if (chest.rune) this.addRuneMark(chest);
      this.syncChest(id, chest);
      callbacks.onChange(chest, () => this.syncChest(id, chest));
    });

    callbacks.onAdd("items", (item: GroundItemView, id: string) => this.addGroundItem(id, item));
    callbacks.onRemove("items", (_item: GroundItemView, id: string) => {
      this.items.get(id)?.destroy();
      this.items.delete(id);
    });

    callbacks.listen("bossDefeated", (open: boolean) => { if (open) this.drawBossPortal(); });

    this.room.onMessage(MSG.damage, (msg: DamageMessage) => this.onDamage(msg));
    this.room.onMessage(MSG.notice, (msg: NoticeMessage) => this.floatText(msg.x, msg.y, msg.text, msg.color, msg.ms));
    this.room.onMessage(MSG.attack, (msg: AttackMessage) => this.onAttack(msg));
    this.room.onMessage(MSG.spell, (msg: SpellMessage) => this.onSpell(msg));
    this.room.onMessage(MSG.cooldown, (msg: CooldownMessage) => this.spellBar.setCooldown(msg.slot, msg.ms));
    this.room.onMessage(MSG.chain, (msg: ChainMessage) => {
      const spell = SPELLS[msg.spellId];
      if (spell) this.fx.chain(msg.points.map((p) => this.tilePoint(p.x, p.y)), spell.color);
    });
    this.room.onMessage(MSG.drank, (msg: DrankMessage) => this.potionBar.onDrank(msg.cooldownMs));
    this.room.onMessage(MSG.monsterStrike, (msg: MonsterStrikeMessage) => this.onMonsterStrike(msg));

    this.targetRing = this.add.graphics().setDepth(DEPTH.ui - 1);

    // Sem alvo travado, o ataque vai no monstro mais próximo ao alcance (o anel vermelho mostra qual).
    // Tocar num monstro trava o alvo e tocar nele de novo destrava; no desktop, Tab troca para o próximo e Esc destrava.
    // Espaço segura o ataque básico; 1 e 2 conjuram no alvo automático.
    const kb = this.input.keyboard;
    kb?.addCapture("TAB,SPACE");
    kb?.on("keydown-TAB", () => this.cycleTarget());
    kb?.on("keydown-ESC", () => {
      if (this.bagBar.isOpen) this.bagBar.close();
      else this.lockTarget(null);
    });
    kb?.on("keydown-SPACE", () => this.attack.hold("key"));
    kb?.on("keyup-SPACE", () => this.attack.release("key"));
    kb?.on("keydown-ONE", () => this.spellBar.press(0));
    kb?.on("keydown-TWO", () => this.spellBar.press(1));
    kb?.on("keydown-Q", () => this.potionBar.press("potion-health"));
    kb?.on("keydown-E", () => this.potionBar.press("potion-mana"));
    kb?.on("keydown-B", () => this.bagBar.toggle());
    // Na zona do joystick, o toque no monstro só vale ao soltar rápido (ver MoveInput); fora dela, na hora.
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const scale = rect.width / this.game.canvas.width;
      if (this.move.inZone(rect.left + pointer.x * scale, rect.top + pointer.y * scale)) return;
      this.tapMonster(pointer.worldX, pointer.worldY);
    });

    this.move = new MoveInput(this, this.game.canvas, (clientX, clientY) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const scale = this.game.canvas.width / rect.width;
      const world = this.cameras.main.getWorldPoint((clientX - rect.left) * scale, (clientY - rect.top) * scale);
      this.tapMonster(world.x, world.y);
    }, loadSettings().fixedStick);
    // O ⚔️ fica embaixo, mais perto do polegar; os slots de magia entram acima dele.
    const actions = document.getElementById("actions")!;
    this.attack = new AttackButton(this.room, actions);
    this.aim = new SpellAim(this, this.room, this.dungeon, (id) => {
      const unit = this.avatars.get(id) ?? this.monsters.get(id);
      return unit && { x: unit.body.x, y: unit.body.y };
    }, DEPTH.ui - 1);
    this.spellBar = new SpellBar(this.room, actions, this.aim, () => this.aboveMe());
    this.perkChoice = new PerkChoice(this.room, () => this.spellBar.choosing, () => this.aboveMe());
    this.runeChoice = new RuneChoice(this.room, () => this.spellBar.choosing || this.perkChoice.open, () => this.aboveMe());
    this.potionBar = new PotionBar(this.room, document.getElementById("potions")!);
    this.bagBar = new BagBar(this.room, document.getElementById("bag")!, document.getElementById("bag-menu")!);
    if (loadSettings().minimap) this.minimap = new Minimap(this.room, this.dungeon);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.move.destroy();
      this.minimap?.destroy();
      this.attack.destroy();
      this.spellBar.destroy();
      this.perkChoice.destroy();
      this.runeChoice.destroy();
      this.potionBar.destroy();
      this.bagBar.destroy();
    });
  }

  update(time: number) {
    const { dx, dy } = this.move.vector();
    // O servidor anda sozinho na direção segurada e decide a velocidade real: o cliente avisa quando a direção muda
    // (inclusive ao soltar) e a reenvia de tempos em tempos para o servidor saber que o comando continua ativo.
    if (dx !== this.sentMove.dx || dy !== this.sentMove.dy || ((dx || dy) && time >= this.nextSendAt)) {
      this.room.send(MSG.move, { dx, dy, hold: true });
      this.sentMove = { dx, dy };
      this.nextSendAt = time + MOVE_RESEND_MS;
    }
    this.avatars.forEach((unit) => this.glide(unit, time));
    this.monsters.forEach((unit) => this.glide(unit, time));
    this.summons.forEach((unit) => this.glide(unit, time));
    this.avatars.forEach((unit) => this.animateUnit(unit, time));
    // Monstro longe da tela não é desenhado nem animado (o Pântano do Kosaradius passa de 100 monstros).
    const view = this.cameras.main.worldView;
    const margin = 4 * TILE_SIZE;
    this.monsters.forEach((unit) => {
      const near = unit.body.x > view.x - margin && unit.body.x < view.right + margin
        && unit.body.y > view.y - margin && unit.body.y < view.bottom + margin;
      if (near !== unit.body.visible) {
        unit.body.setVisible(near);
        if (unit.anim) {
          if (near) unit.sprite.anims.resume();
          else unit.sprite.anims.pause();
        }
      }
      // A barra e o nome seguem mesmo fora da tela (senão ficavam parados na borda).
      if (near) this.animateUnit(unit, time);
      else unit.overlay.setPosition(unit.body.x, unit.body.y);
    });
    this.summons.forEach((unit) => this.animateUnit(unit, time));
    this.drawTargetRing();
    this.minimap?.update(time);
    this.ambience?.update(time);
    this.spellBar.update();
    this.perkChoice.update();
    this.runeChoice.update();
    this.aim.update();
    this.attack.update();
    this.potionBar.update();
    this.bagBar.update();
  }

  // --- Alvo ---------------------------------------------------------------

  private me() {
    return this.room.state.players.get(this.room.sessionId);
  }

  /** Monstro sob um ponto do mundo, com folga de quase um tile (o dedo é impreciso). */
  /** Tocar num monstro trava o alvo nele; tocar no travado destrava. */
  private tapMonster(worldX: number, worldY: number) {
    const id = this.monsterAtWorld(worldX, worldY);
    if (id) this.lockTarget(id === this.locked ? null : id);
  }

  private monsterAtWorld(worldX: number, worldY: number): string | null {
    let best: string | null = null;
    let bestDist = TILE_SIZE * 0.9;
    this.monsters.forEach((unit, id) => {
      if (unit.hidden) return;
      const dist = Math.hypot(unit.body.x - worldX, unit.body.y - worldY);
      if (dist < bestDist) { bestDist = dist; best = id; }
    });
    return best;
  }

  /** Trava o alvo no próximo monstro por ordem de distância (repetir percorre todos por perto). */
  private cycleTarget() {
    const me = this.me();
    if (!me) return;
    const near: { id: string; dist: number }[] = [];
    this.room.state.monsters.forEach((m, id) => {
      if (m.hidden) return;
      const dist = Math.max(Math.abs(m.x - me.x), Math.abs(m.y - me.y));
      if (dist <= TARGET_CYCLE_RANGE) near.push({ id, dist });
    });
    if (near.length === 0) return;
    near.sort((a, b) => a.dist - b.dist || a.id.localeCompare(b.id));
    const current = near.findIndex((n) => n.id === me.target);
    this.lockTarget(near[(current + 1) % near.length].id);
  }

  /** Trava (ou, com `null`, destrava) o alvo. O estado só tem o alvo atual, que também pode ser o automático. */
  private lockTarget(id: string | null) {
    this.locked = id;
    this.room.send(MSG.target, { id });
  }

  private drawTargetRing() {
    const g = this.targetRing.clear();
    const unit = this.monsters.get(this.me()?.target ?? "");
    if (!unit) return;
    const half = TILE_SIZE / 2;
    g.lineStyle(2, COLORS.target).strokeRect(unit.body.x - half, unit.body.y - half, TILE_SIZE, TILE_SIZE);
  }

  // --- Combate -------------------------------------------------------------

  /** Ataque básico de alguém: o herói dá um tranco na direção do alvo e sai o golpe ou projétil. */
  private onAttack(msg: AttackMessage) {
    const classId = this.room.state.players.get(msg.from)?.classId as ClassId | undefined;
    if (!classId) return;
    if (msg.from === this.room.sessionId) this.attack.onAttack();
    this.lunge(this.avatars.get(msg.from), msg.tx - msg.x, msg.ty - msg.y, classId === "knight" ? 5 : 2);
    this.fx.basicAttack(classId, this.tilePoint(msg.x, msg.y), this.tilePoint(msg.tx, msg.ty), msg.ms);
  }

  private onSpell(msg: SpellMessage) {
    // No nível de quem conjurou: a Maestria pode mudar a área e o alcance.
    const spell = rankedSpell(this.room.state.players.get(msg.from), msg.spellId);
    if (!spell) return;
    // A repetição da Maestria (`echo`) é só o efeito: sem recarga nem tranco.
    if (!msg.echo) {
      if (msg.from === this.room.sessionId) this.spellBar.onCast(msg.spellId);
      this.lunge(this.avatars.get(msg.from), msg.tx - msg.x, msg.ty - msg.y, 3);
    }
    this.fx.spell(msg.spellId, this.tilePoint(msg.x, msg.y), this.tilePoint(msg.tx, msg.ty), msg.ms, spell.radius);
    if (spell.shape === "line") this.showLine(spell, msg);
    else if (spell.shape === "cone") this.showCone(spell, msg);
    else if (spell.radius > 0 && !spell.field) this.showArea(spell, msg);
    if (spell.heal) {
      // Em volta de quem conjura, ou no aliado mirado (Cura Distante).
      const at = spell.aim === "self" ? { x: msg.x, y: msg.y } : { x: msg.tx, y: msg.ty };
      this.room.state.players.forEach((p, id) => {
        if (p.status !== "playing" || tileDistance(at.x, at.y, p.x, p.y) > spell.radius) return;
        const unit = this.avatars.get(id);
        if (unit) this.fx.heal({ x: unit.body.x, y: unit.body.y });
      });
    }
  }

  /**
   * Marca cada tile atingido por uma magia de área, com a mesma regra do servidor (raio em tiles e
   * linha de visão do centro), para o jogador ver o tamanho real da área. Paredes ficam de fora.
   */
  private showArea(spell: SpellDef, msg: SpellMessage) {
    const self = spell.aim === "self";
    const cx = self ? msg.x : msg.tx;
    const cy = self ? msg.y : msg.ty;
    const tiles: { x: number; y: number; ring: number }[] = [];
    for (let y = cy - spell.radius; y <= cy + spell.radius; y++) {
      for (let x = cx - spell.radius; x <= cx + spell.radius; x++) {
        if (blocksSight(this.dungeon, x, y) || !hasLineOfSight(this.dungeon, cx, cy, x, y)) continue;
        tiles.push({ ...this.tilePoint(x, y), ring: tileDistance(cx, cy, x, y) });
      }
    }
    this.fx.area(tiles, spell.color, self ? 0 : msg.ms);
  }

  /** Magia em cone: acende o leque (a mesma conta do servidor), do herói para fora. */
  private showCone(spell: SpellDef, msg: SpellMessage) {
    const tiles = coneTiles(this.dungeon, msg.x, msg.y, msg.tx, msg.ty, spell.range);
    this.fx.area(tiles.map((t) => ({ ...this.tilePoint(t.x, t.y), ring: tileDistance(msg.x, msg.y, t.x, t.y) })), spell.color, 0);
  }

  /**
   * Campo no chão. Zona: os tiles do raio (com linha de visão do centro) brilham na cor da magia, ou em laranja
   * no chão em chamas da Pólvora. Armadilha: mandíbulas de ferro no tile. Estaca: um poste com o alcance em volta.
   */
  private addField(id: string, field: FieldView) {
    const spell = SPELLS[field.spellId as SpellId];
    const color = field.style === "fire" ? 0xff7f27 : spell?.color ?? 0xffffff;
    const view = this.add.container(this.toPx(field.x), this.toPx(field.y)).setDepth(field.y * TILE_SIZE - 1);
    const g = this.add.graphics();
    const half = TILE_SIZE / 2;
    if (field.kind === "zone") {
      for (let y = field.y - field.radius; y <= field.y + field.radius; y++) {
        for (let x = field.x - field.radius; x <= field.x + field.radius; x++) {
          if (blocksSight(this.dungeon, x, y) || !hasLineOfSight(this.dungeon, field.x, field.y, x, y)) continue;
          const px = (x - field.x) * TILE_SIZE;
          const py = (y - field.y) * TILE_SIZE;
          // Cada tile do campo com preenchimento e borda: o contorno segue as paredes em vez de atravessá-las.
          g.fillStyle(color, 0.3).fillRect(px - half + 1, py - half + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          g.lineStyle(1, color, 0.75).strokeRect(px - half + 2, py - half + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
      }
      this.tweens.add({ targets: g, alpha: { from: 1, to: 0.55 }, duration: field.style === "fire" ? 180 : 700, yoyo: true, repeat: -1 });
    } else if (field.kind === "wall") {
      // Muralha Mágica: um bloco de energia roxa, com brilho pulsando.
      g.fillStyle(color, 0.55).fillRect(-half + 1, -half - 6, TILE_SIZE - 2, TILE_SIZE + 4);
      g.lineStyle(2, 0xd7c8ff, 0.9).strokeRect(-half + 1, -half - 6, TILE_SIZE - 2, TILE_SIZE + 4);
      g.fillStyle(0xffffff, 0.35).fillRect(-half + 4, -half - 3, TILE_SIZE - 8, 3);
      this.tweens.add({ targets: g, alpha: { from: 1, to: 0.7 }, duration: 400, yoyo: true, repeat: -1 });
    } else if (field.style === "storm") {
      // Fúria dos Céus: nuvem escura sobre o feiticeiro e o alcance dos raios tracejado.
      const reach = (field.radius + 0.5) * TILE_SIZE;
      g.lineStyle(1, color, 0.4).strokeCircle(0, 0, reach);
      for (const [cx, cy, r] of [[-10, -40, 12], [6, -44, 14], [18, -38, 10], [-2, -34, 11]]) g.fillStyle(0x2c3e50, 0.85).fillCircle(cx, cy, r);
      g.fillStyle(0x9ec5ff, 0.5).fillCircle(4, -36, 6);
      this.tweens.add({ targets: g, alpha: { from: 1, to: 0.75 }, duration: 300, yoyo: true, repeat: -1 });
    } else if (field.kind === "trap") {
      // Mandíbulas abertas: arco de dentes de ferro.
      g.lineStyle(2, 0x5d6d7e, 1).strokeEllipse(0, 6, 22, 10);
      for (let i = -3; i <= 3; i++) g.fillStyle(0xbdc3c7, 1).fillTriangle(i * 3 - 1, 4, i * 3 + 1, 4, i * 3, -1);
      g.fillStyle(0x7f8c8d, 1).fillCircle(0, 6, 2);
    } else {
      // Estaca com flechas e o alcance tracejado.
      const reach = (field.radius + 0.5) * TILE_SIZE;
      g.lineStyle(1, color, 0.45).strokeCircle(0, 0, reach);
      g.fillStyle(0x6b4426, 1).fillRect(-2, -14, 4, 22);
      g.fillStyle(color, 1).fillTriangle(-6, -14, 6, -14, 0, -22);
      for (const dx of [-4, 4]) g.lineStyle(1, 0xdcdde1, 1).lineBetween(dx, -10, dx * 2, -18);
    }
    view.add(g);
    view.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: view, scale: 1, alpha: 1, duration: 220, ease: "Back.Out" });
    this.fields.set(id, view);
  }

  /** Magia em linha: acende os tiles atravessados (a mesma conta do servidor), do herói para a ponta, no ritmo da flecha. */
  private showLine(spell: SpellDef, msg: SpellMessage) {
    const tiles = lineTiles(this.dungeon, msg.x, msg.y, msg.tx, msg.ty, spell.range);
    const step = tiles.length > 0 ? msg.ms / tiles.length / 45 : 0;
    this.fx.area(tiles.map((t, i) => ({ ...this.tilePoint(t.x, t.y), ring: i * step })), spell.color, 0);
  }

  /**
   * Golpe especial de um mini-boss ou boss (sai na hora, sem aviso): o nome sobe sobre ele, o sprite incha e
   * brilha na cor da habilidade e o efeito cobre os tiles atingidos.
   */
  private onMonsterStrike(msg: MonsterStrikeMessage) {
    const ability = MONSTERS[msg.kind]?.abilities?.find((a) => a.id === msg.ability);
    if (!ability) return;
    const unit = this.monsters.get(msg.id);
    const from = unit && !msg.rising ? { x: unit.body.x, y: unit.body.y } : this.tilePoint(msg.x, msg.y);
    if (!msg.rising || ability.shape !== "dive") this.floatText(msg.x, msg.y - 0.6, ability.name, ability.color, 1200);
    if (unit && !unit.dead && !msg.rising) {
      // Animado: chamar a guarda e sumir são o quadro especial (rugido, cajado no alto); o resto, o golpe.
      this.playClip(unit, ability.shape === "summon" || ability.shape === "vanish" ? "cast" : "attack");
      this.lunge(unit, msg.tx - msg.x, msg.ty - msg.y, 7);
      const base = unit.sprite.scaleX;
      this.tweens.add({ targets: unit.sprite, scaleX: base * 1.15, scaleY: base * 1.15, duration: 110, yoyo: true, ease: "Quad.Out" });
      unit.sprite.setTint(ability.color);
      this.time.delayedCall(250, () => { if (unit.sprite.active) unit.sprite.clearTint(); });
    }
    this.fx.monsterStrike(ability, from, this.tilePoint(msg.tx, msg.ty), this.tilePoints(msg.tiles), msg.rising);
  }

  /** Tiles em pares [x0, y0, x1, y1, ...] para pontos em pixels. */
  private tilePoints(flat: number[]) {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) points.push(this.tilePoint(flat[i], flat[i + 1]));
    return points;
  }

  /** Monstro animado: toca um clipe que não se repete (golpe, especial) e segura o quadro até ele acabar. */
  private playClip(unit: Unit, clip: Clip) {
    if (!unit.anim || unit.dead || !unit.texture) return;
    unit.sprite.anims.timeScale = 1;
    unit.sprite.play(monsterAnimKey(unit.texture, clip));
    unit.busyUntil = this.time.now + (unit.sprite.anims.currentAnim?.frames.length ?? 4) / unit.anim.fps[clip] * 1000;
  }

  /** Tranco curto do sprite na direção do golpe (ida e volta). */
  private lunge(unit: Unit | undefined, dx: number, dy: number, distance: number) {
    if (!unit || unit.dead || (dx === 0 && dy === 0)) return;
    this.face(unit, Math.sign(dx), Math.abs(dx) >= Math.abs(dy) ? 0 : Math.sign(dy));
    const len = Math.hypot(dx, dy);
    this.tweens.killTweensOf(unit.lunge);
    unit.lunge.x = 0;
    unit.lunge.y = 0;
    this.tweens.add({
      targets: unit.lunge,
      x: Math.round((dx / len) * distance),
      y: Math.round((dy / len) * distance),
      duration: 70,
      yoyo: true,
      ease: "Quad.Out",
      onComplete: () => { unit.lunge.x = 0; unit.lunge.y = 0; },
    });
  }

  /**
   * Um golpe acertou. O golpe dos heróis já foi desenhado pelo `MSG.attack`/`MSG.spell` e o dano
   * só chega no impacto: aqui o alvo pisca, sangra e o número sobe. O ataque dos monstros é
   * desenhado agora (avanço, mordida ou bola de fogo) e o número sobe quando ele chega.
   */
  private onDamage(msg: DamageMessage) {
    const target = this.unitAt(msg.x, msg.y, msg.toPlayer);
    const tile = { x: this.toPx(msg.x), y: this.toPx(msg.y) };
    // Posição viva do alvo (ele pode andar enquanto o projétil voa); sem alvo, o tile do golpe.
    const to = () => (target?.body.active ? { x: target.body.x, y: target.body.y } : tile);
    const impact = () => {
      if (msg.absorbed && target?.barrier) this.barrierHit(target.barrier);
      if (target?.sprite.active && msg.amount > 0) {
        this.hits.flash(target.sprite);
        if (target.bleeds && Math.random() < 0.6) this.hits.bleed(to(), target.bloodTint);
      }
      const color = msg.dot ? DOT_COLORS[msg.dot] : msg.toPlayer ? 0xff5e57 : 0xffffff;
      if (msg.amount > 0) this.floatText(msg.x, msg.y, `-${msg.amount}`, color, DAMAGE_TEXT_MS);
      if (msg.absorbed) this.floatText(msg.x, msg.y - 0.4, `-${msg.absorbed}`, COLORS.barrier, DAMAGE_TEXT_MS);
    };
    // Quem bate: um monstro ou uma criatura invocada (o golpe dos heróis já foi desenhado).
    const monster = this.monsters.get(msg.attacker) ?? this.summons.get(msg.attacker);
    // Habilidade especial e veneno: o efeito já foi desenhado (`onMonsterStrike`) ou não tem golpe.
    if (!monster || msg.special) return impact();
    if (!monster.dead && this.time.now >= monster.walkUntil) {
      this.face(monster, Math.sign(msg.x - msg.fromX), Math.sign(msg.y - msg.fromY));
    }
    this.playClip(monster, "attack");
    this.hits.attack(msg.fx, { x: monster.body.x, y: monster.body.y }, to, monster.lunge, impact);
  }

  /** Unidade que está no tile, pelo estado do servidor: monstro, ou jogador/criatura invocada (aliados). */
  private unitAt(tileX: number, tileY: number, ally: boolean): Unit | undefined {
    let found: Unit | undefined;
    const search = (list: { forEach(cb: (e: { x: number; y: number }, id: string) => void): void }, units: Map<string, Unit>) => {
      list.forEach((entity, id) => {
        if (!found && entity.x === tileX && entity.y === tileY) found = units.get(id);
      });
    };
    if (!ally) search(this.room.state.monsters, this.monsters);
    else {
      search(this.room.state.players, this.avatars);
      search(this.room.state.summons, this.summons);
    }
    return found;
  }

  /** Mostra ou esconde um efeito da unidade (escudo, espinhos, estrelas), criando na primeira vez. */
  private setStatus(unit: Unit, key: string, on: boolean, create: () => Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible) {
    let status = unit.statuses.get(key);
    if (on && !status) {
      status = create();
      unit.statuses.set(key, status);
      unit.body.add(status);
    }
    status?.setVisible(on);
  }

  private shieldAura() {
    const g = this.add.graphics();
    g.lineStyle(2, 0xf39c12, 0.9).strokeEllipse(0, TILE_SIZE / 2 - 3, TILE_SIZE - 2, 12);
    g.lineStyle(1, 0xffe9a3, 0.6).strokeEllipse(0, TILE_SIZE / 2 - 3, TILE_SIZE + 4, 16);
    this.tweens.add({ targets: g, alpha: { from: 1, to: 0.4 }, duration: 400, yoyo: true, repeat: -1 });
    return g;
  }

  /** Estrelinhas girando sobre a cabeça do monstro atordoado. */
  private stunStars(top: number) {
    const ring = this.add.container(0, top);
    for (let i = 0; i < 3; i++) ring.add(this.add.image(0, 0, FX.star));
    let t = 0;
    const spin = this.time.addEvent({
      delay: 40, loop: true,
      callback: () => {
        t += 0.25;
        ring.each((star: Phaser.GameObjects.Image) => {
          const a = t + (ring.getIndex(star) * Math.PI * 2) / 3;
          star.setPosition(Math.cos(a) * 9, Math.sin(a) * 3).setScale(Math.sin(a) > 0 ? 1 : 0.7);
        });
      },
    });
    ring.once(Phaser.GameObjects.Events.DESTROY, () => spin.remove());
    return ring;
  }

  /**
   * Escudo da Fé: uma bolha de luz azul em volta do herói, com o brasão (cruz branca no azul,
   * borda dourada) flutuando à frente. A bolha fica mais fraca conforme o escudo absorve dano
   * e se estilhaça quando quebra.
   */
  private syncBarrier(unit: Unit, value: number, max: number) {
    const on = value > 0;
    if (on && !unit.barrier) {
      const dome = this.add.graphics();
      const crest = this.add.image(-9, 6, FX.holyShield);
      const root = this.add.container(0, 0, [dome, crest]);
      unit.body.add(root);
      unit.barrier = { root, dome, crest, value };
      // Ergue o escudo: o brasão desce girando e a bolha cresce.
      root.setScale(0.2).setAlpha(0);
      this.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 260, ease: "Back.Out" });
      this.tweens.add({ targets: crest, y: { from: 3, to: 7 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      this.drawDome(dome, 1);
    }
    const fx = unit.barrier;
    if (!fx) return;
    if (!on) {
      unit.barrier = undefined;
      this.fx.shatter({ x: unit.body.x, y: unit.body.y }, fx.value > 0 && max > 0);
      fx.root.destroy();
      return;
    }
    if (value !== fx.value) {
      fx.value = value;
      this.drawDome(fx.dome, max > 0 ? value / max : 1);
    }
  }

  /** Bolha em pixels: anel duplo, brilho no alto e um leve preenchimento. `strength` de 0 a 1. */
  private drawDome(g: Phaser.GameObjects.Graphics, strength: number) {
    const a = 0.35 + 0.65 * Math.max(0, Math.min(1, strength));
    const cy = 0;
    g.clear();
    g.fillStyle(0x7fc8ff, 0.12 * a).fillEllipse(0, cy, 34, 38);
    g.lineStyle(2, 0x7fc8ff, 0.85 * a).strokeEllipse(0, cy, 34, 38);
    g.lineStyle(1, 0xe8f6ff, 0.7 * a).strokeEllipse(0, cy, 28, 32);
    // Reflexo no alto da bolha.
    g.fillStyle(0xffffff, 0.55 * a).fillRect(-9, cy - 14, 3, 2).fillRect(-6, cy - 16, 4, 1);
  }

  /** O escudo absorveu um golpe: a bolha pisca e treme. */
  private barrierHit(fx: BarrierFx) {
    this.tweens.add({ targets: fx.dome, alpha: { from: 0.3, to: 1 }, duration: 120 });
    this.tweens.add({ targets: fx.crest, x: { from: -11, to: -9 }, duration: 80, ease: "Quad.Out" });
  }

  /** Marca do Caçador: uma mira vermelha girando sobre o monstro. */
  private markAt(top: number) {
    const g = this.add.graphics().setPosition(0, top);
    g.lineStyle(2, 0xe74c3c, 0.95).strokeCircle(0, 0, 6);
    g.fillStyle(0xe74c3c, 0.95).fillRect(-1, -10, 2, 5).fillRect(-1, 5, 2, 5).fillRect(-10, -1, 5, 2).fillRect(5, -1, 5, 2);
    this.tweens.add({ targets: g, angle: 360, duration: 2400, repeat: -1 });
    return g;
  }

  /** Forma de Pantera ou de Urso: a fera animada com os pés na base do tile (olha para a esquerda). */
  private formSprite(kind: keyof typeof FORMS, facingRight: boolean) {
    const form = FORMS[kind];
    const sprite = this.add.sprite(0, TILE_SIZE / 2, form.texture).setOrigin(0.5, 1).setScale(CREATURE_SPRITE_SCALE * form.scale)
      .setTint(form.tint).setFlipX(facingRight);
    sprite.play(monsterAnimKey(form.texture, "idle"));
    this.tweens.add({ targets: sprite, scale: { from: CREATURE_SPRITE_SCALE * 0.6, to: CREATURE_SPRITE_SCALE * form.scale }, duration: 220, ease: "Back.Out" });
    return sprite;
  }

  /** Renascer da Semente: uma semente com um broto sobre a cabeça, balançando enquanto ela vale. */
  private seedAt(top: number) {
    const g = this.add.graphics().setPosition(0, top);
    g.fillStyle(0x8d5a2b, 1).fillEllipse(0, 2, 8, 9);
    g.fillStyle(0xc8a165, 1).fillEllipse(-1, 1, 3, 4);
    g.fillStyle(0x9cff7a, 1).fillTriangle(0, -2, 6, -7, 2, -1).fillTriangle(0, -2, -5, -6, -1, -1);
    this.tweens.add({ targets: g, y: top - 3, duration: 700, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    return g;
  }

  /** Bônus em si (Postura do Atirador, Aljava Veloz): um anel na cor da magia pulsando nos pés do herói. */
  private buffAura(color: number) {
    const g = this.add.graphics();
    g.lineStyle(2, color, 0.9).strokeEllipse(0, TILE_SIZE / 2 - 3, TILE_SIZE + 2, 13);
    g.lineStyle(1, 0xffffff, 0.5).strokeEllipse(0, TILE_SIZE / 2 - 3, TILE_SIZE - 6, 9);
    this.tweens.add({ targets: g, alpha: { from: 1, to: 0.35 }, duration: 450, yoyo: true, repeat: -1 });
    return g;
  }

  /** Lento: uma crosta de gelo azul nos pés, piscando devagar. */
  private frostAt() {
    const g = this.add.graphics();
    g.fillStyle(0x9fdcff, 0.35).fillEllipse(0, TILE_SIZE / 2 - 3, TILE_SIZE - 4, 10);
    g.lineStyle(1, 0xd6f1ff, 0.9).strokeEllipse(0, TILE_SIZE / 2 - 3, TILE_SIZE - 4, 10);
    for (const x of [-9, -2, 6]) g.fillStyle(0xe8f6ff, 0.9).fillTriangle(x, TILE_SIZE / 2 - 2, x + 2, TILE_SIZE / 2 - 9, x + 4, TILE_SIZE / 2 - 2);
    this.tweens.add({ targets: g, alpha: { from: 1, to: 0.5 }, duration: 700, yoyo: true, repeat: -1 });
    return g;
  }

  /** Dano contínuo no monstro: bolhas (veneno), brasas (queimadura) subindo ou gotas (sangramento) caindo. */
  private dotAt(kind: DotKind) {
    const color = DOT_COLORS[kind];
    const box = this.add.container(0, 0);
    const spawn = this.time.addEvent({
      delay: 260, loop: true,
      callback: () => {
        if (!box.visible) return;
        const dot = this.add.circle(Phaser.Math.Between(-8, 8), Phaser.Math.Between(-2, 8), kind === "burn" ? 2.5 : 2, color, 0.9);
        box.add(dot);
        this.tweens.add({
          targets: dot, y: dot.y + (kind === "bleed" ? 8 : -12), alpha: { from: 0.9, to: 0 }, duration: 600,
          onComplete: () => dot.destroy(),
        });
      },
    });
    box.once(Phaser.GameObjects.Events.DESTROY, () => spawn.remove());
    return box;
  }

  /** Veneno ou queimadura: bolhas (ou brasas) subindo em volta do herói enquanto dura. */
  private dotAura(top: number, color: number) {
    const root = this.add.container(0, 0);
    const spawn = this.time.addEvent({
      delay: 160, loop: true,
      callback: () => {
        if (!root.visible) return;
        const b = this.add.circle(Phaser.Math.Between(-9, 9), TILE_SIZE / 2 - 6, Phaser.Math.Between(1, 2), color, 0.9);
        root.add(b);
        this.tweens.add({ targets: b, y: top + 10, alpha: { from: 0.9, to: 0 }, duration: 650, onComplete: () => b.destroy() });
      },
    });
    root.once(Phaser.GameObjects.Events.DESTROY, () => spawn.remove());
    return root;
  }

  /** Lento: uma poça de lodo nos pés do herói. */
  private mudAtFeet() {
    const g = this.add.graphics();
    g.fillStyle(0x5b4a2a, 0.7).fillEllipse(0, TILE_SIZE / 2 - 3, TILE_SIZE, 10);
    g.fillStyle(0x8b7d4a, 0.6).fillEllipse(-5, TILE_SIZE / 2 - 4, 8, 3).fillEllipse(6, TILE_SIZE / 2 - 2, 6, 3);
    this.tweens.add({ targets: g, alpha: { from: 1, to: 0.6 }, duration: 500, yoyo: true, repeat: -1 });
    return g;
  }

  private thornsAt() {
    const thorns = this.add.image(0, TILE_SIZE / 2, FX.thorns).setOrigin(0.5, 1);
    this.tweens.add({ targets: thorns, scaleY: { from: 0.2, to: 1 }, duration: 180, ease: "Back.Out" });
    return thorns;
  }

  /** Preso: fios de teia em volta dos pés. */
  private webAt() {
    const g = this.add.graphics();
    const y = TILE_SIZE / 2 - 4;
    g.lineStyle(1, 0xf5f5f5, 0.85);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      g.lineBetween(-Math.cos(a) * 13, y - Math.sin(a) * 10, Math.cos(a) * 13, y + Math.sin(a) * 3);
    }
    g.strokeEllipse(0, y - 2, 22, 10).strokeEllipse(0, y - 2, 12, 6);
    this.tweens.add({ targets: g, alpha: { from: 1, to: 0.6 }, duration: 500, yoyo: true, repeat: -1 });
    return g;
  }

  /** Engolido: bolha verde de gosma em volta do herói. */
  private engulfAt() {
    const g = this.add.graphics();
    g.fillStyle(0x7cb342, 0.35).fillCircle(0, 0, TILE_SIZE * 0.6);
    g.lineStyle(2, 0xb5e655, 0.8).strokeCircle(0, 0, TILE_SIZE * 0.6);
    this.tweens.add({ targets: g, scale: { from: 0.95, to: 1.05 }, duration: 400, yoyo: true, repeat: -1 });
    return g;
  }

  /** Cego: nuvem escura sobre os olhos. */
  private blindAt(top: number) {
    const g = this.add.graphics();
    g.fillStyle(0x1e1e2a, 0.75).fillEllipse(-5, top, 14, 7).fillEllipse(5, top - 1, 14, 8).fillEllipse(0, top + 2, 18, 6);
    this.tweens.add({ targets: g, x: { from: -2, to: 2 }, duration: 600, yoyo: true, repeat: -1 });
    return g;
  }

  private drawPortal() {
    const { x, y } = this.dungeon.portal;
    const portal = this.add.image(this.toPx(x), this.toPx(y), PORTAL_TEXTURE.escape).setDepth(y * TILE_SIZE + 1);
    this.tweens.add({ targets: portal, alpha: { from: 1, to: 0.65 }, duration: 900, yoyo: true, repeat: -1 });
  }

  /** O servidor abre o portal de conclusão quando o boss morre (no centro da sala dele, ou na sala dos baús da caverna). */
  private drawBossPortal() {
    const c = this.dungeon.bossPortal;
    const x = this.toPx(c.x);
    const y = this.toPx(c.y);
    // A arte do pack é quase preta e some no chão escuro: um brilho roxo (a cor do portal no minimapa) pulsa por baixo.
    const halo = this.add.ellipse(x, y + 2, 64, 52, COLORS.bossPortal, 0.5).setDepth(c.y * TILE_SIZE + 0.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.ellipse(x, y, 34, 38, COLORS.bossPortal, 0.9).setDepth(c.y * TILE_SIZE + 0.6)
      .setBlendMode(Phaser.BlendModes.ADD);
    const portal = this.add.image(x, y, PORTAL_TEXTURE.boss).setDepth(c.y * TILE_SIZE + 1);
    this.tweens.add({ targets: [portal, core], scale: { from: 0.2, to: 1.2 }, duration: 600, ease: "Back.Out" });
    this.tweens.add({ targets: halo, scale: { from: 0.8, to: 1.25 }, alpha: { from: 0.55, to: 0.25 }, duration: 900, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: core, alpha: { from: 0.9, to: 0.55 }, duration: 700, yoyo: true, repeat: -1, delay: 600 });
  }

  private syncChest(id: string, chest: ChestView) {
    const image = this.chests.get(id);
    if (!image) return;
    // Baú de runa: aberto só para quem já levou a runa dele (para os outros, continua cheio).
    const mine = this.room.state.players.get(this.room.sessionId)?.chosenRune;
    const opened = chest.opened || (!!chest.rune && mine === chest.rune);
    image.setTexture(opened ? CHEST_TEXTURE.open : chest.locked ? CHEST_TEXTURE.locked : CHEST_TEXTURE.unlocked);
  }

  /**
   * Baú de runa: a pedra da runa flutua acima dele com um brilho da cor dela, para escolher de longe. O brilho
   * pulsa mais forte quando o baú destranca (o boss morreu).
   */
  private addRuneMark(chest: ChestView) {
    const color = RUNES[chest.rune]?.color ?? 0xffffff;
    const x = this.toPx(chest.x);
    const y = this.toPx(chest.y);
    const glow = this.add.ellipse(x, y + 6, 40, 18, color, 0.35).setDepth(chest.y * TILE_SIZE + 0.4)
      .setBlendMode(Phaser.BlendModes.ADD);
    const icon = this.add.image(x, y - 22, itemTexture(this, chest.rune)).setDepth((chest.y + 1) * TILE_SIZE - 0.5);
    this.tweens.add({ targets: icon, y: y - 26, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    this.tweens.add({ targets: glow, alpha: { from: 0.2, to: 0.5 }, duration: 900, yoyo: true, repeat: -1 });
  }

  /**
   * Item ou poção no chão: brilho na cor da raridade embaixo do ícone, acima do chão e abaixo dos personagens.
   * Vários itens no mesmo tile se espalham um pouco para dar para ver todos.
   */
  private addGroundItem(id: string, item: GroundItemView) {
    const color = isPotion(item.itemId) ? POTIONS[item.itemId].color
      : isRune(item.itemId) ? RUNES[item.itemId].color : ITEMS[item.itemId] && itemColor(item.itemId);
    // Runa de boss reservada a outro jogador: só ele vê e pega.
    if (color === undefined || (item.owner && item.owner !== this.room.sessionId)) return;
    const stacked = [...this.room.state.items.values()].filter((o) => o.x === item.x && o.y === item.y && o.id !== id).length;
    const offset = [[0, 0], [-6, -4], [6, -4], [-6, 5], [6, 5]][stacked % 5];
    const glow = this.add.ellipse(0, 5, 20, 8, color, 0.45);
    const icon = this.add.image(0, 0, itemTexture(this, item.itemId));
    const container = this.add.container(this.toPx(item.x) + offset[0], this.toPx(item.y) + offset[1] + 4, [glow, icon])
      .setDepth(item.y * TILE_SIZE + 2);
    this.tweens.add({ targets: glow, alpha: { from: 0.45, to: 0.15 }, duration: 700, yoyo: true, repeat: -1 });
    // Cai do monstro com um pulinho.
    this.tweens.add({ targets: icon, y: { from: -10, to: 0 }, duration: 260, ease: "Bounce.Out" });
    this.items.set(id, container);
  }

  // --- Jogadores e monstros -------------------------------------------------

  private addAvatar(sessionId: string, player: PlayerView) {
    const classId = player.classId as ClassId;
    const heroKey = heroArt(this, classId, outfitOf(player));
    const sprite = this.add.sprite(0, 0, heroKey, heroIdleFrame("down")).setScale(HERO_SPRITE_SCALE);
    const top = TILE_SIZE / 2 - sprite.displayHeight;
    const unit = this.makeUnit(player.x, player.y, sprite, TILE_SIZE - 8, top + 4, false);
    unit.classId = classId;
    unit.heroKey = heroKey;
    const label = this.add.text(0, unit.barY - 2, player.name, this.textStyle()).setOrigin(0.5, 1);
    unit.overlay.add(label);
    this.avatars.set(sessionId, unit);
    this.drawBar(unit, player.hp, player.maxHp, COLORS.hpPlayer);

    if (sessionId === this.room.sessionId) {
      this.cameras.main.startFollow(unit.body, true, 0.15, 0.15);
    }
  }

  /** Ponto da página logo acima do nome do nosso personagem (onde ficam os ícones de melhoria). */
  private aboveMe() {
    const unit = this.avatars.get(this.room.sessionId);
    if (!unit) return null;
    const cam = this.cameras.main;
    const rect = this.game.canvas.getBoundingClientRect();
    const scale = rect.width / this.game.canvas.width;
    const x = rect.left + (unit.body.x - cam.worldView.x) * cam.zoom * scale;
    const y = rect.top + (unit.body.y + unit.barY - 14 - cam.worldView.y) * cam.zoom * scale;
    return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom ? null : { x, y };
  }

  private syncAvatar(sessionId: string, player: PlayerView) {
    const unit = this.avatars.get(sessionId);
    if (!unit) return;
    if (sessionId === this.room.sessionId && player.chosenRune) this.room.state.chests.forEach((c, id) => this.syncChest(id, c));
    // O equipamento aparece no personagem: troca a roupa quando ele pega, larga ou recebe itens.
    const outfit = outfitOf(player);
    const heroKey = heroArt(this, unit.classId!, outfit);
    if (heroKey !== unit.heroKey) {
      unit.heroKey = heroKey;
      unit.sprite.setTexture(heroKey, unit.dead ? heroIdleFrame("down") : heroIdleFrame(unit.dir));
    }
    // Equipamento raro ou mágico brilha no herói.
    const signs = gearSigns(outfit);
    if (unit.gear?.key !== gearKey(signs)) {
      unit.gear?.fx?.destroy();
      const fx = gearFx(this, signs, unit.sprite.displayHeight);
      if (fx) unit.body.add(fx);
      unit.gear = { key: gearKey(signs), fx };
    }
    unit.gear.fx?.setVisible(player.status === "playing" && unit.sprite.visible);
    const alpha = player.status === "playing" ? 1 : 0.35;
    unit.body.setAlpha(alpha);
    unit.overlay.setAlpha(alpha);
    if (player.status === "died" && !unit.dead) {
      // Morto fica caído no chão, numa poça, até a partida acabar.
      unit.dead = true;
      unit.sprite.stop().setFrame(heroIdleFrame("down")).setAngle(90);
      this.hits.bleed({ x: unit.body.x, y: unit.body.y });
    }
    this.drawBar(unit, player.hp, player.maxHp, COLORS.hpPlayer, player.barrier);
    this.setStatus(unit, "guard", player.guarded && player.status === "playing", () => this.shieldAura());
    const alive = player.status === "playing";
    this.setStatus(unit, "poison", alive && player.dot === "poison", () => this.dotAura(unit.barY + 2, DOT_COLORS.poison));
    this.setStatus(unit, "burn", alive && player.dot === "burn", () => this.dotAura(unit.barY + 2, DOT_COLORS.burn));
    this.setStatus(unit, "bleed", alive && player.dot === "bleed", () => this.dotAura(unit.barY + 2, DOT_COLORS.bleed));
    // Efeitos de monstro: preso (teia), atordoado (estrelas), engolido (bolhas), cego (nuvem) e corroído (ácido).
    const effects = alive ? player.effects.split(",") : [];
    this.setStatus(unit, "fx:root", effects.includes("root"), () => this.webAt());
    this.setStatus(unit, "fx:stun", effects.includes("stun"), () => this.stunStars(unit.barY - 6));
    this.setStatus(unit, "fx:engulf", effects.includes("engulf"), () => this.engulfAt());
    this.setStatus(unit, "fx:blind", effects.includes("blind"), () => this.blindAt(unit.barY + 4));
    this.setStatus(unit, "fx:corrode", effects.includes("corrode"), () => this.dotAura(unit.barY + 2, 0x7cb342));
    // Uma aura por magia de bônus em si, na cor dela.
    for (const id of SELF_BUFFS) this.setStatus(unit, `buff:${id}`, alive && player.buff === id, () => this.buffAura(SPELLS[id].color));
    this.setStatus(unit, "slow", alive && player.slowed, () => this.mudAtFeet());
    // Forma animal: a fera aparece no lugar do herói enquanto a forma dura.
    for (const kind of Object.keys(FORMS) as (keyof typeof FORMS)[]) {
      const on = alive && player.form === kind;
      this.setStatus(unit, `form:${kind}`, on, () => this.formSprite(kind, unit.sprite.flipX));
    }
    unit.sprite.setVisible(!alive || !(player.form in FORMS));
    this.setStatus(unit, "seed", alive && player.seeded, () => this.seedAt(unit.barY - 12));
    this.setStatus(unit, "reborn", alive && player.reborn, () => this.buffAura(0xf7d774));
    this.syncBarrier(unit, player.status === "playing" ? player.barrier : 0, player.maxBarrier);
    this.moveTo(unit, player.x, player.y, player.stepMs);
  }

  private addMonster(id: string, monster: MonsterView) {
    const kind = (monster.kind in MONSTERS ? monster.kind : "rat") as MonsterKind;
    const def = MONSTERS[kind];
    const art = BESTIARY_ART[kind];
    // Boss com o dobro do tamanho (como as criaturas 64×64 do Tibia); alguns mini-bosses um pouco maiores. O animado já
    // tem o tamanho no quadro (32 px = 1 tile).
    const scale = (art.anim ? art.scale ?? 1 : def.rank === "boss" ? 2 : art.scale ?? 1) * CREATURE_SPRITE_SCALE;
    const texture = monster.hidden && art.disguise ? art.disguise : monsterTexture(kind, monster.variant);
    const sprite = this.add.sprite(0, 0, texture).setScale(scale);
    const top = TILE_SIZE / 2 - sprite.displayHeight;
    const unit = this.makeUnit(monster.x, monster.y, sprite, TILE_SIZE - 8, top - 2, !!art.facesLeft);
    unit.texture = texture;
    unit.baseScale = scale;
    unit.breath = Math.random() * Math.PI * 2;
    unit.bleeds = art.blood !== "none";
    if (art.blood !== "none" && art.blood !== "red") unit.bloodTint = BLOOD_TINT[art.blood];
    unit.flies = art.flies;
    if (art.anim && !(monster.hidden && art.disguise)) {
      unit.anim = art.anim;
      unit.busyUntil = 0;
      sprite.play({ key: monsterAnimKey(texture, "idle"), startFrame: Math.floor(Math.random() * 4) });
    }
    if (def.rank !== "common") {
      const label = this.add.text(0, unit.barY - 2, def.name, { ...this.textStyle(), color: "#ff9f9f" }).setOrigin(0.5, 1);
      unit.overlay.add(label);
    }
    this.monsters.set(id, unit);
    this.drawBar(unit, monster.hp, monster.maxHp, COLORS.hpMonster);
    this.syncHidden(unit, kind, monster.hidden);
    this.syncChampion(unit, kind, monster.champion);
  }

  /** Campeão: nome dourado com o afixo e um brilho dourado nos pés. */
  private syncChampion(unit: Unit, kind: MonsterKind, affix: string) {
    if (!affix || unit.champion === affix || !(affix in CHAMPION_AFFIXES)) return;
    unit.champion = affix;
    const name = `${MONSTERS[kind].name} ${CHAMPION_AFFIXES[affix as ChampionAffix].name}`;
    unit.overlay.add(this.add.text(0, unit.barY - 2, name, { ...this.textStyle(), color: "#f7d774" }).setOrigin(0.5, 1));
    const glow = this.add.ellipse(0, TILE_SIZE / 2 - 3, 26, 9, 0xf7d774, 0.4);
    unit.body.addAt(glow, 0);
    this.tweens.add({ targets: glow, alpha: { from: 0.45, to: 0.15 }, duration: 700, yoyo: true, repeat: -1 });
  }

  private syncMonster(id: string, monster: MonsterView) {
    const unit = this.monsters.get(id);
    if (!unit) return;
    // Variante (cabeças da Hidra): troca a textura quando muda.
    const art = BESTIARY_ART[monster.kind as MonsterKind] ?? BESTIARY_ART.rat;
    const texture = monster.hidden && art.disguise ? art.disguise : monsterTexture(monster.kind as MonsterKind, monster.variant);
    if (!unit.anim && texture !== unit.texture && this.textures.exists(texture)) {
      unit.texture = texture;
      unit.sprite.setTexture(texture);
    }
    this.drawBar(unit, monster.hp, monster.maxHp, COLORS.hpMonster);
    this.setStatus(unit, "roots", monster.rooted, () => this.thornsAt());
    this.setStatus(unit, "stun", monster.stunned, () => this.stunStars(unit.barY - 6));
    this.setStatus(unit, "slow", monster.slowed, () => this.frostAt());
    this.setStatus(unit, "mark", monster.marked, () => this.markAt(unit.barY - 14));
    for (const kind of DOT_KINDS) this.setStatus(unit, `dot:${kind}`, monster.dot === kind, () => this.dotAt(kind));
    this.syncHidden(unit, monster.kind as MonsterKind, monster.hidden);
    this.syncChampion(unit, monster.kind as MonsterKind, monster.champion);
    this.moveTo(unit, monster.x, monster.y, monster.stepMs);
  }

  /**
   * Escondido (camuflado, invisível, voando, submerso): quase transparente, sem barra nem nome, e não dá para tocar.
   * Disfarçado (Mímico): igual a um baú, sem transparência.
   */
  private syncHidden(unit: Unit, kind: MonsterKind, hidden: boolean) {
    if (unit.hidden === hidden) return;
    unit.hidden = hidden;
    const art = BESTIARY_ART[kind] ?? BESTIARY_ART.rat;
    const alpha = hidden ? (art.disguise ? 1 : 0.18) : art.alpha ?? 1;
    this.tweens.killTweensOf(unit.body);
    this.tweens.add({ targets: unit.body, alpha, duration: 220 });
    unit.overlay.setVisible(!hidden);
  }

  /**
   * Criatura invocada: arte animada (parada, andando, golpe), barra azul (sem nome, para não poluir a tela) e um brilho
   * ao aparecer.
   */
  private addSummon(id: string, summon: SummonView) {
    const kind = (summon.kind in SUMMONS ? summon.kind : "wolf") as SummonKind;
    const texture = SUMMON_TEXTURE[kind];
    const sprite = this.add.sprite(0, 0, texture).setScale(CREATURE_SPRITE_SCALE);
    const top = TILE_SIZE / 2 - sprite.displayHeight;
    const unit = this.makeUnit(summon.x, summon.y, sprite, TILE_SIZE - 12, top + 2, true);
    unit.bleeds = false;
    unit.flies = FLYERS.has(kind);
    unit.texture = texture;
    unit.anim = SUMMON_ANIMS[kind];
    unit.busyUntil = 0;
    sprite.play({ key: monsterAnimKey(texture, "idle"), startFrame: Math.floor(Math.random() * SUMMON_ANIMS[kind].frames!.idle) });
    // Brilho de aliado sob os pés, para não confundir com os monstros.
    const glow = this.add.ellipse(0, TILE_SIZE / 2 - 3, 22, 7, 0x9cff7a, 0.35);
    unit.body.addAt(glow, 0);
    this.tweens.add({ targets: glow, alpha: { from: 0.35, to: 0.12 }, duration: 800, yoyo: true, repeat: -1 });
    this.summons.set(id, unit);
    this.drawBar(unit, summon.hp, summon.maxHp, COLORS.hpSummon);
    sprite.setScale(0.2 * CREATURE_SPRITE_SCALE);
    this.tweens.add({ targets: sprite, scale: CREATURE_SPRITE_SCALE, duration: 280, ease: "Back.Out" });
    this.fx.summonBurst({ x: unit.body.x, y: unit.body.y });
  }

  private syncSummon(id: string, summon: SummonView) {
    const unit = this.summons.get(id);
    if (!unit) return;
    this.drawBar(unit, summon.hp, summon.maxHp, COLORS.hpSummon);
    this.moveTo(unit, summon.x, summon.y, summon.stepMs);
  }

  /** Sprite com os pés na base do tile, sombra no chão e barra/nome numa camada separada por cima de tudo. */
  private makeUnit(tileX: number, tileY: number, sprite: Phaser.GameObjects.Sprite, barWidth: number, barY: number, facesLeft: boolean): Unit {
    const x = this.toPx(tileX);
    const y = this.toPx(tileY);
    sprite.setOrigin(0.5, 1).setPosition(0, TILE_SIZE / 2);
    const shadow = this.add.ellipse(0, TILE_SIZE / 2 - 3, sprite.displayWidth * 0.55, (6 * sprite.displayHeight) / TILE_SIZE, 0x000000, 0.35);
    const body = this.add.container(x, y, [shadow, sprite]);
    const bar = this.add.graphics();
    const overlay = this.add.container(x, y, [bar]).setDepth(DEPTH.ui);
    return {
      body, sprite, overlay, bar, barWidth, barY, facesLeft,
      dir: "down", walkUntil: 0, steps: [], leg: null, legEnd: 0, goal: { x, y }, stepMs: DEFAULT_STEP_MS, serverStepMs: 0,
      lastStepAt: 0, lastStepDiagonal: false, lunge: { x: 0, y: 0 }, bleeds: true, dead: false, statuses: new Map(),
    };
  }

  private destroyUnit(unit: Unit | undefined) {
    unit?.body.destroy();
    unit?.overlay.destroy();
  }

  /** Barra de vida; com escudo, uma faixa azul-clara por cima mostra quanto ele ainda absorve. */
  private drawBar(unit: Unit, hp: number, maxHp: number, color: number, barrier = 0) {
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    const x = -unit.barWidth / 2;
    unit.bar.clear()
      .fillStyle(COLORS.hpBack).fillRect(x - 1, unit.barY - 1, unit.barWidth + 2, 5)
      .fillStyle(ratio > 0.3 ? color : 0xe67e22).fillRect(x, unit.barY, unit.barWidth * ratio, 3);
    if (barrier > 0 && maxHp > 0) {
      const shield = Math.min(1, barrier / maxHp);
      unit.bar.fillStyle(COLORS.hpBack).fillRect(x - 1, unit.barY + 3, unit.barWidth * shield + 2, 3)
        .fillStyle(COLORS.barrier).fillRect(x, unit.barY + 4, unit.barWidth * shield, 1);
    }
  }

  /**
   * Passo novo que chegou do servidor: entra na fila para ser desenhado no ritmo da unidade.
   * Os passos chegam com atraso irregular (tick do servidor, lote de estado, rede); desenhar cada um na hora em
   * que chega dava "trava e corre". A fila toca os passos com duração constante, emendados um no outro.
   */
  private moveTo(unit: Unit, tileX: number, tileY: number, stepMs: number) {
    if (stepMs > 0 && stepMs !== unit.serverStepMs) unit.serverStepMs = unit.stepMs = stepMs;
    const x = this.toPx(tileX);
    const y = this.toPx(tileY);
    const dx = x - unit.goal.x;
    const dy = y - unit.goal.y;
    if (dx === 0 && dy === 0) return;
    unit.goal = { x, y };
    const now = this.time.now;
    // Salto (teleporte, empurrão longo, caverna): aparece direto no destino.
    if (Math.max(Math.abs(dx), Math.abs(dy)) > SNAP_TILES * TILE_SIZE) {
      unit.steps.length = 0;
      unit.leg = null;
      unit.legEnd = now;
      unit.body.setPosition(x, y);
      // O próprio jogador passou pela caverna: a câmera corta junto (sem atravessar o mapa) e a tela clareia.
      if (unit === this.avatars.get(this.room.sessionId) && Math.max(Math.abs(dx), Math.abs(dy)) > CAVE_CUT_TILES * TILE_SIZE) {
        this.cameras.main.centerOn(x, y);
        this.cameras.main.fadeIn(350, 0, 0, 0);
      }
      return;
    }
    // Mais de um tile de uma vez (investida, teleporte curto, empurrão): arrancada rápida, fora do ritmo da caminhada.
    if (Math.max(Math.abs(dx), Math.abs(dy)) > TILE_SIZE) {
      unit.steps.push({ x, y, at: now, dash: true });
      return;
    }
    // Ritmo medido: o intervalo desde o passo anterior (andando sem parar) puxa o ritmo para o real.
    // Monstros só andam no tick do servidor e ficam um pouco mais lentos que a ficha.
    const base = unit.serverStepMs || DEFAULT_STEP_MS;
    const gap = (now - unit.lastStepAt) / (unit.lastStepDiagonal ? Math.SQRT2 : 1);
    if (gap < base * 2) unit.stepMs += (Phaser.Math.Clamp(gap, base * 0.7, base * 1.5) - unit.stepMs) * 0.3;
    unit.lastStepAt = now;
    unit.lastStepDiagonal = dx !== 0 && dy !== 0;
    unit.steps.push({ x, y, at: now, dash: false });
  }

  /** Desenha a unidade andando pela fila de passos. */
  private glide(unit: Unit, now: number) {
    for (;;) {
      if (!unit.leg) {
        const next = unit.steps.shift();
        if (!next) return;
        // Emenda no passo anterior; se a fila tinha esvaziado, espera um pouco para juntar folga contra o próximo atraso.
        const start = Math.max(unit.legEnd, next.at > unit.legEnd && !next.dash ? next.at + GLIDE_BUFFER_MS : next.at);
        const tiles = Math.hypot(next.x - unit.body.x, next.y - unit.body.y) / TILE_SIZE;
        // Fila acumulada (lote atrasado de uma vez): anda mais rápido até alcançar.
        const pace = unit.steps.length >= 2 ? GLIDE_CATCH_UP : 1;
        const ms = next.dash ? DASH_MS : unit.stepMs * tiles * pace;
        unit.leg = { fromX: unit.body.x, fromY: unit.body.y, x: next.x, y: next.y, start, ms };
      }
      const leg = unit.leg;
      if (now < leg.start) return;
      const k = leg.ms > 0 ? Math.min(1, (now - leg.start) / leg.ms) : 1;
      unit.body.setPosition(leg.fromX + (leg.x - leg.fromX) * k, leg.fromY + (leg.y - leg.fromY) * k);
      this.face(unit, leg.x - leg.fromX, leg.y - leg.fromY);
      unit.walkUntil = now + 120;
      if (k < 1) return;
      unit.legEnd = leg.start + leg.ms;
      unit.leg = null;
    }
  }

  /** Diagonais olham para o lado, como no Tibia. */
  private face(unit: Unit, dx: number, dy: number) {
    if (dx !== 0) {
      unit.dir = "side";
      unit.sprite.setFlipX(unit.classId ? dx > 0 : unit.facesLeft && dx > 0);
      // A fera da forma animal (do pack, olhando para a esquerda) vira junto com o herói.
      for (const kind of Object.keys(FORMS)) (unit.statuses.get(`form:${kind}`) as Phaser.GameObjects.Sprite | undefined)?.setFlipX(dx > 0);
    } else {
      unit.dir = dy < 0 ? "up" : "down";
    }
  }

  /** A cada quadro: ordem de desenho pela base, barra acompanhando e animação de caminhada. */
  private animateUnit(unit: Unit, time: number) {
    unit.body.setDepth(unit.body.y + TILE_SIZE / 2 + 0.5);
    unit.overlay.setPosition(unit.body.x, unit.body.y);
    const walking = time < unit.walkUntil;
    // Monstros do pack têm um quadro só: um balanço de 1 px enquanto andam; quem voa flutua sempre.
    const bob = unit.flies ? Math.round(3 + Math.sin(time / 180) * 2)
      : !unit.classId && !unit.anim && walking && Math.floor(time / 125) % 2 ? 1 : 0;
    unit.sprite.setPosition(unit.lunge.x, TILE_SIZE / 2 + unit.lunge.y - bob);
    if (unit.dead) return;
    // Animado: anda (no ritmo do passo, 3 quadros por tile) ou fica parado respirando; golpe e especial seguram o quadro.
    if (unit.anim && unit.texture && time >= (unit.busyUntil ?? 0)) {
      const clip = walking ? "walk" : "idle";
      unit.sprite.play(monsterAnimKey(unit.texture, clip), true);
      unit.sprite.anims.timeScale = walking ? Phaser.Math.Clamp(((unit.anim.stride ?? 3) * 1000 / unit.stepMs) / unit.anim.fps.walk, 0.5, 2) : 1;
    }
    // Monstros respiram: o sprite (com os pés no chão) encolhe e estica de leve, cada um no seu ritmo.
    if (unit.baseScale && !unit.anim && !this.tweens.isTweening(unit.sprite)) {
      const breath = 1 - 0.03 * (0.5 + 0.5 * Math.sin(time / 380 + (unit.breath ?? 0)));
      unit.sprite.setScale(unit.baseScale, unit.baseScale * breath);
    }
    // Forma animal: a fera anda no ritmo do passo do herói e respira parada.
    for (const kind of Object.keys(FORMS) as (keyof typeof FORMS)[]) {
      const beast = unit.statuses.get(`form:${kind}`) as Phaser.GameObjects.Sprite | undefined;
      if (!beast?.visible) continue;
      const anim = SUMMON_ANIMS[kind === "panther" ? "wolf" : "bear"];
      beast.play(monsterAnimKey(FORMS[kind].texture, walking ? "walk" : "idle"), true);
      beast.anims.timeScale = walking ? Phaser.Math.Clamp(((anim.stride ?? 3) * 1000 / unit.stepMs) / anim.fps.walk, 0.5, 2) : 1;
    }
    if (unit.heroKey) {
      if (walking) unit.sprite.play(heroWalkAnim(unit.heroKey, unit.dir), true);
      else if (unit.sprite.anims.isPlaying || unit.sprite.frame.name !== String(heroIdleFrame(unit.dir))) {
        unit.sprite.stop().setFrame(heroIdleFrame(unit.dir));
      }
    }
  }

  private textStyle() {
    return { ...TEXT_STYLE, resolution: this.textResolution };
  }

  /** Número ou aviso que sobe e some sobre um tile. */
  private floatText(tileX: number, tileY: number, text: string, color: number, duration = 900) {
    const label = this.add.text(this.toPx(tileX), this.toPx(tileY) - 8, text, {
      ...this.textStyle(),
      fontSize: "11px",
      color: `#${color.toString(16).padStart(6, "0")}`,
    }).setOrigin(0.5).setDepth(DEPTH.ui + 1);
    this.tweens.add({
      targets: label,
      y: label.y - 24,
      alpha: 0,
      duration,
      ease: "Cubic.Out",
      onComplete: () => label.destroy(),
    });
  }

  /** Em pé, 9 tiles de largura com o jogador um pouco acima do centro; deitado, o tile do tamanho de em pé. */
  private fitCamera() {
    const { width, height } = this.scale.gameSize;
    const landscape = width > height;
    const short = Math.min(width, height);
    const long = Math.max(width, height);
    let zoom = Math.min(short / (VIEW_TILES.short * TILE_SIZE), long / (VIEW_TILES.long * TILE_SIZE));
    if (landscape) {
      // `screen` é o aparelho inteiro (em CSS px); o canvas tem os pixels do aparelho (ver createGame).
      const cssToGame = height / (this.game.canvas.getBoundingClientRect().height || height);
      const portraitTile = (Math.min(screen.width, screen.height) / VIEW_TILES.short) * cssToGame;
      zoom = Math.max(zoom, Math.min(portraitTile, height / VIEW_TILES.minLandscape) / TILE_SIZE);
    }
    this.textResolution = Math.max(1, Math.ceil(zoom));
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setFollowOffset(0, landscape ? 0 : -(height * FOLLOW_LIFT) / zoom);
    // Telemetria: quanto da hunt foi jogado deitado.
    if (landscape !== this.landscape) {
      this.landscape = landscape;
      this.room.send(MSG.screen, { landscape } satisfies ScreenMessage);
    }
  }

  private tilePoint(x: number, y: number) {
    return { x: this.toPx(x), y: this.toPx(y) };
  }

  private toPx(tile: number) {
    return tile * TILE_SIZE + TILE_SIZE / 2;
  }
}
