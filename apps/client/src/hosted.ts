import { Encoder, Reflection, type Decoder } from "@colyseus/schema";
import {
  MAX_PARTY_SIZE,
  MSG,
  SERVER_TICK_MS,
  type ClassId,
  type MapId,
  type RunEndedMessage,
  type SoloRunStart,
} from "@kusa/shared";
import { RULES_VERSION } from "virtual:rules-version";
import type { Hunt, HuntReport, Recruit } from "../../server/src/hunt.ts";
import type { DungeonState } from "../../server/src/state.ts";
import { supabase } from "./auth.ts";
import type { DungeonRoom } from "./net.ts";
import { Listing, Signaling, answerCalls, dial, randomId, type Link } from "./p2p.ts";
import { flushPendingSolo, reportSolo } from "./solo.ts";

// Sala hospedada por um jogador: o aparelho dele roda a `Hunt` (a mesma do servidor) e os outros recebem o
// estado por conexão direta. Se o anfitrião sai, o próximo da lista assume a partir do último retrato.
// Cada jogador grava o próprio resultado pelo banco, com os limites da hunt solo (start/finish_solo_run).

/** Retrato enviado aos convidados para continuar a hunt se o anfitrião sair. */
const SNAPSHOT_MS = 1000;
/** Sem notícia do anfitrião por este tempo, ele caiu. */
const HOST_SILENCE_MS = 4000;
/** O anfitrião manda sinal de vida mesmo sem mudança no estado. */
const PING_MS = 1000;
/** Quanto cada convidado tenta ligar para o novo anfitrião antes de passar para o próximo da lista. */
const HANDOVER_TRY_MS = 12_000;

const FRAME_INIT = 1;
const FRAME_PATCH = 2;

interface Snapshot {
  state: Record<string, unknown>;
  hunt: unknown;
  clock: number;
  roster: string[];
}

/** Anfitrião → jogador. */
type Down =
  | { k: "msg"; type: string; msg: unknown }
  | { k: "result"; result: RunEndedMessage; report: HuntReport }
  | { k: "begin" }
  | { k: "roster"; roster: string[]; host: string }
  | { k: "snap"; snap: Snapshot }
  | { k: "ping" }
  | { k: "refuse"; reason: string };

/** Jogador → anfitrião. */
type Up =
  | { k: "hello"; recruit: Recruit; rulesVersion: string; resume: boolean }
  | { k: "msg"; type: string; msg: unknown }
  | { k: "loadout"; items: string[]; bag: string[] }
  | { k: "bye" };

/** Para onde o anfitrião manda as coisas de um jogador (o próprio, direto; os convidados, pelo canal). */
interface Sink {
  down(msg: Down): void;
  frame(bytes: Uint8Array): void;
  close(): void;
}

/** Quem joga nesta sala, visto pelo aparelho: identidade e conta. */
export interface Me {
  name: string;
  classId: ClassId;
  recruit: Recruit;
}

/** Sala como a interface usa, com o aviso de troca de anfitrião. */
export type HostedRoom = DungeonRoom & {
  /** O anfitrião mudou: a interface troca para esta sala nova (o estado antigo para de mudar). */
  onReplaced(cb: (room: HostedRoom, hostName: string) => void): void;
};

// --- Anfitrião --------------------------------------------------------------

/** Roda a hunt neste aparelho e serve o próprio jogador e os convidados. */
class HostRuntime {
  readonly state: DungeonState;
  readonly hunt: Hunt;
  private encoder: Encoder;
  private sinks = new Map<string, Sink>();
  /** Quem acabou de entrar recebe o estado cheio no fim do próximo tick. */
  private pendingInit = new Set<string>();
  /** Ordem de entrada: o primeiro depois do anfitrião assume se ele sair. */
  roster: string[] = [];
  private outbox: { to: string | null; type: string; msg: unknown }[] = [];
  private clockBase: number;
  private clockStart = performance.now();
  private last = performance.now();
  private timers: number[] = [];

