import * as Phaser from "phaser";
import { SPELLS, TILE_SIZE, type ClassId, type MonsterAbility, type SpellId } from "@kusa/shared";
import { FX } from "./art/combat.ts";

/** Efeitos ficam acima dos personagens e abaixo das barras de vida e números. */
const FX_DEPTH = 90_000;

interface Point { x: number; y: number }

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
      case "infernal_core":
        this.ring(from, radius, 0xe74c3c, 650, 9);
        this.later(100, () => this.ring(from, radius * 0.7, 0xff7f27, 500, 6));
        return this.debris(from, radius, 0x5a2a1a);
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
