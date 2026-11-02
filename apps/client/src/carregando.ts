import { MAPS, type MapId } from "@kusa/shared";

/**
 * Tela de "Carregando" da hunt: cobre a tela preta entre a largada (`startGame`) e o primeiro quadro da dungeon
 * (arte chegando pela rede e o mapa sendo desenhado). Mostra o mapa e uma dica que troca a cada poucos segundos.
 * As dicas repetem regras do GDD: mudou a regra, mude a dica.
 */
export const DICAS: readonly string[] = [
  "Fugir leva tudo: volte ao portal da entrada e fique 1,5 s em cima dele.",
  "Se o tempo acaba, o mapa desaba e todos morrem soterrados. Saia antes.",
  "Quem morre perde a bag, as poções e o loot. Abaixo do nível 5, o equipamento do corpo fica.",
  "Os slots de magia abrem nos níveis 3, 6 e 12. Os outros níveis dão uma melhoria à escolha.",
  "A agulha em volta do minimapa aponta para a sala do boss e, depois que ele morre, para o portal dele.",
  "Itens e poções a até 1 tile do herói são pegos sozinhos. Com a bag cheia, nada mais entra.",
  "A recarga das poções é de 6 s, compartilhada entre vida e mana.",
  "Tocar num monstro trava o alvo nele; tocar de novo destrava.",
  "Arraste o ⚔️ ou a magia para mirar à mão. O tiro à distância pode errar.",
  "Mate o boss: o portal que abre na sala dele conclui a dungeon com bônus.",
  "Baús nas salas laterais guardam itens fortes. Alguns são Mímicos.",
  "Ao voltar vivo, a bag vai sozinha para o cofre, melhores itens primeiro.",
  "Poções só caem na dungeon e valem só durante a hunt.",
];

const TROCA_MS = 4500;

let timer = 0;
let ultima = -1;

function sortearDica() {
  let i = Math.floor(Math.random() * DICAS.length);
  if (DICAS.length > 1 && i === ultima) i = (i + 1) % DICAS.length;
  ultima = i;
  return DICAS[i];
}

function trocarDica() {
  const el = document.getElementById("loading-tip");
  if (!el) return;
  el.classList.remove("in");
  // Reinicia a animação de entrada da dica.
  void el.offsetWidth;
  el.textContent = sortearDica();
  el.classList.add("in");
}

/** Abre o "Carregando" com o nome do mapa. */
export function mostrarCarregando(mapId: MapId) {
  const box = document.getElementById("loading");
  if (!box) return;
  const map = MAPS[mapId];
  document.getElementById("loading-map")!.textContent = map ? `${map.icon} ${map.name}` : "";
  box.classList.remove("saindo");
  box.hidden = false;
  trocarDica();
  window.clearInterval(timer);
  timer = window.setInterval(trocarDica, TROCA_MS);
}

/** Fecha o "Carregando" com um fade curto (a hunt já está rodando por baixo). */
export function esconderCarregando() {
  const box = document.getElementById("loading");
  window.clearInterval(timer);
  if (!box || box.hidden) return;
  box.classList.add("saindo");
  window.setTimeout(() => {
    if (box.classList.contains("saindo")) box.hidden = true;
  }, 250);
}