  constructor(
    mods: { Hunt: typeof Hunt; DungeonState: typeof DungeonState; stateFromJSON: (json: Record<string, unknown>) => DungeonState },
    readonly hostId: string,
    readonly roomId: string,
    mapId: MapId,
    snapshot: Snapshot | null,
    private onChange: () => void,
  ) {
    // O relógio da hunt continua de onde o retrato parou: os tempos internos (recargas, efeitos) seguem valendo.
    this.clockBase = snapshot?.clock ?? 0;
    this.state = snapshot ? mods.stateFromJSON(snapshot.state) : new mods.DungeonState();
    this.roster = snapshot ? snapshot.roster.filter((id) => id !== hostId) : [];
    this.roster.unshift(hostId);
    this.hunt = new mods.Hunt(this.state, {
      now: () => this.now(),
      setTimeout: (fn, ms) => void window.setTimeout(fn, ms),
      send: (sessionId, type, msg) => this.outbox.push({ to: sessionId, type, msg }),
      broadcast: (type, msg) => this.outbox.push({ to: null, type, msg }),
      runEnded: (sessionId, result, report) => this.sinks.get(sessionId)?.down({ k: "result", result, report }),
      ended: () => {},
    }, snapshot
      ? { mapId: this.state.mapId as MapId, seed: this.state.seed, restore: snapshot.hunt }
      : { mapId, seed: Math.floor(Math.random() * 2 ** 31) });
    this.encoder = new Encoder(this.state);
    this.timers.push(window.setInterval(() => this.tick(), SERVER_TICK_MS));
    this.timers.push(window.setInterval(() => this.snapshot(), SNAPSHOT_MS));
    this.timers.push(window.setInterval(() => this.sinks.forEach((s) => s.down({ k: "ping" })), PING_MS));
  }

  now() {
    return this.clockBase + performance.now() - this.clockStart;
  }

  /** Alguém entrou (ou voltou, depois da troca de anfitrião). */
  attach(sessionId: string, sink: Sink, recruit: Recruit | null) {
    if (recruit) {
      if (this.state.phase !== "lobby") return sink.down({ k: "refuse", reason: "a hunt já começou" });
      if (this.state.players.size >= MAX_PARTY_SIZE) return sink.down({ k: "refuse", reason: "a sala está cheia" });
      this.hunt.join(sessionId, recruit);
      this.roster.push(sessionId);
    } else if (!this.state.players.has(sessionId)) {
      return sink.down({ k: "refuse", reason: "você não está mais nesta hunt" });
    } else if (!this.roster.includes(sessionId)) {
      this.roster.push(sessionId);
    }
    this.sinks.set(sessionId, sink);
    this.pendingInit.add(sessionId);
    this.sendRoster();
    this.onChange();
  }

  /** Alguém saiu ou a conexão caiu: na sala de espera some; durante a hunt, conta como morte. */
  detach(sessionId: string) {
    this.sinks.delete(sessionId);
    this.pendingInit.delete(sessionId);
    this.hunt.leave(sessionId);
    // A lista é de quem está conectado: quem caiu não pode assumir como anfitrião.
    this.roster = this.roster.filter((id) => id !== sessionId);
    this.sendRoster();
    this.onChange();
  }

  /** Intenção de um jogador (mesmo formato das mensagens ao servidor). */
  receive(sessionId: string, up: Up) {
    if (up.k === "msg") return this.handle(sessionId, up.type, up.msg);
    if (up.k === "loadout") {
      this.hunt.equip(sessionId, up.items ?? []);
      this.hunt.fillBag(sessionId, up.bag ?? []);
    }
  }

