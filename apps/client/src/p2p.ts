import type { RealtimeChannel } from "@supabase/supabase-js";
import { MAX_PARTY_SIZE, type MapId } from "@kusa/shared";
import { supabase } from "./auth.ts";

// Rede da sala hospedada por um jogador: a lista das salas e a sinalização passam pelo Realtime do Supabase
// (funciona com o servidor de jogo dormindo); o jogo vai direto entre os aparelhos, por WebRTC.
// Sem servidor de retransmissão (TURN): em algumas redes móveis a conexão direta não fecha, e o jogo avisa.

/** Servidores STUN públicos: só descobrem o endereço de cada aparelho, não repassam o jogo. */
const ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
/** Quanto esperar a conexão direta antes de desistir. */
const CONNECT_TIMEOUT_MS = 15_000;
const LISTING_CHANNEL = "kusa-salas";

/** Uma sala hospedada como aparece na lista de salas. */
export interface HostedListing {
  roomId: string;
  /** Id do aparelho que hospeda agora (muda quando outro jogador assume). */
  hostPeer: string;
  leader: string;
  mapId: MapId;
  clients: number;
  maxClients: number;
  /** A hunt já começou: ninguém mais entra. */
  locked: boolean;
}

/** Id curto e aleatório (sala ou aparelho). */
export const randomId = () => Math.random().toString(36).slice(2, 10);

/**
 * Canais saindo, por nome. Até o Realtime confirmar a saída, `supabase.channel()` devolve o canal velho para o
 * mesmo nome, e ele nunca mais conecta: "Criar sala" logo depois de largar a lista de salas abria a sala sem
 * anunciá-la (ninguém a via), e entrar de novo na mesma sala travava em "Conectando…".
 */
const leaving = new Map<string, Promise<unknown>>();

/** Abre um canal do Realtime depois que um anterior com o mesmo nome terminou de sair. */
async function openChannel(name: string, config?: Parameters<typeof supabase.channel>[1]) {
  await leaving.get(name);
  return supabase.channel(name, config);
}

/** Fecha o canal e marca o nome como saindo até o Realtime confirmar. */
function closeChannel(name: string, channel: Promise<RealtimeChannel>) {
  const done = channel.then((c) => supabase.removeChannel(c));
  leaving.set(name, done);
  void done.finally(() => { if (leaving.get(name) === done) leaving.delete(name); });
}

/** Resolve quando o canal conecta (o Realtime tenta de novo sozinho se falhar). */
function subscribed(channel: RealtimeChannel) {
  return new Promise<void>((resolve) => channel.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); }));
}

/** Acompanha as salas hospedadas que aceitam jogadores. Devolve a função que para de acompanhar. */
export function watchHostedRooms(onChange: (rooms: HostedListing[]) => void): () => void {
  const channel = openChannel(LISTING_CHANNEL).then((c) => {
    c.on("presence", { event: "sync" }, () => {
      const rooms = Object.values(c.presenceState<HostedListing>()).map((entries) => entries[entries.length - 1]);
      onChange(rooms.filter((r) => r && !r.locked && r.clients < r.maxClients));
    }).subscribe();
    return c;
  });
  return () => closeChannel(LISTING_CHANNEL, channel);
}

/** Anuncia a sala na lista enquanto este aparelho hospeda. */
export class Listing {
  private channel: Promise<RealtimeChannel>;
  private joined: RealtimeChannel | null = null;
  private last: HostedListing | null = null;

  constructor(roomId: string) {
    // No celular o socket cai à toa (app em segundo plano, troca de rede): o canal volta sozinho, mas a presença
    // não, e a sala sumia da lista de todo mundo. Anuncia de novo a cada vez que o canal (re)conecta.
    this.channel = openChannel(LISTING_CHANNEL, { config: { presence: { key: roomId } } }).then((c) => c.subscribe((status) => {
      this.joined = status === "SUBSCRIBED" ? c : null;
      this.announce();
    }));
  }

