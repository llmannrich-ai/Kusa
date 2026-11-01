import * as Phaser from "phaser";
import { SPELLS, TILE_SIZE, type ClassId, type MonsterAbility, type SpellId } from "@kusa/shared";
import { FX } from "./art/combat.ts";

/** Efeitos ficam acima dos personagens e abaixo das barras de vida e números. */
const FX_DEPTH = 90_000;
/** Marcas no chão (rachaduras, cratera, queimado): acima do piso e do sangue, abaixo de todo mundo. */
const GROUND_DEPTH = 1.5;

interface Point { x: number; y: number }

/** Tempos do Núcleo Infernal (ms): o chão esquenta, fica em brasa, esfria e some. */
const VOLCANO = { heatMs: 180, hotMs: 900, coolMs: 2400, endMs: 3000 };

/** Mistura duas cores 0xRRGGBB (`t` = 0 é `a`, 1 é `b`). */
function mix(a: number, b: number, t: number) {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t) << s;
  return ch(16) | ch(8) | ch(0);
}

/** Cor da lava pelo calor (1 = branca-amarela, 0.5 = laranja, 0 = crosta escura). */
function lava(heat: number) {
  return heat > 0.5 ? mix(0xff6b1a, 0xffe08a, (heat - 0.5) * 2) : mix(0x3a0e06, 0xff6b1a, heat * 2);
}

/**
 * Efeitos de combate desenhados pelo cliente a partir dos eventos do servidor (`MSG.attack` e
 * `MSG.spell`). Nada aqui decide dano: os tempos de voo vêm do servidor para o impacto
 * desenhado coincidir com o número de dano.
 */
export class CombatFx {
  constructor(private scene: Phaser.Scene) {}

  basicAttack(classId: ClassId, from: Point, to: Point, ms: number) {
    switch (classId) {
      case "knight": return this.slash(from, to);
      case "paladin": return this.projectile(FX.arrow, from, to, ms);
      case "druid": return this.projectile(FX.greenLight, from, to, ms, { trail: 0x7bd36a, glow: 0x3fbf3a, impact: 0x9cff7a });
      case "sorcerer": return this.projectile(FX.darkLight, from, to, ms, { trail: 0x5a1c7a, glow: 0x8e44ad, impact: 0xb04ae0 });
    }
  }