  private handle(sessionId: string, type: string, msg: any) {
    switch (type) {
      case MSG.start:
        if (!this.hunt.start(sessionId)) return;
        // Cada jogador abre a própria hunt no banco (equipamento e bag saem da conta dele).
        this.sinks.forEach((sink) => sink.down({ k: "begin" }));
        this.onChange();
        return;
      case MSG.addBot:
      case MSG.removeBot:
        if (type === MSG.addBot ? this.hunt.addBot(sessionId, msg) : this.hunt.removeBot(sessionId, msg)) this.onChange();
        return;
      case MSG.move: return this.hunt.move(sessionId, msg);
      case MSG.target: return this.hunt.target(sessionId, msg);
      case MSG.attacking: return this.hunt.attacking(sessionId, msg);
      case MSG.chooseSpell: return this.hunt.chooseSpell(sessionId, msg);
      case MSG.choosePerk: return this.hunt.choosePerk(sessionId, msg);
      case MSG.chooseRune: return this.hunt.chooseRune(sessionId, msg);
      case MSG.cast: return this.hunt.cast(sessionId, msg);
      case MSG.drink: return this.hunt.drink(sessionId, msg);
      case MSG.bagEquip: return this.hunt.bagEquip(sessionId, msg);
      case MSG.unequip: return this.hunt.unequip(sessionId, msg);
      case MSG.bagDrop: return this.hunt.bagDrop(sessionId, msg);
    }
  }

  /** Simulação, mensagens, patches e estado cheio para quem chegou, nessa ordem (como o servidor). */
  private tick() {
    const now = performance.now();
    this.hunt.tick(now - this.last);
    this.last = now;
    const outbox = this.outbox;
    this.outbox = [];
    for (const { to, type, msg } of outbox) {
      if (to === null) this.sinks.forEach((sink, id) => { if (!this.pendingInit.has(id)) sink.down({ k: "msg", type, msg }); });
      else if (!this.pendingInit.has(to)) this.sinks.get(to)?.down({ k: "msg", type, msg });
    }
    const patch = this.encoder.encode();
    if (patch.length > 0) {
      const frame = withKind(FRAME_PATCH, patch);
      this.sinks.forEach((sink, id) => { if (!this.pendingInit.has(id)) sink.frame(frame); });
    }
    this.encoder.discardChanges();
    if (this.pendingInit.size > 0) {
      const handshake = Reflection.encode(this.encoder);
      const full = this.encoder.encodeAll();
      const frame = new Uint8Array(5 + handshake.length + full.length);
      frame[0] = FRAME_INIT;
      new DataView(frame.buffer).setUint32(1, handshake.length);
      frame.set(handshake, 5);
      frame.set(full, 5 + handshake.length);
      this.pendingInit.forEach((id) => this.sinks.get(id)?.frame(frame));
      this.pendingInit.clear();
    }
  }

  private snapshot() {
    if (this.sinks.size <= 1) return;
    const snap: Snapshot = { state: this.state.toJSON(), hunt: this.hunt.exportInternals(), clock: this.now(), roster: this.roster };
    this.sinks.forEach((sink, id) => { if (id !== this.hostId) sink.down({ k: "snap", snap }); });
  }

  private sendRoster() {
    this.sinks.forEach((sink) => sink.down({ k: "roster", roster: this.roster, host: this.hostId }));
  }

  stop() {
    this.timers.forEach((t) => window.clearInterval(t));
    this.sinks.forEach((sink) => sink.close());
    this.sinks.clear();
  }
}

/** Patch com o tipo do quadro na frente (o encoder reaproveita o buffer: aqui vira uma cópia). */
function withKind(kind: number, bytes: Uint8Array) {
  const frame = new Uint8Array(bytes.length + 1);
  frame[0] = kind;
  frame.set(bytes, 1);
  return frame;
}

// --- Jogador ------------------------------------------------------------------

/**
 * A sala vista por um jogador (anfitrião ou convidado), com a cara de uma sala do Colyseus: estado decodificado
 * com callbacks, `send` e `onMessage`. Grava o próprio resultado no banco.
 */
class RoomClient {
  decoder: Decoder<DungeonState> | null = null;
  private listeners = new Map<string, Set<(msg: any) => void>>();
  private leaveListeners = new Set<(code: number) => void>();
  private replacedListeners = new Set<(room: HostedRoom, hostName: string) => void>();
  private ready!: () => void;
  readonly initialized = new Promise<void>((resolve) => { this.ready = resolve; });

  constructor(readonly sessionId: string, readonly roomId: string, private session: HostedSession, private uplink: (up: Up) => void) {}

  get state() {
    return this.decoder!.state;
  }

  get serializer() {
    return { decoder: this.decoder };
  }

