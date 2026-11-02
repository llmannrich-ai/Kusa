import { Encoder, Reflection } from "@colyseus/schema";
import {
  ITEMS,
  MAPS,
  MSG,
  SERVER_TICK_MS,
  SOLO_LIMITS,
  generateDungeon,
  lootName,
  mapIdOf,
  type ClassId,
  type MapId,
  type RunEndedMessage,
  type SoloRunClosed,
  type SoloRunResult,
  type SoloRunStart,
  spellXpGains,
} from "@kusa/shared";
import type { HuntReport } from "../../server/src/hunt.ts";
import { CLIENT_BUILD } from "virtual:client-build";
import { supabase } from "./auth.ts";
import type { DungeonRoom } from "./net.ts";
import { recordSoloMapClear } from "./profile.ts";

const SESSION_ID = "solo";

/**
 * Hunt solo: a mesma simulação do servidor (`Hunt`) roda aqui no navegador, sem rede (sem esperar o
 * servidor acordar e sem atraso). O cliente recebe um objeto com a cara de uma sala do Colyseus (estado
 * sincronizado por encoder/decoder, `send`, `onMessage`), então a cena e o HUD não sabem a diferença.
 * O banco sorteia a seed e corta recompensas impossíveis (`start_solo_run`/`finish_solo_run`).
 */
export async function createSoloHunt(name: string, classId: ClassId, mapId: MapId): Promise<DungeonRoom> {
  // A hunt anterior que não chegou ao banco vai antes: abrir outra fecharia aquela como morte.
  if (await flushPendingSolo()) throw new Error("sem conexão para salvar a hunt anterior; tente de novo com internet");
  // A simulação só é baixada por quem joga solo. Vem antes de abrir a hunt no banco: se o download falhar
  // (página de antes de um deploy), não sobra hunt aberta para fechar como morte.
  const [{ Hunt }, { DungeonState }] = await Promise.all([
    import("../../server/src/hunt.ts"),
    import("../../server/src/state.ts"),
  ]);
  const { data: session } = await supabase.auth.getSession();
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.rpc("start_solo_run", { p_class_id: classId, p_map_id: mapId, p_client: clientInfo() }),
    // As magias ativas do Grimório (até 3 por slot) são as opções da escolha, como na hunt do servidor.
    supabase.from("profiles").select("active_spells").eq("id", session.session?.user.id ?? "").maybeSingle(),
  ]);
  if (error) throw new Error("não foi possível começar a hunt solo");
  const run = data as SoloRunStart;
  noticeClosed(run.closed);

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
    runEnded: (_sessionId, result, report) => reportSolo(run.run_id, classId, result, report, (msg) => emit(MSG.runEnded, msg)),
    ended: () => window.setTimeout(stop, 10_000),
    mapCleared: (ids, boss) => { if (ids.includes(SESSION_ID)) void recordSoloMapClear(run.run_id, boss); },
  }, { mapId, seed: run.seed });
  hunt.join(SESSION_ID, {
    name, classId, talents: run.talents ?? {}, spellXp: run.spell_xp ?? {}, activeSpells: profile?.active_spells ?? [],
  });
  hunt.knownBossRunes(SESSION_ID, run.boss_runes ?? []);

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

  let stopped = false;
  function stop() {
    stopped = true;
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
    [MSG.chooseRune]: (msg) => hunt.chooseRune(SESSION_ID, msg),
    [MSG.cast]: (msg) => hunt.cast(SESSION_ID, msg),
    [MSG.channel]: (msg) => hunt.channel(SESSION_ID, msg),
    [MSG.drink]: (msg) => hunt.drink(SESSION_ID, msg),
    [MSG.bagEquip]: (msg) => hunt.bagEquip(SESSION_ID, msg),
    [MSG.unequip]: (msg) => hunt.unequip(SESSION_ID, msg),
    [MSG.bagDrop]: (msg) => hunt.bagDrop(SESSION_ID, msg),
    [MSG.screen]: (msg) => hunt.screen(SESSION_ID, msg),
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
  watchCommitted(() => (stopped ? null : room as unknown as DungeonRoom), run.run_id);
  return room as unknown as DungeonRoom;
}