  /** `radiusTiles`: a área no nível de quem conjurou (a Maestria pode aumentar). */
  spell(spellId: SpellId, from: Point, to: Point, ms: number, radiusTiles = SPELLS[spellId].radius) {
    const radius = radiusTiles * TILE_SIZE;
    switch (spellId) {
      case "blade_spin": return this.bladeSpin(from);
      case "war_cry": return this.ring(from, radius, 0xe67e22, 500, 4);
      case "holy_arrow":
        this.projectile(FX.holyArrow, from, to, ms, { trail: 0xffe9a3, glow: 0xf7d774, impact: 0xfff6c8, scale: 1.5 });
        return this.later(ms, () => this.holyFlash(to));
      case "arrow_rain": return this.arrowRain(to, radius, ms);
      case "shadow_orb":
        this.projectile(FX.shadowOrb, from, to, ms, { trail: 0x2d0a40, glow: 0x6b2a9a, impact: 0xc77dff });
        return this.later(ms, () => this.ring(to, radius + TILE_SIZE / 2, 0x6b2a9a, 350, 6));
      case "void_storm": return this.voidStorm(from, radius);
      case "forest_blessing": return this.ring(from, radius, 0x2ecc71, 600, 3);
      case "thorn_roots": return this.ring(to, radius, 0x6b7a2a, 400, 5);
      // Compradas no Grimório.
      case "crushing_blow":
        this.slash(from, to);
        return this.later(120, () => this.ring(to, TILE_SIZE / 2, 0xd35400, 300, 6));
      case "holy_shield": return this.shieldRaise(from);
      case "vampiric_blade":
        this.slash(from, to);
        return this.later(120, () => this.drain(to, from, 0xc0392b));
      case "iron_skin": return this.ring(from, TILE_SIZE * 0.8, 0xa4b0be, 500, 5);
      case "earthquake":
        this.ring(from, radius, 0x8d6e4a, 500, 8);
        return this.debris(from, radius, 0x6b4426);
      case "steel_wall":
        this.ring(from, radius, 0x95a5a6, 550, 6);
        return this.shieldRaise(from);
      case "commander_shout":
        this.ring(from, radius, 0xf1c40f, 600, 4);
        return this.ring(from, radius * 0.6, 0x7fc8ff, 500, 3);
      case "execution":
        this.slash(from, to);
        this.later(80, () => this.slash(from, to));
        return this.later(160, () => this.sparks(to, 0xff7675, 10));
      // Especializações do Cavaleiro.
      case "steel_whirlwind": return this.bladeSpin(from);
      case "berserk_rage":
        this.ring(from, TILE_SIZE, 0xc0392b, 500, 6);
        return this.sparks(from, 0xff7675, 10);
      case "thrown_blade":
        this.projectile(FX.arrow, from, to, ms, { trail: 0xdcdde1, glow: 0xa4b0be, impact: 0xffffff, scale: 1.6 });
        return this.later(ms, () => this.sparks(to, 0xc0392b, 6));
      case "thousand_cuts":
        this.slash(from, to);
        return this.later(60, () => this.sparks(to, 0xffffff, 4));
      case "shield_bash":
        this.shieldRaise(from);
        return this.later(100, () => this.ring(to, TILE_SIZE / 2, 0x7fc8ff, 300, 6));
      case "shared_aegis":
        this.ring(from, radius, 0x9fd8ff, 600, 5);
        return this.shieldRaise(from);
      case "iron_thorns":
        this.ring(from, TILE_SIZE * 0.9, 0x95a5a6, 450, 4);
        return this.sparks(from, 0xdcdde1, 10);
      case "living_fortress":
        this.ring(from, TILE_SIZE, 0x7f8c8d, 550, 8);
        return this.debris(from, TILE_SIZE, 0x6b4426);
      // O cavaleiro já está colado no alvo (to): poeira do ponto de partida (from) até ele, e o golpe.
      case "charge":
        for (let i = 0; i <= 4; i++) this.later(i * 25, () => this.puff(from.x + ((to.x - from.x) * i) / 4, from.y + ((to.y - from.y) * i) / 4 + 10, 0xc8a165, 6));
        return this.later(110, () => { this.slash(to, to); this.sparks(to, 0xf1c40f, 8); });
      case "war_banner":
        this.ring(from, radius, 0xf1c40f, 600, 4);
        return this.sparks(from, 0xf1c40f, 8);
      // A corrente vai até o alvo e o traz (o monstro já aparece colado pelo estado).
      case "iron_chain":
        this.projectile(FX.arrow, from, to, ms, { trail: 0x95a5a6, glow: 0x7f8c8d, scale: 1.2 });
        return this.later(ms, () => this.drain(to, from, 0x95a5a6));
      case "supreme_challenge":
        this.ring(from, radius, 0xe74c3c, 600, 5);
        return this.later(120, () => this.ring(from, radius * 0.6, 0xf39c12, 450, 3));
      // A flecha voa até o fim da linha; os tiles atravessados acendem pelo `area` (DungeonScene).
      case "piercing_shot": return this.projectile(FX.arrow, from, to, ms, { trail: 0xf1c40f, glow: 0xf1c40f, scale: 1.4 });
      case "stun_arrow":
        this.projectile(FX.arrow, from, to, ms, { glow: 0xa4b0be, scale: 1.2 });
        return this.later(ms, () => this.sparks(to, 0xf1c40f, 6));
      case "blessed_ward":
      case "healing_light": return this.ring(from, radius, 0xfff6c8, 600, 3);
      case "deadly_shot":
        this.projectile(FX.holyArrow, from, to, ms, { trail: 0xf7d774, glow: 0xf7d774, impact: 0xffffff, scale: 1.8 });
        return this.later(ms, () => this.holyFlash(to));
      case "divine_judgment":
        this.beam(to, 0xfff6c8);
        return this.later(150, () => this.ring(to, radius, 0xf7d774, 450, 5));
      case "explosive_volley":
        this.projectile(FX.arrow, from, to, ms, { trail: 0xe67e22, glow: 0xe67e22, scale: 1.3 });
        return this.later(ms, () => { this.ring(to, radius, 0xe67e22, 450, 7); this.sparks(to, 0xf1c40f, 12); });
      case "lightning_bolt":
        this.projectile(FX.darkLight, from, to, ms, { trail: 0x9ec5ff, glow: 0x5dade2, impact: 0xffffff });
        return this.later(ms, () => this.sparks(to, 0x9ec5ff, 8));
      // Os saltos chegam depois, pelo `MSG.chain` (`chain`).
      case "chain_lightning":
        this.projectile(FX.darkLight, from, to, ms, { trail: 0x9ec5ff, glow: 0x5dade2, impact: 0xffffff });
        return this.later(ms, () => this.sparks(to, 0xffffff, 10));
      case "ice_lance":
        return this.projectile(FX.darkLight, from, to, ms, { trail: 0xd6f1ff, glow: 0x7fd8ff, impact: 0xffffff, scale: 1.2 });
      case "drain_life":
        this.projectile(FX.shadowOrb, from, to, ms, { trail: 0x8e44ad, glow: 0x5a1c7a, scale: 0.7 });
        return this.later(ms, () => this.drain(to, from, 0xc77dff));
      case "frost_nova": return this.ring(from, radius, 0x7fd8ff, 450, 6);
      case "meteor":
        this.projectile(FX.shadowOrb, { x: to.x - 40, y: to.y - 120 }, to, ms, { trail: 0xe67e22, glow: 0xe74c3c, impact: 0xf1c40f, scale: 1.6 });
        return this.later(ms, () => {
          this.ring(to, radius, 0xe74c3c, 500, 8);
          this.debris(to, radius, 0x5a2a1a);
        });
      case "blizzard":
        this.snow(to, radius);
        return this.ring(to, radius, 0xd6f1ff, 600, 4);
      case "dark_pact":
        this.voidStorm(from, radius);
        return this.later(300, () => this.drain(from, from, 0xc77dff));
      case "venom_thorn": return this.projectile(FX.greenLight, from, to, ms, { trail: 0x6ab04c, glow: 0x2d6a1f, impact: 0xbadc58 });
      case "nature_wrath":
        this.projectile(FX.leaf, from, to, ms, { trail: 0x7bd36a, glow: 0x3fbf3a, impact: 0x9cff7a, scale: 1.5 });
        return this.later(ms, () => this.ring(to, radius, 0x3fbf3a, 450, 5));
      // Especializações do Paladino (ramo Mira).
      case "hunter_mark":
        this.projectile(FX.arrow, from, to, ms, { trail: 0xe74c3c, glow: 0xe74c3c, scale: 1.2 });
        return this.later(ms, () => this.sparks(to, 0xe74c3c, 8));
      case "sniper_stance":
        this.ring(from, TILE_SIZE * 0.9, 0xf7d774, 500, 4);
        return this.sparks(from, 0xffffff, 6);
      // O herói já está no destino: um rastro de folhas do ponto de partida (from) até ele (to).
      case "evasive_roll":
        for (let i = 0; i <= 4; i++) this.later(i * 30, () => this.puff(from.x + ((to.x - from.x) * i) / 4, from.y + ((to.y - from.y) * i) / 4 + 10, 0x9be15d, 5));
        return;
      case "swift_quiver":
        this.ring(from, TILE_SIZE * 0.9, 0x9be15d, 500, 3);
        return this.later(120, () => this.ring(from, TILE_SIZE * 0.6, 0xffffff, 400, 2));
      // Especializações do Paladino (ramos Luz e Batedor).
      case "holy_spear":
        this.projectile(FX.holyArrow, from, to, ms, { trail: 0xfff6c8, glow: 0xfff6c8, impact: 0xffffff, scale: 1.3 });
        return this.later(ms, () => this.holyFlash(to));
      case "divine_caldera":
        this.ring(from, radius, 0xf7d774, 550, 6);
        return this.later(120, () => this.ring(from, radius * 0.6, 0xffffff, 400, 3));
      case "light_shield":
        this.drain(from, to, 0x7fc8ff);
        return this.later(200, () => this.shieldRaise(to));
      case "consecrated_ground":
        this.beam(to, 0xfff6c8);
        return this.later(120, () => this.ring(to, radius, 0xfff6c8, 500, 4));
      case "lightning_arrow":
        this.projectile(FX.arrow, from, to, ms, { trail: 0x9ec5ff, glow: 0x5dade2, impact: 0xffffff, scale: 1.3 });
        return this.later(ms, () => this.sparks(to, 0x9ec5ff, 8));
      case "barrage":
        // O leque acende pelo `showCone` (DungeonScene); aqui saem algumas flechas na direção do tiro.
        for (let i = 0; i < 5; i++) {
          const spread = { x: to.x + Phaser.Math.Between(-24, 24), y: to.y + Phaser.Math.Between(-24, 24) };
          this.later(i * 40, () => this.projectile(FX.arrow, from, spread, 220, { trail: 0xe67e22, glow: 0xe67e22 }));
        }
        return;
      // Armadilha e estaca: ao lançar, o objeto aparece pelo estado (campo); o disparo chega como eco.
      case "bear_trap":
        return this.sparks(to, 0xbdc3c7, from.x === to.x && from.y === to.y ? 12 : 4);
      case "arrow_cordon":
        return from.x === to.x && from.y === to.y ? undefined : this.projectile(FX.arrow, from, to, ms, { trail: 0xc8a165, glow: 0xc8a165 });
      // Especializações do Feiticeiro.
      case "energy_beam": return this.zap(from, to, 0x9ec5ff);
      // Os raios da nuvem chegam como eco, de cima para o monstro; o lançamento só faz a nuvem (campo).
      case "sky_fury":
        if (from.x === to.x && from.y === to.y) return this.ring(from, TILE_SIZE, 0x9ec5ff, 400, 3);
        this.beam(to, 0x9ec5ff);
        return this.sparks(to, 0xffffff, 8);
      case "fireball":
        this.projectile(FX.shadowOrb, from, to, ms, { trail: 0xff7f27, glow: 0xe74c3c, impact: 0xf1c40f, scale: 1.3 });
        return this.later(ms, () => { this.ring(to, radius, 0xff7f27, 450, 7); this.sparks(to, 0xf1c40f, 12); });
      // O vulcão precisa dos tiles atingidos e dos monstros pegos: a cena chama `volcano` direto.
      case "infernal_core": return;
      case "cone_of_cold": return this.sparks(from, 0xd6f1ff, 10);
      case "ice_prison":
        this.snow(to, radius);
        return this.ring(to, radius, 0xd6f1ff, 500, 5);
      // O feiticeiro já está no destino (to): névoa onde estava e onde aparece.
      case "misty_step":
        for (const at of [from, to]) for (let i = 0; i < 5; i++) this.puff(at.x + Phaser.Math.Between(-10, 10), at.y + Phaser.Math.Between(-8, 8), 0xc7b8ff, 6);
        return;
      case "magic_wall": return this.ring(to, TILE_SIZE, 0x8e7cc3, 400, 4);
      case "sudden_death":
        this.projectile(FX.shadowOrb, from, to, ms, { trail: 0x2d0a40, glow: 0x000000, impact: 0x8e44ad, scale: 1.1 });
        return this.later(ms, () => this.drain(to, to, 0x5a1c7a));
      case "raise_skeletons":
        this.ring(from, TILE_SIZE * 1.5, 0xdcdde1, 550, 3);
        return this.debris(from, TILE_SIZE, 0xdcdde1);
      case "eldritch_blast":
        this.projectile(FX.darkLight, from, to, ms, { trail: 0xb04ae0, glow: 0x6b2a9a, impact: 0xe0b0ff, scale: 1.2 });
        return this.later(ms, () => this.sparks(to, 0xb04ae0, 8));
      case "black_tentacles": return this.ring(to, radius, 0x9b59b6, 500, 5);
      // Especializações do Druida. As formas: no lançamento, folhas em volta; o salto da pantera e a patada do urso
      // chegam como eco (de onde o druida estava até o monstro).
      case "panther_form":
        if (from.x === to.x && from.y === to.y) return this.ring(from, TILE_SIZE, 0x4b4b6b, 450, 4);
        for (let i = 0; i <= 4; i++) this.later(i * 25, () => this.puff(from.x + ((to.x - from.x) * i) / 4, from.y + ((to.y - from.y) * i) / 4, 0x4b4b6b, 6));
        return this.later(100, () => this.sparks(to, 0xffffff, 8));
      case "bear_form":
        if (from.x === to.x && from.y === to.y) {
          this.ring(from, TILE_SIZE * 1.2, 0x8d6e4a, 500, 6);
          return this.debris(from, TILE_SIZE, 0x6b4426);
        }
        return this.ring(from, TILE_SIZE * 1.5, 0x8d6e4a, 300, 5);
      case "beast_cry":
        this.ring(from, TILE_SIZE * 3, 0xe67e22, 550, 5);
        return this.later(120, () => this.ring(from, TILE_SIZE * 1.8, 0xf1c40f, 450, 3));
      // As folhas da cura no aliado saem pela cena (`spell.heal`).
      case "distant_heal": return this.drain(from, to, 0xff8fab);
      // A semente voa até o aliado; quando ela salva (eco no próprio aliado), uma flor se abre.
      case "rebirth_seed":
        if (from.x === to.x && from.y === to.y) {
          this.ring(to, TILE_SIZE * 1.5, 0x9cff7a, 700, 5);
          this.later(150, () => this.ring(to, TILE_SIZE, 0xf7d774, 500, 3));
          return this.heal(to);
        }
        this.projectile(FX.leaf, from, to, 260, { trail: 0xc8a165, glow: 0x9cff7a, impact: 0x9cff7a });
        return this.later(260, () => this.sparks(to, 0x9cff7a, 8));
      case "barkskin":
        this.drain(from, to, 0x8d6e4a);
        return this.later(200, () => { this.shieldRaise(to); this.debris(to, TILE_SIZE / 2, 0x8d6e4a); });
      case "reviving_rain":
        this.beam(to, 0x7fc8ff);
        return this.ring(to, radius, 0x7fc8ff, 600, 3);
      // A explosão do veneno chega como eco no monstro morto.
      case "mamba_bite":
        if (from.x === to.x && from.y === to.y) {
          this.ring(to, TILE_SIZE * 2.5, 0x9acd32, 450, 7);
          return this.sparks(to, 0x9acd32, 14);
        }
        return this.projectile(FX.greenLight, from, to, ms, { trail: 0x2d6a1f, glow: 0x1e4d14, impact: 0x9acd32, scale: 1.2 });
      case "poison_cloud":
        this.projectile(FX.greenLight, from, to, 200, { trail: 0x9acd32, glow: 0x6ab04c });
        return this.later(200, () => this.ring(to, radius, 0x9acd32, 500, 5));
      case "thunderwave":
        this.ring(from, radius, 0x9ec5ff, 400, 8);
        this.later(80, () => this.ring(from, radius * 0.6, 0xffffff, 300, 4));
        return this.sparks(from, 0x9ec5ff, 10);
      // Raio do céu: da nuvem (Chamar Relâmpago) ou do Céu Carregado, sempre caindo no ponto `to`.
      case "call_lightning":
        this.beam(to, 0x9ec5ff);
        return this.sparks(to, 0xffffff, 8);
      case "giant_eagle":
        this.ring(from, TILE_SIZE * 1.5, 0xc8a165, 550, 3);
        return this.sparks(from, 0xf7d774, 8);
      // Costelas do Grimório. As áreas, linhas e leques acendem pelo `area` e pelo `showCone` (DungeonScene).
      case "twin_slash": return this.slash(from, to);
      case "cross_cut":
        this.slash(from, to);
        return this.sparks(to, 0xd2d6de, 6);
      case "open_wound":
        this.slash(from, to);
        return this.later(120, () => this.sparks(to, 0xc0392b, 10));
      case "seismic_rift": return this.debris(to, TILE_SIZE, 0x6b4426);
      case "aegis_strike":
        this.slash(from, to);
        return this.shieldRaise(from);
      case "shield_quake":
        this.ring(from, radius, 0x5dade2, 500, 6);
        return this.debris(from, radius, 0x6b4426);
      case "stunning_roar":
        this.ring(from, radius, 0xe67e22, 550, 6);
        return this.later(120, () => this.ring(from, radius * 0.6, 0xf1c40f, 450, 4));
      case "battle_order": return this.ring(from, TILE_SIZE * 0.8, 0xe67e22, 500, 4);
      case "challenge_mark":
        this.zap(from, to, 0xe67e22);
        return this.ring(to, TILE_SIZE / 2, 0xe74c3c, 400, 4);
      case "double_shot": return this.projectile(FX.arrow, from, to, ms, { trail: 0xf1c40f, glow: 0xf1c40f });
      case "barbed_arrow":
        this.projectile(FX.arrow, from, to, ms, { trail: 0xc0392b, glow: 0xc0392b, scale: 1.3 });
        return this.later(ms, () => this.sparks(to, 0xc0392b, 8));
      case "sunbeam": return this.zap(from, to, 0xfff6c8);
      case "holy_hammer":
        this.projectile(FX.holyArrow, from, to, ms, { trail: 0xffe9a3, glow: 0xf7d774, impact: 0xfff6c8, scale: 1.8 });
        return this.later(ms, () => this.holyFlash(to));
      case "net_arrow":
        this.projectile(FX.arrow, from, to, ms, { trail: 0xc8a165, glow: 0xc8a165 });
        return this.later(ms, () => this.ring(to, radius + TILE_SIZE / 2, 0xc8a165, 450, 3));
      case "fire_arrows":
        this.arrowRain(to, radius, ms);
        return this.later(ms, () => this.sparks(to, 0xff7f27, 12));
      case "spark": return this.projectile(FX.darkLight, from, to, ms, { trail: 0x9ec5ff, glow: 0x9ec5ff, impact: 0xffffff, scale: 0.8 });
      case "ember_rain":
        this.beam(to, 0xff7f27);
        return this.sparks(to, 0xf1c40f, 10);
      case "frostbite":
        this.projectile(FX.shadowOrb, from, to, ms, { trail: 0xd6f1ff, glow: 0x9ec5ff, impact: 0xffffff, scale: 0.9 });
        return this.later(ms, () => this.snow(to, TILE_SIZE));
      case "frozen_orb":
        this.projectile(FX.shadowOrb, from, to, ms, { trail: 0xd6f1ff, glow: 0x9ec5ff, impact: 0xffffff, scale: 1.5 });
        return this.later(ms, () => { this.ring(to, radius, 0xd6f1ff, 500, 6); this.snow(to, radius); });
      case "dark_seal":
        this.projectile(FX.darkLight, from, to, ms, { trail: 0x2d0a40, glow: 0x8e44ad, impact: 0xc77dff });
        return this.later(ms, () => this.ring(to, TILE_SIZE / 2, 0x8e44ad, 450, 4));
      case "plague":
        this.projectile(FX.shadowOrb, from, to, ms, { trail: 0x6b8e23, glow: 0x556b2f, impact: 0x9acd32 });
        return this.later(ms, () => this.ring(to, radius, 0x6b8e23, 500, 5));
      case "howl": return this.ring(from, radius, 0xb0c4de, 600, 4);
      case "purifying_sap":
        this.zap(from, to, 0x7bed9f);
        return this.heal(to);
      case "blossom_burst":
        this.ring(from, radius, 0xff9ff3, 600, 4);
        return this.heal(from);
      case "vine_lash": return this.zap(from, to, 0x6b7a2a);
      case "spore_burst":
        this.projectile(FX.greenLight, from, to, ms, { trail: 0x9acd32, glow: 0x6b8e23, impact: 0x9cff7a });
        return this.later(ms, () => this.ring(to, radius, 0x9acd32, 500, 5));
      case "bramble_burst":
        this.ring(from, radius, 0x6b7a2a, 450, 7);
        return this.debris(from, radius, 0x3d5a1e);
      // Invocações: um círculo de folhas em volta do druida; as criaturas brotam pelo estado (`summonBurst`).
      case "spirit_wolf":
      case "healing_moth":
      case "hornet_swarm":
      case "wolf_pack":
      case "ancient_bear":
      case "grove_guardian":
      case "forest_heart":
        this.ring(from, Math.max(radius, TILE_SIZE * 1.5), SPELLS[spellId].color, 550, 3);
        return this.heal(from);
    }
  }

