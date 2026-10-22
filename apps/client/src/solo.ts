import { Encoder, Reflection } from "@colyseus/schema";
import {
  ITEMS,
  MSG,
  SERVER_TICK_MS,
  type ClassId,
  type MapId,
  type RunEndedMessage,
  type SoloRunResult,
  type SoloRunStart,
  spellXpGains,
} from "@kusa/shared";
import type { HuntReport } from "../../server/src/hunt.ts";
import { supabase } from "./auth.ts";
import type { DungeonRoom } from "./net.ts";

const SESSION_ID = "solo";

/**
 * Hunt solo: a mesma simulação do servidor (`Hunt`) roda aqui no navegador, sem rede (sem esperar o
 * servidor acordar e sem atraso). O cliente recebe um objeto com a cara de uma sala do Colyseus (estado
 * sincronizado por encoder/decoder, `send`, `onMessage`), então a cena e o HUD não sabem a diferença.
 * O banco sorteia a seed e corta recompensas impossíveis (`start_solo_run`/`finish_solo_run`).
 */
export async function createSoloHunt(name: string, classId: ClassId, mapId: MapId): Promise<DungeonRoom> {
  const { data: session } = await supabase.auth.getSession();
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.rpc("start_solo_run", { p_class_id: classId, p_map_id: mapId }),
    // As magias ativas do Grimório (até 3 por slot) são as opções da escolha, como na hunt do servidor.
    supabase.from("profiles").select("active_spells").eq("id", session.session?.user.id ?? "").maybeSingle(),
  ]);
  if (error) throw new Error("não foi possível começar a hunt solo");
  const run = data as SoloRunStart;
  const finish = (result: RunEndedMessage, report: HuntReport) => finishSolo(run.run_id, classId, result, report);

  // A simulação só é baixada por quem joga solo.
  const [{ Hunt }, { DungeonState }] = await Promise.all([
    import("../../server/src/hunt.ts"),
    import("../../server/src/state.ts"),
  ]);

  const listeners = new Map<string, Set<(msg: any) => void>>();
  const leaveListeners = new Set<(code: number) => void>();
  const emit = (type: string, msg: unknown) => listeners.get(type)?.forEach((cb) => cb(msg));
  /** Mensagens da hunt esperam o próximo tick, como se viessem pela rede. */
  let outbox: [string, unknown][] = [];

  const state = new DungeonState();
  const hunt = new Hunt(state, {
    now: () => performance.now(),
    setTimeout: (fn, ms) => void window.setTimeout(fn, ms),
    send: (_sessionId, type, msg) => outbox.push([type, msg]),
    broadcast: (type, msg) => outbox.push([type, msg]),
    // Entrega direta: o banco pode responder depois de o tick parar, no fim da hunt.
    runEnded: (_sessionId, result, report) => void finish(result, report).then((msg) => emit(MSG.runEnded, msg)),
    ended: () => window.setTimeout(stop, 10_000),
  }, { mapId, seed: run.seed });
  hunt.join(SESSION_ID, {
    name, classId, talents: run.talents ?? {}, spellXp: run.spell_xp ?? {}, activeSpells: profile?.active_spells ?? [],
  });

  // Mesmo caminho do servidor: o cliente decodifica um estado refletido, com callbacks.
  const encoder = new Encoder(state);
  const decoder = Reflection.decode(Reflection.encode(encoder));
  decoder.decode(encoder.encodeAll());
  encoder.discardChanges();

  let last = performance.now();
  const interval = window.setInterval(() => {
    // O relógio é o real: com a aba em segundo plano o tempo da hunt continua correndo, como no servidor.
    const now = performance.now();
    hunt.tick(now - last);
    last = now;
    const messages = outbox;
    outbox = [];
    for (const [type, msg] of messages) emit(type, msg);
    const patch = encoder.encode();
    if (patch.length > 0) decoder.decode(patch);
    encoder.discardChanges();
  }, SERVER_TICK_MS);

  function stop() {
    window.clearInterval(interval);
  }

  /** Mensagens cliente → hunt, com o mesmo formato das que vão ao servidor. */
  const inbox: Record<string, (msg: any) => void> = {
    [MSG.start]: () => {
      if (!hunt.start(SESSION_ID)) return;
      last = performance.now();
      hunt.equip(SESSION_ID, run.items ?? []);
      hunt.fillBag(SESSION_ID, run.bag ?? []);
    },
    [MSG.move]: (msg) => hunt.move(SESSION_ID, msg),
    [MSG.target]: (msg) => hunt.target(SESSION_ID, msg),
    [MSG.attacking]: (msg) => hunt.attacking(SESSION_ID, msg),
    [MSG.chooseSpell]: (msg) => hunt.chooseSpell(SESSION_ID, msg),
    [MSG.choosePerk]: (msg) => hunt.choosePerk(SESSION_ID, msg),
    [MSG.cast]: (msg) => hunt.cast(SESSION_ID, msg),
    [MSG.drink]: (msg) => hunt.drink(SESSION_ID, msg),
    [MSG.bagEquip]: (msg) => hunt.bagEquip(SESSION_ID, msg),
    [MSG.unequip]: (msg) => hunt.unequip(SESSION_ID, msg),
    [MSG.bagDrop]: (msg) => hunt.bagDrop(SESSION_ID, msg),
  };

  const room = {
    sessionId: SESSION_ID,
    roomId: run.run_id,
    state: decoder.state,
    serializer: { decoder },
    send(type: string, msg?: unknown) {
      inbox[type]?.(msg);
    },
    onMessage(type: string, cb: (msg: any) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(cb);
      return () => listeners.get(type)?.delete(cb);
    },
    onLeave(cb: (code: number) => void) {
      leaveListeners.add(cb);
      return () => leaveListeners.delete(cb);
    },
    async leave() {
      // Sair no meio conta como morte (e o banco fecha como morte a hunt que ficar aberta).
      hunt.leave(SESSION_ID);
      stop();
      leaveListeners.forEach((cb) => cb(1000));
    },
  };
  return room as unknown as DungeonRoom;
}