  update(listing: HostedListing) {
    this.last = { ...listing, maxClients: MAX_PARTY_SIZE };
    this.announce();
  }

  private announce() {
    if (this.joined && this.last) void this.joined.track(this.last);
  }

  close() {
    void this.channel.then((c) => c.untrack());
    closeChannel(LISTING_CHANNEL, this.channel);
  }
}

interface Signal {
  to: string;
  from: string;
  kind: "offer" | "answer";
  sdp: string;
}

/** Canal de sinalização de uma sala: ofertas e respostas do WebRTC entre os aparelhos. */
export class Signaling {
  private name: string;
  private channel: Promise<RealtimeChannel>;
  private ready: Promise<void>;
  private handlers = new Set<(signal: Signal) => void>();

  constructor(roomId: string, private me: string) {
    this.name = `kusa-sala-${roomId}`;
    this.channel = openChannel(this.name, { config: { broadcast: { self: false } } }).then((c) => c.on("broadcast", { event: "sinal" }, ({ payload }) => {
      const signal = payload as Signal;
      if (signal?.to === this.me) this.handlers.forEach((h) => h(signal));
    }));
    this.ready = this.channel.then(subscribed);
  }

  onSignal(handler: (signal: Signal) => void) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async send(to: string, kind: Signal["kind"], sdp: string) {
    await this.ready;
    await (await this.channel).send({ type: "broadcast", event: "sinal", payload: { to, from: this.me, kind, sdp } satisfies Signal });
  }

  close() {
    closeChannel(this.name, this.channel);
  }
}

/** Conexão direta pronta: o canal de dados e a conexão (para fechar). */
export interface Link {
  channel: RTCDataChannel;
  close(): void;
}

/** Convidado: liga para o aparelho que hospeda. */
export async function dial(signaling: Signaling, hostPeer: string): Promise<Link> {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channel = pc.createDataChannel("kusa", { ordered: true });
  channel.binaryType = "arraybuffer";
  const close = () => { channel.close(); pc.close(); };
  try {
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    const answered = new Promise<string>((resolve) => {
      const off = signaling.onSignal((s) => {
        if (s.from !== hostPeer || s.kind !== "answer") return;
        off();
        resolve(s.sdp);
      });
    });
    await timeout(signaling.send(hostPeer, "offer", pc.localDescription!.sdp), "a sala não respondeu");
    const sdp = await timeout(answered, "o anfitrião não respondeu");
    await pc.setRemoteDescription({ type: "answer", sdp });
    await timeout(new Promise<void>((resolve, reject) => {
      channel.onopen = () => resolve();
      pc.onconnectionstatechange = () => { if (pc.connectionState === "failed") reject(new Error("conexão direta recusada pela rede")); };
    }), "a conexão direta não fechou");
    return { channel, close };
  } catch (err) {
    close();
    throw err;
  }
}

/** Anfitrião: atende quem liga. `onLink` recebe cada conexão aberta. */
export function answerCalls(signaling: Signaling, onLink: (peer: string, link: Link) => void) {
  return signaling.onSignal(async (s) => {
    if (s.kind !== "offer") return;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.ondatachannel = ({ channel }) => {
      channel.binaryType = "arraybuffer";
      const link = { channel, close: () => { channel.close(); pc.close(); } };
      if (channel.readyState === "open") onLink(s.from, link);
      else channel.onopen = () => onLink(s.from, link);
    };
    await pc.setRemoteDescription({ type: "offer", sdp: s.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await gathered(pc);
    await signaling.send(s.from, "answer", pc.localDescription!.sdp);
  });
}

/** Espera os candidatos de rede (sem trickle: a oferta já vai com todos). Com STUN, leva menos de 1 s. */
function gathered(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => { if (pc.iceGatheringState === "complete") resolve(); };
    pc.addEventListener("icegatheringstatechange", done);
    window.setTimeout(resolve, 3000);
  });
}

function timeout<T>(promise: Promise<T>, message: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error(message)), CONNECT_TIMEOUT_MS)),
  ]);
}