  /**
   * Área de uma magia: cada tile atingido acende com a cor da magia e solta faíscas, em onda do centro
   * para fora (`ring` = distância em tiles até o centro). `delay` espera o projétil chegar.
   */
  area(tiles: (Point & { ring: number })[], color: number, delay: number) {
    const half = TILE_SIZE / 2;
    this.later(delay, () => {
      for (const t of tiles) {
        this.later(t.ring * 45, () => {
          const g = this.scene.add.graphics().setDepth(FX_DEPTH - 2).setPosition(t.x, t.y);
          g.fillStyle(color, 0.35).fillRect(-half + 1, -half + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          g.lineStyle(1, color, 0.9).strokeRect(-half + 1.5, -half + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
          g.fillStyle(0xffffff, 0.25).fillRect(-half + 3, -half + 3, TILE_SIZE - 6, 2);
          this.scene.tweens.add({
            targets: g, scale: { from: 0.6, to: 1 }, alpha: { from: 1, to: 0 }, duration: 520, ease: "Cubic.Out",
            onComplete: () => g.destroy(),
          });
          this.sparks(t, color, 2);
        });
      }
    });
  }

  /** Raio em cadeia: um arco elétrico em zigue-zague de cada alvo para o seguinte, um salto de cada vez. */
  chain(points: Point[], color: number) {
    for (let i = 1; i < points.length; i++) {
      this.later((i - 1) * 70, () => {
        const a = points[i - 1];
        const b = points[i];
        const g = this.scene.add.graphics().setDepth(FX_DEPTH);
        const zigzag = (width: number, tint: number, alpha: number) => {
          g.lineStyle(width, tint, alpha).beginPath().moveTo(a.x, a.y);
          for (let k = 1; k < 5; k++) {
            const t = k / 5;
            g.lineTo(a.x + (b.x - a.x) * t + Phaser.Math.Between(-6, 6), a.y + (b.y - a.y) * t + Phaser.Math.Between(-6, 6));
          }
          g.lineTo(b.x, b.y).strokePath();
        };
        zigzag(4, color, 0.5);
        zigzag(2, 0xffffff, 0.95);
        this.scene.tweens.add({ targets: g, alpha: { from: 1, to: 0 }, duration: 260, onComplete: () => g.destroy() });
        this.sparks(b, color, 6);
      });
    }
  }

  /**
   * Núcleo Infernal: um vulcão rompe o chão sob o feiticeiro. O chão racha em fendas de lava até a borda da área,
   * uma coluna de fogo sobe da cratera e solta cinza, bombas de lava caem nos tiles atingidos e os monstros pegos
   * pegam fogo. O chão fica em brasa e esfria aos poucos (~3 s), então a área do golpe segue legível depois dele.
   * `tiles`: os tiles atingidos (a mesma regra do servidor); `hits`: onde estão os monstros pegos.
   * A câmera não treme (princípio do jogo, ver "Plataforma" no GDD): o impacto vem do desenho.
   */
  volcano(at: Point, tiles: (Point & { ring: number })[], hits: Point[]) {
    if (tiles.length === 0) return;
    const key = (x: number, y: number) => `${Math.floor(x / TILE_SIZE)},${Math.floor(y / TILE_SIZE)}`;
    const inArea = new Set(tiles.map((t) => key(t.x, t.y)));
    const reach = (Math.max(...tiles.map((t) => t.ring)) + 0.5) * TILE_SIZE;
    const crater = { x: at.x, y: at.y + 8 };

    // Fendas: saem da borda da cratera em zigue-zague (quebram e voltam para o rumo), umas com galho, e param
    // na parede (fora da área). `width`: a grossura na raiz; afinam até a ponta.
    const cracks: { pts: Point[]; delay: number; width: number }[] = [];
    const grow = (start: Point, angle: number, length: number, delay: number, width: number, branch: boolean) => {
      const pts = [start];
      const steps = Math.ceil(length / 11);
      let { x, y } = start;
      for (let s = 1; s <= steps; s++) {
        const a = angle + Phaser.Math.FloatBetween(-0.6, 0.6);
        x += Math.cos(a) * 11;
        y += Math.sin(a) * 11;
        if (!inArea.has(key(x, y))) break;
        pts.push({ x, y });
        if (branch && s === Math.floor(steps * Phaser.Math.FloatBetween(0.3, 0.6))) {
          grow({ x, y }, angle + (Math.random() < 0.5 ? -0.8 : 0.8), length * 0.35, delay + 120, width * 0.6, false);
        }
      }
      if (pts.length > 1) cracks.push({ pts, delay, width });
    };
    const spokes = 7;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.35, 0.35);
      const length = reach * Phaser.Math.FloatBetween(0.6, 1);
      grow({ x: crater.x + Math.cos(a) * 28, y: crater.y + Math.sin(a) * 16 }, a, length, 0, Phaser.Math.FloatBetween(3, 4.5), Math.random() < 0.7);
    }
    // Pedras de basalto na borda da cratera e bolhas na lava.
    const rim = Array.from({ length: 20 }, (_, i) => {
      const a = (i / 20) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.1, 0.1);
      const out = Phaser.Math.FloatBetween(0, 3);
      return { x: crater.x + Math.cos(a) * (28 + out), y: crater.y + Math.sin(a) * (16 + out * 0.6), r: Phaser.Math.FloatBetween(3, 6) };
    });
    const bubbles = Array.from({ length: 8 }, () => ({
      x: Phaser.Math.FloatBetween(-18, 18), y: Phaser.Math.FloatBetween(-7, 7), phase: Math.random() * Math.PI * 2,
    }));
    // Respingos das bombas de lava e chão chamuscado sob os monstros atingidos (aparecem com o tempo).
    const splats: (Point & { r: number; born: number })[] = [];
    const scars = hits.map((p) => ({ x: p.x, y: p.y + 10 }));