  /** Quadro binário do anfitrião: estado cheio (na entrada) ou patch. */
  frame(bytes: Uint8Array) {
    if (bytes[0] === FRAME_INIT) {
      const size = new DataView(bytes.buffer, bytes.byteOffset).getUint32(1);
      this.decoder = Reflection.decode(bytes.subarray(5, 5 + size)) as Decoder<DungeonState>;
      this.decoder.decode(bytes.subarray(5 + size));
      this.ready();
    } else if (bytes[0] === FRAME_PATCH && this.decoder) {
      this.decoder.decode(bytes.subarray(1));
    }
  }

  emit(type: string, msg: unknown) {
    this.listeners.get(type)?.forEach((cb) => cb(msg));
  }

  send(type: string, msg?: unknown) {
    this.uplink({ k: "msg", type, msg });
  }

  onMessage(type: string, cb: (msg: any) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
    return () => this.listeners.get(type)?.delete(cb);
  }

  onLeave(cb: (code: number) => void) {
    this.leaveListeners.add(cb);
    return () => this.leaveListeners.delete(cb);
  }

  onReplaced(cb: (room: HostedRoom, hostName: string) => void) {
    this.replacedListeners.add(cb);
  }

  replacedBy(room: RoomClient, hostName: string) {
    this.replacedListeners.forEach((cb) => cb(room as unknown as HostedRoom, hostName));
  }

  async leave() {
    this.session.leave();
    this.leaveListeners.forEach((cb) => cb(1000));
  }
}

// --- Sessão (troca de anfitrião) ----------------------------------------------

/** A participação deste aparelho numa sala hospedada, de anfitrião ou de convidado, através das trocas. */
class HostedSession {
  readonly myId = randomId();
  private signaling: Signaling;
  private runtime: HostRuntime | null = null;
  private listing: Listing | null = null;
  private link: Link | null = null;
  private client: RoomClient | null = null;
  private roster: string[] = [];
  private hostId = "";
  private lastSnap: Snapshot | null = null;
  private lastHeard = 0;
  private watchdog = 0;
  private stopAnswering: (() => void) | null = null;
  private left = false;
  /** Hunt deste jogador no banco (null: não abriu ou falhou; o resultado não é salvo). */
  private runId: string | null = null;
  private mapId: MapId;

  constructor(readonly roomId: string, private me: Me, mapId: MapId, private mods: Parameters<typeof makeRuntime>[0]) {
    this.mapId = mapId;
    this.signaling = new Signaling(roomId, this.myId);
  }

  /** Cria a sala e hospeda neste aparelho. */
  async host(snapshot: Snapshot | null): Promise<RoomClient> {
    this.link?.close();
    this.link = null;
    window.clearInterval(this.watchdog);
    this.hostId = this.myId;
    this.listing ??= new Listing(this.roomId);
    this.runtime = makeRuntime(this.mods, this.myId, this.roomId, this.mapId, snapshot, () => this.publish());
    // Quem hospedava saiu: conta como morte dele (ou sai da sala de espera).
    if (snapshot) {
      const oldHost = snapshot.roster[0];
      if (oldHost && oldHost !== this.myId) this.runtime.detach(oldHost);
    }
    const runtime = this.runtime;
    const client = new RoomClient(this.myId, this.roomId, this, (up) => runtime.receive(this.myId, up));
    runtime.attach(this.myId, {
      down: (msg) => this.onDown(client, msg),
      frame: (bytes) => client.frame(bytes),
      close: () => {},
    }, snapshot ? null : this.me.recruit);
    this.stopAnswering = answerCalls(this.signaling, (peer, link) => this.acceptGuest(peer, link));
    await client.initialized;
    this.client = client;
    this.publish();
    return client;
  }

