/**
 * Varredura teórica de balanceamento, sem servidor e sem hunt: para cada magia de dano e cada invocação de todas as
 * classes, calcula o dano por segundo num alvo só (DPS) no nível máximo do herói, com a magia no nível 1 e na Maestria,
 * sem equipamento e com o melhor equipamento da classe (`bestPerSlot` de todos os itens). Usa as mesmas fórmulas da
 * `Hunt` (`statsFor`, `spellAtRank`, `summonStats`, `SUMMON_SPELL_POWER_SHARE`).
 *
 * Marca como suspeito:
 *   - CLASSE FORTE / FRACA: o kit (básico + a melhor magia de cada slot, na Maestria) longe da mediana das classes;
 *   - FORA DA CURVA: DPS maior que `OUTLIER`× a mediana das magias do mesmo slot na mesma classe;
 *   - EQUIPAMENTO: o melhor equipamento multiplica o DPS bem mais que nas outras magias da classe;
 *   - SEMPRE EM CAMPO: criatura que dura a recarga inteira ou mais (nunca some entre uma conjuração e outra).
 *
 * Modelo simples, para achar candidatos (a telemetria confirma): um alvo só (área, cadeia e linha valem 1 alvo; a
 * coluna "área" avisa), sem melhorias da hunt, Traços, runas nem resistências; as criaturas batem o tempo todo em que
 * estão em campo. Não é teste: não entra no `all.ts`. Faz parte do agente de balanceamento
 * (`.claude/skills/balanceamento/SKILL.md`).
 * As criaturas aparecem bem acima das magias porque o modelo as põe batendo o tempo todo; na hunt elas andam, perdem o
 * alvo e morrem (a telemetria da Caverna deu cerca de 1/5 do teórico para o Urso). Compare criatura com criatura.
 * Uso: npx tsx apps/server/scripts/balanco.ts [--all] [--json] (de dentro de apps/server)
 */
import {
  BASIC_ATTACK_COOLDOWN_MS, CLASS_IDS, ITEMS, MASTERY_RANK, MAX_LEVEL, SPELLS, SUMMONS, SUMMON_SPELL_POWER_SHARE,
  bestPerSlot, gearStats, rankPower, spellAtRank, statsFor, type ClassId, type SpellDef,
} from "@kusa/shared";

/** DPS acima disto × a mediana do slot é suspeito. */
const OUTLIER = 2;
/** Ganho do equipamento acima disto × a mediana dos ganhos da classe é suspeito. */
const GEAR_OUTLIER = 1.3;
/** Kit da classe acima disto × a mediana das classes (ou abaixo do inverso) é suspeito. */
const KIT_OUTLIER = 1.4;

interface Row {
  classId: ClassId;
  source: string;
  name: string;
  slot: number | "básico";
  rank: number;
  area: boolean;
  /** DPS sem equipamento e com o melhor equipamento da classe. */
  bare: number;
  geared: number;
  /** Fração do tempo com a criatura em campo (só invocações). */
  uptime?: number;
  flags: string[];
}

const bestGear = (classId: ClassId) => gearStats(Object.values(bestPerSlot(Object.keys(ITEMS), classId)).filter(Boolean));

/** Dano de uma conjuração num alvo, em múltiplos do dano base (magias) e do dano base das criaturas (invocações). */
function perCast(s: SpellDef, rank: number) {
  const repeat = s.repeat ? 1 + s.repeat.power * (s.repeat.times ?? 1) : 1;
  let spell = (s.damage ?? 0) * repeat;
  if (s.dot) spell += s.dot.perSec * (Math.min(s.dot.ms, s.cooldownMs) / 1000);
  if (s.burst) spell += s.burst.damage;
  if (s.groundFire) spell += s.groundFire.perSec * (Math.min(s.groundFire.ms, s.cooldownMs) / 1000);
  const f = s.field;
  if (f?.damage && f.tickMs && (f.kind === "zone" || f.kind === "turret")) {
    spell += f.damage * (f.kind === "turret" && f.shots ? f.shots : f.ms / f.tickMs);
  }
  let summon = 0;
  let uptime: number | undefined;
  if (s.summon) {
    const def = SUMMONS[s.summon.kind];
    const active = Math.min(s.summon.durationMs, s.cooldownMs);
    uptime = s.summon.durationMs / s.cooldownMs;
    summon = s.summon.count * def.damage * rankPower(rank) * (active / def.attackCooldownMs);
  }
  return { spell, summon, uptime };
}