    const heat = (ms: number) =>
      ms < VOLCANO.heatMs ? ms / VOLCANO.heatMs
        : ms < VOLCANO.hotMs ? 1
          : Math.max(0, 1 - (ms - VOLCANO.hotMs) / (VOLCANO.coolMs - VOLCANO.hotMs));
    const fade = (ms: number) => (ms < VOLCANO.coolMs ? 1 : Math.max(0, 1 - (ms - VOLCANO.coolMs) / (VOLCANO.endMs - VOLCANO.coolMs)));

    const ground = this.scene.add.graphics().setDepth(GROUND_DEPTH);
    const glow = this.scene.add.graphics().setDepth(GROUND_DEPTH + 0.1).setBlendMode(Phaser.BlendModes.ADD);
    const half = TILE_SIZE / 2;
    /** Fenda afinando da raiz (`width`) até a ponta. */
    const polyline = (pts: Point[], count: number, width: number, color: number, alpha: number) => {
      for (let k = 1; k < count; k++) {
        const w = Math.max(1, width * (1 - (k / pts.length) * 0.75));
        ground.lineStyle(w, color, alpha).lineBetween(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y);
        ground.fillStyle(color, alpha).fillCircle(pts[k].x, pts[k].y, w / 2);
      }
    };
    const draw = (ms: number) => {
      const h = heat(ms);
      ground.clear().setAlpha(fade(ms));
      glow.clear().setAlpha(fade(ms));
      // Chão chamuscado, tile a tile, em onda do centro para fora (como a área da magia).
      for (const t of tiles) {
        if (ms < t.ring * 45) continue;
        ground.fillStyle(0x140a06, 0.42).fillRect(t.x - half + 1, t.y - half + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ground.fillStyle(lava(h * 0.7), 0.5 * h).fillRect(t.x - 5, t.y + 3, 2, 2).fillRect(t.x + 6, t.y - 6, 2, 2);
      }
      for (const s of scars) ground.fillStyle(0x0a0503, 0.55).fillEllipse(s.x, s.y, 26, 10);
      // Fendas: borda carbonizada, lava e um fio quase branco enquanto está quente.
      for (const c of cracks) {
        const grown = Phaser.Math.Clamp((ms - c.delay) / 260, 0, 1);
        const count = 1 + Math.floor((c.pts.length - 1) * grown);
        if (count < 2) continue;
        polyline(c.pts, count, c.width + 3, 0x1a0805, 0.85);
        polyline(c.pts, count, c.width, lava(h * 0.85), 0.95);
        if (h > 0.15) polyline(c.pts, count, c.width * 0.4, lava(h), 1);
        for (let k = 1; k < count; k += 2) glow.fillStyle(0xff6b1a, 0.12 * h).fillCircle(c.pts[k].x, c.pts[k].y, c.width * 2);
      }
      for (const s of splats) {
        const sh = Math.min(h, 1 - Math.min(1, (ms - s.born) / 2200));
        ground.fillStyle(0x1a0805, 0.8).fillCircle(s.x, s.y, s.r + 1.5);
        ground.fillStyle(lava(sh), 1).fillCircle(s.x, s.y, s.r).fillCircle(s.x + s.r * 0.8, s.y + 1, s.r * 0.6);
      }
      // Cratera: lava borbulhando cercada de basalto.
      ground.fillStyle(0x1a0805, 0.9).fillEllipse(crater.x, crater.y, 66, 38);
      ground.fillStyle(lava(h * 0.75), 1).fillEllipse(crater.x, crater.y, 52, 28);
      ground.fillStyle(lava(h * 0.95), 1).fillEllipse(crater.x, crater.y + 1, 36, 18);
      ground.fillStyle(lava(h), 1).fillEllipse(crater.x, crater.y + 1, 18, 8);
      for (const b of bubbles) {
        const r = 1.2 + Math.max(0, Math.sin(ms / 140 + b.phase)) * 2.5;
        ground.fillStyle(lava(Math.min(1, h + 0.2)), h).fillCircle(crater.x + b.x, crater.y + b.y, r);
      }
      for (const r of rim) {
        ground.fillStyle(0x2b2522, 1).fillCircle(r.x, r.y, r.r);
        ground.fillStyle(0x4a3f3a, 1).fillCircle(r.x - 1, r.y - 1, r.r * 0.5);
        ground.fillStyle(0xff6b1a, 0.6 * h).fillRect(r.x - 1, r.y + r.r - 1, 2, 1);
      }
      glow.fillStyle(0xff6b1a, 0.3 * h).fillEllipse(crater.x, crater.y, 96, 56);
      glow.fillStyle(0xffe08a, 0.25 * h).fillEllipse(crater.x, crater.y, 40, 20);
    };
    this.scene.tweens.addCounter({
      from: 0, to: VOLCANO.endMs, duration: VOLCANO.endMs,
      onUpdate: (tween) => draw(tween.getValue() ?? 0),
      onComplete: () => { ground.destroy(); glow.destroy(); },
    });

    // Onda de choque até a borda da área e pedras saltando.
    this.ring(at, reach, 0xe74c3c, 650, 9);
    this.later(90, () => this.ring(at, reach * 0.7, 0xff7f27, 500, 6));
    this.later(160, () => this.ring(at, reach * 0.4, 0xffe08a, 400, 3));
    this.debris(at, reach, 0x2b2522);
    this.later(60, () => this.eruption(crater));

    // Bombas de lava: saem da cratera em arco e caem em tiles atingidos, deixando respingo no chão.
    const landing = tiles.filter((t) => t.ring >= 1);
    const born = this.scene.time.now;
    for (let i = 0; i < 12 && landing.length > 0; i++) {
      const t = landing[Phaser.Math.Between(0, landing.length - 1)];
      const to = { x: t.x + Phaser.Math.Between(-8, 8), y: t.y + Phaser.Math.Between(-8, 8) };
      this.later(Phaser.Math.Between(120, 800), () => this.lavaBomb({ x: crater.x, y: crater.y - 30 }, to, () => {
        splats.push({ ...to, r: Phaser.Math.FloatBetween(2.5, 4), born: this.scene.time.now - born });
      }));
    }

    // Monstros atingidos pegam fogo: labaredas sobem neles em duas ondas.
    for (const p of hits) {
      this.later(60, () => this.sparks(p, 0xffd166, 8));
      for (let wave = 0; wave < 2; wave++) this.later(60 + wave * 280, () => this.engulf(p));
    }

    // Brasas sobem do chão enquanto ele está quente; fumaça sai das fendas quando esfria.
    for (let i = 0; i < 28; i++) {
      const t = tiles[Phaser.Math.Between(0, tiles.length - 1)];
      this.later(Phaser.Math.Between(150, 2000), () => this.ember({ x: t.x + Phaser.Math.Between(-12, 12), y: t.y + Phaser.Math.Between(-12, 12) }));
    }
    for (let i = 0; i < 10 && cracks.length > 0; i++) {
      const c = cracks[Phaser.Math.Between(0, cracks.length - 1)];
      const p = c.pts[Phaser.Math.Between(0, c.pts.length - 1)];
      this.later(Phaser.Math.Between(1300, 2500), () => this.smoke(p, Phaser.Math.FloatBetween(4, 7), 900));
    }
  }