  /** Entra na sala de outro aparelho. */
  async join(hostPeer: string, resume: boolean): Promise<RoomClient> {
    const link = await dial(this.signaling, hostPeer);
    this.link = link;
    this.hostId = hostPeer;
    const client = new RoomClient(this.myId, this.roomId, this, (up) => send(link, up));
    let refused: ((err: Error) => void) | null = null;
    const refusal = new Promise<never>((_, reject) => { refused = reject; });
    link.channel.onmessage = ({ data }) => {
      this.lastHeard = performance.now();
      if (typeof data === "string") {
        const down = JSON.parse(data) as Down;
        if (down.k === "refuse") refused?.(new Error(down.reason));
        else this.onDown(client, down);
      } else {
        client.frame(new Uint8Array(data as ArrayBuffer));
      }
    };
    link.channel.onclose = () => this.hostLost(link);
    send(link, { k: "hello", recruit: this.me.recruit, rulesVersion: RULES_VERSION, resume });
    this.lastHeard = performance.now();
    window.clearInterval(this.watchdog);
    this.watchdog = window.setInterval(() => {
      if (performance.now() - this.lastHeard > HOST_SILENCE_MS) this.hostLost(link);
    }, 1000);
    await Promise.race([client.initialized, refusal]);
    this.client = client;
    return client;
  }

  private acceptGuest(peer: string, link: Link) {
    const runtime = this.runtime;
    if (!runtime) return link.close();
    let attached = false;
    link.channel.onmessage = ({ data }) => {
      if (typeof data !== "string") return;
      const up = JSON.parse(data) as Up;
      if (up.k === "hello") {
        if (up.rulesVersion !== RULES_VERSION) {
          send(link, { k: "refuse", reason: "versões diferentes do jogo: os dois precisam recarregar a página" });
          return;
        }
        attached = true;
        runtime.attach(peer, {
          down: (msg) => send(link, msg),
          frame: (bytes) => { if (link.channel.readyState === "open") link.channel.send(bytes as Uint8Array<ArrayBuffer>); },
          close: () => link.close(),
        }, up.resume ? null : up.recruit);
      } else if (up.k === "bye") {
        link.close();
      } else if (attached) {
        runtime.receive(peer, up);
      }
    };
    link.channel.onclose = () => { if (attached && this.runtime === runtime) runtime.detach(peer); };
  }

  /** Mensagens do anfitrião para este jogador (o anfitrião manda para si mesmo pelo mesmo caminho). */
  private onDown(client: RoomClient, down: Down) {
    switch (down.k) {
      case "msg": return client.emit(down.type, down.msg);
      case "roster":
        this.roster = down.roster;
        this.hostId = down.host;
        return;
      case "snap":
        this.lastSnap = down.snap;
        return;
      case "begin": return void this.beginRun(client);
      case "result":
        return reportSolo(this.runId, this.me.classId, down.result, down.report, (msg) => client.emit(MSG.runEnded, msg));
    }
  }

  /** A hunt começou: abre a hunt deste jogador no banco e manda o equipamento e a bag para a dungeon. */
  private async beginRun(client: RoomClient) {
    // A hunt anterior que não chegou ao banco vai antes: abrir outra fecharia aquela como morte.
    await flushPendingSolo();
    const { data, error } = await supabase.rpc("start_solo_run", { p_class_id: this.me.classId, p_map_id: this.mapId });
    if (error) {
      console.error("Falha ao abrir a hunt no banco", error);
      return;
    }
    const run = data as SoloRunStart;
    this.runId = run.run_id;
    const up: Up = { k: "loadout", items: run.items ?? [], bag: run.bag ?? [] };
    if (this.runtime) this.runtime.receive(this.myId, up);
    else if (this.link) send(this.link, up);
  }

  /** O anfitrião sumiu: o próximo da lista assume; os outros ligam para ele. */
  private async hostLost(link: Link) {
    if (this.link !== link || this.left) return;
    this.link = null;
    window.clearInterval(this.watchdog);
    link.close();
    const old = this.client;
    const me = old?.state.players.get(this.myId);
    // Já saiu da hunt (resultado na tela): não precisa de anfitrião novo.
    if (!old || (me && me.status !== "playing")) return;
    const snapshot = this.lastSnap;
    // Na ordem de entrada: todos escolhem o mesmo. Se ele não atender, tentam o seguinte.
    const candidates = snapshot ? snapshot.roster.filter((id) => id !== this.hostId) : [];
    for (const candidate of candidates) {
      try {
        const next = candidate === this.myId
          ? await this.host(snapshot)
          : await withTimeout(this.join(candidate, true), HANDOVER_TRY_MS);
        const name = next.state.players.get(candidate)?.name ?? "outro jogador";
        old.replacedBy(next, name);
        return;
      } catch (err) {
        console.warn(`Troca de anfitrião: ${candidate} não assumiu`, err);
      }
    }
    // Ninguém assumiu: a hunt acaba para este jogador. A hunt dele no banco fica aberta e conta como morte.
    const level = me?.level ?? 1;
    old.emit(MSG.runEnded, {
      outcome: "died", loot: 0, level, items: [], bag: [], spells: [],
      note: "O anfitrião caiu e ninguém conseguiu assumir a hunt.",
    } satisfies RunEndedMessage);
    this.leave();
  }

