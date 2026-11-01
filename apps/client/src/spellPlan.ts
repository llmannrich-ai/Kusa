import {
  ACTIVE_SPELLS_PER_SLOT,
  SPELLS,
  SPELL_SLOT_LEVELS,
  knownSpells,
  spellBonus,
  spellRanks,
  type ClassId,
  type SpellDef,
  type SpellId,
  type SpellXp,
  type TalentRanks,
} from "@kusa/shared";

// Planejamento das magias da hunt (página "Magias da hunt", aberta pelo Grimório da página Heróis): o papel de cada
// magia, o que o conjunto ativo cobre e a sugestão de quais ativar. Só leitura e conta: quem grava é o menu.

/** Slots mostrados na página. O 3º ainda não existe no jogo (`SPELL_SLOT_LEVELS`); aparece como "em breve". */
export const PLAN_SLOTS = 3;

/** O slot já existe na hunt? */
export const slotExists = (slot: number) => slot < SPELL_SLOT_LEVELS.length;

/** Papel de uma magia na hunt, tirado dos efeitos dela (não é regra do jogo, é leitura para o jogador). */
export type SpellRole = "area" | "alvo" | "controle" | "defesa" | "cura" | "mobilidade" | "invocacao" | "apoio";

export const ROLE_INFO: Record<SpellRole, { label: string; icon: string }> = {
  area: { label: "Área", icon: "💥" },
  alvo: { label: "Alvo único", icon: "🎯" },
  controle: { label: "Controle", icon: "🌀" },
  defesa: { label: "Defesa", icon: "🛡️" },
  cura: { label: "Cura", icon: "💚" },
  mobilidade: { label: "Mobilidade", icon: "💨" },
  invocacao: { label: "Invocação", icon: "🐾" },
  apoio: { label: "Reforço", icon: "📯" },
};

/** Papéis de uma magia, na ordem de `ROLE_INFO`. */
export function spellRoles(s: SpellDef): SpellRole[] {
  const f = s.field;
  const hits = !!(s.damage || s.dot || f?.damage || s.burst || s.groundFire);
  const wide = s.shape !== undefined || !!s.chain || (s.radius > 0 && !s.heal) || f?.kind === "zone" || !!s.burst || !!s.groundFire;
  const roles = new Set<SpellRole>();
  if (hits && wide) roles.add("area");
  if (hits && !wide) roles.add("alvo");
  if (s.execute || s.distanceBonus || s.mark) roles.add("alvo");
  if (s.rootMs || s.stunMs || s.slow || s.taunt || s.push || s.pull || s.nextBasicStunMs || f?.rootMs || f?.kind === "wall" || f?.kind === "trap") {
    roles.add("controle");
  }
  if (s.barrier || s.guard || s.armor || s.thorns || s.lifesteal || s.form?.kind === "bear" || f?.allyArmor || s.selfBuff?.slowAttackers) {
    roles.add("defesa");
  }
  if (s.heal || f?.allyHeal || s.seed || s.cleanse || s.tauntHeal || s.summonDeathHeal || s.rally?.heal) roles.add("cura");
  if (s.dash || s.charge || s.form?.kind === "panther" || (s.selfBuff?.moveSpeed ?? 0) > 0) roles.add("mobilidade");
  if (s.summon || f?.kind === "turret" || f?.spawn || s.packCall) roles.add("invocacao");
  // Carga da Legião (aura que anda com o herói) também é apoio.
  if (s.mark || f?.allyDamage || s.selfBuff?.basicDamage || s.selfBuff?.attackHaste || s.selfBuff?.attackRange || s.rally || s.aura) roles.add("apoio");
  return (Object.keys(ROLE_INFO) as SpellRole[]).filter((r) => roles.has(r));
}

/** O que um conjunto de magias da hunt precisa ter; cada necessidade é atendida por um ou mais papéis. */
export const NEEDS = [
  { id: "area", label: "Dano em área", roles: ["area"], tip: "bandos cercam você" },
  { id: "alvo", label: "Dano no alvo", roles: ["alvo", "area"], tip: "chefes e monstros fortes demoram a cair" },
  { id: "controle", label: "Controle", roles: ["controle"], tip: "nada segura os monstros longe de você" },
  { id: "vida", label: "Sobrevivência", roles: ["defesa", "cura"], tip: "nada evita o dano ou devolve vida" },
] as const satisfies readonly { id: string; label: string; roles: readonly SpellRole[]; tip: string }[];