  /** Coluna de fogo da cratera (atrás de quem conjura), que se abre em nuvem de cinza no alto. */
  private eruption(at: Point) {
    const column = this.scene.add.graphics().setPosition(at.x, at.y).setDepth(at.y + TILE_SIZE / 2 - 8)
      .setBlendMode(Phaser.BlendModes.ADD);
    // Jato largo na boca, afinando no meio e abrindo num chafariz de lava no alto.
    const jet = (base: number, waist: number, top: number, height: number, color: number, alpha: number) => {
      column.fillStyle(color, alpha).fillPoints([
        new Phaser.Math.Vector2(-base / 2, 0), new Phaser.Math.Vector2(base / 2, 0),
        new Phaser.Math.Vector2(waist / 2, -height * 0.55), new Phaser.Math.Vector2(top / 2, -height),
        new Phaser.Math.Vector2(-top / 2, -height), new Phaser.Math.Vector2(-waist / 2, -height * 0.55),
      ], true);
      for (const [dx, dy, r] of [[-0.45, 0.05, 0.38], [0.45, 0.05, 0.38], [-0.2, -0.12, 0.42], [0.2, -0.12, 0.42], [0, -0.2, 0.4]]) {
        column.fillCircle(dx * top, -height + dy * top, r * top);
      }
    };
    jet(30, 20, 44, 112, 0xc0392b, 0.5);
    jet(20, 13, 30, 104, 0xff6b1a, 0.75);
    jet(10, 6, 14, 96, 0xffe08a, 0.95);
    column.setScale(1, 0);
    this.scene.tweens.add({
      targets: column, scaleY: 1, duration: 170, ease: "Back.Out",
      onComplete: () => this.scene.tweens.add({
        targets: column, scaleX: 0.25, alpha: 0, delay: 250, duration: 500, ease: "Quad.In",
        onComplete: () => column.destroy(),
      }),
    });
    // Nuvem de cinza no topo, iluminada de baixo nas bordas.
    this.later(180, () => {
      for (let i = 0; i < 10; i++) {
        const c = this.scene.add.circle(
          at.x + Phaser.Math.Between(-22, 22), at.y - 112 + Phaser.Math.Between(-10, 10), Phaser.Math.Between(11, 18),
          [0x6b5a52, 0x4a3f3a, 0x9a3a18][i % 3], 0.85,
        ).setDepth(FX_DEPTH - 1).setScale(0.5);
        this.scene.tweens.add({
          targets: c, scale: Phaser.Math.FloatBetween(1.4, 2), alpha: 0,
          x: c.x + Phaser.Math.Between(-24, 24), y: c.y - Phaser.Math.Between(20, 40),
          duration: Phaser.Math.Between(1300, 1700), ease: "Sine.Out", onComplete: () => c.destroy(),
        });
      }
    });
  }

