import { hasLineOfSight, isWalkable, tileDistance, type Dungeon } from "@kusa/shared";

interface Point { x: number; y: number }

/** Limite de tiles visitados por busca (os mapas têm até 112×112, mas o aggro é curto). */
const MAX_VISITED = 1500;

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

/**
 * Próximo passo (8 direções, tile a tile) de `from` até um tile a até `range` de `to`
 * com linha de visão. Busca em largura que respeita `isWalkable`, não corta quina de
 * parede na diagonal e desvia de tiles ocupados. Devolve null se não houver caminho.
 * `walkable` troca o chão que vale (a Águia Gigante voa por cima da água).
 */
export function nextStep(
  d: Dungeon,
  from: Point,
  to: Point,
  range: number,
  occupied: (x: number, y: number) => boolean,
  walkable: (x: number, y: number) => boolean = (x, y) => isWalkable(d, x, y),
): Point | null {
  const key = (x: number, y: number) => y * d.width + x;
  const start = key(from.x, from.y);
  const parent = new Map<number, number>([[start, -1]]);
  const queue: number[] = [start];

  for (let head = 0; head < queue.length && parent.size < MAX_VISITED; head++) {
    const cur = queue[head];
    const cx = cur % d.width;
    const cy = Math.floor(cur / d.width);

    if (cur !== start && tileDistance(cx, cy, to.x, to.y) <= range && hasLineOfSight(d, cx, cy, to.x, to.y)) {
      // Volta pelos pais até o primeiro passo.
      let step = cur;
      while (parent.get(step) !== start) step = parent.get(step)!;
      return { x: step % d.width, y: Math.floor(step / d.width) };
    }

    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const k = key(nx, ny);
      if (parent.has(k) || !walkable(nx, ny) || occupied(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!walkable(nx, cy) || !walkable(cx, ny))) continue;
      parent.set(k, cur);
      queue.push(k);
    }
  }
  return null;
}
