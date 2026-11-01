import { randomUUID } from "node:crypto";
import { Room, ServerError, type Client } from "colyseus";
import {
  CLASSES,
  CLASS_UNLOCK,
  MAX_PARTY_SIZE,
  MSG,
  classUnlocked,
  SERVER_TICK_MS,
  VERSION_MISMATCH_CODE,
  MAPS,
  MONSTERS,
  mapIdOf,
  mapUnlocked,
  spellXpGains,
  unlockedBy,
  UNLOCK_BOSS,
  type ClassId,
  type AddBotMessage,
  type AttackingMessage,
  type BagDropMessage,
  type ScreenMessage,
  type BagEquipMessage,
  type CastMessage, type ChannelMessage,
  type ChoosePerkMessage,
  type ChooseRuneMessage,
  type ChooseSpellMessage,
  type DrinkMessage,
  type HuntMetadata,
  type JoinOptions,
  type MoveMessage,
  type RemoveBotMessage,
  type TargetMessage,
  type UnequipMessage,
} from "@kusa/shared";
import { RULES_VERSION } from "./rulesVersion.ts";
import { Hunt } from "./hunt.ts";
import { DungeonState } from "./state.ts";
import { mapClears, readLoadout, recordMapClear, recordRun, resolveAccount, storeBag, supabase, takeBag, takenBossRunes, takeLoadout, type Account } from "./supabase.ts";
import { recordTelemetry } from "./telemetry.ts";

/** Só para testes: KUSA_START_LEVEL=8 faz todo mundo começar no nível 8 (com os slots de magia abertos). */
const START_LEVEL = Number(process.env.KUSA_START_LEVEL) || 1;
/** Só para testes: KUSA_ALL_SPELLS=1 dá a todo mundo o Grimório inteiro da classe no nível máximo. */
const ALL_SPELLS = process.env.KUSA_ALL_SPELLS === "1";
/** Só para testes: KUSA_MONSTER_HP=20 multiplica a vida dos monstros (efeitos como veneno e lentidão aparecem antes de eles morrerem). */
const MONSTER_HP = Number(process.env.KUSA_MONSTER_HP) || 1;
/** Só para testes: KUSA_RUNES=rune-life,rune-meteor faz todo mundo começar a hunt com essas runas equipadas. */
const TEST_RUNES = (process.env.KUSA_RUNES ?? "").split(",").filter(Boolean);

/** Sala do Colyseus de uma hunt em equipe: a simulação fica em `Hunt`; aqui ficam a rede, o banco e a telemetria. */
export class DungeonRoom extends Room<{ state: DungeonState; metadata: HuntMetadata }> {
  maxClients = MAX_PARTY_SIZE;
  state = new DungeonState();

  private hunt!: Hunt;
  private matchId = randomUUID();
  /** sessionId → conta do Supabase (null = convidado). */
  private users = new Map<string, string | null>();
  /** sessionId → bosses vencidos pela conta (qualquer classe): abrem as classes trancadas, também para os bots. */
  private bossClears = new Map<string, string[]>();