const rows: Row[] = [];
for (const classId of CLASS_IDS) {
  const base = statsFor(classId, MAX_LEVEL).damage;
  const g = bestGear(classId);
  const sec = BASIC_ATTACK_COOLDOWN_MS / 1000;
  rows.push({
    classId, source: "basic", name: "Ataque básico", slot: "básico", rank: 0, area: false,
    bare: base / sec, geared: base * (1 + g.damage) / sec, flags: [],
  });
  for (const def of Object.values(SPELLS).filter((s) => s.classId === classId)) {
    for (const rank of [1, MASTERY_RANK]) {
      const s = spellAtRank(def, rank);
      const { spell, summon, uptime } = perCast(s, rank);
      if (!spell && !summon) continue;
      const cd = s.cooldownMs / 1000;
      const dps = (spellPower: number) => (base * (1 + spellPower) * spell + base * (1 + spellPower * SUMMON_SPELL_POWER_SHARE) * summon) / cd;
      rows.push({
        classId, source: def.id, name: def.name, slot: def.slot, rank,
        area: Boolean(s.radius || s.chain || s.shape || s.burst),
        bare: dps(0), geared: dps(g.spellPower), uptime, flags: [],
      });
    }
  }
}

const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? (v[Math.floor((v.length - 1) / 2)] + v[Math.ceil((v.length - 1) / 2)]) / 2 : 0;
};
// Dentro da classe: cada classe tem seu jeito de causar dano (o cavaleiro vive do básico, o feiticeiro das magias).
for (const classId of CLASS_IDS) {
  const mine = rows.filter((r) => r.classId === classId);
  for (const rank of [1, MASTERY_RANK]) {
    for (const slot of [0, 1]) {
      const group = mine.filter((r) => r.slot === slot && r.rank === rank);
      const m = median(group.map((r) => r.geared));
      for (const r of group) if (r.geared > OUTLIER * m) r.flags.push(`FORA DA CURVA (${(r.geared / m).toFixed(1)}× a mediana do slot na classe)`);
    }
  }
  const gains = mine.filter((r) => r.bare > 0 && r.slot !== "básico").map((r) => r.geared / r.bare);
  const gainMedian = median(gains);
  for (const r of mine) {
    const gain = r.bare > 0 ? r.geared / r.bare : 1;
    if (r.slot !== "básico" && gain > GEAR_OUTLIER * gainMedian) r.flags.push(`EQUIPAMENTO (×${gain.toFixed(2)}, mediana da classe ×${gainMedian.toFixed(2)})`);
  }
}
for (const r of rows) if (r.uptime !== undefined && r.uptime >= 1) r.flags.push(`SEMPRE EM CAMPO (${Math.round(r.uptime * 100)}% da recarga)`);

/** Kit de cada classe na Maestria com o melhor equipamento: básico + a melhor magia de cada slot. */
const kits = CLASS_IDS.map((classId) => {
  const mine = rows.filter((r) => r.classId === classId);
  const best = (slot: number) => mine.filter((r) => r.slot === slot && r.rank === MASTERY_RANK).sort((a, b) => b.geared - a.geared)[0];
  const basic = mine.find((r) => r.slot === "básico")!;
  const [s1, s2] = [best(0), best(1)];
  return { classId, total: basic.geared + (s1?.geared ?? 0) + (s2?.geared ?? 0), basic: basic.geared, s1, s2, flag: "" };
});
const kitMedian = median(kits.map((k) => k.total));
for (const k of kits) {
  if (k.total > KIT_OUTLIER * kitMedian) k.flag = `CLASSE FORTE (${(k.total / kitMedian).toFixed(1)}× a mediana)`;
  else if (k.total < kitMedian / KIT_OUTLIER) k.flag = `CLASSE FRACA (${(k.total / kitMedian).toFixed(1)}× a mediana)`;
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ kits, rows }, null, 2));
} else {
  const fmt = (n: number) => n.toFixed(1).padStart(7);
  const all = process.argv.includes("--all");
  console.log(`DPS teórico num alvo, herói no nível ${MAX_LEVEL}, em combate contínuo (sem equipamento | melhor equipamento).`);
  console.log(`\nKit na Maestria (básico + melhor magia de cada slot, melhor equipamento):`);
  for (const k of kits) {
    console.log(`  ${k.classId.padEnd(9)}${fmt(k.total)}  básico ${k.basic.toFixed(0)} + ${k.s1?.name} ${k.s1?.geared.toFixed(0)} + ${k.s2?.name} ${k.s2?.geared.toFixed(0)}${k.flag ? `  ⚠ ${k.flag}` : ""}`);
  }
  for (const classId of CLASS_IDS) {
    const list = rows.filter((x) => x.classId === classId && (all || x.flags.length)).sort((a, b) => b.geared - a.geared);
    if (!list.length) continue;
    console.log(`\n${classId}${all ? "" : " (só suspeitos; --all lista tudo)"}`);
    for (const r of list) {
      const tag = r.slot === "básico" ? "básico" : `slot ${r.slot + 1} n${r.rank}`;
      console.log(`  ${fmt(r.bare)} |${fmt(r.geared)}  ${tag.padEnd(10)} ${r.name}${r.area ? " (área)" : ""}${r.flags.length ? `  ⚠ ${r.flags.join("; ")}` : ""}`);
    }
  }
  console.log(`\n${rows.filter((r) => r.flags.length).length} suspeitos de ${rows.length} fontes.`);
}