  /** Bomba de lava em arco alto com rastro de brasa; no chão, espirra e chama `landed`. */
  private lavaBomb(from: Point, to: Point, landed: () => void) {
    const ms = Phaser.Math.Between(420, 600);
    const arc = Phaser.Math.Between(50, 90);
    const ball = this.scene.add.circle(from.x, from.y, 3.5, 0xffb347).setDepth(FX_DEPTH).setStrokeStyle(1, 0x7a1a0a, 1);
    const shadow = this.scene.add.ellipse(from.x, from.y + 30, 7, 3, 0x000000, 0.35).setDepth(GROUND_DEPTH + 0.2);
    this.scene.tweens.add({ targets: shadow, x: to.x, y: to.y + 2, duration: ms, onComplete: () => shadow.destroy() });
    let lastTrail = 0;
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: ms,
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        ball.setPosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * arc);
        if (this.scene.time.now - lastTrail < 40) return;
        lastTrail = this.scene.time.now;
        this.puff(ball.x, ball.y, 0xff6b1a, 2);
      },
      onComplete: () => {
        ball.destroy();
        landed();
        this.ring(to, 10, 0xff6b1a, 300, 2);
        this.sparks(to, 0xffd166, 5);
        this.smoke(to, 3, 500);
      },
    });
  }

  /** Labaredas subindo num monstro atingido. */
  private engulf(at: Point) {
    const colors = [0xe74c3c, 0xff6b1a, 0xffd166];
    for (let i = 0; i < 3; i++) {
      const flame = this.scene.add.ellipse(at.x + (i - 1) * 7, at.y + 6, 9, 14, colors[i], 0.9)
        .setDepth(FX_DEPTH).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6, 0.6);
      this.scene.tweens.add({
        targets: flame, y: at.y - 18, scaleX: 0.3, scaleY: 1.6, alpha: 0,
        delay: i * 70, duration: 520, ease: "Quad.Out", onComplete: () => flame.destroy(),
      });
    }
  }

  /** Uma brasa subindo e apagando. */
  private ember(at: Point) {
    const s = this.scene.add.image(at.x, at.y, FX.spark).setDepth(FX_DEPTH - 1)
      .setTint([0xffd166, 0xff6b1a, 0xe74c3c][Phaser.Math.Between(0, 2)]).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: s, x: at.x + Phaser.Math.Between(-8, 8), y: at.y - Phaser.Math.Between(20, 36), alpha: { from: 1, to: 0 },
      duration: Phaser.Math.Between(700, 1000), ease: "Sine.Out", onComplete: () => s.destroy(),
    });
  }

  /** Fumaça escura subindo devagar. */
  private smoke(at: Point, size: number, duration: number) {
    const c = this.scene.add.circle(at.x, at.y, size, 0x3b3330, 0.55).setDepth(FX_DEPTH - 1);
    this.scene.tweens.add({
      targets: c, y: at.y - 18, x: at.x + Phaser.Math.Between(-6, 6), scale: 2, alpha: 0,
      duration, ease: "Sine.Out", onComplete: () => c.destroy(),
    });
  }

  /** Raio reto e tremido de `from` a `to` (Feixe de Energia). */
  private zap(from: Point, to: Point, color: number) {
    const g = this.scene.add.graphics().setDepth(FX_DEPTH);
    const steps = Math.max(3, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 16));
    const line = (width: number, tint: number, alpha: number) => {
      g.lineStyle(width, tint, alpha).beginPath().moveTo(from.x, from.y);
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        g.lineTo(from.x + (to.x - from.x) * t + Phaser.Math.Between(-3, 3), from.y + (to.y - from.y) * t + Phaser.Math.Between(-3, 3));
      }
      g.lineTo(to.x, to.y).strokePath();
    };
    line(6, color, 0.45);
    line(2, 0xffffff, 0.95);
    this.scene.tweens.add({ targets: g, alpha: { from: 1, to: 0 }, duration: 300, onComplete: () => g.destroy() });
  }

  /** Brilho de cura subindo de um aliado (Bênção da Floresta). */
  heal(at: Point) {
    for (let i = 0; i < 6; i++) {
      const leaf = this.scene.add.image(at.x + Phaser.Math.Between(-10, 10), at.y + 8, FX.leaf).setDepth(FX_DEPTH);
      this.scene.tweens.add({
        targets: leaf,
        y: at.y - 18 - Phaser.Math.Between(0, 10),
        angle: Phaser.Math.Between(-90, 90),
        alpha: { from: 1, to: 0 },
        delay: i * 60,
        duration: 700,
        onComplete: () => leaf.destroy(),
      });
    }
  }

  // --- Habilidades especiais dos monstros --------------------------------------

  /**
   * Habilidade de monstro (sai sem aviso): o desenho vem do `fx` da habilidade, sobre os tiles atingidos.
   * `to` é o alvo (ou onde o monstro caiu) e `rising` marca a decolagem do voo/mergulho.
   */
  monsterStrike(ability: MonsterAbility, from: Point, to: Point, tiles: Point[], rising = false) {
    const color = ability.color;
    const radius = Math.max(1, ability.radius) * TILE_SIZE;
    const flash = (delayPerRing = 0) => this.area(tiles.map((t, i) => ({ ...t, ring: delayPerRing ? i * delayPerRing : 0 })), color, 0);
    switch (ability.fx) {
      case "quake":
        this.ring(from, radius + TILE_SIZE * 0.6, color, 520, 9);
        this.later(120, () => this.ring(from, radius * 0.7, 0xffffff, 360, 3));
        this.debris(from, radius, 0x6b4426);
        return flash(0.6);
      case "breath":
        this.breath(from, tiles);
        return flash(0.5);
      case "acidRain":
        this.acidRain(tiles, color);
        return this.later(320, () => flash(0.3));
      case "boulder":
        this.lob(from, to, 0x8d6e63, 360);
        return this.later(360, () => {
          this.debris(to, radius, 0x6b4426);
          this.ring(to, radius, color, 380, 6);
          flash();
        });
      case "leap":
        this.ring({ x: to.x, y: to.y + 8 }, TILE_SIZE * 0.7, color, 360, 4);
        this.puff(to.x, to.y + 8, 0xbdb3a3, 9);
        if (tiles.length > 0) flash();
        return;
      case "tongue":
        this.lash(from, to, color, 260);
        return this.later(140, () => this.sparks(to, color, 5));
      case "constrict":
        this.ring(to, TILE_SIZE * 0.55, color, 600, 5);
        return this.later(150, () => this.ring(to, TILE_SIZE * 0.4, 0x5d6d7e, 500, 4));
      case "rend":
        this.slash(from, to);
        this.later(90, () => this.slash(from, to));
        return this.later(180, () => this.sparks(to, color, 8));
      case "dive":
        if (rising) {
          this.puff(from.x, from.y, 0xffffff, 14);
          return this.ring({ x: from.x, y: from.y + 8 }, TILE_SIZE, color, 500, 5);
        }
        this.ring(to, radius + TILE_SIZE / 2, color, 480, 8);
        this.debris(to, radius, 0x6b4426);
        return flash(0.4);
      case "web":
        this.lob(from, to, 0xf5f5f5, 260);
        return this.later(260, () => this.ring(to, TILE_SIZE * 0.6, 0xf5f5f5, 700, 2));
      case "spit":
        this.lob(from, to, color, 300);
        return this.later(300, () => {
          this.bubbles(to, color);
          flash();
        });
      case "emberRift":
        this.emberRift(from, ability.shape === "self" ? null : to, ability.shape === "self" ? radius : Math.max(1, ability.length ?? 4) * TILE_SIZE);
        return this.later(160, () => flash(0.35));
      case "lightning":
        for (const t of tiles) this.zap(from, t, color);
        return flash(0.3);
      case "bolt":
        this.lob(from, to, color, 240);
        return this.later(240, () => this.sparks(to, color, 8));
      case "engulf":
        this.bubbles(to, color);
        return this.ring(to, TILE_SIZE * 0.7, color, 500, 6);
      case "summon":
        this.ring({ x: from.x, y: from.y + 8 }, TILE_SIZE * 1.2, color, 520, 4);
        return this.sparks(from, color, 10);
      case "vanish":
        this.puff(from.x, from.y, color, 14);
        return this.sparks(from, color, 10);
      case "slam":
        this.ring(to, radius, color, 420, 7);
        return flash();
    }
  }

  /** Coisa arremessada em arco (pedra, teia, cuspe), com sombra no chão. */
  private lob(from: Point, to: Point, color: number, ms: number) {
    const ball = this.scene.add.circle(from.x, from.y - 8, 4, color).setDepth(FX_DEPTH).setStrokeStyle(1, 0x000000, 0.5);
    const shadow = this.scene.add.ellipse(from.x, from.y + 10, 8, 3, 0x000000, 0.35).setDepth(FX_DEPTH - 1);
    this.scene.tweens.add({ targets: shadow, x: to.x, y: to.y + 10, duration: ms, onComplete: () => shadow.destroy() });
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: ms,
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        ball.setPosition(from.x + (to.x - from.x) * t, from.y - 8 + (to.y - from.y) * t - Math.sin(t * Math.PI) * 26);
      },
      onComplete: () => ball.destroy(),
    });
  }

  /** Língua ou chicote: estica do monstro até o alvo e volta. */
  private lash(from: Point, to: Point, color: number, ms: number) {
    const g = this.scene.add.graphics().setDepth(FX_DEPTH);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: ms, yoyo: true,
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        g.clear().lineStyle(4, color, 1).lineBetween(from.x, from.y - 6, from.x + (to.x - from.x) * t, from.y - 6 + (to.y - from.y) * t);
      },
      onComplete: () => g.destroy(),
    });
  }

  /**
   * Fenda de Brasa (Vorgak): o chão racha a partir do cutelo, numa linha reta até `to` (ou em raios para todo lado, sem
   * `to`), e a fenda fica incandescente e esfria devagar (laranja, vermelho, escuro), com labaredas saindo dela em
   * sequência e brasas subindo. O impacto está no desenho do chão (a câmera não treme).
   */
  private emberRift(from: Point, to: Point | null, reach: number) {
    const cracks: Point[][] = [];
    const crack = (angle: number, length: number) => {
      const pts: Point[] = [{ x: from.x, y: from.y + 6 }];
      const steps = Math.max(4, Math.round(length / 9));
      for (let i = 1; i <= steps; i++) {
        const d = (i / steps) * length;
        const jag = i === steps ? 0 : Phaser.Math.Between(-5, 5);
        pts.push({ x: from.x + Math.cos(angle) * d - Math.sin(angle) * jag, y: from.y + 6 + Math.sin(angle) * d + Math.cos(angle) * jag });
        // Galhos curtos saindo da fenda principal.
        if (i > 1 && i < steps && Math.random() < 0.35) {
          const b = angle + (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.FloatBetween(0.5, 1);
          const at = pts[pts.length - 1], bl = Phaser.Math.Between(6, 14);
          cracks.push([at, { x: at.x + Math.cos(b) * bl * 0.5 + Phaser.Math.Between(-2, 2), y: at.y + Math.sin(b) * bl * 0.5 }, { x: at.x + Math.cos(b) * bl, y: at.y + Math.sin(b) * bl }]);
        }
      }
      cracks.unshift(pts);
    };
    if (to) crack(Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y), reach);
    else for (let i = 0; i < 7; i++) crack((i / 7) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2), reach * Phaser.Math.FloatBetween(0.75, 1.05));

    const scorch = this.scene.add.graphics().setDepth(GROUND_DEPTH + 0.05);
    const glow = this.scene.add.graphics().setDepth(GROUND_DEPTH + 0.06).setBlendMode(Phaser.BlendModes.ADD);
    const path = (g: Phaser.GameObjects.Graphics, pts: Point[], upTo: number) => {
      const n = Math.max(1, Math.ceil(upTo * (pts.length - 1)));
      g.beginPath().moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= n && i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.strokePath();
    };
    const lerpColor = (a: number, b: number, t: number) => {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, t * 100);
      return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
    };
    // Abre em 220 ms, fica em brasa e esfria até 2,6 s; a marca escura some por último.
    const OPEN = 220, LIFE = 2600;
    this.scene.tweens.addCounter({
      from: 0, to: LIFE, duration: LIFE,
      onUpdate: (tween) => {
        const ms = tween.getValue() ?? 0;
        const open = Math.min(1, ms / OPEN);
        const heat = ms < OPEN ? 1 : Math.max(0, 1 - (ms - OPEN) / 1500);
        const fade = ms < LIFE - 700 ? 1 : (LIFE - ms) / 700;
        scorch.clear();
        glow.clear();
        cracks.forEach((pts, k) => {
          const main = k === 0 || (to === null && pts.length > 3);
          scorch.lineStyle(main ? 7 : 4, 0x140a06, 0.6 * fade);
          path(scorch, pts, open);
          scorch.lineStyle(main ? 3 : 2, lerpColor(0x2a0d06, 0xff8a1a, heat), Math.max(0.35 * fade, heat));
          path(scorch, pts, open);
          if (heat > 0) {
            glow.lineStyle(main ? 12 : 7, 0xff4a0a, 0.32 * heat);
            path(glow, pts, open);
            glow.lineStyle(1.2, 0xfff0b0, heat);
            path(glow, pts, open);
          }
        });
      },
      onComplete: () => { scorch.destroy(); glow.destroy(); },
    });
    // Labaredas saindo da fenda em sequência, do cutelo para a ponta.
    cracks.forEach((pts, k) => pts.forEach((pt, i) => {
      if (i === 0 || (k > 0 && to)) return;
      this.later(i * (OPEN / pts.length) + 40, () => {
        const flame = this.scene.add.circle(pt.x, pt.y - 3, 4, 0xffd166, 0.95).setDepth(FX_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
        const outer = this.scene.add.circle(pt.x, pt.y - 3, 8, 0xff6b1a, 0.55).setDepth(FX_DEPTH - 1).setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
          targets: [flame, outer], scale: { from: 0.5, to: 1.5 }, alpha: { from: 1, to: 0 }, y: pt.y - 18 - Phaser.Math.Between(0, 8),
          duration: 460, ease: "Quad.Out", onComplete: () => { flame.destroy(); outer.destroy(); },
        });
      });
    }));
    // Brasas subindo devagar da fenda, enquanto ela esfria.
    const main = cracks[0];
    for (let i = 0; i < 18; i++) {
      const pt = main[Phaser.Math.Between(0, main.length - 1)];
      const e = this.scene.add.image(pt.x + Phaser.Math.Between(-4, 4), pt.y, FX.spark).setDepth(FX_DEPTH).setTint(i % 3 ? 0xff8a1a : 0xffd166).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: e, x: e.x + Phaser.Math.Between(-8, 8), y: pt.y - Phaser.Math.Between(20, 40), alpha: { from: 1, to: 0 }, scale: { from: 1, to: 0.4 },
        delay: OPEN + i * 45, duration: 900, onComplete: () => e.destroy(),
      });
    }
  }

  /** Bolhas de veneno subindo. */
  private bubbles(at: Point, color: number) {
    for (let i = 0; i < 7; i++) {
      const b = this.scene.add.circle(at.x + Phaser.Math.Between(-8, 8), at.y + 4, Phaser.Math.Between(1, 3), color, 0.85).setDepth(FX_DEPTH);
      this.scene.tweens.add({
        targets: b, y: at.y - 18 - Phaser.Math.Between(0, 8), alpha: { from: 1, to: 0 },
        delay: i * 50, duration: 500, onComplete: () => b.destroy(),
      });
    }
  }

  /** Sopro Infernal: labaredas correm pela faixa, cada tile explode em fogo. */
  private breath(from: Point, tiles: Point[]) {
    tiles.forEach((t, i) => this.later(i * 22, () => {
      const flame = this.scene.add.circle(t.x, t.y - 4, 6, 0xffd166, 0.95).setDepth(FX_DEPTH).setBlendMode(Phaser.BlendModes.ADD);
      const outer = this.scene.add.circle(t.x, t.y - 4, 10, 0xff6b1a, 0.6).setDepth(FX_DEPTH - 1).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: [flame, outer], scale: { from: 0.4, to: 1.6 }, alpha: { from: 1, to: 0 }, y: t.y - 16, duration: 420, ease: "Quad.Out",
        onComplete: () => { flame.destroy(); outer.destroy(); },
      });
      this.puff(t.x + Phaser.Math.Between(-6, 6), t.y, 0x3d1f0f, 4);
    }));
    for (let i = 0; i < 10; i++) {
      const ember = this.scene.add.image(from.x, from.y - 8, FX.spark).setDepth(FX_DEPTH).setTint(i % 2 ? 0xffd166 : 0xff6b1a);
      const t = tiles[Math.floor((i / 10) * tiles.length)] ?? from;
      this.scene.tweens.add({ targets: ember, x: t.x + Phaser.Math.Between(-10, 10), y: t.y - 10, alpha: { from: 1, to: 0 }, duration: 300, delay: i * 20, onComplete: () => ember.destroy() });
    }
  }

  /** Chuva Ácida: gotas caem do alto em cada tile e espirram. */
  private acidRain(tiles: Point[], color: number) {
    tiles.forEach((t, i) => {
      const drop = this.scene.add.ellipse(t.x + Phaser.Math.Between(-6, 6), t.y - 110, 4, 8, color, 0.95).setDepth(FX_DEPTH);
      this.scene.tweens.add({
        targets: drop, y: t.y - 2, duration: 280, delay: (i % 6) * 15, ease: "Quad.In",
        onComplete: () => {
          drop.destroy();
          this.bubbles(t, color);
        },
      });
    });
  }

  // --- Ataques básicos ------------------------------------------------------

  /** Golpe de espada: meia-lua virada para o alvo, girando um pouco. */
  private slash(from: Point, to: Point) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    const x = Phaser.Math.Linear(from.x, to.x, 0.6);
    const y = Phaser.Math.Linear(from.y, to.y, 0.6);
    const arc = this.scene.add.image(x, y, FX.slash).setDepth(FX_DEPTH).setRotation(angle - 0.9).setScale(0.8);
    this.scene.tweens.add({
      targets: arc,
      rotation: angle + 0.9,
      scale: 1.1,
      alpha: { from: 1, to: 0 },
      duration: 220,
      ease: "Cubic.Out",
      onComplete: () => arc.destroy(),
    });
    this.later(90, () => this.sparks(to, 0xffffff, 4));
  }

  /** Projétil reto até o alvo, com rastro e brilho opcionais. */
  private projectile(
    key: string, from: Point, to: Point, ms: number,
    opts: { trail?: number; glow?: number; impact?: number; scale?: number } = {},
  ) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    const scale = opts.scale ?? 1;
    const parts: Phaser.GameObjects.GameObject[] = [];
    let glow: Phaser.GameObjects.Arc | undefined;
    if (opts.glow !== undefined) {
      glow = this.scene.add.circle(from.x, from.y - 6, 7 * scale, opts.glow, 0.35).setDepth(FX_DEPTH);
      parts.push(glow);
    }
    const shot = this.scene.add.image(from.x, from.y - 6, key).setDepth(FX_DEPTH).setRotation(angle).setScale(scale);
    parts.push(shot);
    const duration = Math.max(60, ms);
    let lastTrail = 0;
    this.scene.tweens.add({
      targets: glow ? [shot, glow] : shot,
      x: to.x,
      y: to.y - 6,
      duration,
      onUpdate: () => {
        if (opts.trail === undefined || this.scene.time.now - lastTrail < 30) return;
        lastTrail = this.scene.time.now;
        this.puff(shot.x, shot.y, opts.trail, 3 * scale);
      },
      onComplete: () => {
        parts.forEach((p) => p.destroy());
        if (opts.impact !== undefined) this.sparks({ x: to.x, y: to.y - 6 }, opts.impact, 6);
      },
    });
  }

  // --- Magias ---------------------------------------------------------------

  /** Giro da Lâmina: quatro meias-luas dando a volta no cavaleiro. */
  private bladeSpin(at: Point, tint?: number) {
    for (let i = 0; i < 4; i++) {
      const start = (i * Math.PI) / 2;
      const arc = this.scene.add.image(at.x, at.y, FX.slash).setDepth(FX_DEPTH).setScale(1.3).setOrigin(0, 0.5);
      if (tint !== undefined) arc.setTint(tint);
      this.scene.tweens.addCounter({
        from: 0, to: 1, duration: 420, ease: "Cubic.Out",
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          arc.setRotation(start + t * Math.PI * 2).setAlpha(1 - t * 0.8);
        },
        onComplete: () => arc.destroy(),
      });
    }
  }

  /** Flecha Sagrada: cruz de luz dourada no impacto. */
  private holyFlash(at: Point) {
    const g = this.scene.add.graphics().setDepth(FX_DEPTH).setPosition(at.x, at.y - 6);
    g.fillStyle(0xfff6c8, 0.9).fillRect(-2, -14, 4, 28).fillRect(-14, -2, 28, 4);
    g.fillStyle(0xf7d774, 0.5).fillCircle(0, 0, 9);
    this.scene.tweens.add({ targets: g, scale: { from: 0.4, to: 1.4 }, alpha: { from: 1, to: 0 }, duration: 350, onComplete: () => g.destroy() });
  }

  /** Chuva de Flechas: flechas caindo do alto sobre a área até a hora do impacto. */
  private arrowRain(center: Point, radius: number, ms: number) {
    const total = 14;
    const window = Math.max(200, ms);
    for (let i = 0; i < total; i++) {
      const tx = center.x + Phaser.Math.Between(-radius, radius);
      const ty = center.y + Phaser.Math.Between(-radius, radius);
      const delay = (i / total) * window * 0.7;
      this.later(delay, () => {
        const arrow = this.scene.add.image(tx - 10, ty - 90, FX.arrow).setDepth(FX_DEPTH).setRotation(Math.PI / 2 - 0.12);
        this.scene.tweens.add({
          targets: arrow, x: tx, y: ty, duration: window * 0.3 + 80, ease: "Quad.In",
          onComplete: () => {
            arrow.destroy();
            this.puff(tx, ty, 0xa08f78, 4);
          },
        });
      });
    }
  }

  /** Tempestade do Vazio: escuridão gira e explode até o raio. */
  private voidStorm(at: Point, radius: number) {
    this.ring(at, radius, 0x2d0a40, 550, 10);
    this.ring(at, radius * 0.7, 0x8e44ad, 450, 3);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const orb = this.scene.add.image(at.x, at.y, FX.darkLight).setDepth(FX_DEPTH);
      this.scene.tweens.add({
        targets: orb,
        x: at.x + Math.cos(a + 1) * radius,
        y: at.y + Math.sin(a + 1) * radius,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.4, to: 0.6 },
        duration: 520,
        ease: "Cubic.Out",
        onComplete: () => orb.destroy(),
      });
    }
  }

  /** Escudo da Fé: o brasão desce sobre o cavaleiro com um clarão azul. */
  private shieldRaise(at: Point) {
    const crest = this.scene.add.image(at.x, at.y - 30, FX.holyShield).setDepth(FX_DEPTH).setScale(2.2).setAlpha(0);
    this.scene.tweens.add({
      targets: crest, y: at.y - 4, scale: 1, alpha: { from: 0, to: 1 }, duration: 260, ease: "Quad.In",
      onComplete: () => {
        this.ring(at, TILE_SIZE * 0.9, 0x7fc8ff, 380, 4);
        this.sparks(at, 0xe8f6ff, 8);
        this.scene.tweens.add({ targets: crest, alpha: 0, duration: 200, onComplete: () => crest.destroy() });
      },
    });
  }

  /**
   * O escudo acabou: com `broken`, estilhaços azuis voam (quebrou de tanto apanhar);
   * sem, só some num brilho (o tempo acabou).
   */
  shatter(at: Point, broken: boolean) {
    if (!broken) return this.sparks(at, 0x9fd8ff, 6);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      const shard = this.scene.add.rectangle(at.x, at.y, 3, 2, i % 3 ? 0x7fc8ff : 0xe8f6ff).setDepth(FX_DEPTH).setRotation(a);
      this.scene.tweens.add({
        targets: shard,
        x: at.x + Math.cos(a) * 22, y: at.y + Math.sin(a) * 22 + 6,
        angle: Phaser.Math.Between(-180, 180), alpha: 0, duration: 420, ease: "Quad.Out",
        onComplete: () => shard.destroy(),
      });
    }
  }

  /** Criatura invocada aparece: folhas e um círculo verde. */
  summonBurst(at: Point) {
    this.ring({ x: at.x, y: at.y + 8 }, TILE_SIZE * 0.6, 0x9cff7a, 400, 3);
    this.heal(at);
  }

  /** Criatura invocada some (morreu ou o tempo acabou). */
  vanish(at: Point) {
    this.sparks(at, 0x9cff7a, 8);
    this.puff(at.x, at.y, 0x9cff7a, 8);
  }

  /** Gotas de vida voando do alvo para quem conjurou (roubo de vida). */
  private drain(from: Point, to: Point, color: number) {
    for (let i = 0; i < 5; i++) {
      const drop = this.scene.add.circle(from.x, from.y - 6, 2, color, 0.9).setDepth(FX_DEPTH);
      this.scene.tweens.add({
        targets: drop, x: to.x + Phaser.Math.Between(-4, 4), y: to.y - 8, alpha: { from: 1, to: 0.3 },
        delay: i * 60, duration: 380, ease: "Sine.In", onComplete: () => drop.destroy(),
      });
    }
  }

  /** Coluna de luz caindo do céu (Julgamento Divino). */
  private beam(at: Point, color: number) {
    const g = this.scene.add.graphics().setDepth(FX_DEPTH).setPosition(at.x, at.y);
    g.fillStyle(color, 0.8).fillRect(-5, -140, 10, 140);
    g.fillStyle(0xffffff, 0.9).fillRect(-2, -140, 4, 140);
    this.scene.tweens.add({ targets: g, scaleX: { from: 1.6, to: 0.2 }, alpha: { from: 1, to: 0 }, duration: 380, onComplete: () => g.destroy() });
  }

  /** Pedras e terra saltando do chão (Terremoto, Meteoro). */
  private debris(at: Point, radius: number, color: number) {
    for (let i = 0; i < 12; i++) {
      const x = at.x + Phaser.Math.Between(-radius, radius);
      const y = at.y + Phaser.Math.Between(-radius, radius);
      const rock = this.scene.add.rectangle(x, y, 3, 3, color).setDepth(FX_DEPTH);
      this.scene.tweens.add({ targets: rock, y: y - 10, duration: 160, yoyo: true, ease: "Quad.Out", delay: i * 20, onComplete: () => rock.destroy() });
    }
  }

  /** Flocos de neve caindo sobre a área (Nevasca). */
  private snow(at: Point, radius: number) {
    for (let i = 0; i < 24; i++) {
      const x = at.x + Phaser.Math.Between(-radius, radius);
      const y = at.y + Phaser.Math.Between(-radius, radius);
      const flake = this.scene.add.image(x - 6, y - 40, FX.spark).setDepth(FX_DEPTH).setTint(0xe8f6ff);
      this.scene.tweens.add({ targets: flake, x, y, alpha: { from: 1, to: 0 }, duration: 500, delay: i * 18, onComplete: () => flake.destroy() });
    }
  }

  // --- Peças ------------------------------------------------------------------

  /** Onda circular que cresce até `radius` e some. */
  private ring(at: Point, radius: number, color: number, duration: number, width: number) {
    const g = this.scene.add.graphics().setDepth(FX_DEPTH);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration, ease: "Cubic.Out",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        g.clear().lineStyle(width * (1 - t * 0.6), color, 1 - t).strokeCircle(at.x, at.y, Math.max(2, radius * t));
        g.fillStyle(color, 0.18 * (1 - t)).fillCircle(at.x, at.y, Math.max(2, radius * t));
      },
      onComplete: () => g.destroy(),
    });
  }

  /** Faíscas saindo de um ponto. */
  private sparks(at: Point, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 8;
      const s = this.scene.add.image(at.x, at.y, FX.spark).setDepth(FX_DEPTH).setTint(color);
      this.scene.tweens.add({
        targets: s,
        x: at.x + Math.cos(a) * d,
        y: at.y + Math.sin(a) * d,
        alpha: { from: 1, to: 0 },
        duration: 260,
        onComplete: () => s.destroy(),
      });
    }
  }

  /** Fumacinha do rastro. */
  private puff(x: number, y: number, color: number, size: number) {
    const c = this.scene.add.circle(x, y, size, color, 0.6).setDepth(FX_DEPTH - 1);
    this.scene.tweens.add({ targets: c, scale: 0.2, alpha: 0, duration: 260, onComplete: () => c.destroy() });
  }

  private later(ms: number, fn: () => void) {
    if (ms <= 0) fn(); else this.scene.time.delayedCall(ms, fn);
  }
}
