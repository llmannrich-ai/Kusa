import { levelForXp, generateDungeon } from "@kusa/shared";
import { Hunt, type HuntHost } from "/home/user/Kusa/apps/server/src/hunt.ts";
import { DungeonState } from "/home/user/Kusa/apps/server/src/state.ts";
const host: HuntHost = { now: () => 0, setTimeout: () => {}, send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {} };
const acc = { trunk: 0, west: 0, east: 0, mons: 0, loot: 0 };
const N = 40;
for (let s = 1; s <= N; s++) {
  const seed = s * 7919;
  const h: any = new Hunt(new DungeonState(), host, { mapId: "cavern", seed });
  h.join("x", { name: "x", classId: "knight", talents: {}, spellXp: {} }); h.start("x");
  const d = generateDungeon(seed, "cavern");
  acc.loot += h.maxLoot();
  h.brains.forEach((b: any, id: string) => {
    const m = h.state.monsters.get(id); acc.mons++;
    if (b.def.rank === "boss") return;
    if (Math.abs(m.x - d.width / 2) < 9 && m.y > 60) acc.trunk += b.xp;
    else if (m.x < d.width / 2) acc.west += b.xp; else acc.east += b.xp;
  });
}
const f = (v: number) => Math.round(v / N);
const t = f(acc.trunk), w = f(acc.west), e = f(acc.east);
const lv = (x: number) => `${levelForXp(x)}/${levelForXp(x * 0.75)}`;
console.log(`monstros ${f(acc.mons)}, loot máx ${f(acc.loot)} | tronco ${t} | oeste ${w} | leste ${e}`);
console.log(`nível (tudo/75%): chegando no Basilisco ${lv(t + w)} | Observador direto ${lv(t + e)} | Observador depois do oeste ${lv(t + w + e)}`);