/**
 * Grava o resultado no banco e devolve a mensagem de fim com o que foi de fato creditado. Vale também para a sala
 * hospedada por um jogador (cada um grava o seu). Sem `runId` (a hunt não abriu no banco), nada é salvo.
 */
export async function finishSolo(runId: string | null, classId: ClassId, result: RunEndedMessage, report: HuntReport): Promise<RunEndedMessage> {
  if (!runId) return { ...result, loot: 0, items: [], bag: [], note: "A hunt não abriu no banco: a recompensa não foi salva." };
  const { data, error } = await supabase.rpc("finish_solo_run", {
    p_run_id: runId,
    p_outcome: result.outcome,
    p_level: result.level,
    p_loot: result.loot,
    p_items: result.items,
    p_bag: result.bag,
    p_report: {
      duration_s: report.durationS,
      max_depth: Math.max(-1, ...Object.keys(report.stats.depthAt).map(Number)),
      path_rooms: report.pathRooms,
      killed_by: report.stats.death?.by ?? null,
      abandoned: report.stats.abandoned,
      party_size: report.partySize,
      stats: report.stats,
      // XP de uso das magias da hunt; o banco corta pelo tempo de hunt.
      spell_xp: spellXpGains(classId, result.spells),
    },
  });
  if (error) {
    console.error("Falha ao salvar a hunt solo", error);
    return { ...result, loot: 0, items: [], bag: [], note: "Sem conexão com o banco: a recompensa desta hunt não foi salva." };
  }
  const saved = data as SoloRunResult;
  const names = (ids: string[]) => ids.map((id) => ITEMS[id]?.name ?? id).join(", ");
  const left = [...result.items, ...result.bag];
  for (const id of [...saved.items, ...saved.bag]) {
    const i = left.indexOf(id);
    if (i >= 0) left.splice(i, 1);
  }
  const cut = saved.gold < result.loot || left.length > 0;
  return {
    ...result,
    loot: saved.gold,
    items: saved.items,
    bag: saved.bag,
    note: cut
      ? `Limite da hunt solo: ${saved.gold} de ${result.loot} de loot${left.length ? `; não guardado: ${names(left)}` : ""}.`
      : undefined,
  };
}