  onCreate(options: JoinOptions) {
    this.hunt = new Hunt(this.state, {
      now: () => this.clock.currentTime,
      setTimeout: (fn, ms) => void this.clock.setTimeout(fn, ms),
      send: (sessionId, type, msg) => this.clients.getById(sessionId)?.send(type, msg),
      broadcast: (type, msg) => this.broadcast(type, msg),
      runEnded: (sessionId, result, report) => {
        this.clients.getById(sessionId)?.send(MSG.runEnded, result);
        const userId = this.users.get(sessionId) ?? null;
        if (userId) void recordRun(this.matchId, { userId, ...result, classId: report.classId, spellXp: spellXpGains(report.classId as ClassId, result.spells), bossRunes: report.stats.bossRunes });
        void recordTelemetry({ matchId: this.matchId, userId, ...report });
      },
      ended: () => void this.clock.setTimeout(() => this.disconnect(), 10_000),
      // Campanha: quem estava na hunt quando o boss caiu abre o cenário seguinte (por conta e classe).
      mapCleared: (sessionIds, boss) => {
        for (const sessionId of sessionIds) {
          const userId = this.users.get(sessionId);
          const classId = this.state.players.get(sessionId)?.classId;
          if (userId && classId) void recordMapClear(userId, classId, this.hunt.mapId, boss);
        }
      },
    }, {
      mapId: mapIdOf(options?.mapId),
      seed: Math.floor(Math.random() * 2 ** 31),
      startLevel: START_LEVEL,
      allSpells: ALL_SPELLS,
      monsterHp: MONSTER_HP,
      runes: TEST_RUNES,
    });
    this.maxClients = this.hunt.partySize();

    this.onMessage(MSG.start, (client) => {
      if (this.hunt.start(client.sessionId)) void this.startRun();
    });

    // Bot ocupa uma vaga: a sala aceita um humano a menos.
    this.onMessage(MSG.addBot, (client, msg: AddBotMessage) => {
      if (!this.classOpen(client.sessionId, msg?.classId)) return;
      if (this.hunt.addBot(client.sessionId, msg)) this.updateListing();
    });
    this.onMessage(MSG.removeBot, (client, msg: RemoveBotMessage) => {
      if (this.hunt.removeBot(client.sessionId, msg)) this.updateListing();
    });

    this.onMessage(MSG.move, (client, msg: MoveMessage) => this.hunt.move(client.sessionId, msg));
    this.onMessage(MSG.target, (client, msg: TargetMessage) => this.hunt.target(client.sessionId, msg));
    this.onMessage(MSG.attacking, (client, msg: AttackingMessage) => this.hunt.attacking(client.sessionId, msg));
    this.onMessage(MSG.chooseSpell, (client, msg: ChooseSpellMessage) => this.hunt.chooseSpell(client.sessionId, msg));
    this.onMessage(MSG.choosePerk, (client, msg: ChoosePerkMessage) => this.hunt.choosePerk(client.sessionId, msg));
    this.onMessage(MSG.chooseRune, (client, msg: ChooseRuneMessage) => this.hunt.chooseRune(client.sessionId, msg));
    this.onMessage(MSG.cast, (client, msg: CastMessage) => this.hunt.cast(client.sessionId, msg));
    this.onMessage(MSG.channel, (client, msg: ChannelMessage) => this.hunt.channel(client.sessionId, msg));
    this.onMessage(MSG.drink, (client, msg: DrinkMessage) => this.hunt.drink(client.sessionId, msg));
    this.onMessage(MSG.bagEquip, (client, msg: BagEquipMessage) => this.hunt.bagEquip(client.sessionId, msg));
    this.onMessage(MSG.unequip, (client, msg: UnequipMessage) => this.hunt.unequip(client.sessionId, msg));
    this.onMessage(MSG.bagDrop, (client, msg: BagDropMessage) => this.hunt.bagDrop(client.sessionId, msg));
    this.onMessage(MSG.screen, (client, msg: ScreenMessage) => this.hunt.screen(client.sessionId, msg));

    this.setSimulationInterval((dt) => this.hunt.tick(dt), SERVER_TICK_MS);
  }

  async onAuth(_client: Client, options: JoinOptions) {
    // Cliente de outra versão geraria outro mapa a partir da mesma seed. A mensagem leva a versão do
    // servidor para o cliente decidir se recarrega (ele está velho) ou espera (o servidor está atualizando).
    if (options?.rulesVersion !== RULES_VERSION) {
      // "v999": cliente de antes da versão por hash lê o número depois de "servidor v" e só recarrega se for maior que
      // o dele (o último foi 26). O cliente atual lê o hash depois de "regras ".
      throw new ServerError(VERSION_MISMATCH_CODE, `O jogo foi atualizado: recarregue a página. (servidor v999, regras ${RULES_VERSION})`);
    }
    const account = await resolveAccount(options.accessToken);
    // Classe trancada (Xamã Orc): só entra quem já venceu o boss que a abre, com qualquer personagem da conta.
    if (supabase && options.classId in CLASSES && !classUnlocked(account?.bossClears ?? [], options.classId)) {
      const boss = CLASS_UNLOCK[options.classId] as keyof typeof MONSTERS;
      throw new ServerError(4403, `${CLASSES[options.classId].name} ainda está trancado: vença ${MONSTERS[boss].name} com qualquer herói.`);
    }
    // Campanha: quem cria a sala precisa ter o cenário aberto com a classe (quem entra na sala de outro não).
    // Sem banco (modo convidado, testes) não há campanha para conferir.
    if (supabase && this.users.size === 0) {
      const mapId = this.hunt.mapId;
      const clears = account ? await mapClears(account.userId, options.classId) : [];
      if (!mapUnlocked(clears, mapId)) {
        const before = unlockedBy(mapId);
        const boss = UNLOCK_BOSS[mapId];
        const what = boss && before ? `${MONSTERS[boss].name} em ${MAPS[before].name}` : `o boss de ${before ? MAPS[before].name : "um cenário anterior"}`;
        throw new ServerError(4403, `${MAPS[mapId].name} ainda está fechado: vença ${what} com esta classe.`);
      }
    }
    // Sempre um objeto (verdadeiro): sem conta, entra como convidado.
    return { account };
  }