/** Quem mostra o aviso das hunts fechadas sem resultado (o menu registra; sem ele, só o console). */
let closedNotice: (text: string) => void = (text) => console.warn(text);
export function onClosedSoloRun(show: (text: string) => void) {
  closedNotice = show;
}

/** Avisa o jogador das hunts que estavam abertas (o app fechou no meio) e o banco acabou de fechar. */
export function noticeClosed(closed: SoloRunClosed[] | undefined) {
  for (const c of closed ?? []) {
    const map = MAPS[mapIdOf(c.map_id)].name;
    if (!c.died) {
      closedNotice(`A hunt anterior (${map}) foi fechada sem perda: o equipamento e a bag voltaram.`);
      continue;
    }
    const lost = [...(c.lost ? [c.lost] : []), ...c.lost_bag].map(lootName);
    closedNotice(`A hunt anterior (${map}) ficou aberta e contou como morte${lost.length ? `: perdeu ${lost.join(", ")}` : ""}.`);
  }
}

/**
 * Avisa o banco quando a hunt passa a valer: o herói saiu da sala inicial e jogou `SOLO_LIMITS.committedSeconds`.
 * Daí em diante, fechar o app no meio conta como morte; antes, a hunt aberta fecha sem perda (`start_solo_run`).
 * `room` devolve a sala atual (a hospedada troca de sala quando o anfitrião muda) ou null quando acabou.
 */
export function watchCommitted(room: () => DungeonRoom | null, runId: string | null) {
  if (!runId) return;
  watchAlive(room, runId);
  let spawn: { x: number; y: number; w: number; h: number } | null = null;
  let runningSince = 0;
  let sending = false;
  const timer = window.setInterval(() => {
    const r = room();
    const me = r?.state.players.get(r.sessionId);
    if (!r || (r.state.phase !== "lobby" && me && me.status !== "playing")) return void window.clearInterval(timer);
    if (r.state.phase !== "running" || !me || sending) return;
    runningSince ||= performance.now();
    if (performance.now() - runningSince < SOLO_LIMITS.committedSeconds * 1000) return;
    spawn ??= generateDungeon(r.state.seed, mapIdOf(r.state.mapId)).spawn;
    if (me.x >= spawn.x && me.x < spawn.x + spawn.w && me.y >= spawn.y && me.y < spawn.y + spawn.h) return;
    sending = true;
    void supabase.rpc("solo_run_committed", { p_run_id: runId }).then(({ error }) => {
      sending = false;
      // Sem rede, tenta de novo no próximo segundo.
      if (!error) window.clearInterval(timer);
    });
  }, 1000);
}

/**
 * Build do cliente e dados do aparelho, gravados com a hunt solo (`start_solo_run`, `telemetry_solo_fechadas`): quando
 * o celular fecha o jogo no meio, a hunt não dá resultado e só isso diz em que versão e em que aparelho foi.
 * `deviceMemory` não existe no iPhone (fica null).
 */
export function clientInfo() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    build: CLIENT_BUILD, mem: nav.deviceMemory ?? null, cores: nav.hardwareConcurrency ?? null,
    dpr: window.devicePixelRatio, w: screen.width, h: screen.height, ua: navigator.userAgent.slice(0, 200),
  };
}

/** Intervalo do sinal de vida da hunt solo aberta (`solo_run_alive`). */
const ALIVE_MS = 20_000;

/**
 * Sinal de vida da hunt solo enquanto ela roda: se o jogo fechar sozinho, `last_seen_at` diz até quando ele estava
 * aberto (`telemetry_solo_fechadas`). Para quando a hunt acaba para este jogador.
 */
function watchAlive(room: () => DungeonRoom | null, runId: string) {
  const timer = window.setInterval(() => {
    const r = room();
    const me = r?.state.players.get(r.sessionId);
    if (!r || (r.state.phase !== "lobby" && me && me.status !== "playing")) return void window.clearInterval(timer);
    if (r.state.phase === "running") void supabase.rpc("solo_run_alive", { p_run_id: runId }).then(() => {});
  }, ALIVE_MS);
}

/** Resultado de hunt que ainda não chegou ao banco: fica no aparelho até `finish_solo_run` responder. */
const PENDING_KEY = "kusa:solo-pendente";
/** Esperas entre as tentativas de gravar o fim da hunt (ms): a rede do celular costuma voltar em segundos. */
const FINISH_RETRY_MS = [1000, 3000, 8000];