  /** Lista de salas: líder, cenário, vagas e se já começou. */
  private publish() {
    const runtime = this.runtime;
    if (!runtime || !this.listing) return;
    const leader = runtime.state.players.get(runtime.state.leaderId);
    void this.listing.update({
      roomId: this.roomId, hostPeer: this.myId, leader: leader?.name ?? this.me.name, mapId: runtime.state.mapId as MapId,
      clients: runtime.state.players.size, maxClients: MAX_PARTY_SIZE, locked: runtime.state.phase !== "lobby",
    });
  }

  leave() {
    if (this.left) return;
    this.left = true;
    window.clearInterval(this.watchdog);
    if (this.link) send(this.link, { k: "bye" });
    this.link?.close();
    this.stopAnswering?.();
    this.runtime?.stop();
    this.listing?.close();
    this.signaling.close();
  }
}

function send(link: Link, up: Up | Down) {
  if (link.channel.readyState === "open") link.channel.send(JSON.stringify(up));
}

function makeRuntime(
  mods: { Hunt: typeof Hunt; DungeonState: typeof DungeonState; stateFromJSON: (json: Record<string, unknown>) => DungeonState },
  hostId: string, roomId: string, mapId: MapId, snapshot: Snapshot | null, onChange: () => void,
) {
  return new HostRuntime(mods, hostId, roomId, mapId, snapshot?.hunt ? snapshot : null, onChange);
}

/** A simulação só é baixada por quem joga numa sala hospedada (ou solo). */
async function loadSimulation() {
  const [{ Hunt }, { DungeonState }, { stateFromJSON }] = await Promise.all([
    import("../../server/src/hunt.ts"),
    import("../../server/src/state.ts"),
    import("../../server/src/snapshot.ts"),
  ]);
  return { Hunt, DungeonState, stateFromJSON };
}

/** Talentos, XP e magias ativas da conta (precisam entrar na hunt antes do início, como no servidor). */
export async function myRecruit(name: string, classId: ClassId): Promise<Me> {
  const { data: session } = await supabase.auth.getSession();
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from("profile_talents").select("talent_id, rank, xp"),
    supabase.from("profiles").select("active_spells").eq("id", session.session?.user.id ?? "").maybeSingle(),
  ]);
  const rows = (data ?? []) as { talent_id: string; rank: number; xp: number }[];
  return {
    name,
    classId,
    recruit: {
      name, classId,
      talents: Object.fromEntries(rows.map((t) => [t.talent_id, t.rank])),
      spellXp: Object.fromEntries(rows.filter((t) => t.xp > 0).map((t) => [t.talent_id, t.xp])),
      activeSpells: (profile?.active_spells as string[] | null) ?? [],
    },
  };
}

/** Cria uma sala hospedada neste aparelho. */
export async function createHostedRoom(me: Me, mapId: MapId): Promise<HostedRoom> {
  const session = new HostedSession(randomId(), me, mapId, await loadSimulation());
  return (await session.host(null)) as unknown as HostedRoom;
}

/** Entra numa sala hospedada por outro jogador. */
export async function joinHostedRoom(roomId: string, hostPeer: string, mapId: MapId, me: Me): Promise<HostedRoom> {
  const session = new HostedSession(roomId, me, mapId, await loadSimulation());
  try {
    return (await session.join(hostPeer, false)) as unknown as HostedRoom;
  } catch (err) {
    session.leave();
    throw err;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([promise, new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("tempo esgotado")), ms))]);
}
