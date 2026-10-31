import * as Phaser from "phaser";
import { MAPS, TILE_SIZE, centerOf, generateDungeon, type MapId } from "@kusa/shared";
import { DUNES_VOID, drawDunes } from "./dunesMap.ts";
import { FORTRESS_VOID, drawFortress } from "./fortressMap.ts";
import { GATES_VOID, drawGates } from "./gatesMap.ts";
import type { MapAmbience } from "./mapShared.ts";

/**
 * Medição de desempenho dos cenários no celular (ferramenta de desenvolvimento, fora do build do jogo; empacotada à
 * parte numa página só): desenha a Fortaleza Orc, os Portões do Império e as Dunas Cantantes, um de cada vez, com a
 * câmera do celular em pé (9 tiles no lado curto), e passeia a câmera da entrada até o boss no passo de um herói.
 * Mede o tempo de desenho, a memória das texturas e os quadros por segundo (média e os 5% piores). A Fortaleza tem que
 * ficar perto dos Portões (`docs/FORTALEZA_PLANO.md`, fase 0).
 */
const MAP_LIST: { id: MapId; draw: typeof drawFortress; void: number }[] = [
  { id: "fortress", draw: drawFortress, void: FORTRESS_VOID },
  { id: "gates", draw: drawGates, void: GATES_VOID },
  { id: "dunes", draw: drawDunes, void: DUNES_VOID },
];
/** Duração máxima do passeio de cada mapa (ms), depois de 1 s parado. */
const TOUR_MS = 20000;

interface Result { mapa: string; desenhoMs: number; texturasMb: number; qps: number; qpsPiores5: number }

const status = document.getElementById("status")!;
const table = document.getElementById("resultado")!;

function measure(entry: (typeof MAP_LIST)[number]): Promise<Result> {
  return new Promise((resolve) => {
    const d = generateDungeon(1, entry.id);
    class Medida extends Phaser.Scene {
      private ambience: MapAmbience | null = null;
      private pts: { x: number; y: number }[] = [];
      private frames: number[] = [];
      private t0 = -1;
      private dist = 0;
      private drawMs = 0;
      private texMb = 0;

      create() {
        const t = performance.now();
        this.ambience = entry.draw(this, d, 0, 1e6);
        this.drawMs = Math.round(performance.now() - t);
        let bytes = 0;
        for (const key of this.textures.getTextureKeys()) for (const src of this.textures.get(key).source) bytes += src.width * src.height * 4;
        this.texMb = Math.round(bytes / 1048576);
        this.pts = [centerOf(d.spawn), ...d.path.map(centerOf), centerOf(d.boss)].map((p) => ({ x: p.x * TILE_SIZE + 16, y: p.y * TILE_SIZE + 16 }));
        const cam = this.cameras.main.setBackgroundColor(entry.void).setRoundPixels(true);
        cam.setZoom(Math.min(this.scale.gameSize.width, this.scale.gameSize.height) / (9 * TILE_SIZE)).centerOn(this.pts[0].x, this.pts[0].y);
        status.textContent = `${MAPS[entry.id].name}: desenhado em ${this.drawMs} ms, passeando…`;
      }

      update(time: number, delta: number) {
        this.ambience?.update(time);
        if (this.t0 < 0) this.t0 = time;
        if (time - this.t0 < 1000) return;
        this.frames.push(delta);
        this.dist += (delta / 1000) * 4 * TILE_SIZE;
        let left = this.dist;
        for (let i = 0; i + 1 < this.pts.length && time - this.t0 < TOUR_MS + 1000; i++) {
          const a = this.pts[i], b = this.pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
          if (left <= len) { this.cameras.main.centerOn(a.x + (b.x - a.x) * (left / len), a.y + (b.y - a.y) * (left / len)); return; }
          left -= len;
        }
        const sorted = [...this.frames].sort((x, y) => y - x);
        const worst = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.05)));
        const avg = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
        const result = { mapa: MAPS[entry.id].name, desenhoMs: this.drawMs, texturasMb: this.texMb, qps: Math.round(1000 / avg(this.frames)), qpsPiores5: Math.round(1000 / avg(worst)) };
        this.ambience = null;
        game.destroy(true);
        setTimeout(() => resolve(result), 300);
      }
    }
    const parent = document.getElementById("mapa")!;
    const dpr = window.devicePixelRatio || 1;
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent, pixelArt: true, scene: [Medida],
      scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    });
  });
}

document.getElementById("comecar")!.addEventListener("click", async (e) => {
  (e.currentTarget as HTMLButtonElement).remove();
  const results: Result[] = [];
  for (const entry of MAP_LIST) results.push(await measure(entry));
  const tela = `${innerWidth}×${innerHeight} @${devicePixelRatio}x · ${navigator.userAgent}`;
  const text = [
    "Mapa | Desenho (ms) | Texturas (MB) | Quadros/s | Piores 5%",
    ...results.map((r) => `${r.mapa} | ${r.desenhoMs} | ${r.texturasMb} | ${r.qps} | ${r.qpsPiores5}`),
    `Tela: ${tela}`,
  ].join("\n");
  status.textContent = "Pronto. Copie o resultado e cole na conversa.";
  table.textContent = text;
  const copy = document.createElement("button");
  copy.textContent = "Copiar resultado";
  copy.addEventListener("click", () => {
    navigator.clipboard.writeText(text).then(() => { copy.textContent = "Copiado ✓"; }, () => { copy.textContent = "Não deu para copiar: selecione o texto acima"; });
  });
  table.after(copy);
});