interface PendingFinish {
  /** Conta dona da hunt: outra conta no mesmo aparelho não reenvia (o banco recusaria). */
  uid: string;
  params: Record<string, unknown>;
}

function readPending(): PendingFinish[] {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writePending(list: PendingFinish[]) {
  try {
    if (list.length > 0) localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    else localStorage.removeItem(PENDING_KEY);
  } catch { /* armazenamento indisponível: fica só a tentativa em memória */ }
}

function dropPending(runId: unknown) {
  writePending(readPending().filter((p) => p.params.p_run_id !== runId));
}

/**
 * Erro do próprio banco (SQLSTATE de 5 caracteres, como a hunt já fechada): tentar de novo não adianta.
 * Sem código (o fetch falhou) ou com erro do PostgREST/gateway, a rede pode voltar.
 */
function isFinal(error: { code?: string }) {
  return /^[0-9A-Z]{5}$/.test(error.code ?? "");
}

/**
 * Reenvia os resultados que ficaram no aparelho (a rede caiu no fim da hunt ou a página recarregou antes de
 * gravar). Roda ao entrar no menu e antes de abrir outra hunt: `start_solo_run` fecha como morte a hunt que
 * estiver aberta. Devolve se ainda sobrou algo desta conta sem gravar.
 */
export async function flushPendingSolo(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return false;
  let left = false;
  for (const pending of readPending().filter((p) => p.uid === uid)) {
    const { error } = await supabase.rpc("finish_solo_run", pending.params);
    if (error && !isFinal(error)) {
      left = true;
      continue;
    }
    if (error) console.error("Resultado guardado recusado pelo banco", error);
    dropPending(pending.params.p_run_id);
  }
  return left;
}

/**
 * Mostra o resultado na hora (sem esperar o banco, que pode levar segundos) e de novo com o que foi gravado.
 * Entrega direta: o banco pode responder depois de o tick parar, no fim da hunt.
 */
export function reportSolo(
  runId: string | null, classId: ClassId, result: RunEndedMessage, report: HuntReport, emit: (msg: RunEndedMessage) => void,
): void {
  if (runId) emit({ ...result, saving: true, note: "Salvando a recompensa…" });
  void finishSolo(runId, classId, result, report).then(emit);
}

/**
 * Grava o resultado no banco e devolve a mensagem de fim com o que foi de fato creditado. Vale também para a sala
 * hospedada por um jogador (cada um grava o seu). Sem `runId` (a hunt não abriu no banco), nada é salvo.
 * O resultado fica guardado no aparelho antes de ir para o banco: se a rede cair (ou a página recarregar), ele
 * é reenviado depois e a hunt não vira morte.
 */
export async function finishSolo(runId: string | null, classId: ClassId, result: RunEndedMessage, report: HuntReport): Promise<RunEndedMessage> {
  if (!runId) return { ...result, loot: 0, items: [], bag: [], note: "A hunt não abriu no banco: a recompensa não foi salva." };
  const params = {
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
      // Bosses que deram a runa nesta hunt: o banco anota e só aceita uma runa nova por boss anotado.
      boss_runes: report.stats.bossRunes,
    },
  };
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (uid) writePending([...readPending(), { uid, params }]);

  let { data, error } = await supabase.rpc("finish_solo_run", params);
  for (const wait of FINISH_RETRY_MS) {
    if (!error || isFinal(error)) break;
    await new Promise((resolve) => window.setTimeout(resolve, wait));
    ({ data, error } = await supabase.rpc("finish_solo_run", params));
  }
  if (error && !isFinal(error)) {
    console.error("Falha ao salvar a hunt solo (fica guardada no aparelho)", error);
    return {
      ...result,
      note: "Sem conexão com o banco: o resultado ficou guardado neste aparelho e vai ser salvo quando a conexão voltar"
        + " (abra o jogo de novo com internet). Nada foi perdido.",
    };
  }
  dropPending(runId);
  if (error) {
    console.error("Falha ao salvar a hunt solo", error);
    return { ...result, loot: 0, items: [], bag: [], note: "O banco recusou o resultado: a recompensa desta hunt não foi salva." };
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