export type NeedId = (typeof NEEDS)[number]["id"];

/** Para cada necessidade, as magias do conjunto que a atendem (vazio = falta). */
export function coverage(spells: readonly SpellId[]): Record<NeedId, SpellId[]> {
  const out = {} as Record<NeedId, SpellId[]>;
  for (const need of NEEDS) {
    out[need.id] = spells.filter((id) => spellRoles(SPELLS[id]).some((r) => (need.roles as readonly SpellRole[]).includes(r)));
  }
  return out;
}

/** Uma magia conhecida vista pela página: nível de uso, força extra (sinergia + Tomo) e a força total estimada. */
export interface PlanSpell {
  id: SpellId;
  level: number;
  /** Força extra de sinergia + Tomo (fração). */
  bonus: number;
  /** Força relativa: +10% por nível (como `spellAtRank`) vezes a força extra. 1 = nível 0 sem bônus. */
  power: number;
  roles: SpellRole[];
}

/** As magias conhecidas de um slot, da mais forte para a mais fraca (empate: ordem da árvore). */
export function slotSpells(classId: ClassId, slot: number, ranks: TalentRanks, xp: SpellXp): PlanSpell[] {
  const levels = spellRanks(classId, ranks, xp);
  return knownSpells(classId, ranks)
    .filter((id) => SPELLS[id].slot === slot)
    .map((id, order) => {
      const level = levels[id] ?? 0;
      const bonus = spellBonus(classId, id, ranks, levels).total;
      return { id, level, bonus, power: (1 + 0.1 * level) * (1 + bonus), roles: spellRoles(SPELLS[id]), order };
    })
    .sort((a, b) => b.power - a.power || a.order - b.order)
    .map(({ order: _, ...spell }) => spell);
}

/** Peso de cada papel novo na sugestão, comparado a +10% de força (um nível de uso). */
const NEW_ROLE_WEIGHT = 0.12;
/** Peso de atender uma necessidade que o outro slot não atende. */
const NEW_NEED_WEIGHT = 0.2;

export interface Suggestion {
  picks: SpellId[];
  /** Por que cada magia entrou (texto curto). */
  reasons: Partial<Record<SpellId, string>>;
}

/**
 * Sugestão das até 3 magias ativas de um slot: começa pela mais forte e, a cada vaga, pesa a força contra o que a
 * magia traz de novo (papéis que o slot ainda não tem e necessidades que o outro slot não cobre), para a escolha na
 * hunt ter opções diferentes entre si e não três magias que fazem a mesma coisa.
 */
export function suggestSlot(spells: readonly PlanSpell[], otherSlot: readonly SpellId[]): Suggestion {
  const picks: PlanSpell[] = [];
  const reasons: Partial<Record<SpellId, string>> = {};
  const outside = coverage(otherSlot);
  const pool = [...spells];
  while (picks.length < ACTIVE_SPELLS_PER_SLOT && pool.length > 0) {
    const have = new Set(picks.flatMap((p) => p.roles));
    const covered = coverage(picks.map((p) => p.id));
    let best = 0;
    let bestScore = -Infinity;
    let bestNews: string[] = [];
    pool.forEach((s, i) => {
      const newRoles = s.roles.filter((r) => !have.has(r));
      const newNeeds = NEEDS.filter((n) => outside[n.id].length === 0 && covered[n.id].length === 0
        && s.roles.some((r) => (n.roles as readonly SpellRole[]).includes(r)));
      const score = s.power + NEW_ROLE_WEIGHT * newRoles.length + NEW_NEED_WEIGHT * newNeeds.length;
      if (score > bestScore) {
        bestScore = score;
        best = i;
        bestNews = newNeeds.length ? newNeeds.map((n) => n.label) : newRoles.map((r) => ROLE_INFO[r].label);
      }
    });
    const [pick] = pool.splice(best, 1);
    const strongest = picks.length === 0;
    reasons[pick.id] = strongest
      ? (pick.level > 0 || pick.bonus > 0 ? "a mais forte que você tem" : "base do conjunto")
      : bestNews.length ? `traz ${bestNews.slice(0, 2).join(" e ")}` : "a próxima mais forte";
    picks.push(pick);
  }
  // Na ordem da lista (mais forte primeiro), para casar com a tela.
  const order = spells.map((s) => s.id);
  return { picks: picks.map((p) => p.id).sort((a, b) => order.indexOf(a) - order.indexOf(b)), reasons };
}