  onJoin(client: Client, options: JoinOptions, auth: { account: Account | null }) {
    this.users.set(client.sessionId, auth.account?.userId ?? null);
    this.bossClears.set(client.sessionId, auth.account?.bossClears ?? []);
    this.hunt.join(client.sessionId, {
      name: auth.account?.name ?? options.name,
      classId: options.classId,
      talents: auth.account?.talents ?? {},
      spellXp: auth.account?.spellXp ?? {},
      activeSpells: auth.account?.activeSpells ?? [],
    });
    this.updateListing();
  }

  /** O bot desta classe pode entrar? Sem banco (convidado, testes) toda classe está aberta. */
  private classOpen(sessionId: string, classId: ClassId | undefined) {
    if (!supabase || !classId || !(classId in CLASSES)) return true;
    return classUnlocked(this.bossClears.get(sessionId) ?? [], classId);
  }

  onLeave(client: Client) {
    this.hunt.leave(client.sessionId);
    // Quem sai da sala de espera não entrou na hunt: nada sai da conta dele.
    if (!this.state.players.has(client.sessionId)) this.users.delete(client.sessionId);
    this.updateListing();
  }

  private async startRun() {
    this.lock();
    // Os bots vestem uma cópia do equipamento da classe deles na conta de quem os pôs. A leitura vem antes de
    // retirar o equipamento dos humanos: um humano da mesma classe tiraria os itens da conta.
    await Promise.allSettled([...this.users].flatMap(([sessionId, userId]) => (userId ? this.hunt.botsOf(sessionId) : [])
      .map(async (bot) => this.hunt.equip(bot.id, await readLoadout(userId!, bot.classId)))));
    // O equipamento escolhido no menu e a bag saem da conta e entram na dungeon (chegam logo depois do início).
    this.users.forEach((userId, sessionId) => {
      const classId = this.state.players.get(sessionId)?.classId;
      if (!userId || !classId) return;
      // Sai da conta só o equipamento que a classe usa (a espada de um druida fica em casa).
      // Morreu ou saiu antes de os itens chegarem: eles nem entraram na dungeon e voltam inteiros para o cofre.
      void takeLoadout(userId, classId).then((items) => {
        if (!this.hunt.equip(sessionId, items)) void storeBag(userId, items);
      });
      void takeBag(userId).then((items) => {
        if (!this.hunt.fillBag(sessionId, items)) void storeBag(userId, items);
      });
      // Cada boss dá a runa uma vez por personagem: os que já deram não dão outra.
      void takenBossRunes(userId, classId).then((bosses) => this.hunt.knownBossRunes(sessionId, bosses));
    });
  }

  /** A lista de salas mostra o líder e o mapa; as vagas dos bots saem do total. */
  private updateListing() {
    const leader = this.state.players.get(this.state.leaderId);
    if (this.state.phase === "lobby" && leader) {
      void this.setMatchmaking({
        maxClients: this.hunt.partySize() - this.hunt.botCount(),
        metadata: { leader: leader.name, mapId: mapIdOf(this.state.mapId) },
      });
    }
  }
}
